/**
 * Rutas para enriquecimiento del catálogo con soporte SSE
 */

import express, { Request, Response } from 'express'
import MasterCatalogEnricher from '../scripts/master-catalog-enrich'
import type { CatalogEnrichmentProgress } from '../shared/catalog-types'

const router = express.Router()

// Estado compartido (en producción usar Redis o similar)
let enrichmentInProgress = false
let lastProgress: CatalogEnrichmentProgress | null = null

/**
 * POST /api/catalog/enrich
 * Inicia el enriquecimiento del catálogo con SSE
 */
router.post('/enrich', (req: Request, res: Response) => {
  if (enrichmentInProgress) {
    return res.status(409).json({
      success: false,
      message: 'Enriquecimiento ya en progreso',
    })
  }

  enrichmentInProgress = true
  lastProgress = null

  // Headers para SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Crear enriquecedor
  const enricher = new MasterCatalogEnricher()

  // Registrar callback de progreso
  enricher.onProgress((progress: CatalogEnrichmentProgress) => {
    lastProgress = progress

    // Enviar evento SSE
    const data = JSON.stringify(progress)
    res.write(`data: ${data}\n\n`)

    // Log
    if (progress.error) {
      console.error(`[${progress.step}] Error:`, progress.error)
    }
  })

  // Ejecutar enriquecimiento en background
  enricher.enrich().then(
    stats => {
      enrichmentInProgress = false

      // Evento final con estadísticas
      const finalEvent: CatalogEnrichmentProgress = {
        step: 'complete',
        message: '✅ Enriquecimiento completado exitosamente',
        percent: 100,
        currentBrand: 'Hot Wheels',
        processedItems: stats.totalProcessed,
        totalItems: stats.totalProcessed,
        stats: {
          itemsWithMainPhoto: stats.photosCoverage.withMainPhoto,
          itemsWithCardedPhoto: stats.photosCoverage.withCardedPhoto,
          itemsWithGallery: stats.photosCoverage.withGallery,
          itemsClassified: stats.totalProcessed,
          colorsNormalized: stats.colorNormalization.totalUnique,
        },
      }

      res.write(`data: ${JSON.stringify(finalEvent)}\n\n`)
      res.write('STATS:' + JSON.stringify(stats) + '\n\n')
      res.end()

      console.log('✅ Enriquecimiento completado')
    },
    error => {
      enrichmentInProgress = false

      const errorEvent: CatalogEnrichmentProgress = {
        step: 'error',
        message: `❌ Error: ${String(error)}`,
        percent: 0,
        currentBrand: 'Hot Wheels',
        processedItems: lastProgress?.processedItems || 0,
        totalItems: lastProgress?.totalItems || 0,
        error: {
          code: 'ENRICH_FAILED',
          message: String(error),
        },
      }

      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`)
      res.end()

      console.error('❌ Error en enriquecimiento:', error)
    }
  )
})

/**
 * GET /api/catalog/enrich/status
 * Obtiene estado actual del enriquecimiento
 */
router.get('/enrich/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      inProgress: enrichmentInProgress,
      lastProgress: lastProgress,
    },
  })
})

/**
 * GET /api/catalog/enrich/stats
 * Obtiene última estadística disponible
 */
router.get('/enrich/stats', (req: Request, res: Response) => {
  if (!lastProgress || lastProgress.step !== 'complete') {
    return res.status(404).json({
      success: false,
      message: 'No hay estadísticas disponibles',
    })
  }

  res.json({
    success: true,
    data: lastProgress,
  })
})

export default router
