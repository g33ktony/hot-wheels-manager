/**
 * Validate all pages in filtered-series.json
 * Tests each page for:
 * 1. Does the wiki page exist?
 * 2. Does it have tables?
 * 3. Can the scraper extract vehicles?
 * 4. Do extracted vehicles have required fields (carModel, toy_num/col_num, year)?
 * 
 * Outputs a detailed report and a cleaned list of valid pages.
 */
import axios from 'axios'
import fs from 'fs'
import path from 'path'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 400
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Batch size for API calls (MediaWiki supports up to 50 titles per query)
const BATCH_SIZE = 50

// ============================================================
// Copy parser functions from scrape-intelligent.ts
// ============================================================

interface TableData {
  headers: string[]
  rows: string[][]
  columnMap: Record<string, number>
  sectionYear: string | null
}

function cleanWikitext(text: string): string {
  return text
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/''+/g, '')
    .trim()
}

function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    if (/toy\s*[#]|toy\s*number|toy\s*no|^tool\s*#$/i.test(header)) {
      map.toy_num = i
    } else if (/^#\s*in\s*series$|series\s*#|col\.?\s*#|coll\s*#|^#$/i.test(header)) {
      map.number = i
    } else if (/casting\s*name|^casting$|^original\s*casting$|car\s*name|^name$|model|^car$|vehicle/i.test(header)) {
      map.name = i
    } else if (/year|released?|release\s*date/i.test(header)) {
      map.year = i
    } else if (/body\s*color/i.test(header)) {
      map.color = i
    } else if (/tampos?$/i.test(header)) {
      map.tampo = i
    } else if (/base\s*color|base\s*type|^base$/i.test(header)) {
      map.base = i
    } else if (/window\s*color|^window$/i.test(header)) {
      map.window = i
    } else if (/interior\s*color|^interior$/i.test(header)) {
      map.interior = i
    } else if (/wheel\s*type|^wheels?$/i.test(header)) {
      map.wheels = i
    } else if (/^color|colour$/i.test(header)) {
      if (map.color === undefined) map.color = i
    } else if (/^number$|^num$|^no\.$|^#$/i.test(header)) {
      if (map.number === undefined && map.toy_num === undefined) map.number = i
    } else if (/country/i.test(header)) {
      map.country = i
    } else if (/notes/i.test(header)) {
      map.notes = i
    } else if (/photo|image/i.test(header)) {
      map.photo = i
    }
  }
  return map
}

function processSingleTable(tableLines: string[]): TableData {
  let headers: string[] = []
  let rows: string[][] = []
  let currentRow: string[] = []
  let firstRowSeparatorSeen = false

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim()
    if (line.startsWith('|-') || line.startsWith('|}') || line.startsWith('{|')) {
      if (currentRow.length > 0) {
        if (headers.length === 0 && tableLines[i-1]?.trim().startsWith('!')) {
          headers = [...currentRow]
        } else {
          rows.push(currentRow)
        }
        currentRow = []
      }
      if (line.startsWith('|-')) firstRowSeparatorSeen = true
      continue
    }

    // Handle {{ListXXXX|val1|val2|...}} template rows
    const templateMatch = line.match(/^\{\{List\w+\|(.+)\}\}$/)
    if (templateMatch) {
      // Flush currentRow first (may contain header cells)
      if (currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = []
      }
      const content = templateMatch[1]
      const cells: string[] = []
      let depth = 0
      let current = ''
      for (let c = 0; c < content.length; c++) {
        if (content[c] === '[' && content[c+1] === '[') { depth++; current += '[['; c++; }
        else if (content[c] === ']' && content[c+1] === ']') { depth--; current += ']]'; c++; }
        else if (content[c] === '|' && depth === 0) { cells.push(cleanWikitext(current)); current = ''; }
        else { current += content[c]; }
      }
      if (current) cells.push(cleanWikitext(current))
      if (cells.length > 0) rows.push(cells)
      continue
    }

    if (line.startsWith('!')) {
      const content = line.substring(1)
      const parts = content.split('!!')
      for (let part of parts) {
        if (part.includes('|')) part = part.split('|').pop() || ''
        headers.push(cleanWikitext(part))
      }
    } else if (line.startsWith('|') && !line.startsWith('|+')) {
      const content = line.substring(1)
      const parts = content.split('||')
      for (let part of parts) {
        const stripped = part.replace(/\[\[[^\]]*\]\]/g, '___WIKILINK___')
        if (stripped.includes('|') && !stripped.startsWith('___WIKILINK___')) {
          if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(part)) {
            const pipeIdx = part.indexOf('|')
            part = part.substring(pipeIdx + 1)
          }
        }
        currentRow.push(cleanWikitext(part))
      }
    }
    // Multiline cell continuation: bare text belongs to previous cell
    else if (currentRow.length > 0 && !line.startsWith('{') && !line.startsWith('!') && line.length > 0) {
      const lastIdx = currentRow.length - 1
      const append = cleanWikitext(line)
      if (append) {
        currentRow[lastIdx] = currentRow[lastIdx] ? `${currentRow[lastIdx]} ${append}` : append
      }
    }
  }

  // If no ! headers found, check if first row has bold text (|bgcolor=...|'''Header''')
  if (headers.length === 0 && rows.length > 0) {
    const firstRow = rows[0]
    const boldCount = firstRow.filter(cell => cell && /\S/.test(cell)).length
    const rawFirstCells: string[] = []
    let collecting = false
    for (const line of tableLines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{|')) { collecting = true; continue }
      if (trimmed.startsWith('|-') || /^\{\{List/i.test(trimmed)) break
      if (collecting && (trimmed.startsWith('|') || /'''/.test(trimmed))) {
        rawFirstCells.push(trimmed)
      }
    }
    const hasBoldHeaders = rawFirstCells.some(c => /'''[^']+'''/.test(c))
    if (hasBoldHeaders && boldCount >= 3) {
      headers = rows.shift()!
    }
  }

  const columnMap = mapColumns(headers)
  return { headers, rows, columnMap, sectionYear: null }
}

function parseTables(wikitext: string): TableData[] {
  const tables: TableData[] = []
  const lines = wikitext.split('\n')
  let currentTable: string[] | null = null
  let tableStack = 0
  let lastSectionYear: string | null = null

  for (const line of lines) {
    const sectionMatch = line.match(/^={2,}\s*(.+?)\s*={2,}$/)
    if (sectionMatch) {
      const yearMatch = sectionMatch[1].match(/((?:19|20)\d{2})/)
      if (yearMatch) lastSectionYear = yearMatch[1]
    }
    if (line.trim().startsWith('{|')) {
      if (tableStack === 0) currentTable = []
      tableStack++
    }
    if (currentTable) currentTable.push(line)
    if (line.trim().endsWith('|}')) {
      tableStack--
      if (tableStack === 0 && currentTable) {
        const tableData = processSingleTable(currentTable)
        tableData.sectionYear = lastSectionYear
        tables.push(tableData)
        currentTable = null
      }
    }
  }
  return tables.filter(t => t.headers.length > 0 && t.rows.length > 0)
}

function extractVehiclesFromTable(table: TableData, pageTitle: string, series: string, year: string | null): any[] {
  const vehicles: any[] = []
  for (const row of table.rows) {
    if (row.some(cell => /^(#|number|name|year|color|casting|series)/i.test(cell)) ||
        row.every(cell => !cell.trim())) continue

    const vehicle: any = {
      carModel: cleanWikitext(row[table.columnMap.name] || ''),
      toy_num: cleanWikitext(row[table.columnMap.toy_num] || row[table.columnMap.number] || ''),
      year: cleanWikitext(row[table.columnMap.year] || '') || table.sectionYear || year || '',
      color: cleanWikitext(row[table.columnMap.color] || ''),
      series: series,
      col_num: cleanWikitext(row[table.columnMap.number] || ''),
    }
    // If no name column exists, use pageTitle as the car name (individual car pages)
    if (!vehicle.carModel && table.columnMap.name === undefined) {
      vehicle.carModel = pageTitle.replace(/\s*\(.*\)\s*$/, '').trim()
    }
    
    // Valida datos mínimos - name required, number optional
    if (vehicle.carModel) {
      vehicles.push(vehicle)
    }
  }
  return vehicles
}

// ============================================================
// Validation logic
// ============================================================

interface PageResult {
  title: string
  status: 'ok' | 'no-page' | 'no-tables' | 'no-vehicles' | 'no-year' | 'error'
  exists: boolean
  tableCount: number
  vehicleCount: number
  vehiclesWithYear: number
  vehiclesWithoutYear: number
  headers: string[][]  // headers of each table
  errors: string[]
}

/**
 * Check if pages exist using batch API (up to 50 at once)
 */
async function checkPagesExist(titles: string[]): Promise<Map<string, {exists: boolean, redirectTo?: string}>> {
  const result = new Map<string, {exists: boolean, redirectTo?: string}>()
  
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    redirects: '1',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const pages = response.data.query?.pages || []
    const redirects = response.data.query?.redirects || []
    
    // Build redirect map
    const redirectMap = new Map<string, string>()
    for (const r of redirects) {
      redirectMap.set(r.from, r.to)
    }
    
    for (const page of pages) {
      const exists = !page.missing
      result.set(page.title, { exists, redirectTo: undefined })
    }
    
    // Map original titles to results (handle redirects)
    for (const title of titles) {
      if (redirectMap.has(title)) {
        const redirectTarget = redirectMap.get(title)!
        const targetResult = result.get(redirectTarget)
        result.set(title, { 
          exists: targetResult?.exists || false, 
          redirectTo: redirectTarget 
        })
      } else if (!result.has(title)) {
        result.set(title, { exists: false })
      }
    }
  } catch (error) {
    for (const title of titles) {
      result.set(title, { exists: false })
    }
  }
  
  return result
}

/**
 * Fetch page content and try to extract vehicles
 */
async function validatePage(title: string, yearHint: string | null): Promise<PageResult> {
  const result: PageResult = {
    title,
    status: 'ok',
    exists: false,
    tableCount: 0,
    vehicleCount: 0,
    vehiclesWithYear: 0,
    vehiclesWithoutYear: 0,
    headers: [],
    errors: [],
  }

  // Extract year from page title as fallback
  if (!yearHint) {
    const titleYearMatch = title.match(/((?:19|20)\d{2})/)
    if (titleYearMatch) yearHint = titleYearMatch[1]
  }

  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'revisions',
      rvprop: 'content',
      format: 'json',
      formatversion: '2'
    })

    const response = await axios.get(`${FANDOM_API}?${params}`)
    const page = response.data.query?.pages?.[0]

    if (!page || page.missing) {
      result.status = 'no-page'
      return result
    }

    result.exists = true
    const wikitext = page.revisions?.[0]?.content || ''

    if (!wikitext.includes('{|')) {
      result.status = 'no-tables'
      return result
    }

    const tables = parseTables(wikitext)
    result.tableCount = tables.length

    if (tables.length === 0) {
      result.status = 'no-tables'
      return result
    }

    // Collect headers for debugging
    result.headers = tables.map(t => t.headers)

    // Try to extract vehicles
    let totalVehicles = 0
    let withYear = 0
    let withoutYear = 0

    for (const table of tables) {
      const vehicles = extractVehiclesFromTable(table, title, title, yearHint)
      totalVehicles += vehicles.length
      for (const v of vehicles) {
        if (v.year) withYear++
        else withoutYear++
      }
    }

    result.vehicleCount = totalVehicles
    result.vehiclesWithYear = withYear
    result.vehiclesWithoutYear = withoutYear

    if (totalVehicles === 0) {
      result.status = 'no-vehicles'
      // Check if tables have a "name" column
      for (const table of tables) {
        if (table.columnMap.name === undefined) {
          result.errors.push(`Table missing 'name' column. Headers: ${table.headers.join(', ')}`)
        }
      }
    } else if (withoutYear > 0 && withYear === 0) {
      result.status = 'no-year'
      result.errors.push(`All ${withoutYear} vehicles missing year`)
    }

  } catch (error: any) {
    result.status = 'error'
    result.errors.push(error.message)
  }

  return result
}

// ============================================================
// Main validation runner
// ============================================================
async function main() {
  console.log('🔍 Validating all pages in filtered-series.json...\n')

  const filteredPath = path.join(__dirname, '../../data/filtered-series.json')
  const data = JSON.parse(fs.readFileSync(filteredPath, 'utf-8'))

  const allPages: Array<{title: string, yearHint: string | null}> = []

  // Add mainline lists
  for (const page of data.mainlineLists || []) {
    const yearMatch = page.match(/(\d{4})/)
    allPages.push({ title: page, yearHint: yearMatch ? yearMatch[1] : null })
  }

  // Add series pages
  for (const page of data.seriesPages || []) {
    if (/^Timeline of|^List of Sets|^Wheel types/i.test(page)) continue
    allPages.push({ title: page, yearHint: null })
  }

  console.log(`📋 Total pages to validate: ${allPages.length}\n`)

  // Step 1: Batch check existence
  console.log('📡 Step 1: Checking page existence (batched)...')
  const existenceMap = new Map<string, {exists: boolean, redirectTo?: string}>()
  
  for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
    const batch = allPages.slice(i, i + BATCH_SIZE).map(p => p.title)
    const results = await checkPagesExist(batch)
    for (const [k, v] of results) existenceMap.set(k, v)
    await sleep(300)
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allPages.length)}/${allPages.length}\r`)
  }

  const existingPages = allPages.filter(p => existenceMap.get(p.title)?.exists !== false || existenceMap.get(p.title)?.redirectTo)
  const missingPages = allPages.filter(p => !existenceMap.get(p.title)?.exists && !existenceMap.get(p.title)?.redirectTo)

  console.log(`\n  ✅ Exist: ${existingPages.length}`)
  console.log(`  ❌ Missing: ${missingPages.length}\n`)

  // Step 2: Validate existing pages (fetch content + parse)
  console.log('📡 Step 2: Validating page content (this takes a while)...\n')
  
  const results: PageResult[] = []
  const stats = { ok: 0, noPage: 0, noTables: 0, noVehicles: 0, noYear: 0, error: 0 }
  let totalVehicles = 0
  let totalWithYear = 0
  let totalWithoutYear = 0

  for (let i = 0; i < existingPages.length; i++) {
    const page = existingPages[i]
    const result = await validatePage(page.title, page.yearHint)
    results.push(result)
    
    totalVehicles += result.vehicleCount
    totalWithYear += result.vehiclesWithYear
    totalWithoutYear += result.vehiclesWithoutYear

    switch(result.status) {
      case 'ok': stats.ok++; break
      case 'no-page': stats.noPage++; break
      case 'no-tables': stats.noTables++; break
      case 'no-vehicles': stats.noVehicles++; break
      case 'no-year': stats.noYear++; break
      case 'error': stats.error++; break
    }

    // Progress every 20 pages
    if ((i + 1) % 20 === 0 || i === existingPages.length - 1) {
      process.stdout.write(`  ${i + 1}/${existingPages.length} | ✅${stats.ok} 📭${stats.noTables} 🚫${stats.noVehicles} ⚠️${stats.noYear} ❌${stats.error} | ${totalVehicles} vehicles\r`)
    }

    await sleep(DELAY_MS)
  }

  // ============================================================
  // Report
  // ============================================================
  console.log('\n\n' + '='.repeat(70))
  console.log('📊 VALIDATION REPORT')
  console.log('='.repeat(70))
  
  console.log(`\n📋 Page Status:`)
  console.log(`  ✅ OK (has vehicles):    ${stats.ok}`)
  console.log(`  📭 No tables:            ${stats.noTables}`)
  console.log(`  🚫 Tables but 0 vehicles: ${stats.noVehicles}`)
  console.log(`  ⚠️  All vehicles no year:  ${stats.noYear}`)
  console.log(`  ❌ Missing pages:         ${missingPages.length}`)
  console.log(`  💥 Errors:               ${stats.error}`)
  
  console.log(`\n🚗 Vehicle Stats:`)
  console.log(`  Total extractable: ${totalVehicles}`)
  console.log(`  With year:         ${totalWithYear}`)
  console.log(`  Without year:      ${totalWithoutYear}`)
  
  // Pages with no tables
  const noTablePages = results.filter(r => r.status === 'no-tables')
  if (noTablePages.length > 0) {
    console.log(`\n📭 PAGES WITHOUT TABLES (${noTablePages.length}):`)
    for (const p of noTablePages.slice(0, 50)) {
      console.log(`  - ${p.title}`)
    }
    if (noTablePages.length > 50) console.log(`  ... and ${noTablePages.length - 50} more`)
  }

  // Pages with tables but 0 vehicles
  const noVehiclePages = results.filter(r => r.status === 'no-vehicles')
  if (noVehiclePages.length > 0) {
    console.log(`\n🚫 TABLES BUT NO VEHICLES (${noVehiclePages.length}):`)
    for (const p of noVehiclePages.slice(0, 30)) {
      const headerSummary = p.headers.map(h => h.join(', ')).join(' | ')
      console.log(`  - ${p.title}`)
      if (p.errors.length) console.log(`    Errors: ${p.errors.join('; ')}`)
      console.log(`    Headers: ${headerSummary.substring(0, 120)}`)
    }
    if (noVehiclePages.length > 30) console.log(`  ... and ${noVehiclePages.length - 30} more`)
  }

  // Pages with year issues
  const noYearPages = results.filter(r => r.status === 'no-year')
  if (noYearPages.length > 0) {
    console.log(`\n⚠️  ALL VEHICLES MISSING YEAR (${noYearPages.length}):`)
    for (const p of noYearPages) {
      console.log(`  - ${p.title} (${p.vehicleCount} vehicles)`)
    }
  }

  // Missing pages
  if (missingPages.length > 0) {
    console.log(`\n❌ MISSING PAGES (${missingPages.length}):`)
    for (const p of missingPages.slice(0, 50)) {
      console.log(`  - ${p.title}`)
    }
    if (missingPages.length > 50) console.log(`  ... and ${missingPages.length - 50} more`)
  }

  // Top pages by vehicle count
  const topPages = results
    .filter(r => r.vehicleCount > 0)
    .sort((a, b) => b.vehicleCount - a.vehicleCount)
    .slice(0, 20)
  
  console.log(`\n🏆 TOP 20 PAGES BY VEHICLE COUNT:`)
  for (const p of topPages) {
    const yearStatus = p.vehiclesWithoutYear > 0 ? ` ⚠️${p.vehiclesWithoutYear} no year` : ''
    console.log(`  ${p.vehicleCount.toString().padStart(4)} - ${p.title}${yearStatus}`)
  }

  // ============================================================
  // Save cleaned list (only pages that have extractable vehicles)
  // ============================================================
  const validMainline = results
    .filter(r => r.status === 'ok' && r.title.startsWith('List of'))
    .map(r => r.title)
  const validSeries = results
    .filter(r => r.status === 'ok' && !r.title.startsWith('List of'))
    .map(r => r.title)
  // Also include no-year pages (we can fix that)
  const noYearSeries = results
    .filter(r => r.status === 'no-year')
    .map(r => r.title)

  const cleanedOutput = {
    totalValid: validMainline.length + validSeries.length + noYearSeries.length,
    validMainline: validMainline.sort(),
    validSeries: validSeries.sort(),
    needsYearFix: noYearSeries.sort(),
    removedNoTables: noTablePages.map(p => p.title).sort(),
    removedNoVehicles: noVehiclePages.map(p => p.title).sort(),
    removedMissing: missingPages.map(p => p.title).sort(),
    stats: {
      ...stats,
      missingPages: missingPages.length,
      totalVehicles,
      totalWithYear,
      totalWithoutYear,
    },
    validatedAt: new Date().toISOString(),
  }

  const outputPath = path.join(__dirname, '../../data/validated-series.json')
  fs.writeFileSync(outputPath, JSON.stringify(cleanedOutput, null, 2))
  
  console.log(`\n💾 Validated list saved to data/validated-series.json`)
  console.log(`   Valid pages: ${cleanedOutput.totalValid} (${validMainline.length} mainline + ${validSeries.length} series + ${noYearSeries.length} needs year fix)`)
  console.log(`   Removed: ${noTablePages.length + noVehiclePages.length + missingPages.length} pages`)
  console.log(`   Expected vehicles: ~${totalVehicles}`)
}

main().catch(console.error)
