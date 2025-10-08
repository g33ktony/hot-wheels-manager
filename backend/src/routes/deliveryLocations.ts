import express from 'express'
import { getDeliveryLocations, createDeliveryLocation, deleteDeliveryLocation } from '../controllers/deliveryLocationsController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

router.get('/', getDeliveryLocations)
router.post('/', createDeliveryLocation)
router.delete('/:id', deleteDeliveryLocation)

export default router
