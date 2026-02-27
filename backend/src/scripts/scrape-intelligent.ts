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
const DELAY_MS = 200 // Rate limiting

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
  sectionName: string | null  // Nombre completo de la sección (e.g. "Mix 4")
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
  let lastSectionName: string | null = null

  for (const line of lines) {
    // Detectar encabezados de sección == ... == para extraer el año y nombre
    const sectionMatch = line.match(/^={2,}\s*(.+?)\s*={2,}$/)
    if (sectionMatch) {
      const sectionText = sectionMatch[1].trim()
      lastSectionName = sectionText
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
        tableData.sectionName = lastSectionName
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
  let rowspanTracker: Array<{ col: number; value: string; remaining: number }> = []
  
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim()
    
    if (line.startsWith('|-') || line.startsWith('|}') || line.startsWith('{|')) {
      if (currentRow.length > 0) {
        // Apply any active rowspans: insert spanned values into their columns
        if (rowspanTracker.length > 0 && headers.length > 0) {
          const expectedCols = headers.length
          // Expand currentRow to full width by inserting spanned cells
          const fullRow: string[] = []
          let dataIdx = 0
          for (let col = 0; col < expectedCols; col++) {
            const span = rowspanTracker.find(s => s.col === col && s.remaining > 0)
            if (span) {
              fullRow.push(span.value)
            } else {
              fullRow.push(currentRow[dataIdx] ?? '')
              dataIdx++
            }
          }
          // Decrement rowspan counters
          for (const span of rowspanTracker) {
            if (span.remaining > 0) span.remaining--
          }
          rowspanTracker = rowspanTracker.filter(s => s.remaining > 0)
          
          if (headers.length === 0 && tableLines[i-1]?.trim().startsWith('!')) {
            headers = [...fullRow]
          } else {
            rows.push(fullRow)
          }
        } else {
          if (headers.length === 0 && tableLines[i-1]?.trim().startsWith('!')) {
            headers = [...currentRow]
          } else {
            rows.push(currentRow)
          }
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
        // Extract rowspan before cleaning 
        const rowspanMatch = part.match(/rowspan\s*=\s*"?(\d+)"?/i)
        const rowspan = rowspanMatch ? parseInt(rowspanMatch[1]) : 1
        
        // Limpiar atributos style="..." pero NO romper wiki links con pipes
        const stripped = part.replace(/\[\[[^\]]*\]\]/g, '___WIKILINK___')
        if (stripped.includes('|') && !stripped.startsWith('___WIKILINK___')) {
          const pipeIdx = part.indexOf('|')
          if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(part)) {
            part = part.substring(pipeIdx + 1)
          }
        }
        const cellValue = cleanWikitext(part)
        
        // Calculate real column index accounting for active rowspans
        let realCol = currentRow.length
        if (headers.length > 0) {
          // Count how many spanned columns precede this cell
          let dataIdx = currentRow.length
          realCol = 0
          let counted = 0
          while (counted < dataIdx && realCol < headers.length) {
            const span = rowspanTracker.find(s => s.col === realCol && s.remaining > 0)
            if (span) {
              realCol++
            } else {
              counted++
              if (counted < dataIdx) realCol++
            }
          }
          // Skip over any remaining spanned columns
          while (rowspanTracker.find(s => s.col === realCol && s.remaining > 0)) {
            realCol++
          }
        }
        
        currentRow.push(cellValue)
        
        // Track rowspan for this column
        if (rowspan > 1) {
          rowspanTracker.push({ col: realCol, value: cellValue, remaining: rowspan - 1 })
        }
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
  return { headers, rows, columnMap, sectionYear: null, sectionName: null }
}

function cleanWikitext(text: string): string {
  return text
    .replace(/\[\[(?:File|Image):([^\]|]+)(?:\|[^\]]+)?\]\]/gi, (_m, name: string) => 
      'wiki-file:' + name.trim().replace(/ /g, '_') // Preservar nombres de archivo como marcador (espacios→underscores)
    )
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // Enlaces [[Link|Display]] -> Display
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Enlaces simples [[Link]] -> Link
    .replace(/\{\{[^}]*\}\}/g, '') // Eliminar plantillas {{...}}
    .replace(/<[^>]+>/g, '') // Eliminar HTML
    .replace(/''+/g, '') // Eliminar negritas/cursivas ''
    .trim()
}

/**
 * Extrae múltiples URLs de imágenes (principal y carded) del wikitext
 */
function extractImages(wikitext: string): { main?: string, carded?: string } {
  const images: { main?: string, carded?: string } = {}

  // Buscar sección ==Images== o ==Gallery==
  const imagesSection = wikitext.match(/==(Images|Gallery)==([^]*?)(?===|$)/i)
  if (!imagesSection) return images

  const imageSectionText = imagesSection[2]

  // Método 1: Buscar en tabla de imágenes [[File:xxx.jpg|description]]
  const fileMatches = imageSectionText.match(/\[\[(File|Image):([^\]|]+)[^\]]*\|?([^\]]*)\]\]/gi)
  
  if (fileMatches && fileMatches.length > 0) {
    // Primera imagen = main
    let mainMatch = fileMatches[0].match(/(?:File|Image):([^\]|]+)/i)
    if (mainMatch) {
      const fileName = mainMatch[1].trim().replace(/ /g, '_')
      images.main = `wiki-file:${fileName}`
    }

    // Buscar segunda imagen con palabras clave "carded", "card", "boxed", "box", "original"
    for (let i = 1; i < fileMatches.length; i++) {
      const match = fileMatches[i].match(/(?:File|Image):([^\]|]+)[^\]]*\|?([^\]]*)\]\]/i)
      if (match) {
        const fileName = match[1].trim().replace(/ /g, '_')
        const description = (match[2] || '').toLowerCase()
        
        // Buscar keywords que indiquen que es la versión "carded"
        if (description.includes('carded') || description.includes('card') || 
            description.includes('boxed') || description.includes('box') || 
            description.includes('original') || description.includes('package') ||
            fileName.toLowerCase().includes('carded') || fileName.toLowerCase().includes('boxed')) {
          images.carded = `wiki-file:${fileName}`
          break
        }
      }
    }

    // Si no encontró carded por descripción, usar la segunda imagen disponible
    if (!images.carded && fileMatches.length > 1) {
      let secondMatch = fileMatches[1].match(/(?:File|Image):([^\]|]+)/i)
      if (secondMatch) {
        const fileName = secondMatch[1].trim().replace(/ /g, '_')
        images.carded = `wiki-file:${fileName}`
      }
    }
  }

  // Método 2: Si no encuentra en tabla, buscar en galería <gallery>...</gallery>
  if (!images.carded && !images.main) {
    const galleryMatch = imageSectionText.match(/<gallery[^>]*>([^]*?)<\/gallery>/i)
    if (galleryMatch) {
      const galleryContent = galleryMatch[1]
      const galleryFiles = galleryContent.match(/(?:File|Image):([^\n|]+)/gi)
      if (galleryFiles) {
        // First file in gallery is main
        if (galleryFiles.length > 0) {
          const mainFile = galleryFiles[0].match(/(?:File|Image):([^\n|]+)/i)
          if (mainFile) {
            const fileName = mainFile[1].trim().replace(/ /g, '_')
            images.main = `wiki-file:${fileName}`
          }
        }
        // Second file is often carded
        if (galleryFiles.length > 1) {
          const cardedFile = galleryFiles[1].match(/(?:File|Image):([^\n|]+)/i)
          if (cardedFile) {
            const fileName = cardedFile[1].trim().replace(/ /g, '_')
            images.carded = `wiki-file:${fileName}`
          }
        }
      }
    }
  }

  return images
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
    } else if (/photo\s*loose/i.test(header)) {
      map.photo = i
    } else if (/photo\s*carded/i.test(header)) {
      map.photo_carded = i
    } else if (/photo|image/i.test(header)) {
      if (map.photo === undefined) map.photo = i
    }
  }
  
  return map
}

/**
 * Strips wiki-file: markers from text fields (they should only be in photo columns)
 */
function stripFileMarkers(text: string): string {
  return text.replace(/wiki-file:\S+/gi, '').trim()
}

/**
 * Classifies a series into a granular segment.
 * Segments: mainline, premium, fast_furious, elite_64, rlc, sth, th, monster_truck, other
 * Order matters — most specific matches first.
 */
function classifySegment(series: string): string {
  if (!series) return 'mainline'
  const s = series.toLowerCase()

  // ─── SUPER TREASURE HUNT ─────────────────────────────
  if (s.includes('super treasure hunt') || s === 'sth' || /\bsth\b/.test(s)) return 'sth'

  // ─── TREASURE HUNT ───────────────────────────────────
  if (s.includes('treasure hunt') || s === 'th' || /\bth\b/.test(s)) return 'th'

  // ─── ELITE 64 ────────────────────────────────────────
  if (s.includes('elite 64') || s.includes('elite64')) return 'elite_64'

  // ─── RLC (Red Line Club) ─────────────────────────────
  if (s === 'rlc' || s.startsWith('rlc ') || s.endsWith(' rlc') ||
      s.includes('rlc party') || s.includes('rlc exclusive') ||
      s.includes('red line club') || s.includes('redline club') ||
      s.includes('rlc rewards') || s.includes('rlc membership') ||
      /\brlc\b/.test(s)) return 'rlc'

  // ─── FAST & FURIOUS ──────────────────────────────────
  if (s.includes('fast & furious') || s.includes('fast and furious') || s.includes('fast furious')) return 'fast_furious'

  // ─── PREMIUM lines ───────────────────────────────────
  const premiumPatterns = [
    'car culture', 'boulevard', 'pop culture', 'team transport',
    'speed machines', '100% hot wheels',
    'hot wheels classics', 'cool classics', 'hot wheels garage',
    'convention', 'dragstrip demons', 'real riders',
    'since \'68', 'since 68', 'g-machines', 'auto affinity',
    'oil can', 'neo-classics', 'hall of fame', 'larry\'s garage',
    'hot wheels heritage', 'modern classics', 'japan historics',
    'vintage racing', 'cargo carriers',
    'slide street', 'car culture 2-pack', 'culture 2-pack',
    'hot wheels id', 'hot wheels premium',
    'flying customs', 'premium box set', 'premium set',
    'cruise boulevard', 'retro entertainment',
    'replica entertainment',
    'hot wheels garage (2010', 'hot wheels garage (2011',
    'holiday hot rods',
  ]
  for (const p of premiumPatterns) {
    if (s.includes(p)) return 'premium'
  }
  if (/^\d{4}\s+car culture/i.test(s)) return 'premium'
  if (/car\s*culture\s*\d{4}/i.test(s)) return 'premium'

  // ─── MONSTER TRUCKS ──────────────────────────────────
  if (s.includes('monster truck') || s.includes('monster jam')) return 'monster_truck'

  // ─── OTHER (non-standard 1:64 products) ──────────────
  const otherPatterns = [
    'racerverse', 'skate', 'character car', 'starship',
    'star wars', 'marvel', 'dc character',
    'disney character', 'mario kart', 'color shifter',
    'color changer', 'color reveal', 'color fx',
    'pull-back', 'pull back', 'action pack',
    'acceleracers', 'battle force', 'world race',
    '1:18 scale', '1:43 scale', '1:50 scale',
    'micro hot wheels', 'charawheels', 'crashers',
    'prototype poster', 'super rigs', 'racing rig',
    'haulers', 'highway hauler', 'hiway hauler',
    'attack pack', 'power command', 'motorized',
    'sto & go', 'track set', 'track builder',
    'battle rollers', 'moto', 'batman 1:50',
  ]
  for (const p of otherPatterns) {
    if (s.includes(p)) return 'other'
  }

  // ─── MAINLINE ────────────────────────────────────────
  if (/^list of \d{4} hot wheels/i.test(s)) return 'mainline'
  if (/^\d{4} hot wheels$/i.test(s)) return 'mainline'
  if (/^\d{4} (first edition|new model|open stock)/i.test(s)) return 'mainline'
  if (/first edition/i.test(s)) return 'mainline'
  if (/new model/i.test(s)) return 'mainline'
  if (/^hw\s/i.test(s)) return 'mainline'

  const mainlinePatterns = [
    'muscle mania', 'then and now', 'nightburnerz', 'night burnerz',
    'street beast', 'x-raycers', 'experimotors', 'tooned',
    'track stars', 'track aces', 'heat fleet', 'all stars',
    'factory fresh', 'super chromes', 'faster than ever',
    'baja blazer', 'rod squad', 'dino rider', 'fast foodie',
    'fright cars', 'checkmate', 'holiday racer', 'mystery cars',
    'digital circuit', 'crew choice', 'speed blur',
    'workshop', 'city works', 'race world',
    'red edition', 'green edition', 'blue edition',
    'kmart', 'walmart', 'target exclusive',
    'mainline', 'basic',
  ]
  for (const p of mainlinePatterns) {
    if (s.includes(p)) return 'mainline'
  }

  if (/^\d{4}\s/.test(s) && !s.includes('car culture') && !s.includes('pop culture')) return 'mainline'

  return 'mainline'
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
      carModel: stripFileMarkers(row[table.columnMap.name] || ''),
      toy_num: stripFileMarkers(row[table.columnMap.toy_num] || row[table.columnMap.number] || ''),
      year: stripFileMarkers(row[table.columnMap.year] || '') || table.sectionYear || year || '',
      color: stripFileMarkers(row[table.columnMap.color] || ''),
      series: series,
      sub_series: table.sectionName || '',
      col_num: stripFileMarkers(row[table.columnMap.number] || ''),
      series_num: stripFileMarkers(row[table.columnMap.number] || ''),
      tampo: stripFileMarkers(row[table.columnMap.tampo] || ''),
      wheel_type: stripFileMarkers(row[table.columnMap.wheels] || ''),
      base_color: stripFileMarkers(row[table.columnMap.base] || ''),
      window_color: stripFileMarkers(row[table.columnMap.window] || ''),
      interior_color: stripFileMarkers(row[table.columnMap.interior] || ''),
      country: stripFileMarkers(row[table.columnMap.country] || ''),
      notes: stripFileMarkers(row[table.columnMap.notes] || ''),
      photo_url: extractPhotoUrl(row[table.columnMap.photo] || ''),
      photo_url_carded: table.columnMap.photo_carded !== undefined 
        ? extractPhotoUrl(row[table.columnMap.photo_carded] || '') 
        : undefined,
      segment: classifySegment(series),
    }
    
    // If no name column exists, use pageTitle as the car name (individual car pages)
    if (!vehicle.carModel && table.columnMap.name === undefined) {
      vehicle.carModel = pageTitle.replace(/\s*\(.*\)\s*$/, '').trim()
    }
    
    // Validate & normalize year: must be a 4-digit year (1968-2030)
    if (vehicle.year) {
      const yearMatch = String(vehicle.year).match(/((?:19|20)\d{2})/)
      if (yearMatch) {
        vehicle.year = yearMatch[1]
      } else {
        vehicle.year = year || '' // fallback to page-level year
      }
    }
    
    // Validate toy_num: should look like a part number, not random text
    if (vehicle.toy_num && !/^[A-Z0-9][-A-Z0-9\/]{1,20}$/i.test(vehicle.toy_num)) {
      // Keep it only if it has digits (likely a real part number)
      if (!/\d/.test(vehicle.toy_num)) {
        vehicle.toy_num = ''
      }
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
  
  // Check for wiki-file: marker left by cleanWikitext
  const markerMatch = photoCell.match(/wiki-file:([^\s]+)/i)
  if (markerMatch) {
    const imageName = markerMatch[1].trim().replace(/ /g, '_')
    return `wiki-file:${imageName}`
  }
  
  // Fallback: busca patrones de imagen en wikitext raw
  const imageMatch = photoCell.match(/\[\[File:([^\]|]+)(\|[^\]]+)?\]\]/) || 
                    photoCell.match(/\[\[Image:([^\]|]+)(\|[^\]]+)?\]\]/)
  
  if (imageMatch) {
    const imageName = imageMatch[1].trim().replace(/ /g, '_')
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
 * Batch scrape: fetch up to 50 pages at once using MediaWiki multi-title query
 */
async function scrapePagesBatch(tasks: Array<{ category: string; year: string | null }>): Promise<Map<string, any[]>> {
  const results = new Map<string, any[]>()
  const titles = tasks.map(t => t.category).join('|')
  
  const params = new URLSearchParams({
    action: 'query',
    titles,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const pages = response.data.query?.pages || []
    
    for (const page of pages) {
      if (!page || page.missing || !page.revisions || !page.revisions[0]?.content) {
        results.set(page.title, [])
        continue
      }
      
      const wikitext = page.revisions[0].content
      const task = tasks.find(t => t.category === page.title)
      let year = task?.year || null
      
      if (!year) {
        const titleYearMatch = page.title.match(/((?:19|20)\d{2})/)
        if (titleYearMatch) year = titleYearMatch[1]
      }
      
      let vehicles: any[] = []
      if (wikitext.includes('{|')) {
        const tables = parseTables(wikitext)
        for (const table of tables) {
          const tableVehicles = extractVehiclesFromTable(table, page.title, page.title, year)
          vehicles.push(...tableVehicles)
        }
      }
      
      results.set(page.title, vehicles)
    }
  } catch (error) {
    console.error(`Error batch scraping:`, error)
    // Fallback: return empty for all
    for (const task of tasks) {
      if (!results.has(task.category)) results.set(task.category, [])
    }
  }
  
  return results
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
async function scrapeIntelligent(saveToMongo = true, onProgress?: (progress: { 
  step: string, 
  percent: number, 
  current: number, 
  total: number,
  message: string 
}) => void) {
  // Collect all scraped vehicles for JSON export
  const allScrapedVehicles: any[] = []

  try {
    console.log('🚀 Iniciando Scraper INTELIGENTE de Fandom...\n')
    
    if (onProgress) {
      onProgress({ 
        step: 'initializing', 
        percent: 0, 
        current: 0, 
        total: 100, 
        message: 'Inicializando scraper...' 
      })
    }

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
    // Resume support: skip already-processed pages
    // ============================================================
    const progressPath = path.join(__dirname, '../../data/scrape-progress.json')
    let processedPages = new Set<string>()
    if (fs.existsSync(progressPath)) {
      const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'))
      processedPages = new Set(progress.processedPages || [])
      console.log(`📌 Resumiendo: ${processedPages.size} páginas ya procesadas, se omitirán`)
    }

    const saveProgress = () => {
      fs.writeFileSync(progressPath, JSON.stringify({
        processedPages: Array.from(processedPages),
        lastSaved: new Date().toISOString()
      }))
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

    // Filter out already-processed pages
    const remainingTasks = taskList.filter(t => !processedPages.has(t.category))
    console.log(`📋 Cargadas ${discovered.mainlineLists?.length || 0} mainline lists + ${discovered.seriesPages?.length || 0} series pages`)
    console.log(`📋 Páginas restantes: ${remainingTasks.length} / ${taskList.length}`)

    console.log(`${'='.repeat(70)}`)
    console.log(`PROCESANDO ${remainingTasks.length} PÁGINAS DE SERIES (lotes de 50)`)
    console.log(`${'='.repeat(70)}\n`)

    let pendingVehicles: any[] = []
    const BATCH_SIZE = 10  // MediaWiki limits content-heavy multi-page requests

    // Process in batches of 50 pages
    for (let i = 0; i < remainingTasks.length; i += BATCH_SIZE) {
      const batch = remainingTasks.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(remainingTasks.length / BATCH_SIZE)
      console.log(`... Lote ${batchNum}/${totalBatches} (páginas ${i + 1}-${Math.min(i + BATCH_SIZE, remainingTasks.length)} de ${remainingTasks.length})`)
      
      if (onProgress) {
        onProgress({
          step: 'scraping',
          percent: Math.min(90, Math.round(((i + BATCH_SIZE) / remainingTasks.length) * 100 * 0.7)), // Scraping is 70% of total
          current: i + batch.length,
          total: remainingTasks.length,
          message: `Escaneando páginas de Fandom (${i + 1}/${remainingTasks.length})...`
        })
      }

      const batchResults = await scrapePagesBatch(batch)
      await sleep(200) // Brief pause between batches

      for (const item of batch) {
        const vehicles = batchResults.get(item.category) || []
        stats.categories++

        let pageAdded = 0
        for (const vehicle of vehicles) {
          allScrapedVehicles.push(vehicle)
          pendingVehicles.push(vehicle)
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
              }
            }
          } else {
            stats.success++
            stats.total++
            pageAdded++
          }
        }
        if (pageAdded > 0) {
          console.log(`  📄 ${item.category} → ${pageAdded} nuevos`)
        }
        stats.pages++
        processedPages.add(item.category)
      }

      // Incremental save every 5 batches (250 pages)
      if (batchNum % 5 === 0) {
        if (pendingVehicles.length > 0) {
          const batchNew = mergeCarsIntoJSON(pendingVehicles)
          console.log(`  💾 Guardado incremental: ${batchNew} nuevos en JSON (${stats.categories}/${remainingTasks.length} páginas)`)
          pendingVehicles = []
        }
        saveProgress()
      }
    }

    // Save remaining
    if (pendingVehicles.length > 0) {
      mergeCarsIntoJSON(pendingVehicles)
    }
    saveProgress()

    console.log('\n' + '='.repeat(70))
    console.log('🎉 ¡Scraping Inteligente Completado!')
    console.log('='.repeat(70))
    console.log(`\n📊 ESTADÍSTICAS:`)
    console.log(`   ✅ Vehículos guardados en Mongo: ${stats.success}`)
    console.log(`   ⏭️  Duplicados: ${stats.duplicates}`)
    console.log(`   ❌ Errores Mongo: ${stats.errors}`)
    console.log(`   📄 Total páginas procesadas: ${stats.pages}`)
    console.log(`   📂 Total series procesadas: ${stats.categories}`)
    console.log(`   🚗 Total vehículos encontrados: ${allScrapedVehicles.length}`)

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
  // Skip MongoDB during scraping — sync after via updateCatalog
  scrapeIntelligent(false)
}

export default scrapeIntelligent
