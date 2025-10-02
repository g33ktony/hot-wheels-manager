import { Router } from 'express'
import { getPurchases, createPurchase, updatePurchase, updatePurchaseStatus, deletePurchase } from '../controllers/purchasesController'

const router = Router()

// GET /api/purchases - Get all purchases
router.get('/', getPurchases)

// POST /api/purchases - Create a new purchase
router.post('/', createPurchase)

// PUT /api/purchases/:id - Update purchase
router.put('/:id', updatePurchase)

// PUT /api/purchases/:id/status - Update purchase status
router.put('/:id/status', updatePurchaseStatus)

// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', deletePurchase)

export default router
