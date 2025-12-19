import { Router } from 'express'
import * as salesController from '../controllers/salesController'

const router = Router()

// GET /api/sales - Get all sales
router.get('/', salesController.getSales)

// POST /api/sales - Create a new sale
router.post('/', salesController.createSale)

// POST /api/sales/pos - Create a POS (Point of Sale) quick sale
router.post('/pos', salesController.createPOSSale)

// GET /api/sales/stats - Get sales statistics
router.get('/stats', salesController.getSalesStats)

// PUT /api/sales/:id - Update a sale
router.put('/:id', salesController.updateSale)

// DELETE /api/sales/:id - Delete a sale
router.delete('/:id', salesController.deleteSale)

export default router
