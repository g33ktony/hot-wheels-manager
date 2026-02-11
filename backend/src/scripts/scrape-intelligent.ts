/**
 * Intelligent Fandom Scraper para Hot Wheels
 * Detecta dinámicamente la estructura de columnas de cada tabla
 * Scrapes: RLC, Elite 64, Mainline de TODOS los años
 */
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { mergeCarsIntoJSON } from '../services/hotWheelsCacheService'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 800 // Rate limiting (aumentado para ser más cauteloso)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Patrones de búsqueda para identificar columnas
const COLUMN_PATTERNS = {
  number: /^(#|\d{1,5}|Toy #|Number)$/i,
  name: /(name|model|car|vehicle|casting)$/i,
  year: /(year|released|release date)$/i,
  color: /(color|colour)$/i,
  series: /(series|line|collection|set)$/i,
}

interface TableData {
  headers: string[]
  rows: string[][]
  columnMap: Record<string, number>
  sectionYear: string | null  // Año extraído del encabezado de sección
}

type ScrapeTask = {
  category: string
  year: string | null
}

/**
 * Obtiene tabla Wikitext y la parsea de forma robusta
 */
function parseTables(wikitext: string): TableData[] {
  const tables: TableData[] = []
  
  // Dividir el wikitext en tablas, rastreando encabezados de sección para extraer el año
  const lines = wikitext.split('\n')
  let currentTable: string[] | null = null
  let tableStack = 0
  let lastSectionYear: string | null = null

  for (const line of lines) {
    // Detectar encabezados de sección == ... == para extraer el año
    const sectionMatch = line.match(/^={2,}\s*(.+?)\s*={2,}$/)
    if (sectionMatch) {
      const sectionText = sectionMatch[1]
      // Buscar años como "2017", "2024" en el texto del encabezado
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

/**
 * Procesa una única tabla wikitext
 */
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

    // Handle {{ListXXXX|val1|val2|...}} template rows (used in some mainline pages)
    const templateMatch = line.match(/^\{\{List\w+\|(.+)\}\}$/)
    if (templateMatch) {
      // Flush currentRow first (may contain header cells)
      if (currentRow.length > 0) {
        if (headers.length === 0) {
          // These are likely bold-cell headers before template data
          rows.push(currentRow)
        } else {
          rows.push(currentRow)
        }
        currentRow = []
      }
      // Parse template parameters (protect wiki links from pipe splitting)
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

    // Headers
    if (line.startsWith('!')) {
      const content = line.substring(1)
      const parts = content.split('!!')
      for (let part of parts) {
        // Limpiar atributos style="...", etc.
        if (part.includes('|')) part = part.split('|').pop() || ''
        headers.push(cleanWikitext(part))
      }
    } 
    // Data cells
    else if (line.startsWith('|') && !line.startsWith('|+')) {
      const content = line.substring(1)
      const parts = content.split('||')
      for (let part of parts) {
        // Limpiar atributos style="..." pero NO romper wiki links con pipes
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
    // Multiline cell continuation: bare text that belongs to previous cell
    // (e.g. |bgcolor="yellow"|\n'''Toy #''' — the '''Toy #''' is on its own line)
    else if (currentRow.length > 0 && !line.startsWith('{') && !line.startsWith('!') && line.length > 0) {
      // Append to the last cell in currentRow
      const lastIdx = currentRow.length - 1
      const append = cleanWikitext(line)
      if (append) {
        currentRow[lastIdx] = currentRow[lastIdx] ? `${currentRow[lastIdx]} ${append}` : append
      }
    }
  }

  // If no ! headers were found, check if first row cells contain '''bold text''' (used as headers in some pages)
  if (headers.length === 0 && rows.length > 0) {
    const firstRow = rows[0]
    const boldCount = firstRow.filter(cell => cell && /\S/.test(cell)).length
    // Check original lines for bold markers before cleanWikitext stripped them
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

function cleanWikitext(text: string): string {
  return text
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '') // Eliminar imágenes/archivos [[File:...|...]]
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // Enlaces [[Link|Display]] -> Display
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Enlaces simples [[Link]] -> Link
    .replace(/\{\{[^}]*\}\}/g, '') // Eliminar plantillas {{...}}
    .replace(/<[^>]+>/g, '') // Eliminar HTML
    .replace(/''+/g, '') // Eliminar negritas/cursivas ''
    .trim()
}

/**
 * Mapea los headers a posiciones de datos
 */
function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    
    // Detecta qué tipo de columna es - ORDEN IMPORTA: más específico primero
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
      // Generic "color" only if body color wasn't found
      if (map.color === undefined) map.color = i
    } else if (/^number$|^num$|^no\.$|^#$/i.test(header)) {
      // Generic number fallback
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

/**
 * Extrae vehículos de una tabla
 */
function extractVehiclesFromTable(
  table: TableData,
  pageTitle: string,
  series: string,
  year: string | null
): any[] {
  const vehicles: any[] = []
  
  for (const row of table.rows) {
    // Salta filas de encabezado secundarios o filas vacías
    if (row.some(cell => /^(#|number|name|year|color|casting|series)/i.test(cell)) || 
        row.every(cell => !cell.trim())) {
      continue
    }
    
    // Extrae datos usando el mapeo de columnas
    const vehicle: any = {
      carModel: cleanWikitext(row[table.columnMap.name] || ''),
      toy_num: cleanWikitext(row[table.columnMap.toy_num] || row[table.columnMap.number] || ''),
      year: cleanWikitext(row[table.columnMap.year] || '') || table.sectionYear || year || '',
      color: cleanWikitext(row[table.columnMap.color] || ''),
      series: series,
      col_num: cleanWikitext(row[table.columnMap.number] || ''),
      series_num: cleanWikitext(row[table.columnMap.number] || ''),
      tampo: cleanWikitext(row[table.columnMap.tampo] || ''),
      wheel_type: cleanWikitext(row[table.columnMap.wheels] || ''),
      base_color: cleanWikitext(row[table.columnMap.base] || ''),
      window_color: cleanWikitext(row[table.columnMap.window] || ''),
      interior_color: cleanWikitext(row[table.columnMap.interior] || ''),
      country: cleanWikitext(row[table.columnMap.country] || ''),
      notes: cleanWikitext(row[table.columnMap.notes] || ''),
      photo_url: extractPhotoUrl(row[table.columnMap.photo] || '')
    }
    
    // If no name column exists, use pageTitle as the car name (individual car pages)
    if (!vehicle.carModel && table.columnMap.name === undefined) {
      vehicle.carModel = pageTitle.replace(/\s*\(.*\)\s*$/, '').trim()
    }
    
    // Valida que tenga datos mínimos - name required, number optional
    if (vehicle.carModel) {
      vehicles.push(vehicle)
    }
  }
  
  return vehicles
}

/**
 * Extrae nombre de archivo de imagen de la celda wiki.
 * Guarda como "wiki-file:FILENAME" para resolución posterior via API.
 */
function extractPhotoUrl(photoCell: string): string | undefined {
  if (!photoCell) return undefined
  
  // Busca patrones de imagen en wikitext
  const imageMatch = photoCell.match(/\[\[File:([^\]|]+)(\|[^\]]+)?\]\]/) || 
                    photoCell.match(/\[\[Image:([^\]|]+)(\|[^\]]+)?\]\]/)
  
  if (imageMatch) {
    const imageName = imageMatch[1].trim().replace(/ /g, '_')
    // Almacenar referencia para resolución posterior con backfill-images.ts
    return `wiki-file:${imageName}`
  }
  
  return undefined
}

/**
 * Scrape una página de serie completa que contiene múltiples tablas con vehículos
 */
async function scrapePage(pageTitle: string, category: string, year: string | null = null): Promise<any[]> {
  const params = new URLSearchParams({
    action: 'query',
    titles: pageTitle,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2'
  })

  // Extract year from page title as fallback (e.g. "2024 Car Culture", "List of 1989 Hot Wheels")
  if (!year) {
    const titleYearMatch = pageTitle.match(/((?:19|20)\d{2})/)
    if (titleYearMatch) year = titleYearMatch[1]
  }

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const page = response.data.query?.pages?.[0]
    
    if (!page || !page.revisions || !page.revisions[0].content) return []
    
    const wikitext = page.revisions[0].content
    let vehicles: any[] = []
    
    // Parse all tables from the series page
    if (wikitext.includes('{|')) {
      const tables = parseTables(wikitext)
      for (const table of tables) {
        const tableVehicles = extractVehiclesFromTable(table, pageTitle, category, year)
        vehicles.push(...tableVehicles)
      }
    }
    
    return vehicles
  } catch (error) {
    console.error(`Error scraping ${pageTitle}:`, error)
    return []
  }
}

/**
 * Parsea plantilla {{casting|...}}
 */
function parseCastingTemplate(wikitext: string, title: string, category: string, yearEnv: string | null): any {
  const match = wikitext.match(/\{\{casting([\s\S]*?)\}\}/)
  if (!match) return null

  const content = match[1]
  const fields: Record<string, string> = {}
  
  const lines = content.split('|')
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      fields[key.trim().toLowerCase()] = cleanWikitext(valueParts.join('=').trim())
    }
  }

  return {
    carModel: fields.name || title.split(/\s*\(RLC\)|\s*\(Elite 64\)/)[0].trim(),
    toy_num: fields.number || fields.toy || 'N/A',
    year: fields.year || yearEnv || fields.released || 'N/A',
    color: fields.color || '',
    series: fields.series || category,
    col_num: fields.number || '',
    tampo: fields.tampo || '',
    wheel_type: fields.wheels || '',
    photo_url: fields.image ? `wiki-file:${fields.image.replace(/ /g, '_')}` : undefined
  }
}

/**
 * Obtiene listado de páginas por categoría
 */
async function getCategoryPages(category: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmlimit: '500',
    cmsort: 'title',
    format: 'json'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const members = response.data.query?.categorymembers || []
    if (members.length > 0) {
      console.log(`  ✅ ${category}: ${members.length} páginas`)
    }
    return members.map((m: any) => m.title)
  } catch (error) {
    return []
  }
}

/**
 * Scraper principal inteligente
 */
async function scrapeIntelligent(saveToMongo = true) {
  // Collect all scraped vehicles for JSON export
  const allScrapedVehicles: any[] = []

  try {
    console.log('🚀 Iniciando Scraper INTELIGENTE de Fandom...\n')
    console.log('📊 Detectará dinámicamente la estructura de columnas en cada tabla\n')

    if (saveToMongo) {
      const mongoURI = process.env.MONGODB_URI!
      await mongoose.connect(mongoURI)
      console.log('✅ Conectado a MongoDB\n')
    }

    const stats = {
      total: 0,
      success: 0,
      duplicates: 0,
      errors: 0,
      categories: 0,
      pages: 0
    }

    const taskList: Array<{ category: string; year: string | null }> = []
    const seenCategories = new Set<string>()

    const pushCategory = (category: string, year: string | null = null) => {
      const normalized = category.trim()
      if (!normalized || seenCategories.has(normalized)) return
      seenCategories.add(normalized)
      taskList.push({ category: normalized, year })
    }

    // ============================================================
    // Cargar lista de series desde el archivo descubierto
    // ============================================================
    const discoveredPath = path.join(__dirname, '../../data/filtered-series.json')
    if (!fs.existsSync(discoveredPath)) {
      console.error('❌ No se encontró data/filtered-series.json')
      console.error('   Ejecuta primero: npx tsx src/scripts/discover-fast.ts')
      return
    }

    const discovered = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'))
    
    // Mainline year lists
    for (const page of discovered.mainlineLists || []) {
      const yearMatch = page.match(/(\d{4})/)
      pushCategory(page, yearMatch ? yearMatch[1] : null)
    }

    // All series pages
    for (const series of discovered.seriesPages || []) {
      // Skip pages that are clearly NOT vehicle tables
      if (/^Timeline of|^List of Sets|^Wheel types/i.test(series)) continue
      pushCategory(series, null)
    }

    console.log(`📋 Cargadas ${discovered.mainlineLists?.length || 0} mainline lists + ${discovered.seriesPages?.length || 0} series pages`)

    console.log(`${'='.repeat(70)}`)
    console.log(`PROCESANDO ${taskList.length} PÁGINAS DE SERIES`)
    console.log(`${'='.repeat(70)}\n`)

    for (const item of taskList) {
      if (stats.categories % 20 === 0) {
        console.log(`... Revisando lote de páginas (${stats.categories}/${taskList.length})`)
      }
      
      // Scrape directamente la página de la serie
      console.log(`  📄 Scrapeando página: ${item.category}`)
      stats.categories++
      
      const vehicles = await scrapePage(item.category, item.category, item.year)
      await sleep(600)

      let pageAdded = 0
      for (const vehicle of vehicles) {
        allScrapedVehicles.push(vehicle)
        if (saveToMongo) {
          try {
            await HotWheelsCarModel.create(vehicle)
            stats.success++
            stats.total++
            pageAdded++
          } catch (error: any) {
            if (error.code === 11000) {
              stats.duplicates++
            } else {
              stats.errors++
              console.log(`    ❌ Error guardando vehículo: ${error.message}`)
              console.log(`       Datos: ${JSON.stringify(vehicle).substring(0, 200)}...`)
            }
          }
        } else {
          stats.success++
          stats.total++
          pageAdded++
        }
      }
      console.log(`    ✅ ${pageAdded} vehículos nuevos de ${item.category}`)
      stats.pages++
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎉 ¡Scraping Inteligente Completado!')
    console.log('='.repeat(70))
    console.log(`\n📊 ESTADÍSTICAS:`)
    console.log(`   ✅ Vehículos guardados: ${stats.success}`)
    console.log(`   ⏭️  Duplicados: ${stats.duplicates}`)
    console.log(`   ❌ Errores: ${stats.errors}`)
    console.log(`   📄 Total páginas procesadas: ${stats.pages}`)
    console.log(`   📂 Total series procesadas: ${stats.categories}`)

    // Save/merge all scraped vehicles into local JSON
    if (allScrapedVehicles.length > 0) {
      const newCount = mergeCarsIntoJSON(allScrapedVehicles)
      console.log(`   💾 JSON actualizado: ${newCount} entradas nuevas agregadas`)
    }

    if (saveToMongo) {
      console.log(`   📦 Total en BD: ${await HotWheelsCarModel.countDocuments()}\n`)
    }

    return allScrapedVehicles

  } catch (error) {
    console.error('❌ Error:', error)
    return allScrapedVehicles
  } finally {
    if (saveToMongo && mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
      console.log('👋 Desconectado de MongoDB')
    }
  }
}

if (require.main === module) {
  scrapeIntelligent()
}

export default scrapeIntelligent
