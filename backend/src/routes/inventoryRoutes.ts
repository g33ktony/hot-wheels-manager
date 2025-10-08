import { Router } from 'express'
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getSeriesItems,
  checkSeriesAvailability,
  getMissingSeriesPieces,
} from '../controllers/inventoryController'


import { tenantContext } from '../middleware/tenant'
const router = Router()


// Todas las rutas requieren tenantContext para inyectar userId
router.use(tenantContext)

// GET /api/inventory - Get all inventory items
router.get('/', getInventoryItems)

// POST /api/inventory - Add new inventory item
router.post('/', addInventoryItem)

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', updateInventoryItem)

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', deleteInventoryItem)

// ========== SERIES ROUTES ==========

// GET /api/inventory/series/:seriesId - Get all items from a series
router.get('/series/:seriesId', getSeriesItems)

// GET /api/inventory/series/:seriesId/availability - Check if complete series is available
router.get('/series/:seriesId/availability', checkSeriesAvailability)

// GET /api/inventory/series/:seriesId/missing - Get missing pieces for a series
router.get('/series/:seriesId/missing', getMissingSeriesPieces)

export default router
