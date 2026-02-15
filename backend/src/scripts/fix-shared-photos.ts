/**
 * Fix shared/duplicate photos across variants of the same casting.
 * 
 * Problem: The pageimages API returns ONE main image per wiki page,
 * so all variants of e.g. "1993 Ford Mustang Cobra R" get the same photo.
 * But the wiki TABLE has unique photos per row (variant).
 * 
 * Solution:
 * 1. Find castings where multiple variants share the same photo_url
 * 2. Fetch each casting page's wikitext
 * 3. Parse the table to extract per-row photos
 * 4. Match rows to JSON entries by (year, color, toy_num)
 * 5. Resolve wiki-file: → real URL via imageinfo API
 * 6. Update JSON and MongoDB
 * 
 * Usage: npx tsx src/scripts/fix-shared-photos.ts [--dry-run] [--min-dupes N]
 */

import mongoose from 'mongoose'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const JSON_PATH = path.resolve(__dirname, '../../data/hotwheels_database.json')
const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const BATCH_SIZE = 50
const DELAY_MS = 300
const MAX_RETRIES = 3

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const minDupesIdx = args.indexOf('--min-dupes')
const MIN_DUPES = minDupesIdx >= 0 ? parseInt(args[minDupesIdx + 1]) : 2

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Resolve File: titles through imageinfo API.
 * Returns Map<filename, realUrl>
 */
async function resolveFileUrls(filenames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (filenames.length === 0) return result

  for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
    const batch = filenames.slice(i, i + BATCH_SIZE)
    const titles = batch.map(f => `File:${f}`).join('|')

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params = new URLSearchParams({
          action: 'query',
          titles,
          prop: 'imageinfo',
          iiprop: 'url',
          format: 'json',
          formatversion: '2'
        })

        const response = await axios.get(`${FANDOM_API}?${params}`, { timeout: 15000 })
        const pages = response.data.query?.pages || []

        for (const page of pages) {
          if (page.imageinfo && page.imageinfo[0]?.url) {
            const filename = page.title.replace(/^File:/, '')
            // Store both space and underscore versions for reliable lookup
            result.set(filename, page.imageinfo[0].url)
            result.set(filename.replace(/ /g, '_'), page.imageinfo[0].url)
          }
        }
        break // success
      } catch (error: any) {
        if (attempt < MAX_RETRIES) {
          console.error(`  Error batch ${i} (attempt ${attempt}/${MAX_RETRIES}): ${error.message}, retrying...`)
          await sleep(DELAY_MS * attempt * 2)
        } else {
          console.error(`  Error batch ${i} (GIVING UP after ${MAX_RETRIES} attempts): ${error.message}`)
        }
      }
    }

    if (i + BATCH_SIZE < filenames.length) {
      await sleep(DELAY_MS)
    }
  }

  return result
}

/**
 * Fetch wikitext for multiple pages.
 * Returns Map<pageTitle, wikitextContent>
 */
async function fetchPageWikitext(pageTitles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  for (let i = 0; i < pageTitles.length; i += BATCH_SIZE) {
    const batch = pageTitles.slice(i, i + BATCH_SIZE)
    const titles = batch.join('|')

    const params = new URLSearchParams({
      action: 'query',
      titles,
      prop: 'revisions',
      rvprop: 'content',
      format: 'json',
      formatversion: '2'
    })

    let fetched = false
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(`${FANDOM_API}?${params}`, { timeout: 15000 })
        const pages = response.data.query?.pages || []

        for (const page of pages) {
          if (page.revisions && page.revisions[0]?.content) {
            result.set(page.title, page.revisions[0].content)
          }
        }
        fetched = true
        break
      } catch (error: any) {
        if (attempt < MAX_RETRIES) {
          console.error(`  Error wikitext batch ${i} (attempt ${attempt}/${MAX_RETRIES}): ${error.message}, retrying...`)
          await sleep(DELAY_MS * attempt * 2)
        } else {
          console.error(`  Error wikitext batch ${i} (GIVING UP): ${error.message}`)
          console.error(`    Failed titles: ${batch.join(', ')}`)
        }
      }
    }

    if (i + BATCH_SIZE < pageTitles.length) {
      await sleep(DELAY_MS)
    }

    if (i % 200 === 0 && i > 0) {
      console.log(`  ... fetched ${i}/${pageTitles.length} pages`)
    }
  }

  return result
}

/**
 * Parse a wiki table and extract photo filenames for each row.
 * Handles MediaWiki table format where cells are one-per-line (|cell).
 * Returns array of row objects with extracted photo and identifying info.
 */
function parseTablePhotos(wikitext: string): Array<{
  photo_filename: string | null
  photo_carded_filename: string | null
  year: string
  color: string
  toy_num: string
  carName: string
  rowIndex: number
}> {
  const results: Array<any> = []
  const lines = wikitext.split('\n')

  let inTable = false
  let headers: string[] = []
  let photoCol = -1
  let photoCrdCol = -1
  let nameCol = -1
  let yearCol = -1
  let colorCol = -1
  let numCol = -1
  let currentRow: string[] = []
  let rowIndex = 0

  function identifyColumns() {
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j].toLowerCase().trim()
      if (/^(photo|image|loose|pic)$/i.test(h) && photoCol === -1) photoCol = j
      if (/^(carded|packaged|card)$/i.test(h)) photoCrdCol = j
      if (/^(name|casting|model|car)$/i.test(h)) nameCol = j
      if (/^(year)$/i.test(h)) yearCol = j
      if (/^(col\.?|color|colour|body\s*color)$/i.test(h)) colorCol = j
      if (/^(#|num|number|toy.?#|toy.?num|col\.?\s*#|col\.?\s*num)$/i.test(h)) numCol = j
    }
  }

  function flushRow() {
    if (currentRow.length < 2 || headers.length === 0) {
      currentRow = []
      return
    }

    // Skip header-like rows
    const isHeaderRow = currentRow.some(c => /^(#|number|name|year|color|casting|series)/i.test(c.trim()))
    if (isHeaderRow) {
      currentRow = []
      return
    }

    // Pad row to header length
    while (currentRow.length < headers.length) currentRow.push('')

    let photoFilename: string | null = null
    let photoCrdFilename: string | null = null

    if (photoCol >= 0) photoFilename = extractFilename(currentRow[photoCol] || '')
    if (photoCrdCol >= 0) photoCrdFilename = extractFilename(currentRow[photoCrdCol] || '')

    results.push({
      photo_filename: photoFilename,
      photo_carded_filename: photoCrdFilename,
      year: yearCol >= 0 ? extractYear(currentRow[yearCol] || '') : '',
      color: colorCol >= 0 ? cleanCell(currentRow[colorCol] || '') : '',
      toy_num: numCol >= 0 ? cleanCell(currentRow[numCol] || '') : '',
      carName: nameCol >= 0 ? cleanCell(currentRow[nameCol] || '') : '',
      rowIndex: rowIndex++,
    })
    currentRow = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Table start
    if (line.startsWith('{|')) {
      inTable = true
      headers = []
      photoCol = photoCrdCol = nameCol = yearCol = colorCol = numCol = -1
      currentRow = []
      rowIndex = 0
      continue
    }

    // Table end
    if (line.startsWith('|}')) {
      flushRow()
      inTable = false
      continue
    }

    if (!inTable) continue

    // Row separator
    if (line.startsWith('|-')) {
      flushRow()
      continue
    }

    // Header cells
    if (line.startsWith('!')) {
      const content = line.substring(1)
      const parts = content.split('!!')
      for (let part of parts) {
        // Remove style attributes
        if (part.includes('|')) {
          const pipeIdx = part.indexOf('|')
          if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(part)) {
            part = part.substring(pipeIdx + 1)
          }
        }
        headers.push(part.replace(/'''?/g, '').replace(/<[^>]+>/g, '').trim())
      }
      identifyColumns()
      continue
    }

    // Data cells
    if (line.startsWith('|') && !line.startsWith('|+')) {
      const content = line.substring(1)
      // Check for || inline separators
      const parts = content.split('||')
      for (let part of parts) {
        // Strip style attributes but preserve wiki links
        const stripped = part.replace(/\[\[[^\]]*\]\]/g, '___WIKILINK___')
        if (stripped.includes('|') && !stripped.startsWith('___WIKILINK___')) {
          if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(part)) {
            const pipeIdx = part.indexOf('|')
            part = part.substring(pipeIdx + 1)
          }
        }
        currentRow.push(part.trim())
      }
    }
  }

  // Don't forget last row
  flushRow()

  return results
}

/**
 * Extract a File/Image filename from a wikitext cell.
 */
function extractFilename(cell: string): string | null {
  // Match [[File:NAME|...]] or [[Image:NAME|...]]
  const match = cell.match(/\[\[(?:File|Image):([^\]|]+)/i)
  if (match) {
    const name = match[1].trim().replace(/ /g, '_')
    // Skip placeholder images
    if (/^(image_not_available|ina|no_image|placeholder)/i.test(name)) return null
    return name
  }
  return null
}

/**
 * Extract 4-digit year from a cell.
 */
function extractYear(cell: string): string {
  const match = cell.match(/((?:19|20)\d{2})/)
  return match ? match[1] : ''
}

/**
 * Clean wikitext from a cell (remove links, formatting).
 */
function cleanCell(cell: string): string {
  return cell
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1') // [[Link|Text]] → Text
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[Link]] → Link
    .replace(/'''?/g, '') // Bold/italic markers
    .replace(/<[^>]+>/g, '') // HTML tags
    .trim()
}

/**
 * Match a wiki table row to a JSON entry.
 * Returns the best matching JSON entry index or -1.
 */
function matchRowToEntry(
  row: { year: string; color: string; toy_num: string; carName: string },
  entries: any[]
): number {
  let bestIdx = -1
  let bestScore = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    let score = 0

    // toy_num match is strongest
    if (row.toy_num && entry.toy_num && 
        row.toy_num.toLowerCase() === entry.toy_num.toLowerCase()) {
      score += 10
    }

    // Year match
    if (row.year && entry.year && row.year === entry.year.toString()) {
      score += 3
    }

    // Color match (fuzzy)
    if (row.color && entry.color) {
      const rc = row.color.toLowerCase()
      const ec = entry.color.toLowerCase()
      if (rc === ec) score += 5
      else if (rc.includes(ec) || ec.includes(rc)) score += 3
    }

    // Name match
    if (row.carName && entry.carModel) {
      const rn = row.carName.toLowerCase()
      const en = entry.carModel.toLowerCase()
      if (rn === en || rn.includes(en) || en.includes(rn)) score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  // Require at least a year or toy_num match
  return bestScore >= 3 ? bestIdx : -1
}

async function fixSharedPhotos() {
  console.log('🔧 Fix Shared/Duplicate Photos Across Variants')
  console.log(`   Min duplicates threshold: ${MIN_DUPES}`)
  if (DRY_RUN) console.log('   🔍 DRY RUN mode')
  console.log('================================================\n')

  // Load JSON
  const jsonData: any[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`📄 JSON: ${jsonData.length} items`)

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('✅ Connected to MongoDB\n')

  // ====== Step 1: Find castings with shared photos ======
  console.log('📌 Step 1: Finding castings with shared photos...')

  // Group entries by carModel
  const modelGroups = new Map<string, number[]>() // carModel → [jsonIndices]
  for (let i = 0; i < jsonData.length; i++) {
    const model = jsonData[i].carModel || ''
    if (!model) continue
    if (!modelGroups.has(model)) modelGroups.set(model, [])
    modelGroups.get(model)!.push(i)
  }

  // Find models where multiple variants share the same photo
  const modelsToFix: Array<{ model: string; indices: number[]; sharedUrls: Set<string> }> = []

  for (const [model, indices] of modelGroups) {
    if (indices.length < MIN_DUPES) continue

    // Count photo URLs
    const urlCounts = new Map<string, number>()
    for (const idx of indices) {
      const url = jsonData[idx].photo_url || ''
      if (url.startsWith('https://')) {
        urlCounts.set(url, (urlCounts.get(url) || 0) + 1)
      }
    }

    // Collect ALL URLs shared by MIN_DUPES+ variants
    const sharedUrls = new Set<string>()
    for (const [url, count] of urlCounts) {
      if (count >= MIN_DUPES) {
        sharedUrls.add(url)
      }
    }
    
    if (sharedUrls.size > 0) {
      modelsToFix.push({ model, indices, sharedUrls })
    }
  }

  console.log(`  Found ${modelsToFix.length} castings with shared photos (${MIN_DUPES}+ variants same URL)`)
  
  if (modelsToFix.length === 0) {
    console.log('  Nothing to fix!')
    await mongoose.disconnect()
    return
  }

  // Show some examples
  console.log(`  Examples:`)
  for (const { model, indices } of modelsToFix.slice(0, 5)) {
    console.log(`    ${model}: ${indices.length} variants`)
  }

  // ====== Step 2: Fetch wikitext for casting pages ======
  console.log('\n📌 Step 2: Fetching wikitext for casting pages...')

  // Use carModel as the wiki page title — these are individual casting pages
  const pageNamesToFetch = [...new Set(modelsToFix.map(m => m.model))]
  console.log(`  Fetching ${pageNamesToFetch.length} pages...`)
  
  const wikitextMap = await fetchPageWikitext(pageNamesToFetch)
  console.log(`  Got wikitext for ${wikitextMap.size} pages`)
  
  // Log pages that were requested but not fetched
  const missingPages = pageNamesToFetch.filter(p => !wikitextMap.has(p))
  if (missingPages.length > 0) {
    console.log(`  ⚠️  Missing wikitext for ${missingPages.length} pages:`)
    for (const p of missingPages.slice(0, 10)) {
      console.log(`     - ${p}`)
    }
    if (missingPages.length > 10) {
      console.log(`     ... and ${missingPages.length - 10} more`)
    }
  }

  // ====== Step 3: Parse tables and extract per-row photos ======
  console.log('\n📌 Step 3: Parsing tables for per-variant photos...')

  const allFilenames = new Set<string>()
  let matchedRows = 0
  let unmatchedRows = 0
  let noWikitext = 0
  let noTableRows = 0
  let noSharedEntries = 0
  const updates: Array<{ jsonIdx: number; filename: string }> = []

  for (const { model, indices, sharedUrls } of modelsToFix) {
    const wikitext = wikitextMap.get(model)
    if (!wikitext) {
      noWikitext++
      continue
    }

    // Parse table to get per-row photos
    const tableRows = parseTablePhotos(wikitext)
    if (tableRows.length === 0) {
      noTableRows++
      continue
    }

    // Get ONLY entries that currently have ANY shared (duplicate) photo.
    // Entries that already have a unique/correct photo should not be touched.
    const entriesWithSharedPhoto = indices
      .filter(idx => sharedUrls.has(jsonData[idx].photo_url || ''))
      .map(idx => ({ ...jsonData[idx], _jsonIdx: idx }))

    if (entriesWithSharedPhoto.length === 0) {
      noSharedEntries++
      continue
    }

    // Track which entries have been matched (avoid double-matching)
    const matchedEntries = new Set<number>()

    // Match each table row to a JSON entry that needs fixing
    for (const row of tableRows) {
      if (!row.photo_filename) continue

      // Find best matching unmatched entry
      const availableEntries = entriesWithSharedPhoto.filter(e => !matchedEntries.has(e._jsonIdx))
      if (availableEntries.length === 0) break // All shared entries matched

      const matchIdx = matchRowToEntry(row, availableEntries)
      
      if (matchIdx >= 0) {
        const entry = availableEntries[matchIdx]
        matchedEntries.add(entry._jsonIdx)
        allFilenames.add(row.photo_filename)
        updates.push({ jsonIdx: entry._jsonIdx, filename: row.photo_filename })
        matchedRows++
      } else {
        unmatchedRows++
      }
    }
  }

  console.log(`  Matched ${matchedRows} table rows to JSON entries`)
  console.log(`  Unmatched rows: ${unmatchedRows}`)
  console.log(`  No wikitext fetched: ${noWikitext}`)
  console.log(`  No table rows parsed: ${noTableRows}`)
  console.log(`  No shared entries remaining: ${noSharedEntries}`)
  console.log(`  Unique filenames to resolve: ${allFilenames.size}`)

  // ====== Step 4: Resolve filenames to real URLs ======
  console.log('\n📌 Step 4: Resolving filenames via imageinfo API...')
  
  const resolvedUrls = await resolveFileUrls(Array.from(allFilenames))
  console.log(`  Resolved ${resolvedUrls.size} of ${allFilenames.size} filenames`)

  // ====== Step 5: Apply updates ======
  console.log('\n📌 Step 5: Applying updates...')

  let updatedJson = 0
  let skippedSameUrl = 0
  let unresolvedFilenames = 0

  for (const { jsonIdx, filename } of updates) {
    const resolvedUrl = resolvedUrls.get(filename)
    if (!resolvedUrl) {
      unresolvedFilenames++
      continue
    }

    const currentUrl = jsonData[jsonIdx].photo_url || ''
    if (currentUrl === resolvedUrl) {
      skippedSameUrl++
      continue
    }

    if (!DRY_RUN) {
      jsonData[jsonIdx].photo_url = resolvedUrl
    }
    updatedJson++
  }

  console.log(`  Updated: ${updatedJson}`)
  console.log(`  Skipped (already correct): ${skippedSameUrl}`)
  console.log(`  Unresolved filenames: ${unresolvedFilenames}`)

  // ====== Step 6: Save ======
  if (!DRY_RUN && updatedJson > 0) {
    console.log('\n📌 Step 6: Saving...')
    
    // Save JSON
    fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData))
    console.log(`  ✅ JSON saved`)

    // Update MongoDB
    let mongoUpdated = 0
    for (const { jsonIdx, filename } of updates) {
      const resolvedUrl = resolvedUrls.get(filename)
      if (!resolvedUrl) continue

      const item = jsonData[jsonIdx]
      const filter: any = {}
      if (item.toy_num) filter.toy_num = item.toy_num
      if (item.series) filter.series = item.series
      if (item.year) filter.year = item.year.toString()
      if (item.color) filter.color = item.color

      if (Object.keys(filter).length >= 2) {
        const result = await HotWheelsCarModel.updateMany(filter, { $set: { photo_url: resolvedUrl } })
        mongoUpdated += result.modifiedCount
      }
    }
    console.log(`  ✅ MongoDB: ${mongoUpdated} documents updated`)
  } else if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes saved')
  }

  // ====== Stats ======
  const totalWithPhoto = jsonData.filter(i => (i.photo_url || '').startsWith('https://')).length
  console.log('\n================================================')
  console.log('📊 RESULTS:')
  console.log(`   Castings analyzed: ${modelsToFix.length}`)
  console.log(`   Photos updated: ${updatedJson}`)
  console.log(`   Total items with photos: ${totalWithPhoto}`)
  console.log('================================================')

  await mongoose.disconnect()
  console.log('\n👋 Done.')
}

fixSharedPhotos().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
