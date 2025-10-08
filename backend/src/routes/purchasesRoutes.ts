import { Router } from 'express'
import { getPurchases, createPurchase, updatePurchase, updatePurchaseStatus, receivePurchaseWithVerification, deletePurchase } from '../controllers/purchasesController'
import { tenantContext } from '../middleware/tenant'

const router = Router()

// Apply tenant context middleware to all routes
router.use(tenantContext)

// GET /api/purchases - Get all purchases
router.get('/', getPurchases)

// POST /api/purchases - Create a new purchase
router.post('/', createPurchase)

// PUT /api/purchases/:id - Update purchase
router.put('/:id', updatePurchase)

// PUT /api/purchases/:id/status - Update purchase status
router.put('/:id/status', updatePurchaseStatus)

// PUT /api/purchases/:id/receive - Receive purchase with verification
router.put('/:id/receive', receivePurchaseWithVerification)

// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', deletePurchase)

export default router
