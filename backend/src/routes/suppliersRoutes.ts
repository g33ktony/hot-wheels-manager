import { Router } from 'express'
import * as suppliersController from '../controllers/suppliersController'

const router = Router()

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
