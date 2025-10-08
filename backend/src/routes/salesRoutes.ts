import { Router } from 'express'
import * as salesController from '../controllers/salesController'
import { tenantContext } from '../middleware/tenant'

const router = Router()

// Todas las rutas requieren tenantContext para inyectar userId
router.use(tenantContext)

// GET /api/sales - Get all sales
router.get('/', salesController.getSales)

// POST /api/sales - Create a new sale
router.post('/', salesController.createSale)

// GET /api/sales/stats - Get sales statistics
router.get('/stats', salesController.getSalesStats)

// PUT /api/sales/:id - Update a sale
router.put('/:id', salesController.updateSale)

// DELETE /api/sales/:id - Delete a sale
router.delete('/:id', salesController.deleteSale)

export default router
