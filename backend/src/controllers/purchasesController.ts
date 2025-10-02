import { Request, Response } from 'express'
import { ApiResponse } from '@shared/types'
import Purchase from '../models/Purchase'
import { InventoryItemModel } from '../models/InventoryItem'
import { SupplierModel } from '../models/Supplier'

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const purchases = await Purchase.find()
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

    if (!['pending', 'paid', 'shipped', 'received', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Estado inválido'
      })
    }

    const purchase = await Purchase.findById(id)
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada'
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

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const purchaseData = req.body

    // Validate supplier exists if supplierId is provided
    if (purchaseData.supplierId) {
      const supplier = await SupplierModel.findById(purchaseData.supplierId)
      if (!supplier) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Proveedor no encontrado'
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
      // Check if inventory item already exists
      let inventoryItem = await InventoryItemModel.findOne({
        carId: item.carId,
        condition: item.condition
      })

      if (inventoryItem) {
        // Update existing inventory item
        inventoryItem.quantity += item.quantity
        inventoryItem.purchasePrice = item.unitPrice // Update to latest purchase price
        await inventoryItem.save()
      } else {
        // Create new inventory item
        const newInventoryItem = new InventoryItemModel({
          carId: item.carId,
          quantity: item.quantity,
          purchasePrice: item.unitPrice,
          suggestedPrice: item.unitPrice * 2, // Default markup
          condition: item.condition,
          notes: `Agregado desde compra ${purchase._id}`
        })
        await newInventoryItem.save()
      }
    }

    console.log(`Added ${purchase.items.length} items to inventory from purchase ${purchase._id}`)
  } catch (error) {
    console.error('Error adding items to inventory:', error)
    throw error
  }
}

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const purchase = await Purchase.findById(id)
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada'
      })
    }

    // Validate supplier exists if supplierId is provided
    if (updateData.supplierId) {
      const supplier = await SupplierModel.findById(updateData.supplierId)
      if (!supplier) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Proveedor no encontrado'
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

    const purchase = await Purchase.findById(id)
    if (!purchase) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Compra no encontrada'
      })
    }

    // If the purchase was received, we need to remove the items from inventory
    if (purchase.status === 'received') {
      await removeItemsFromInventory(purchase)
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

// Helper function to remove items from inventory when purchase is deleted
const removeItemsFromInventory = async (purchase: any) => {
  try {
    for (const item of purchase.items) {
      // Find the inventory item
      const inventoryItem = await InventoryItemModel.findOne({
        carId: item.carId,
        condition: item.condition
      })

      if (inventoryItem) {
        // Reduce quantity or remove item if quantity becomes 0
        inventoryItem.quantity -= item.quantity
        if (inventoryItem.quantity <= 0) {
          await InventoryItemModel.findByIdAndDelete(inventoryItem._id)
        } else {
          await inventoryItem.save()
        }
      }
    }

    console.log(`Removed ${purchase.items.length} items from inventory for deleted purchase ${purchase._id}`)
  } catch (error) {
    console.error('Error removing items from inventory:', error)
    throw error
  }
}
