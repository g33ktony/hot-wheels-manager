import { Router } from 'express'
import * as deliveriesController from '../controllers/deliveriesController'

const router = Router()

// GET /api/deliveries - Get all deliveries
router.get('/', deliveriesController.getDeliveries)

// GET /api/deliveries/:id - Get delivery by ID
router.get('/:id', deliveriesController.getDeliveryById)

// POST /api/deliveries - Create a new delivery
router.post('/', deliveriesController.createDelivery)

// PUT /api/deliveries/:id - Update delivery
router.put('/:id', deliveriesController.updateDelivery)

// PATCH /api/deliveries/:id/prepared - Mark delivery as prepared
router.patch('/:id/prepared', deliveriesController.markDeliveryAsPrepared)

// PATCH /api/deliveries/:id/completed - Mark delivery as completed
router.patch('/:id/completed', deliveriesController.markDeliveryAsCompleted)

// PATCH /api/deliveries/:id/pending - Mark delivery as pending
router.patch('/:id/pending', deliveriesController.markDeliveryAsPending)

// DELETE /api/deliveries/:id - Delete delivery
router.delete('/:id', deliveriesController.deleteDelivery)

export default router
