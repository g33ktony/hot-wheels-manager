import { Request, Response } from 'express'
import { ApiResponse } from '@shared/types'
import { PendingItemModel } from '../models/PendingItem'
import Purchase from '../models/Purchase'

// GET /api/pending-items - Get all pending items with filters
export const getPendingItems = async (req: Request, res: Response) => {
  try {
    const { status, overdue } = req.query
    
    const query: any = {}
    
    // Filter by status if provided
    if (status) {
      query.status = status
    }
    
    // Filter overdue items (>15 days)
    if (overdue === 'true') {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
      query.reportedDate = { $lte: fifteenDaysAgo }
    }
    
    const pendingItems = await PendingItemModel.find(query)
      .populate('originalPurchaseId')
      .populate('linkedToPurchaseId')
      .sort({ reportedDate: -1 })
    
    // Calculate totals
    const totalValue = pendingItems.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity),
      0
    )
    
    res.json({
      success: true,
      data: {
        items: pendingItems,
        count: pendingItems.length,
        totalValue
      },
      message: `${pendingItems.length} item(s) pendiente(s) encontrado(s)`
    })
  } catch (error: any) {
    console.error('Get pending items error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error al obtener items pendientes'
    })
  }
}

// POST /api/pending-items - Create new pending item
export const createPendingItem = async (req: Request, res: Response) => {
  try {
    const pendingItem = new PendingItemModel(req.body)
    await pendingItem.save()
    
    // Update purchase pending items count
    await updatePurchasePendingCount(pendingItem.originalPurchaseId)
    
    const response: ApiResponse<any> = {
      success: true,
      data: pendingItem,
      message: 'Item pendiente creado exitosamente'
    }
    
    res.status(201).json(response)
  } catch (error: any) {
    console.error('Create pending item error:', error)
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error al crear item pendiente'
    })
  }
}

// PUT /api/pending-items/:id - Update pending item (status, notes, etc.)
export const updatePendingItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const pendingItem = await PendingItemModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    
    if (!pendingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Item pendiente no encontrado'
      })
    }
    
    res.json({
      success: true,
      data: pendingItem,
      message: 'Item pendiente actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('Update pending item error:', error)
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error al actualizar item pendiente'
    })
  }
}

// PUT /api/pending-items/:id/link-to-purchase - Link pending item to a future purchase
export const linkToPurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { purchaseId } = req.body
    
    const pendingItem = await PendingItemModel.findById(id)
    if (!pendingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Item pendiente no encontrado'
      })
    }
    
    // Validate: Item can only be linked to one non-received purchase at a time
    if (pendingItem.linkedToPurchaseId) {
      const linkedPurchase = await Purchase.findById(pendingItem.linkedToPurchaseId)
      if (linkedPurchase && linkedPurchase.status !== 'received') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Este item ya está vinculado a una compra pendiente. Debes recibirla primero.'
        })
      }
    }
    
    // Validate: Purchase must exist and not be received
    const purchase = await Purchase.findById(purchaseId)
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada'
      })
    }
    
    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No se puede agregar a una compra ya recibida'
      })
    }
    
    // Link the item
    pendingItem.linkedToPurchaseId = purchaseId
    pendingItem.status = 'pending-reshipment'
    await pendingItem.save()
    
    res.json({
      success: true,
      data: pendingItem,
      message: 'Item vinculado a la compra exitosamente'
    })
  } catch (error: any) {
    console.error('Link to purchase error:', error)
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error al vincular item a la compra'
    })
  }
}

// PUT /api/pending-items/:id/mark-refunded - Mark item as refunded
export const markAsRefunded = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { refundAmount, refundDate, refundMethod, notes } = req.body
    
    const pendingItem = await PendingItemModel.findById(id)
    if (!pendingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Item pendiente no encontrado'
      })
    }
    
    // Update refund information
    pendingItem.status = 'refunded'
    pendingItem.refundAmount = refundAmount
    pendingItem.refundDate = refundDate || new Date()
    pendingItem.refundMethod = refundMethod
    if (notes) pendingItem.notes = notes
    
    await pendingItem.save()
    
    // Update purchase pending items count
    await updatePurchasePendingCount(pendingItem.originalPurchaseId)
    
    res.json({
      success: true,
      data: pendingItem,
      message: 'Item marcado como reembolsado exitosamente'
    })
  } catch (error: any) {
    console.error('Mark as refunded error:', error)
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error al marcar item como reembolsado'
    })
  }
}

// DELETE /api/pending-items/:id - Delete/cancel pending item
export const deletePendingItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const pendingItem = await PendingItemModel.findById(id)
    if (!pendingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Item pendiente no encontrado'
      })
    }
    
    const originalPurchaseId = pendingItem.originalPurchaseId
    
    await PendingItemModel.findByIdAndDelete(id)
    
    // Update purchase pending items count
    await updatePurchasePendingCount(originalPurchaseId)
    
    res.json({
      success: true,
      data: null,
      message: 'Item pendiente eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Delete pending item error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error al eliminar item pendiente'
    })
  }
}

// GET /api/pending-items/stats - Get pending items statistics
export const getPendingItemsStats = async (req: Request, res: Response) => {
  try {
    const allItems = await PendingItemModel.find({})
    
    // Only count active pending items (exclude refunded and cancelled)
    const activePendingItems = allItems.filter(
      item => item.status === 'pending-reshipment' || item.status === 'requesting-refund'
    )
    
    const totalValue = activePendingItems.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity),
      0
    )
    
    // Count by status
    const byStatus = {
      'pending-reshipment': 0,
      'requesting-refund': 0,
      'refunded': 0,
      'cancelled': 0
    }
    
    allItems.forEach(item => {
      byStatus[item.status]++
    })
    
    // Overdue items (>15 days) - only count active pending items
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    const overdueItems = activePendingItems.filter(item => item.reportedDate <= fifteenDaysAgo)
    
    res.json({
      success: true,
      data: {
        totalCount: activePendingItems.length, // Only count active pending items
        totalValue,
        byStatus,
        overdueCount: overdueItems.length
      },
      message: 'Estadísticas obtenidas exitosamente'
    })
  } catch (error: any) {
    console.error('Get stats error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error al obtener estadísticas'
    })
  }
}

// Helper function to update purchase pending items count
async function updatePurchasePendingCount(purchaseId: string) {
  try {
    const pendingCount = await PendingItemModel.countDocuments({
      originalPurchaseId: purchaseId,
      status: { $nin: ['refunded', 'cancelled'] }
    })
    
    await Purchase.findByIdAndUpdate(purchaseId, {
      hasPendingItems: pendingCount > 0,
      pendingItemsCount: pendingCount
    })
  } catch (error) {
    console.error('Error updating purchase pending count:', error)
  }
}

// Process pending items when a purchase is received
// This adds pending items (that were linked to this purchase) to inventory
export async function processPendingItemsOnPurchaseReceived(purchaseId: string) {
  try {
    console.log(`🔄 Processing pending items for received purchase: ${purchaseId}`)
    
    // Find all pending items linked to this purchase that haven't been received yet
    const pendingItems = await PendingItemModel.find({
      linkedToPurchaseId: purchaseId,
      status: 'pending-reshipment'
    })
    
    if (pendingItems.length === 0) {
      console.log('✅ No pending items to process for this purchase')
      return
    }
    
    const { InventoryItemModel } = await import('../models/InventoryItem')
    
    for (const pendingItem of pendingItems) {
      console.log(`📦 Processing pending item: ${pendingItem.carId} (qty: ${pendingItem.quantity})`)
      
      // Check if inventory item already exists with same carId, condition, and brand
      let inventoryItem = await InventoryItemModel.findOne({
        carId: pendingItem.carId,
        condition: pendingItem.condition,
        brand: pendingItem.brand || { $exists: false }
      })
      
      if (inventoryItem) {
        // Update existing inventory item
        console.log(`✅ Adding ${pendingItem.quantity} units to existing inventory item`)
        inventoryItem.quantity += pendingItem.quantity
        inventoryItem.purchasePrice = pendingItem.unitPrice
        
        if (pendingItem.brand) inventoryItem.brand = pendingItem.brand
        if (pendingItem.pieceType) inventoryItem.pieceType = pendingItem.pieceType
        if (pendingItem.isTreasureHunt) inventoryItem.isTreasureHunt = true
        if (pendingItem.isSuperTreasureHunt) inventoryItem.isSuperTreasureHunt = true
        if (pendingItem.isChase) inventoryItem.isChase = true
        
        // Merge photos
        if (pendingItem.photos && pendingItem.photos.length > 0) {
          const existingPhotos = inventoryItem.photos || []
          const newPhotos = pendingItem.photos.filter(photo => !existingPhotos.includes(photo))
          inventoryItem.photos = [...existingPhotos, ...newPhotos]
        }
        
        // Append notes
        const notePrefix = `[Pre-orden recibida - ${new Date().toLocaleDateString()}]`
        if (pendingItem.notes) {
          const existingNotes = inventoryItem.notes || ''
          inventoryItem.notes = existingNotes 
            ? `${existingNotes}\n${notePrefix}: ${pendingItem.notes}`
            : `${notePrefix}: ${pendingItem.notes}`
        } else {
          const existingNotes = inventoryItem.notes || ''
          inventoryItem.notes = existingNotes 
            ? `${existingNotes}\n${notePrefix}: Item agregado desde pre-orden`
            : `${notePrefix}: Item agregado desde pre-orden`
        }
        
        await inventoryItem.save()
      } else {
        // Create new inventory item
        console.log(`✅ Creating new inventory item`)
        const suggestedPrice = pendingItem.unitPrice * 1.3 // Default 30% markup
        const newInventoryItem = new InventoryItemModel({
          carId: pendingItem.carId,
          quantity: pendingItem.quantity,
          purchasePrice: pendingItem.unitPrice,
          suggestedPrice: suggestedPrice,
          actualPrice: suggestedPrice, // Set actualPrice to match suggestedPrice initially
          condition: pendingItem.condition,
          brand: pendingItem.brand,
          pieceType: pendingItem.pieceType,
          isTreasureHunt: pendingItem.isTreasureHunt || false,
          isSuperTreasureHunt: pendingItem.isSuperTreasureHunt || false,
          isChase: pendingItem.isChase || false,
          photos: pendingItem.photos || [],
          notes: pendingItem.notes 
            ? `[Pre-orden recibida - ${new Date().toLocaleDateString()}]: ${pendingItem.notes}`
            : `[Pre-orden recibida - ${new Date().toLocaleDateString()}]: Item agregado desde pre-orden`,
          dateAdded: new Date()
        })
        await newInventoryItem.save()
      }
      
      // Mark pending item as received/completed by removing the link
      pendingItem.linkedToPurchaseId = undefined
      pendingItem.notes = (pendingItem.notes || '') + `\n✅ Recibido el ${new Date().toLocaleDateString()} - Agregado al inventario`
      await pendingItem.save()
    }
    
    console.log(`✅ Processed ${pendingItems.length} pending item(s) and added to inventory`)
  } catch (error) {
    console.error('Error processing pending items on purchase received:', error)
    throw error
  }
}
