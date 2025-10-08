import { Request, Response } from 'express'
import { ApiResponse } from '@shared/types'
import Purchase from '../models/Purchase'
import { InventoryItemModel } from '../models/InventoryItem'
import { SupplierModel } from '../models/Supplier'
import { DeliveryModel } from '../models/Delivery'
import { PendingItemModel } from '../models/PendingItem'
import { SaleModel } from '../models/Sale'

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID not found in request' })
    }

    const purchases = await Purchase.find({ userId })
      .populate('supplierId')
      .sort({ purchaseDate: -1 })

    const response: ApiResponse<any[]> = {
      success: true,
      data: purchases,
      message: purchases.length === 0
        ? 'No purchases yet. Start by adding your Hot Wheels purchases!'
        : `${purchases.length} purchase${purchases.length === 1 ? '' : 's'} found`
    }

    res.json(response)
  } catch (error: any) {
    console.error('Get purchases error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error retrieving purchases'
    }
    res.status(500).json(errorResponse)
  }
}

export const updatePurchaseStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      })
    }

    if (!['pending', 'paid', 'shipped', 'received', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Estado inválido'
      })
    }

    const purchase = await Purchase.findOne({ _id: id, userId })
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada o no pertenece al usuario'
      })
    }

    // If status is changing to received, add items to inventory
    if (status === 'received' && purchase.status !== 'received') {
      await addItemsToInventory(purchase)
      purchase.receivedDate = new Date()
      purchase.isReceived = true
    }

    purchase.status = status
    await purchase.save()

    const updatedPurchase = await Purchase.findById(id).populate('supplierId')

    const response: ApiResponse<any> = {
      success: true,
      data: updatedPurchase,
      message: 'Estado de compra actualizado exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Update purchase status error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al actualizar el estado de la compra'
    }
    res.status(500).json(errorResponse)
  }
}

// New endpoint for receiving purchase with verified quantities
export const receivePurchaseWithVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { receivedQuantities } = req.body // Array of { index: number, quantity: number }
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      })
    }

    const purchase = await Purchase.findOne({ _id: id, userId })
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada o no pertenece al usuario'
      })
    }

    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Esta compra ya fue marcada como recibida'
      })
    }

    // Update quantities with what was actually received
    receivedQuantities.forEach((received: { index: number; quantity: number }) => {
      if (purchase.items[received.index]) {
        purchase.items[received.index].quantity = received.quantity
      }
    })

    // Remove items with 0 quantity (completely not received)
    purchase.items = purchase.items.filter(item => item.quantity > 0)

    // Recalculate total cost based on received items
    purchase.totalCost = purchase.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0
    ) + (purchase.shippingCost || 0)

    // Mark as received and add to inventory
    purchase.status = 'received'
    purchase.receivedDate = new Date()
    purchase.isReceived = true
    
    await purchase.save()

    // Add received items to inventory
    await addItemsToInventory(purchase)

    const updatedPurchase = await Purchase.findById(id).populate('supplierId')

    const response: ApiResponse<any> = {
      success: true,
      data: updatedPurchase,
      message: 'Compra recibida y agregada al inventario exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Receive purchase with verification error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al recibir la compra'
    }
    res.status(500).json(errorResponse)
  }
}

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID not found in request' })
    }

    const purchaseData = req.body

    // Validate supplier exists and belongs to user if supplierId is provided
    if (purchaseData.supplierId) {
      const supplier = await SupplierModel.findOne({ _id: purchaseData.supplierId, userId })
      if (!supplier) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Proveedor no encontrado o no pertenece al usuario'
        })
      }
      purchaseData.supplier = supplier
    }

    // Calculate total cost from items if not provided
    if (!purchaseData.totalCost && purchaseData.items) {
      purchaseData.totalCost = purchaseData.items.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
        0
      ) + (purchaseData.shippingCost || 0)
    }

    // Add userId to purchase data
    purchaseData.userId = userId

    const newPurchase = new Purchase(purchaseData)
    const savedPurchase = await newPurchase.save()

    const populatedPurchase = await Purchase.findById(savedPurchase._id).populate('supplierId')

    const response: ApiResponse<any> = {
      success: true,
      data: populatedPurchase,
      message: 'Compra registrada exitosamente'
    }

    res.status(201).json(response)
  } catch (error: any) {
    console.error('Create purchase error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al registrar la compra'
    }
    res.status(400).json(errorResponse)
  }
}

// Helper function to add items to inventory when purchase is received
const addItemsToInventory = async (purchase: any) => {
  try {
    for (const item of purchase.items) {
      // Special handling for boxes
      if (item.isBox) {
        // Create a sealed box item in inventory
        const boxItem = new InventoryItemModel({
          carId: item.carId,
          quantity: 1, // The box itself as a unit
          purchasePrice: item.boxPrice || item.unitPrice,
          suggestedPrice: item.boxPrice || item.unitPrice, // Box can be sold as-is
          condition: item.condition,
          brand: item.brand,
          pieceType: item.pieceType,
          // Box-specific fields
          isBox: true,
          boxName: item.boxName,
          boxSize: item.boxSize,
          boxPrice: item.boxPrice || item.unitPrice,
          boxStatus: 'sealed',
          registeredPieces: 0,
          photos: item.photos || [],
          location: item.location,
          notes: item.notes 
            ? `📦 Caja sellada - Agregada desde compra ${purchase._id}\n${item.notes}`
            : `📦 Caja sellada - Agregada desde compra ${purchase._id}`,
          dateAdded: new Date()
        })
        await boxItem.save()
        continue // Skip normal item processing for boxes
      }

      // Normal item processing (non-box items)
      // Check if inventory item already exists with same carId, condition, and brand
      let inventoryItem = await InventoryItemModel.findOne({
        carId: item.carId,
        condition: item.condition,
        brand: item.brand || { $exists: false }
      })

      if (inventoryItem) {
        // Update existing inventory item - add quantity and update price
        inventoryItem.quantity += item.quantity
        inventoryItem.purchasePrice = item.unitPrice // Update to latest purchase price
        
        // Always update brand and pieceType if provided (not just if missing)
        if (item.brand) inventoryItem.brand = item.brand
        if (item.pieceType) inventoryItem.pieceType = item.pieceType
        
        // Update special edition flags if true
        if (item.isTreasureHunt) inventoryItem.isTreasureHunt = item.isTreasureHunt
        if (item.isSuperTreasureHunt) inventoryItem.isSuperTreasureHunt = item.isSuperTreasureHunt
        if (item.isChase) inventoryItem.isChase = item.isChase
        
        // Update series info if provided
        if (item.seriesName) {
          inventoryItem.seriesId = item.seriesId || inventoryItem.seriesId
          inventoryItem.seriesName = item.seriesName
          inventoryItem.seriesSize = item.seriesSize || inventoryItem.seriesSize
          inventoryItem.seriesPosition = item.seriesPosition || inventoryItem.seriesPosition
          inventoryItem.seriesPrice = item.seriesPrice || inventoryItem.seriesPrice
        }
        
        // Merge photos without duplicates
        if (item.photos && item.photos.length > 0) {
          const existingPhotos = inventoryItem.photos || []
          const newPhotos = item.photos.filter((photo: string) => !existingPhotos.includes(photo))
          inventoryItem.photos = [...existingPhotos, ...newPhotos]
        }
        
        // Update location if provided and not already set
        if (item.location && !inventoryItem.location) {
          inventoryItem.location = item.location
        }
        
        // Append notes
        if (item.notes) {
          const existingNotes = inventoryItem.notes || ''
          inventoryItem.notes = existingNotes 
            ? `${existingNotes}\n[Compra ${purchase._id}]: ${item.notes}`
            : `[Compra ${purchase._id}]: ${item.notes}`
        }
        
        await inventoryItem.save()
      } else {
        // Create new inventory item with all fields from purchase
        const newInventoryItem = new InventoryItemModel({
          carId: item.carId,
          quantity: item.quantity,
          purchasePrice: item.unitPrice,
          suggestedPrice: item.unitPrice * 2, // Default markup of 100%
          condition: item.condition,
          // Brand and type fields
          brand: item.brand,
          pieceType: item.pieceType,
          isTreasureHunt: item.isTreasureHunt || false,
          isSuperTreasureHunt: item.isSuperTreasureHunt || false,
          isChase: item.isChase || false,
          // Series fields
          seriesId: item.seriesId,
          seriesName: item.seriesName,
          seriesSize: item.seriesSize,
          seriesPosition: item.seriesPosition,
          seriesPrice: item.seriesPrice,
          // Photos and location
          photos: item.photos || [],
          location: item.location,
          // Notes
          notes: item.notes 
            ? `Agregado desde compra ${purchase._id}\n${item.notes}`
            : `Agregado desde compra ${purchase._id}`,
          dateAdded: new Date()
        })
        await newInventoryItem.save()
      }
    }

    console.log(`✅ Added ${purchase.items.length} items to inventory from purchase ${purchase._id}`)
  } catch (error) {
    console.error('❌ Error adding items to inventory:', error)
    throw error
  }
}

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      })
    }

    const purchase = await Purchase.findOne({ _id: id, userId })
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada o no pertenece al usuario'
      })
    }

    // Validate supplier exists and belongs to user if supplierId is provided
    if (updateData.supplierId) {
      const supplier = await SupplierModel.findOne({ _id: updateData.supplierId, userId })
      if (!supplier) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Proveedor no encontrado o no pertenece al usuario'
        })
      }
    }

    // Update purchase fields
    if (updateData.items !== undefined) purchase.items = updateData.items
    if (updateData.supplierId !== undefined) purchase.supplierId = updateData.supplierId
    if (updateData.totalCost !== undefined) purchase.totalCost = updateData.totalCost
    if (updateData.shippingCost !== undefined) purchase.shippingCost = updateData.shippingCost
    if (updateData.trackingNumber !== undefined) purchase.trackingNumber = updateData.trackingNumber
    if (updateData.purchaseDate !== undefined) purchase.purchaseDate = updateData.purchaseDate
    if (updateData.estimatedDelivery !== undefined) purchase.estimatedDelivery = updateData.estimatedDelivery
    if (updateData.actualDelivery !== undefined) purchase.actualDelivery = updateData.actualDelivery
    if (updateData.status !== undefined) purchase.status = updateData.status
    if (updateData.notes !== undefined) purchase.notes = updateData.notes

    // Recalculate total cost if items changed
    if (updateData.items) {
      purchase.totalCost = updateData.items.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
        0
      ) + (purchase.shippingCost || 0)
    }

    await purchase.save()

    const updatedPurchase = await Purchase.findById(id).populate('supplierId')

    const response: ApiResponse<any> = {
      success: true,
      data: updatedPurchase,
      message: 'Compra actualizada exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Update purchase error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al actualizar la compra'
    }
    res.status(500).json(errorResponse)
  }
}

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      })
    }

    const purchase = await Purchase.findOne({ _id: id, userId })
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada o no pertenece al usuario'
      })
    }

    // If the purchase was received, we need to validate before deletion
    if (purchase.status === 'received') {
      console.log(`🔍 Validating deletion of received purchase ${id}...`)
      
      // Validate that items can be safely removed
      const validation = await validatePurchaseDeletion(purchase)
      
      if (!validation.canDelete) {
        return res.status(400).json({
          success: false,
          data: null,
          message: validation.message,
          error: validation.details
        })
      }
      
      console.log(`🗑️  Deleting received purchase ${id} - reverting inventory and deliveries...`)
      
      // Remove items from inventory (now with box support)
      await removeItemsFromInventory(purchase)
      
      // Delete associated deliveries
      const deletedDeliveries = await DeliveryModel.deleteMany({ purchaseId: id })
      if (deletedDeliveries.deletedCount > 0) {
        console.log(`✅ Deleted ${deletedDeliveries.deletedCount} delivery(ies) associated with purchase ${id}`)
      }
    }
    
    // Always delete associated pending items (regardless of purchase status)
    const deletedPendingItems = await PendingItemModel.deleteMany({ originalPurchaseId: id })
    if (deletedPendingItems.deletedCount > 0) {
      console.log(`✅ Deleted ${deletedPendingItems.deletedCount} pending item(s) associated with purchase ${id}`)
    }

    await Purchase.findByIdAndDelete(id)

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Compra eliminada exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Delete purchase error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al eliminar la compra'
    }
    res.status(500).json(errorResponse)
  }
}

// Helper function to validate if a purchase can be safely deleted
const validatePurchaseDeletion = async (purchase: any) => {
  const issues: string[] = []
  
  for (const item of purchase.items) {
    // Handle boxes
    if (item.isBox) {
      const boxItem: any = await InventoryItemModel.findOne({
        carId: item.carId,
        isBox: true,
        boxName: item.boxName
      })
      
      if (boxItem) {
        // Check if box is being unpacked or already unpacked
        if (boxItem.boxStatus === 'unpacking') {
          issues.push(`❌ La caja "${item.boxName}" está siendo desempacada (${boxItem.registeredPieces}/${boxItem.boxSize} piezas registradas)`)
        } else if (boxItem.boxStatus === 'completed') {
          issues.push(`❌ La caja "${item.boxName}" ya fue desempacada completamente`)
        }
        
        // Check if any pieces from this box were sold
        const soldPieces = await InventoryItemModel.find({
          sourceBoxId: boxItem._id.toString(),
          quantity: 0 // Sold items have quantity 0
        })
        
        if (soldPieces.length > 0) {
          issues.push(`❌ ${soldPieces.length} pieza(s) de la caja "${item.boxName}" ya fueron vendidas`)
        }
      }
    } else {
      // Handle regular items
      const inventoryItem = await InventoryItemModel.findOne({
        carId: item.carId,
        condition: item.condition,
        brand: item.brand || { $exists: false }
      })
      
      if (inventoryItem) {
        // Check if item was sold (quantity is less than purchased)
        const currentQuantity = inventoryItem.quantity
        const purchasedQuantity = item.quantity
        
        if (currentQuantity < purchasedQuantity) {
          const soldQuantity = purchasedQuantity - currentQuantity
          issues.push(`❌ ${soldQuantity} de ${purchasedQuantity} unidad(es) de "${item.carId}" ya fueron vendidas`)
        }
        
        // Check if item is in any active sale
        const activeSales = await SaleModel.find({
          'items.carId': item.carId,
          status: { $nin: ['cancelled', 'completed'] }
        })
        
        if (activeSales.length > 0) {
          issues.push(`❌ "${item.carId}" está en ${activeSales.length} venta(s) activa(s)`)
        }
      }
    }
  }
  
  return {
    canDelete: issues.length === 0,
    message: issues.length > 0 
      ? 'No se puede eliminar esta compra porque tiene items que ya fueron procesados'
      : 'La compra puede eliminarse de forma segura',
    details: issues.join('\n')
  }
}

// Helper function to remove items from inventory when purchase is deleted
const removeItemsFromInventory = async (purchase: any) => {
  try {
    for (const item of purchase.items) {
      // Handle boxes
      if (item.isBox) {
        const boxItem: any = await InventoryItemModel.findOne({
          carId: item.carId,
          isBox: true,
          boxName: item.boxName
        })
        
        if (boxItem) {
          // Only delete if still sealed (validation should have caught other cases)
          if (boxItem.boxStatus === 'sealed') {
            await InventoryItemModel.findByIdAndDelete(boxItem._id)
            console.log(`  ✓ Removed sealed box "${item.boxName}" from inventory`)
          } else {
            console.warn(`  ⚠️  Skipping box "${item.boxName}" - status: ${boxItem.boxStatus}`)
          }
        }
      } else {
        // Handle regular items (consistent with addItemsToInventory logic)
        const inventoryItem = await InventoryItemModel.findOne({
          carId: item.carId,
          condition: item.condition,
          brand: item.brand || { $exists: false }
        })

        if (inventoryItem) {
          // Reduce quantity or remove item if quantity becomes 0
          inventoryItem.quantity -= item.quantity
          if (inventoryItem.quantity <= 0) {
            await InventoryItemModel.findByIdAndDelete(inventoryItem._id)
            console.log(`  ✓ Removed item ${item.carId} from inventory (quantity reached 0)`)
          } else {
            await inventoryItem.save()
            console.log(`  ✓ Reduced quantity for ${item.carId}: ${inventoryItem.quantity + item.quantity} → ${inventoryItem.quantity}`)
          }
        }
      }
    }

    console.log(`✅ Removed ${purchase.items.length} item(s) from inventory for deleted purchase ${purchase._id}`)
  } catch (error) {
    console.error('❌ Error removing items from inventory:', error)
    throw error
  }
}
