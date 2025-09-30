import { Router } from 'express'
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/inventoryController'

const router = Router()

// GET /api/inventory - Get all inventory items
router.get('/', getInventoryItems)

// POST /api/inventory - Add new inventory item
router.post('/', addInventoryItem)

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', updateInventoryItem)

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', deleteInventoryItem)

export default router
