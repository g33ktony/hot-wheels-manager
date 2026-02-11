/**
 * Quick test: validates scraper fixes on Experimotors page
 * Tests: year extraction from section headers, column mapping, cleanWikitext
 */
import axios from 'axios'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'

// Import functions inline to test them independently
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
    if (/toy\s*[#]|toy\s*number|toy\s*no/i.test(header)) {
      map.toy_num = i
    } else if (/^#\s*in\s*series$|series\s*#|col\s*#|^#$/i.test(header)) {
      map.number = i
    } else if (/casting\s*name|^name$|model|^car$|vehicle/i.test(header)) {
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
          const pipeIdx = part.indexOf('|')
          if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(part)) {
            part = part.substring(pipeIdx + 1)
          }
        }
        currentRow.push(cleanWikitext(part))
      }
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
      const sectionText = sectionMatch[1]
      const yearMatch = sectionText.match(/((?:19|20)\d{2})/)
      if (yearMatch) {
        lastSectionYear = yearMatch[1]
      }
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

async function testExperimotors() {
  console.log('🧪 Testing scraper fixes on Experimotors page...\n')

  const params = new URLSearchParams({
    action: 'query',
    titles: 'Experimotors',
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2'
  })

  const response = await axios.get(`${FANDOM_API}?${params}`)
  const page = response.data.query?.pages?.[0]
  const wikitext = page.revisions[0].content

  const tables = parseTables(wikitext)
  
  console.log(`📊 Found ${tables.length} tables\n`)
  
  let totalVehicles = 0
  let yearOK = 0
  let yearMissing = 0

  for (const table of tables) {
    console.log(`--- Table: sectionYear=${table.sectionYear} ---`)
    console.log(`  Headers: ${table.headers.join(' | ')}`)
    console.log(`  Column map: ${JSON.stringify(table.columnMap)}`)
    console.log(`  Rows: ${table.rows.length}`)
    
    // Show first vehicle from each table
    if (table.rows.length > 0) {
      const row = table.rows[0]
      const vehicle = {
        carModel: cleanWikitext(row[table.columnMap.name] || ''),
        toy_num: cleanWikitext(row[table.columnMap.toy_num] || row[table.columnMap.number] || ''),
        year: cleanWikitext(row[table.columnMap.year] || '') || table.sectionYear || '',
        color: cleanWikitext(row[table.columnMap.color] || ''),
        series_num: cleanWikitext(row[table.columnMap.number] || ''),
      }
      console.log(`  First vehicle: ${JSON.stringify(vehicle)}`)
      
      // Count year hits
      for (const r of table.rows) {
        const yr = cleanWikitext(r[table.columnMap.year] || '') || table.sectionYear || ''
        if (yr) yearOK++; else yearMissing++
        totalVehicles++
      }
    }
    console.log()
  }
  
  console.log('='.repeat(50))
  console.log(`✅ Total vehicles: ${totalVehicles}`)
  console.log(`✅ With year: ${yearOK}`)
  console.log(`❌ Missing year: ${yearMissing}`)
  
  if (yearMissing === 0 && totalVehicles > 0) {
    console.log('\n🎉 ALL FIXES WORKING! Year extraction successful.')
  } else if (yearMissing > 0) {
    console.log('\n⚠️  Some vehicles still missing year.')
  }
}

testExperimotors().catch(console.error)
