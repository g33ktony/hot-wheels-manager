import { Router } from 'express'
import {
  getBoxes,
  getBoxById,
  registerBoxPieces,
  completeBox,
  deleteBoxPiece,
  updateBox
} from '../controllers/boxesController'

const router = Router()

// Get all boxes (sealed or unpacking)
router.get('/', getBoxes)

// Get box details with registered pieces
router.get('/:id', getBoxById)

// Register piece(s) from a box
router.post('/:id/pieces', registerBoxPieces)

// Mark box as complete (even if incomplete)
router.put('/:id/complete', completeBox)

// Delete a registered piece from a box
router.delete('/:id/pieces/:pieceId', deleteBoxPiece)

// Update box information
router.put('/:id', updateBox)

export default router
