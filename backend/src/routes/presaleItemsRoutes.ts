import { Router, Request, Response } from 'express'
import PreSaleItemService from '../services/PreSaleItemService'

const router = Router()

// Log when routes are loaded - helps verify deployment
console.log('✅ Presale Items Routes loaded - v1.0.2 with improved error handling and conversion logging')

/**
 * Pre-Sale Items Routes
 * Handles CRUD and business logic for pre-sale item aggregation
 */

// Debug route to test if presale route is loaded
router.get('/test/debug', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Presale items route is loaded - v1.0.1',
    timestamp: new Date().toISOString(),
    routesFixed: true
  })
})

// GET /api/presale/items/summary/active - Get summary of active pre-sales (MUST BE BEFORE /:id)
router.get('/summary/active', async (req: Request, res: Response) => {
  try {
    const summary = await PreSaleItemService.getActiveSalesSummary()

    res.json({
      success: true,
      data: summary
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch summary'
    })
  }
})

// GET /api/presale/items/car/:carId - Get pre-sale item by car ID (MUST BE BEFORE /:id)
router.get('/car/:carId', async (req: Request, res: Response) => {
  try {
    const { carId } = req.params
    const item = await PreSaleItemService.getPreSaleItemByCarId(carId)

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Pre-sale item not found for this car'
      })
    }

    res.json({
      success: true,
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pre-sale item'
    })
  }
})

// GET /api/presale/items - Get all pre-sale items with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, carId, onlyActive } = req.query
    const storeId = req.storeId

    console.log('📌 GET /presale/items - Filters:', { status, carId, onlyActive, storeId })

    const filters: any = {}
    if (status) filters.status = status
    if (carId) filters.carId = carId
    if (storeId) filters.storeId = storeId
    if (onlyActive === 'true') filters.onlyActive = true

    console.log('📌 Calling PreSaleItemService.getPreSaleItems with filters:', filters)
    const items = await PreSaleItemService.getPreSaleItems(filters)
    console.log('✅ Successfully retrieved presale items:', items.length)

    res.json({
      success: true,
      data: items,
      count: items.length
    })
  } catch (error: any) {
    console.error('❌ Error in GET /presale/items:', error.message, error.stack)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pre-sale items',
      details: error.stack
    })
  }
})

// GET /api/presale/items/:id - Get specific pre-sale item (MUST BE AFTER /summary/active and /car/:carId)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const item = await PreSaleItemService.getPreSaleItem(id)

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Pre-sale item not found'
      })
    }

    res.json({
      success: true,
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pre-sale item'
    })
  }
})

// POST /api/presale/items - Create new pre-sale item from purchase
router.post('/', async (req: Request, res: Response) => {
  try {
    const { purchaseId, carId, quantity, unitPrice, markupPercentage, preSalePrice, normalPrice, photo, endDate } = req.body

    if (!purchaseId || !carId || !quantity || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: purchaseId, carId, quantity, unitPrice'
      })
    }

    const item = await PreSaleItemService.createOrUpdatePreSaleItem(
      purchaseId,
      carId,
      quantity,
      unitPrice,
      markupPercentage,
      preSalePrice,
      normalPrice,
      photo,
      endDate
    )

    res.status(201).json({
      success: true,
      message: 'Pre-sale item created/updated successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create pre-sale item'
    })
  }
})

// PUT /api/presale/items/:id - General update endpoint
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    const updatedItem = await PreSaleItemService.updatePreSaleItem(id, updates)

    res.json({
      success: true,
      message: 'Pre-sale item updated successfully',
      data: updatedItem
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update pre-sale item'
    })
  }
})

// PUT /api/presale/items/:id/markup - Update markup percentage
router.put('/:id/markup', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { markupPercentage } = req.body

    if (markupPercentage === undefined) {
      return res.status(400).json({
        success: false,
        error: 'markupPercentage is required'
      })
    }

    const item = await PreSaleItemService.updateMarkup(id, markupPercentage)

    res.json({
      success: true,
      message: 'Markup updated successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update markup'
    })
  }
})

// PUT /api/presale/items/:id/final-price - Update final price per unit
router.put('/:id/final-price', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { finalPrice } = req.body

    if (finalPrice === undefined || finalPrice === null) {
      return res.status(400).json({
        success: false,
        error: 'finalPrice is required'
      })
    }

    const item = await PreSaleItemService.updateFinalPrice(id, finalPrice)

    res.json({
      success: true,
      message: 'Final price updated successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update final price'
    })
  }
})

// PUT /api/presale/items/:id/photo - Update photo
router.put('/:id/photo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { photo } = req.body

    if (!photo) {
      return res.status(400).json({
        success: false,
        error: 'Photo is required'
      })
    }

    const item = await PreSaleItemService.updatePhoto(id, photo)

    res.json({
      success: true,
      message: 'Photo updated successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update photo'
    })
  }
})

// PUT /api/presale/items/:id/status - Update status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['purchased', 'shipped', 'received', 'reserved', 'payment-plan', 'payment-pending', 'ready', 'delivered', 'cancelled', 'active', 'completed', 'paused']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      })
    }

    console.log(`📌 Updating PreSaleItem ${id} status to: ${status}`);
    const item = await PreSaleItemService.updateStatus(id, status)
    console.log(`✅ Successfully updated PreSaleItem ${id} status to: ${status}`);

    const responseMessage = status === 'received' 
      ? `Status updated to ${status} successfully - Created ${item.units.length > 0 ? item.units.length : item.totalQuantity} inventory item(s)` 
      : `Status updated to ${status} successfully`;

    res.json({
      success: true,
      message: responseMessage,
      data: item,
      conversionDetails: status === 'received' ? {
        itemsCreated: item.units.length > 0 ? item.units.length : item.totalQuantity,
        totalQuantity: item.totalQuantity,
        unitsTracked: item.units.length,
        purchasesLinked: item.purchaseIds.length
      } : undefined
    })
  } catch (error: any) {
    console.error(`❌ Error updating PreSaleItem ${req.params.id} status:`, error.message);
    
    // Provide more specific error messages for different failure scenarios
    if (error.message.includes('Failed to convert')) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create inventory items from pre-sale items. Some units may not have been processed.',
        details: error.message
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// POST /api/presale/items/:id/assign - Assign units to delivery
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { deliveryId, quantity, purchaseId } = req.body

    if (!deliveryId || !quantity || !purchaseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deliveryId, quantity, purchaseId'
      })
    }

    const result = await PreSaleItemService.assignUnitsToDelivery(
      id,
      deliveryId,
      quantity,
      purchaseId
    )

    res.json({
      success: true,
      message: `${quantity} units assigned to delivery successfully`,
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to assign units'
    })
  }
})

// POST /api/presale/items/:id/unassign - Unassign units from delivery
router.post('/:id/unassign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { unitIds } = req.body

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'unitIds must be a non-empty array'
      })
    }

    const item = await PreSaleItemService.unassignUnitsFromDelivery(id, unitIds)

    res.json({
      success: true,
      message: `${unitIds.length} units unassigned successfully`,
      data: item
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to unassign units'
    })
  }
})

// POST /api/presale/items/:id/reset-assignments - Unassign all units and reopen presale
router.post('/:id/reset-assignments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const item = await PreSaleItemService.resetAssignments(id)

    res.json({
      success: true,
      message: 'Pre-sale assignments reset successfully',
      data: item
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reset assignments'
    })
  }
})

// GET /api/presale/items/:id/units/:deliveryId - Get units for delivery
router.get('/:id/units/:deliveryId', async (req: Request, res: Response) => {
  try {
    const { id, deliveryId } = req.params
    const units = await PreSaleItemService.getUnitsForDelivery(id, deliveryId)

    res.json({
      success: true,
      data: units,
      count: units.length
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch units'
    })
  }
})

// GET /api/presale/items/:id/profit - Get profit analytics
router.get('/:id/profit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const analytics = await PreSaleItemService.getProfitAnalytics(id)

    res.json({
      success: true,
      data: analytics
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profit analytics'
    })
  }
})

// DELETE /api/presale/items/:id - Cancel pre-sale item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const item = await PreSaleItemService.cancelPreSaleItem(id)

    res.json({
      success: true,
      message: 'Pre-sale item cancelled successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel pre-sale item'
    })
  }
})

export default router
