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

interface ProgressCallback {
  (progress: CatalogEnrichmentProgress): void
}

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
        percent: 15,
        currentBrand: 'Hot Wheels',
        processedItems: totalItems,
        totalItems,
      })

      // 2. Procesar y enriquecer
      const enrichedItems = await this.enrichAllItems(allItems)

      // 3. Calcular estadísticas de fotos
      this.stats.photosCoverage = CatalogPhotoService.calculatePhotoCoverage(enrichedItems)

      // 4. Sincronizar con MongoDB
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
