/**
 * CASTING PAGE ENRICHMENT SCRIPT
 * 
 * Fetches individual casting pages from Fandom wiki (e.g. "1965 Shelby Cobra 427 S/C")
 * and enriches existing catalog items with detailed info:
 *   color, tampo, base_color, window_color, interior_color, wheel_type, country, series, photo
 *
 * The individual casting pages have a standardised "==Versions==" table with columns:
 *   Col #, Year, Series, Color, Tampo, Base Color/Type, Window Color,
 *   Interior Color, Wheel Type, Toy #, Country, Notes, Photo
 *
 * Strategy:
 *   1. Collect unique carModel names from current JSON database
 *   2. Batch-check which have Fandom pages (50 titles per API call)
 *   3. Batch-fetch page content (10 at a time — content is heavy)
 *   4. Parse ==Versions== table, match rows by toy_num
 *   5. Fill in missing fields (never overwrite existing non-empty values)
 *   6. Save back to JSON
 *
 * Usage:
 *   npx tsx src/scripts/enrich-from-casting-pages.ts
 *
 * Environment variables:
 *   CASTING_ENRICH_LIMIT        — max number of models to process (default: all)
 *   CASTING_OVERWRITE_FIELDS    — comma-separated field names to overwrite even if non-empty
 *   CASTING_SKIP_EXISTING       — if "true", skip models that already have all fields filled
 */

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { CatalogPhotoService } from '../services/catalogPhotoService'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DATA_PATH = path.join(__dirname, '../../data/hotwheels_database.json')
const PROGRESS_PATH = path.join(__dirname, '../../data/casting-enrich-progress.json')
const REQUEST_DELAY = 150 // ms between API batches

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Types ───────────────────────────────────────────────────────

interface VersionRow {
  col_num: string
  year: string
  series: string
  color: string
  tampo: string
  base_color: string
  window_color: string
  interior_color: string
  wheel_type: string
  toy_num: string
  country: string
  notes: string
  photo_url: string | undefined
}

interface EnrichStats {
  modelsChecked: number
  pagesFound: number
  pagesMissing: number
  rowsParsed: number
  itemsEnriched: number
  fieldsUpdated: number
  photosAdded: number
  errors: number
}

// ─── Wikitext Parsing ────────────────────────────────────────────

function cleanWikitext(text: string): string {
  return text
    .replace(/\[\[(?:File|Image):([^\]|]+)(?:\|[^\]]+)?\]\]/gi, (_m, name: string) =>
      'wiki-file:' + name.trim().replace(/ /g, '_')
    )
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/''+/g, '')
    .trim()
}

/**
 * Parses the ==Versions== table from a casting page's wikitext.
 * Returns an array of version rows matched by structure.
 */
function parseVersionsTable(wikitext: string): VersionRow[] {
  const rows: VersionRow[] = []

  // Find ==Versions== section
  const vIdx = wikitext.indexOf('==Versions==')
  if (vIdx < 0) return rows

  // Extract from Versions header to end of first table after it
  let tableStart = wikitext.indexOf('{|', vIdx)
  if (tableStart < 0) return rows
  
  // Find matching |}
  let depth = 0
  let tableEnd = -1
  for (let i = tableStart; i < wikitext.length; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '|') { depth++; i++ }
    else if (wikitext[i] === '|' && wikitext[i + 1] === '}') {
      depth--
      if (depth === 0) { tableEnd = i + 2; break }
      i++
    }
  }
  if (tableEnd < 0) tableEnd = wikitext.length

  const tableText = wikitext.substring(tableStart, tableEnd)
  const lines = tableText.split('\n')

  // Parse headers
  const headers: string[] = []
  const dataRows: string[][] = []
  let currentRow: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('{|') || trimmed.startsWith('|+')) continue

    if (trimmed.startsWith('|-') || trimmed.startsWith('|}')) {
      if (currentRow.length > 0) {
        if (headers.length === 0) {
          // This shouldn't happen for casting pages, but safety
        } else {
          dataRows.push(currentRow)
        }
        currentRow = []
      }
      continue
    }

    // Header cells
    if (trimmed.startsWith('!')) {
      const content = trimmed.substring(1)
      const parts = content.split('!!')
      for (let part of parts) {
        if (part.includes('|')) part = part.split('|').pop() || ''
        headers.push(cleanWikitext(part))
      }
      continue
    }

    // Data cells
    if (trimmed.startsWith('|')) {
      const content = trimmed.substring(1)
      // Split by || but protect [[wiki links]]
      const cells = splitCellsProtected(content)
      for (let cell of cells) {
        // Strip style attributes
        if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(cell)) {
          const pipeIdx = cell.indexOf('|')
          if (pipeIdx >= 0) cell = cell.substring(pipeIdx + 1)
          else continue // attribute-only, skip
        }
        currentRow.push(cleanWikitext(cell))
      }
    }
  }
  // Final row
  if (currentRow.length > 0 && headers.length > 0) {
    dataRows.push(currentRow)
  }

  // Map headers to indices
  const colMap = mapVersionHeaders(headers)
  if (colMap.toy_num === undefined) return rows // Can't match without toy_num

  for (const cells of dataRows) {
    const get = (key: string) => {
      const idx = (colMap as any)[key]
      if (idx === undefined || idx >= cells.length) return ''
      return cells[idx] || ''
    }

    const photoRaw = get('photo')
    let photoUrl: string | undefined = undefined
    if (photoRaw) {
      const wikiMatch = photoRaw.match(/wiki-file:([^\s]+)/i)
      if (wikiMatch) photoUrl = `wiki-file:${wikiMatch[1]}`
    }

    const toyNum = get('toy_num')
    if (!toyNum) continue // Skip empty rows

    rows.push({
      col_num: get('col_num'),
      year: get('year'),
      series: get('series'),
      color: get('color'),
      tampo: get('tampo'),
      base_color: get('base_color'),
      window_color: get('window_color'),
      interior_color: get('interior_color'),
      wheel_type: get('wheel_type'),
      toy_num: toyNum,
      country: get('country'),
      notes: get('notes'),
      photo_url: photoUrl,
    })
  }

  return rows
}

function splitCellsProtected(content: string): string[] {
  const cells: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '[' && content[i + 1] === '[') { depth++; current += '[['; i++ }
    else if (content[i] === ']' && content[i + 1] === ']') { depth--; current += ']]'; i++ }
    else if (content[i] === '|' && content[i + 1] === '|' && depth === 0) {
      cells.push(current)
      current = ''
      i++ // skip second |
    }
    else { current += content[i] }
  }
  if (current) cells.push(current)
  return cells
}

function mapVersionHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (/col\s*#|col\.\s*#|^#$/i.test(h)) map.col_num = i
    else if (/^year$/i.test(h)) map.year = i
    else if (/^series$/i.test(h)) map.series = i
    else if (/^color$/i.test(h)) map.color = i
    else if (/^tampo/i.test(h)) map.tampo = i
    else if (/base\s*color/i.test(h)) map.base_color = i
    else if (/window\s*color/i.test(h)) map.window_color = i
    else if (/interior\s*color/i.test(h)) map.interior_color = i
    else if (/wheel\s*type/i.test(h)) map.wheel_type = i
    else if (/toy\s*#|toy\s*num/i.test(h)) map.toy_num = i
    else if (/country/i.test(h)) map.country = i
    else if (/notes/i.test(h)) map.notes = i
    else if (/photo|image/i.test(h)) map.photo = i
  }
  return map
}

// ─── Fandom API Helpers ─────────────────────────────────────────

/**
 * Batch-check which page titles exist (up to 50 per call).
 * Returns a Map from search title → actual wiki title (for pages that exist).
 */
async function checkPagesExist(titles: string[]): Promise<Map<string, string>> {
  const existMap = new Map<string, string>()
  const BATCH = 50

  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH)
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      format: 'json',
      formatversion: '2',
    })

    try {
      const resp = await axios.get(`${FANDOM_API}?${params}`)
      const pages = resp.data.query?.pages || []
      const normalized = resp.data.query?.normalized || []
      
      // Build reverse normalization map (normalized → original)
      const normMap = new Map<string, string>()
      for (const n of normalized) {
        normMap.set(n.to, n.from)
      }

      for (const page of pages) {
        if (!page.missing) {
          const wikiTitle = page.title
          const originalTitle = normMap.get(wikiTitle) || wikiTitle.replace(/ /g, '_')
          existMap.set(originalTitle, wikiTitle)
        }
      }
    } catch (e) {
      console.error(`  ⚠️ Error checking page existence:`, (e as Error).message)
    }

    if (i + BATCH < titles.length) await sleep(REQUEST_DELAY)
  }

  return existMap
}

/**
 * Batch-fetch page content (up to 10 per call — content is heavy).
 * Returns Map<wikiTitle, wikitext>.
 */
async function fetchPageContents(wikiTitles: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>()
  const BATCH = 10

  for (let i = 0; i < wikiTitles.length; i += BATCH) {
    const batch = wikiTitles.slice(i, i + BATCH)
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'revisions',
      rvprop: 'content',
      format: 'json',
      formatversion: '2',
    })

    try {
      const resp = await axios.get(`${FANDOM_API}?${params}`)
      const pages = resp.data.query?.pages || []

      for (const page of pages) {
        if (page.revisions?.[0]?.content) {
          contentMap.set(page.title, page.revisions[0].content)
        }
      }
    } catch (e) {
      console.error(`  ⚠️ Error fetching content:`, (e as Error).message)
    }

    if (i + BATCH < wikiTitles.length) await sleep(REQUEST_DELAY)
  }

  return contentMap
}

// ─── Enrichment Logic ────────────────────────────────────────────

const ENRICHABLE_FIELDS = [
  'color', 'tampo', 'base_color', 'window_color', 'interior_color',
  'wheel_type', 'country', 'notes',
] as const

type EnrichableField = typeof ENRICHABLE_FIELDS[number]

/**
 * Main enrichment function.
 */
async function enrichFromCastingPages(): Promise<EnrichStats> {
  const stats: EnrichStats = {
    modelsChecked: 0,
    pagesFound: 0,
    pagesMissing: 0,
    rowsParsed: 0,
    itemsEnriched: 0,
    fieldsUpdated: 0,
    photosAdded: 0,
    errors: 0,
  }

  // Config from env
  const limit = process.env.CASTING_ENRICH_LIMIT
    ? parseInt(process.env.CASTING_ENRICH_LIMIT)
    : Infinity
  const overwriteFields = new Set(
    (process.env.CASTING_OVERWRITE_FIELDS || '').split(',').map(s => s.trim()).filter(Boolean)
  )
  const skipExisting = process.env.CASTING_SKIP_EXISTING === 'true'

  console.log('📖 Casting Page Enrichment')
  console.log('═'.repeat(60))

  // 1. Load database
  const items: any[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  console.log(`📦 Loaded ${items.length} items`)

  // 2. Build toy_num → item index for quick lookup
  const toyNumIndex = new Map<string, number[]>()
  for (let i = 0; i < items.length; i++) {
    const tn = String(items[i].toy_num || '').trim()
    if (tn) {
      const arr = toyNumIndex.get(tn) || []
      arr.push(i)
      toyNumIndex.set(tn, arr)
    }
  }

  // 3. Collect unique carModel → wiki title candidates
  const modelTitles = new Map<string, string>() // normalized carModel → wiki search title
  for (const item of items) {
    const model = String(item.carModel || '').trim()
    if (!model) continue
    if (modelTitles.has(model)) continue

    // Convert to wiki title: spaces → underscores, keep special chars
    const wikiTitle = model.replace(/ /g, '_')
    modelTitles.set(model, wikiTitle)
  }

  let allModels = Array.from(modelTitles.entries())
  if (limit < allModels.length) {
    allModels = allModels.slice(0, limit)
  }

  console.log(`🔍 Checking ${allModels.length} unique models against Fandom...`)

  // 4. Load progress (for resume support)
  let processedModels = new Set<string>()
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
      processedModels = new Set(progress.processedModels || [])
      console.log(`📌 Resuming: ${processedModels.size} models already processed`)
    } catch {}
  }

  // Filter out already-processed
  const remaining = allModels.filter(([model]) => !processedModels.has(model))
  console.log(`📋 Models to process: ${remaining.length}`)

  // 5. Batch-check page existence
  const CHECK_BATCH = 200
  let existingPages = new Map<string, string>()

  for (let i = 0; i < remaining.length; i += CHECK_BATCH) {
    const batch = remaining.slice(i, i + CHECK_BATCH)
    const titles = batch.map(([, t]) => t)
    const found = await checkPagesExist(titles)
    for (const [k, v] of found) existingPages.set(k, v)
    
    const progress = Math.min(i + CHECK_BATCH, remaining.length)
    process.stdout.write(`\r  Checked ${progress}/${remaining.length} titles (${found.size} found in this batch)`)
  }
  console.log(`\n✅ Found ${existingPages.size} casting pages on Fandom`)
  stats.modelsChecked = remaining.length
  stats.pagesFound = existingPages.size
  stats.pagesMissing = remaining.length - existingPages.size

  // 6. Map back: carModel → wikiTitle for pages that exist
  const modelToWikiTitle = new Map<string, string>()
  for (const [model, searchTitle] of remaining) {
    if (existingPages.has(searchTitle)) {
      modelToWikiTitle.set(model, existingPages.get(searchTitle)!)
    }
  }

  // 7. Fetch and process casting pages
  const wikiTitles = Array.from(new Set(modelToWikiTitle.values()))
  console.log(`\n📥 Fetching ${wikiTitles.length} casting pages...`)

  const CONTENT_BATCH = 10
  let fetchedCount = 0
  let allWikiPhotos: string[] = [] // Collect wiki-file URLs for batch resolution

  for (let i = 0; i < wikiTitles.length; i += CONTENT_BATCH) {
    const batch = wikiTitles.slice(i, i + CONTENT_BATCH)
    const contentMap = await fetchPageContents(batch)

    for (const [wikiTitle, wikitext] of contentMap) {
      try {
        const versionRows = parseVersionsTable(wikitext)
        stats.rowsParsed += versionRows.length

        for (const row of versionRows) {
          const toyNum = row.toy_num.trim()
          if (!toyNum) continue

          const itemIndices = toyNumIndex.get(toyNum)
          if (!itemIndices) continue

          for (const idx of itemIndices) {
            const item = items[idx]
            let fieldsChanged = 0

            // Fill in missing fields from casting page
            for (const field of ENRICHABLE_FIELDS) {
              const castingValue = row[field]
              if (!castingValue) continue

              const currentValue = String(item[field] || '').trim()
              if (currentValue && !overwriteFields.has(field)) continue // Don't overwrite

              // Clean wiki-file markers from non-photo text fields
              const cleanValue = castingValue.replace(/wiki-file:\S+/gi, '').trim()
              if (!cleanValue) continue

              item[field] = cleanValue
              fieldsChanged++
              stats.fieldsUpdated++
            }

            // Also try to update series if current is generic "List of XXXX Hot Wheels"
            if (row.series && /^List of \d{4}/i.test(String(item.series || ''))) {
              item.series = row.series
              stats.fieldsUpdated++
              fieldsChanged++
            }

            // Update col_num if missing
            if (row.col_num && !item.col_num) {
              item.col_num = row.col_num
              stats.fieldsUpdated++
              fieldsChanged++
            }

            // Photo: only if current photo is missing or localhost
            if (row.photo_url) {
              const currentPhoto = String(item.photo_url || '').trim()
              if (!currentPhoto || currentPhoto.includes('localhost')) {
                // Don't set "Image Not Available" photos
                if (!row.photo_url.toLowerCase().includes('not_available') &&
                    !row.photo_url.toLowerCase().includes('image_not_available')) {
                  item.photo_url = row.photo_url
                  allWikiPhotos.push(row.photo_url)
                  stats.photosAdded++
                  fieldsChanged++
                }
              }
            }

            if (fieldsChanged > 0) stats.itemsEnriched++
          }
        }
      } catch (e) {
        console.error(`  ⚠️ Error processing ${wikiTitle}:`, (e as Error).message)
        stats.errors++
      }
    }

    // Mark processed
    for (const [model, wt] of modelToWikiTitle) {
      if (batch.includes(wt)) processedModels.add(model)
    }

    fetchedCount += batch.length
    process.stdout.write(`\r  Processed ${fetchedCount}/${wikiTitles.length} pages | ` +
      `${stats.itemsEnriched} items enriched | ${stats.fieldsUpdated} fields updated`)

    // Save progress periodically
    if (fetchedCount % 100 === 0) {
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify({
        processedModels: Array.from(processedModels),
        lastSaved: new Date().toISOString(),
      }))
    }
  }
  console.log('')

  // 8. Resolve any new wiki-file photo URLs to CDN
  if (allWikiPhotos.length > 0) {
    console.log(`\n🔗 Resolving ${allWikiPhotos.length} wiki-file photo URLs...`)
    await CatalogPhotoService.resolveAllWikiUrls(items)
  }

  // 9. Save enriched database
  console.log('\n💾 Saving enriched database...')
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2))

  // Save final progress
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({
    processedModels: Array.from(processedModels),
    lastSaved: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }))

  // 10. Print results
  console.log('\n' + '═'.repeat(60))
  console.log('📊 ENRICHMENT RESULTS')
  console.log('═'.repeat(60))
  console.log(`  Models checked:    ${stats.modelsChecked}`)
  console.log(`  Pages found:       ${stats.pagesFound}`)
  console.log(`  Pages missing:     ${stats.pagesMissing}`)
  console.log(`  Version rows:      ${stats.rowsParsed}`)
  console.log(`  Items enriched:    ${stats.itemsEnriched}`)
  console.log(`  Fields updated:    ${stats.fieldsUpdated}`)
  console.log(`  Photos added:      ${stats.photosAdded}`)
  console.log(`  Errors:            ${stats.errors}`)
  console.log('═'.repeat(60))

  return stats
}

// ─── CLI entry ───────────────────────────────────────────────────

if (require.main === module) {
  enrichFromCastingPages()
    .then(stats => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch(err => {
      console.error('❌ Fatal error:', err)
      process.exit(1)
    })
}

export { enrichFromCastingPages, parseVersionsTable }
