import { Router } from 'express'
import {
  getInventoryItems,
  getInventoryItemById,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  deleteInventoryItemPermanent,
  getSeriesItems,
  checkSeriesAvailability,
  getMissingSeriesPieces,
} from '../controllers/inventoryController'
import { analyzeImage } from '../controllers/geminiController'

const router = Router()

// POST /api/inventory/analyze-image - Analyze Hot Wheels image with AI
router.post('/analyze-image', analyzeImage)

// GET /api/inventory - Get all inventory items
router.get('/', getInventoryItems)

// GET /api/inventory/:id - Get single inventory item by ID
router.get('/:id', getInventoryItemById)

// POST /api/inventory - Add new inventory item
router.post('/', addInventoryItem)

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', updateInventoryItem)

// DELETE /api/inventory/:id - Delete inventory item (soft delete - sets quantity to 0)
router.delete('/:id', deleteInventoryItem)

// DELETE /api/inventory/:id/permanent - Permanently delete inventory item (hard delete)
router.delete('/:id/permanent', deleteInventoryItemPermanent)

// ========== SERIES ROUTES ==========

// GET /api/inventory/series/:seriesId - Get all items from a series
router.get('/series/:seriesId', getSeriesItems)

// GET /api/inventory/series/:seriesId/availability - Check if complete series is available
router.get('/series/:seriesId/availability', checkSeriesAvailability)

// GET /api/inventory/series/:seriesId/missing - Get missing pieces for a series
router.get('/series/:seriesId/missing', getMissingSeriesPieces)

export default router
