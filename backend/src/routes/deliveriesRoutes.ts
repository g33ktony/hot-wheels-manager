import { Router } from 'express'
import * as deliveriesController from '../controllers/deliveriesController'
import * as deliveryPaymentController from '../controllers/deliveryPaymentController'

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

// Payment routes
// POST /api/deliveries/:id/payments - Add a payment
router.post('/:id/payments', deliveryPaymentController.addPayment)

// DELETE /api/deliveries/:id/payments/:paymentId - Delete a payment
router.delete('/:id/payments/:paymentId', deliveryPaymentController.deletePayment)

// GET /api/deliveries/:id/payments - Get payment history
router.get('/:id/payments', deliveryPaymentController.getPaymentHistory)

export default router
