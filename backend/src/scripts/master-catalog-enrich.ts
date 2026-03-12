/**
 * MASTER CATALOG ENRICHMENT SCRIPT
 * 
 * Orquestación completa del enriquecimiento de catálogo para todas las marcas
 * Responsabilidades:
 * - Cargar datos de todas las marcas
 * - Clasificar tipos de series (STH/TH/Premium/etc)
 * - Normalizar colores
 * - Validar y priorizar fotos
 * - Enriquecer con metadatos
 * - Sincronizar con MongoDB
 * - Emitir progreso en tiempo real
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import axios from 'axios'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { CatalogClassificationService } from '../services/catalogClassificationService'
import { CatalogPhotoService } from '../services/catalogPhotoService'
import type {
  EnrichedCatalogItem,
  CatalogEnrichmentProgress,
  CatalogEnrichmentStats,
  Brand,
} from '../shared/catalog-types'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const REQUEST_DELAY_MS = 120
const CASTING_PROGRESS_PATH = path.join(__dirname, '../../data/casting-enrich-progress.json')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface ProgressCallback {
  (progress: CatalogEnrichmentProgress): void
}

// ─── Casting Page Types ──────────────────────────────────────────

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

interface CastingEnrichStats {
  modelsChecked: number
  pagesFound: number
  pagesMissing: number
  rowsParsed: number
  itemsEnriched: number
  fieldsUpdated: number
  photosAdded: number
  errors: number
}

// ─── Casting Page Wikitext Parsing ───────────────────────────────

function cleanCastingWikitext(text: string): string {
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

function parseVersionsTable(wikitext: string): VersionRow[] {
  const rows: VersionRow[] = []

  const vIdx = wikitext.indexOf('==Versions==')
  if (vIdx < 0) return rows

  let tableStart = wikitext.indexOf('{|', vIdx)
  if (tableStart < 0) return rows

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

  const headers: string[] = []
  const dataRows: string[][] = []
  let currentRow: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('{|') || trimmed.startsWith('|+')) continue

    if (trimmed.startsWith('|-') || trimmed.startsWith('|}')) {
      if (currentRow.length > 0) {
        if (headers.length > 0) dataRows.push(currentRow)
        currentRow = []
      }
      continue
    }

    if (trimmed.startsWith('!')) {
      const content = trimmed.substring(1)
      const parts = content.split('!!')
      for (let part of parts) {
        if (part.includes('|')) part = part.split('|').pop() || ''
        headers.push(cleanCastingWikitext(part))
      }
      continue
    }

    if (trimmed.startsWith('|')) {
      const content = trimmed.substring(1)
      const cells = splitCellsProtected(content)
      for (let cell of cells) {
        if (/^\s*(style|class|align|width|bgcolor|rowspan|colspan)\s*=/i.test(cell)) {
          const pipeIdx = cell.indexOf('|')
          if (pipeIdx >= 0) cell = cell.substring(pipeIdx + 1)
          else continue
        }
        currentRow.push(cleanCastingWikitext(cell))
      }
    }
  }
  if (currentRow.length > 0 && headers.length > 0) dataRows.push(currentRow)

  const colMap = mapVersionHeaders(headers)
  if (colMap.toy_num === undefined) return rows

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
    if (!toyNum) continue

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

// ─── Fandom API Helpers for Casting Pages ────────────────────────

async function checkCastingPagesExist(titles: string[]): Promise<Map<string, string>> {
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

      const normMap = new Map<string, string>()
      for (const n of normalized) normMap.set(n.to, n.from)

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

    if (i + BATCH < titles.length) await sleep(REQUEST_DELAY_MS)
  }

  return existMap
}

async function fetchCastingPageContents(wikiTitles: string[]): Promise<Map<string, string>> {
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

    if (i + BATCH < wikiTitles.length) await sleep(REQUEST_DELAY_MS)
  }

  return contentMap
}

const ENRICHABLE_FIELDS = [
  'color', 'tampo', 'base_color', 'window_color', 'interior_color',
  'wheel_type', 'country', 'notes',
] as const

export class MasterCatalogEnricher {
  private progressCallbacks: ProgressCallback[] = []
  private stats: CatalogEnrichmentStats = {
    totalProcessed: 0,
    brandBreakdown: {
      'Hot Wheels': 0,
      'Mini GT': 0,
      'Pop Race': 0,
      'Kaido House': 0,
      Tomica: 0,
    },
    photosCoverage: {
      withMainPhoto: 0,
      withCardedPhoto: 0,
      withGallery: 0,
      withoutPhoto: 0,
      percentWithMainPhoto: 0,
    },
    colorNormalization: {
      totalUnique: 0,
      groupedInto: 0,
      byGroup: {
        Red: 0,
        Blue: 0,
        Green: 0,
        Yellow: 0,
        Orange: 0,
        Purple: 0,
        Pink: 0,
        Black: 0,
        White: 0,
        Silver: 0,
        Gold: 0,
        Brown: 0,
        Gray: 0,
        Chrome: 0,
        Multi: 0,
        Unknown: 0,
      },
    },
    enrichmentSuccess: {
      full: 0,
      partial: 0,
      failed: 0,
    },
    processingTime: 0,
  }

  constructor() {}

  /**
   * Registra callback para progreso (SSE, websocket, etc)
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback)
  }

  /**
   * Emite evento de progreso
   */
  private emitProgress(progress: CatalogEnrichmentProgress): void {
    console.log(`[${progress.step}] ${progress.message} (${progress.percent}%)`)
    for (const callback of this.progressCallbacks) {
      try {
        callback(progress)
      } catch (e) {
        console.error('Error in progress callback:', e)
      }
    }
  }

  /**
   * Punto de entrada principal
   */
  async enrich(): Promise<CatalogEnrichmentStats> {
    const startTime = Date.now()

    try {
      this.emitProgress({
        step: 'loading',
        message: '🔄 Iniciando enriquecimiento de catálogo maestro...',
        percent: 0,
        currentBrand: 'Hot Wheels',
        processedItems: 0,
        totalItems: 0,
      })

      // 1. Cargar datos
      const allItems = await this.loadAllBrands()
      const totalItems = allItems.length

      this.emitProgress({
        step: 'loading',
        message: `✅ Catálogos cargados: ${totalItems} items`,
        percent: 8,
        currentBrand: 'Hot Wheels',
        processedItems: totalItems,
        totalItems,
      })

      // 2. Enrich from individual Fandom casting pages (color, tampo, wheels, etc.)
      const castingStats = await this.enrichFromCastingPages(allItems)
      console.log(`📖 Casting page enrichment: ${castingStats.pagesFound} pages, ${castingStats.itemsEnriched} items enriched, ${castingStats.fieldsUpdated} fields updated`)

      // 3. Resolver wiki-file: URLs a CDN HTTPS (en lote — including any new ones from casting pages)
      this.emitProgress({
        step: 'resolving-photos',
        message: '🔗 Resolviendo URLs de imágenes wiki-file: a CDN...',
        percent: 17,
        currentBrand: 'Hot Wheels',
        processedItems: 0,
        totalItems,
      })

      const wikiResolution = await CatalogPhotoService.resolveAllWikiUrls(allItems, (resolved, total) => {
        this.emitProgress({
          step: 'resolving-photos',
          message: `🔗 Resueltas ${resolved}/${total} URLs wiki-file:`,
          percent: 17 + Math.round((resolved / Math.max(total, 1)) * 8),
          currentBrand: 'Hot Wheels',
          processedItems: resolved,
          totalItems: total,
        })
      })

      console.log(`📸 Wiki-file resolution: ${wikiResolution.resolved}/${wikiResolution.total} resolved, ${wikiResolution.failed} failed`)

      // 4. Procesar y enriquecer
      const enrichedItems = await this.enrichAllItems(allItems)

      // 5. Calcular estadísticas de fotos
      this.stats.photosCoverage = CatalogPhotoService.calculatePhotoCoverage(enrichedItems)

      // 6. Guardar JSON con URLs resueltas (para que el cache use HTTPS)
      if (wikiResolution.resolved > 0 || castingStats.fieldsUpdated > 0) {
        const dataDir = path.join(__dirname, '../../data')
        const hwPath = path.join(dataDir, 'hotwheels_database.json')
        if (fs.existsSync(hwPath)) {
          const hwItems = enrichedItems.filter(item => (item as any).brand === 'Hot Wheels' || !(item as any).brand)
          fs.writeFileSync(hwPath, JSON.stringify(hwItems, null, 2))
          console.log(`💾 JSON actualizado con ${wikiResolution.resolved} URLs resueltas y ${castingStats.fieldsUpdated} campos de casting pages`)
        }
      }

      // 7. Sincronizar con MongoDB
      await this.syncToMongo(enrichedItems)

      this.stats.processingTime = Date.now() - startTime

      this.emitProgress({
        step: 'complete',
        message: `✅ Enriquecimiento completado en ${Math.round(this.stats.processingTime / 1000)}s`,
        percent: 100,
        currentBrand: 'Hot Wheels',
        processedItems: enrichedItems.length,
        totalItems,
        stats: {
          itemsWithMainPhoto: this.stats.photosCoverage.withMainPhoto,
          itemsWithCardedPhoto: this.stats.photosCoverage.withCardedPhoto,
          itemsWithGallery: this.stats.photosCoverage.withGallery,
          itemsClassified: enrichedItems.length,
          colorsNormalized: this.stats.colorNormalization.totalUnique,
        },
      })

      return this.stats
    } catch (error) {
      this.emitProgress({
        step: 'error',
        message: `❌ Error durante enriquecimiento: ${String(error)}`,
        percent: 0,
        currentBrand: 'Hot Wheels',
        processedItems: 0,
        totalItems: 0,
        error: {
          code: 'ENRICH_ERROR',
          message: String(error),
        },
      })
      throw error
    }
  }

  /**
   * Enrich items from individual Fandom casting pages.
   * Matches by toy_num and fills missing fields (never overwrites).
   */
  private async enrichFromCastingPages(items: any[]): Promise<CastingEnrichStats> {
    const stats: CastingEnrichStats = {
      modelsChecked: 0,
      pagesFound: 0,
      pagesMissing: 0,
      rowsParsed: 0,
      itemsEnriched: 0,
      fieldsUpdated: 0,
      photosAdded: 0,
      errors: 0,
    }

    this.emitProgress({
      step: 'enriching-from-castings',
      message: '📖 Preparando enriquecimiento desde casting pages...',
      percent: 10,
      currentBrand: 'Hot Wheels',
      processedItems: 0,
      totalItems: items.length,
    })

    // Build toy_num → item index
    const toyNumIndex = new Map<string, number[]>()
    for (let i = 0; i < items.length; i++) {
      const tn = String(items[i].toy_num || '').trim()
      if (tn) {
        const arr = toyNumIndex.get(tn) || []
        arr.push(i)
        toyNumIndex.set(tn, arr)
      }
    }

    // Collect unique carModel → wiki title candidates
    const modelTitles = new Map<string, string>()
    for (const item of items) {
      const model = String(item.carModel || '').trim()
      if (!model || modelTitles.has(model)) continue
      modelTitles.set(model, model.replace(/ /g, '_'))
    }

    const allModels = Array.from(modelTitles.entries())
    console.log(`🔍 Checking ${allModels.length} unique models against Fandom casting pages...`)

    // Load resume progress
    let processedModels = new Set<string>()
    if (fs.existsSync(CASTING_PROGRESS_PATH)) {
      try {
        const progress = JSON.parse(fs.readFileSync(CASTING_PROGRESS_PATH, 'utf-8'))
        processedModels = new Set(progress.processedModels || [])
        console.log(`📌 Resuming: ${processedModels.size} models already processed`)
      } catch {}
    }

    const remaining = allModels.filter(([model]) => !processedModels.has(model))
    console.log(`📋 Models to process: ${remaining.length}`)

    if (remaining.length === 0) {
      console.log('✅ All models already processed from casting pages')
      return stats
    }

    // Batch-check page existence
    const CHECK_BATCH = 200
    const existingPages = new Map<string, string>()

    for (let i = 0; i < remaining.length; i += CHECK_BATCH) {
      const batch = remaining.slice(i, i + CHECK_BATCH)
      const titles = batch.map(([, t]) => t)
      const found = await checkCastingPagesExist(titles)
      for (const [k, v] of found) existingPages.set(k, v)

      const progress = Math.min(i + CHECK_BATCH, remaining.length)
      this.emitProgress({
        step: 'enriching-from-castings',
        message: `🔍 Verificando casting pages: ${progress}/${remaining.length} modelos...`,
        percent: 10 + Math.round((progress / remaining.length) * 3),
        currentBrand: 'Hot Wheels',
        processedItems: progress,
        totalItems: remaining.length,
      })
    }

    console.log(`✅ Found ${existingPages.size} casting pages on Fandom`)
    stats.modelsChecked = remaining.length
    stats.pagesFound = existingPages.size
    stats.pagesMissing = remaining.length - existingPages.size

    // Map carModel → wikiTitle for existing pages
    const modelToWikiTitle = new Map<string, string>()
    for (const [model, searchTitle] of remaining) {
      if (existingPages.has(searchTitle)) {
        modelToWikiTitle.set(model, existingPages.get(searchTitle)!)
      }
    }

    // Fetch and process casting pages
    const wikiTitles = Array.from(new Set(modelToWikiTitle.values()))
    console.log(`📥 Fetching ${wikiTitles.length} casting pages...`)

    const CONTENT_BATCH = 10
    let fetchedCount = 0

    for (let i = 0; i < wikiTitles.length; i += CONTENT_BATCH) {
      const batch = wikiTitles.slice(i, i + CONTENT_BATCH)
      const contentMap = await fetchCastingPageContents(batch)

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

              for (const field of ENRICHABLE_FIELDS) {
                const castingValue = row[field]
                if (!castingValue) continue

                const currentValue = String(item[field] || '').trim()
                if (currentValue) continue // Don't overwrite

                const cleanValue = castingValue.replace(/wiki-file:\S+/gi, '').trim()
                if (!cleanValue) continue

                item[field] = cleanValue
                fieldsChanged++
                stats.fieldsUpdated++
              }

              // Update series if current is generic "List of XXXX Hot Wheels"
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

              // Photo: only if current is missing or localhost
              if (row.photo_url) {
                const currentPhoto = String(item.photo_url || '').trim()
                if (!currentPhoto || currentPhoto.includes('localhost')) {
                  if (!row.photo_url.toLowerCase().includes('not_available') &&
                      !row.photo_url.toLowerCase().includes('image_not_available')) {
                    item.photo_url = row.photo_url
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

      this.emitProgress({
        step: 'enriching-from-castings',
        message: `📖 Casting pages: ${fetchedCount}/${wikiTitles.length} | ${stats.itemsEnriched} items enriched`,
        percent: 13 + Math.round((fetchedCount / wikiTitles.length) * 3),
        currentBrand: 'Hot Wheels',
        processedItems: fetchedCount,
        totalItems: wikiTitles.length,
      })

      // Save progress periodically
      if (fetchedCount % 100 === 0) {
        fs.writeFileSync(CASTING_PROGRESS_PATH, JSON.stringify({
          processedModels: Array.from(processedModels),
          lastSaved: new Date().toISOString(),
        }))
      }
    }

    // Save final progress
    fs.writeFileSync(CASTING_PROGRESS_PATH, JSON.stringify({
      processedModels: Array.from(processedModels),
      lastSaved: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }))

    console.log(`📖 Casting enrichment: ${stats.itemsEnriched} items, ${stats.fieldsUpdated} fields, ${stats.photosAdded} photos`)

    return stats
  }

  /**
   * Carga todos los catálogos
   */
  private async loadAllBrands(): Promise<any[]> {
    const dataDir = path.join(__dirname, '../../data')
    const brands: Brand[] = ['Hot Wheels', 'Mini GT', 'Pop Race', 'Kaido House', 'Tomica']
    let allItems: any[] = []

    for (const brand of brands) {
      try {
        // Hot Wheels usa hotwheels_database.json
        const fileName =
          brand === 'Hot Wheels'
            ? 'hotwheels_database.json'
            : `${brand.toLowerCase().replace(' ', '-')}_database.json`

        const filePath = path.join(dataDir, fileName)

        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          const items = Array.isArray(data) ? data : data.items || []

          console.log(`📥 Cargados ${items.length} items de ${brand}`)
          this.stats.brandBreakdown[brand] = items.length

          allItems = allItems.concat(items)
        } else {
          console.log(`⚠️  No encontrado: ${fileName}`)
        }
      } catch (e) {
        console.error(`Error cargando ${brand}:`, e)
      }
    }

    return allItems
  }

  /**
   * Enriquece todos los items
   */
  private async enrichAllItems(items: any[]): Promise<EnrichedCatalogItem[]> {
    this.emitProgress({
      step: 'classifying',
      message: '🔍 Clasificando tipos de series...',
      percent: 25,
      currentBrand: 'Hot Wheels',
      processedItems: 0,
      totalItems: items.length,
    })

    const enrichedItems: EnrichedCatalogItem[] = []
    const colorsSeen = new Set<string>()

    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i]
        const brand = CatalogClassificationService.detectBrand(item)

        // Clasificar tipo de serie (para Hot Wheels)
        let hwSeriesType = undefined
        if (brand === 'Hot Wheels') {
          hwSeriesType = CatalogClassificationService.classifyHotWheelsSeriesType(item)
        }

        // Normalizar color
        const colorNormalized = CatalogClassificationService.normalizeColor(item.color)
        if (item.color) {
          colorsSeen.add(item.color)
          this.stats.colorNormalization.byGroup[colorNormalized.group]++
        }

        // Priorizar foto
        const photoResult = CatalogPhotoService.prioritizePhoto(
          item,
          (mainItem, cardedName) =>
            CatalogClassificationService.validateCardedMatchesMain(mainItem, cardedName)
        )

        // Crear item enriquecido
        const enriched: EnrichedCatalogItem = {
          ...item,
          brand,
          hwSeriesType,
          colorGroup: colorNormalized.group,
          colorVariant: colorNormalized.variant,
          colorHex: colorNormalized.hex,
          seriesPosition: CatalogClassificationService.extractSeriesPosition(item),
          yearPosition: CatalogClassificationService.extractYearPosition(item),
          photoValidation: {
            hasMainPhoto: CatalogPhotoService['isValidPhotoUrl'](item.photo_url),
            hasCardedPhoto: CatalogPhotoService['isValidPhotoUrl'](item.photo_url_carded),
            hasGallery:
              Array.isArray(item.photo_gallery) &&
              item.photo_gallery.some((url: any) =>
                CatalogPhotoService['isValidPhotoUrl'](url)
              ),
            usedPhotoSource: photoResult.source,
            cardedValidated: photoResult.cardedValidated,
          },
          enrichmentMetadata: {
            processedAt: new Date().toISOString(),
            version: '1.0.0',
            dataQuality:
              photoResult.source === 'main'
                ? 'high'
                : photoResult.source === 'carded'
                  ? 'high'
                  : photoResult.source === 'gallery'
                    ? 'medium'
                    : 'low',
          },
        }

        enrichedItems.push(enriched)

        // Actualizar progreso cada 100 items
        if ((i + 1) % 100 === 0) {
          this.emitProgress({
            step: 'enriching',
            message: `📊 Procesados ${i + 1}/${items.length} items...`,
            percent: 25 + Math.round((i / items.length) * 50),
            currentBrand: brand,
            processedItems: i + 1,
            totalItems: items.length,
          })
        }

        this.stats.totalProcessed++
        if (photoResult.source !== 'none') {
          this.stats.enrichmentSuccess.full++
        } else {
          this.stats.enrichmentSuccess.failed++
        }
      } catch (e) {
        console.error(`Error enriqueciendo item ${i}:`, e)
        this.stats.enrichmentSuccess.failed++
      }
    }

    this.stats.colorNormalization.totalUnique = colorsSeen.size
    this.stats.colorNormalization.groupedInto = Object.values(
      this.stats.colorNormalization.byGroup
    ).filter((v: number) => v > 0).length

    return enrichedItems
  }

  /**
   * Sincroniza items enriquecidos a MongoDB
   */
  private async syncToMongo(enrichedItems: EnrichedCatalogItem[]): Promise<void> {
    this.emitProgress({
      step: 'syncing',
      message: '💾 Sincronizando con MongoDB...',
      percent: 85,
      currentBrand: 'Hot Wheels',
      processedItems: 0,
      totalItems: enrichedItems.length,
    })

    // Conectar a MongoDB si no está conectado
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hot-wheels')
    }

    const collection = HotWheelsCarModel.collection

    // Clear existing data
    try {
      const deleteResult = await collection.deleteMany({})
      console.log(`[PRE-SYNC] Cleared ${deleteResult.deletedCount} existing documents`)
    } catch (e) {
      console.log('[PRE-SYNC] Collection might not exist yet')
    }

    const BATCH_SIZE = 1000
    let synced = 0

    // Insert enriched items in batches using raw collection insert (no schema validation delays)
    for (let batchStart = 0; batchStart < enrichedItems.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, enrichedItems.length)
      const batch = enrichedItems.slice(batchStart, batchEnd)

      try {
        // Use raw insertMany with no validation or session involvement
        const result = await collection.insertMany(batch)
        const insertedCount = Object.keys(result.insertedIds).length
        synced += insertedCount
        console.log(`[SYNC_BATCH] ${batchStart}-${batchEnd}: inserted=${insertedCount}`)

        this.emitProgress({
          step: 'syncing',
          message: `💾 Sincronizados ${Math.min(batchEnd, enrichedItems.length)}/${enrichedItems.length} items...`,
          percent: 85 + Math.round((batchEnd / enrichedItems.length) * 10),
          currentBrand: 'Hot Wheels',
          processedItems: batchEnd,
          totalItems: enrichedItems.length,
        })
      } catch (e: any) {
        // Count successfully inserted even if there were errors
        if (e.insertedIds) {
          const insertedCount = Object.keys(e.insertedIds).length
          synced += insertedCount
          console.log(
            `[SYNC_BATCH] ${batchStart}-${batchEnd}: inserted=${insertedCount} (${e.writeErrors?.length || 0} errors)`
          )
        } else {
          console.error(`[ERROR] Batch ${batchStart}-${batchEnd}: ${(e as Error).message?.substring(0, 100)}`)
        }
      }
    }

    // Verify final count
    const finalCount = await collection.countDocuments({})
    console.log(`✅ Final sync: ${synced} processed, ${finalCount} in MongoDB`)
  }
}

/**
 * Ejecutar como script standalone
 */
async function main() {
  try {
    const enricher = new MasterCatalogEnricher()

    // Sin callbacks (salida a console)
    enricher.onProgress(progress => {
      console.log(`\n[${progress.step.toUpperCase()}] ${progress.message}`)
      if (progress.stats) {
        console.log('Stats:', progress.stats)
      }
    })

    const stats = await enricher.enrich()

    console.log('\n\n📊 ===== ESTADÍSTICAS FINALES =====')
    console.log(JSON.stringify(stats, null, 2))

    // Guardar stats con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const statsFile = path.join(__dirname, `../../data/enrichment-stats-${timestamp}.json`)
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2))
    console.log(`💾 Stats guardadas en: ${statsFile}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  }
}

// Solo ejecutar main si se llama como script (no como import)
if (require.main === module) {
  main()
}

export default MasterCatalogEnricher
