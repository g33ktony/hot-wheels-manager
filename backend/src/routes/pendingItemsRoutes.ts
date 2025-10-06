import express from 'express'
import {
  getPendingItems,
  createPendingItem,
  updatePendingItem,
  linkToPurchase,
  markAsRefunded,
  deletePendingItem,
  getPendingItemsStats
} from '../controllers/pendingItemsController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/pending-items - Get all pending items with filters
router.get('/', getPendingItems)

// GET /api/pending-items/stats - Get statistics
router.get('/stats', getPendingItemsStats)

// POST /api/pending-items - Create new pending item
router.post('/', createPendingItem)

// PUT /api/pending-items/:id - Update pending item
router.put('/:id', updatePendingItem)

// PUT /api/pending-items/:id/link-to-purchase - Link to purchase
router.put('/:id/link-to-purchase', linkToPurchase)

// PUT /api/pending-items/:id/mark-refunded - Mark as refunded
router.put('/:id/mark-refunded', markAsRefunded)

// DELETE /api/pending-items/:id - Delete pending item
router.delete('/:id', deletePendingItem)

export default router
