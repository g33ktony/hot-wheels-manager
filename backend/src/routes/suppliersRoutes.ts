import { Router } from 'express'
import * as suppliersController from '../controllers/suppliersController'
import { tenantContext } from '../middleware/tenant'

const router = Router()

// Apply tenant context middleware to all routes
router.use(tenantContext)

// GET /api/suppliers - Get all suppliers
router.get('/', suppliersController.getSuppliers)

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', suppliersController.getSupplierById)

// POST /api/suppliers - Create a new supplier
router.post('/', suppliersController.createSupplier)

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', suppliersController.updateSupplier)

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', suppliersController.deleteSupplier)

export default router
