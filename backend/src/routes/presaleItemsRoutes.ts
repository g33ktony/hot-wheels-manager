import { Router, Request, Response } from 'express'
import PreSaleItemService from '../services/PreSaleItemService'

const router = Router()

/**
 * Pre-Sale Items Routes
 * Handles CRUD and business logic for pre-sale item aggregation
 */

// Debug route to test if presale route is loaded
router.get('/test/debug', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Presale items route is loaded',
    timestamp: new Date().toISOString()
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

    console.log('📌 GET /presale/items - Filters:', { status, carId, onlyActive })

    const filters: any = {}
    if (status) filters.status = status
    if (carId) filters.carId = carId
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
    const { purchaseId, carId, quantity, unitPrice, markupPercentage, finalPrice, photo } = req.body

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
      finalPrice,
      photo
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

// PUT /api/presale/items/:id/status - Update status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['active', 'completed', 'cancelled', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, completed, cancelled, or paused'
      })
    }

    const item = await PreSaleItemService.updateStatus(id, status)

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: item
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
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
