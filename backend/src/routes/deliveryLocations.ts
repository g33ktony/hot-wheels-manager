import express from 'express'
import { getDeliveryLocations, createDeliveryLocation, deleteDeliveryLocation } from '../controllers/deliveryLocationsController'
import { authMiddleware } from '../middleware/auth'
import { tenantContext } from '../middleware/tenant'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// Apply tenant context middleware
router.use(tenantContext)

router.get('/', getDeliveryLocations)
router.post('/', createDeliveryLocation)
router.delete('/:id', deleteDeliveryLocation)

export default router
