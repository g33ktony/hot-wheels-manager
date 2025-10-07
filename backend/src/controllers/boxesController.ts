import { Request, Response } from 'express'
import { InventoryItemModel, IInventoryItem } from '../models/InventoryItem'
import { ApiResponse } from '@shared/types'

// Note: TypeScript tiene problemas reconociendo campos opcionales de mongoose para box fields
// Los campos están definidos en el schema pero no en la interfaz inferida por Document
// @ts-nocheck en funciones específicas o casting manual donde sea necesario

type BoxItem = IInventoryItem & { 
  isBox: boolean;
  boxName?: string;
  boxSize?: number;
  boxPrice?: number;
  boxStatus?: 'sealed' | 'unpacking' | 'completed';
  registeredPieces?: number;
  sourceBox?: string;
  sourceBoxId?: string;
}

// Helper to cast InventoryItem to BoxItem
const asBox = (item: any): BoxItem => item as BoxItem

// GET /api/boxes - Get all boxes (sealed or unpacking)
export const getBoxes = async (req: Request, res: Response) => {
  try {
    const boxes = await InventoryItemModel.find({
      isBox: true,
      boxStatus: { $in: ['sealed', 'unpacking'] }
    }).sort({ dateAdded: -1 }).lean() as unknown as BoxItem[]

    res.json({
      success: true,
      data: boxes,
      message: 'Cajas obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error fetching boxes:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las cajas'
    })
  }
}

// GET /api/boxes/:id - Get box details with registered pieces
export const getBoxById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    // Get registered pieces from this box
    const registeredPieces = await InventoryItemModel.find({
      sourceBoxId: id
    }).sort({ dateAdded: -1 })

    res.json({
      success: true,
      data: {
        box,
        registeredPieces
      },
      message: 'Detalle de caja obtenido exitosamente'
    })
  } catch (error) {
    console.error('Error fetching box details:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener el detalle de la caja'
    })
  }
}

// POST /api/boxes/:id/pieces - Register piece(s) from a box
export const registerBoxPieces = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { pieces } = req.body // Array of pieces to register

    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Se requiere al menos una pieza para registrar'
      })
    }

    // Find the box
    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    // Calculate cost per piece
    const costPerPiece = (box.boxPrice || 0) / (box.boxSize || 1)

    // Register each piece
    const registeredPieces = []
    for (const piece of pieces) {
      // Check if item with same carId already exists
      let inventoryItem = asBox(await InventoryItemModel.findOne({
        carId: piece.carId,
        condition: piece.condition || 'mint',
        brand: box.brand || { $exists: false }
      }))

      if (inventoryItem) {
        // Update existing item
        inventoryItem.quantity += 1
        inventoryItem.purchasePrice = costPerPiece
        
        // Update special flags if provided
        if (piece.isTreasureHunt) inventoryItem.isTreasureHunt = true
        if (piece.isSuperTreasureHunt) inventoryItem.isSuperTreasureHunt = true
        if (piece.isChase) inventoryItem.isChase = true
        
        // Merge photos
        if (piece.photos && piece.photos.length > 0) {
          const existingPhotos = inventoryItem.photos || []
          const newPhotos = piece.photos.filter((photo: string) => !existingPhotos.includes(photo))
          inventoryItem.photos = [...existingPhotos, ...newPhotos]
        }
        
        // Append notes
        if (piece.notes) {
          const existingNotes = inventoryItem.notes || ''
          inventoryItem.notes = existingNotes 
            ? `${existingNotes}\n[De ${box.boxName}]: ${piece.notes}`
            : `[De ${box.boxName}]: ${piece.notes}`
        }
        
        // Update source box info
        if (!inventoryItem.sourceBox) {
          inventoryItem.sourceBox = box.boxName
          inventoryItem.sourceBoxId = box._id?.toString()
        }
        
        await inventoryItem.save()
        registeredPieces.push(inventoryItem)
      } else {
        // Create new inventory item
        const newItem = new InventoryItemModel({
          carId: piece.carId,
          quantity: 1,
          purchasePrice: costPerPiece,
          suggestedPrice: piece.suggestedPrice || costPerPiece * 2,
          condition: piece.condition || 'mint',
          brand: box.brand,
          pieceType: box.pieceType,
          isTreasureHunt: piece.isTreasureHunt || false,
          isSuperTreasureHunt: piece.isSuperTreasureHunt || false,
          isChase: piece.isChase || false,
          photos: piece.photos || [],
          location: piece.location || box.location,
          notes: piece.notes 
            ? `De ${box.boxName}\n${piece.notes}`
            : `De ${box.boxName}`,
          sourceBox: box.boxName,
          sourceBoxId: box._id?.toString(),
          dateAdded: new Date()
        })
        await newItem.save()
        registeredPieces.push(newItem)
      }
    }

    // Update box status
    box.registeredPieces = (box.registeredPieces || 0) + pieces.length
    if (box.boxStatus === 'sealed') {
      box.boxStatus = 'unpacking'
    }
    
    // Check if box is complete
    if (box.registeredPieces >= (box.boxSize || 0)) {
      box.boxStatus = 'completed'
      // Delete the box from inventory (it's now empty)
      await InventoryItemModel.findByIdAndDelete(id)
      
      return res.json({
        success: true,
        data: {
          registeredPieces,
          boxCompleted: true
        },
        message: `${pieces.length} pieza(s) registrada(s) exitosamente. ¡Caja completada!`
      })
    }
    
    await box.save()

    res.json({
      success: true,
      data: {
        box,
        registeredPieces,
        boxCompleted: false
      },
      message: `${pieces.length} pieza(s) registrada(s) exitosamente. ${(box.boxSize || 0) - (box.registeredPieces || 0)} piezas pendientes.`
    })
  } catch (error) {
    console.error('Error registering box pieces:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al registrar las piezas'
    })
  }
}

// PUT /api/boxes/:id/complete - Mark box as complete (even if incomplete)
export const completeBox = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body // Optional reason for incomplete completion

    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    // Update box status and delete from inventory
    box.boxStatus = 'completed'
    if (reason) {
      box.notes = `${box.notes}\n[Completada incompleta]: ${reason}`
      await box.save()
    }
    
    await InventoryItemModel.findByIdAndDelete(id)

    res.json({
      success: true,
      data: {
        registeredPieces: box.registeredPieces,
        totalPieces: box.boxSize,
        completed: true
      },
      message: 'Caja marcada como completada'
    })
  } catch (error) {
    console.error('Error completing box:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al completar la caja'
    })
  }
}

// DELETE /api/boxes/:id/pieces/:pieceId - Delete a registered piece from a box
export const deleteBoxPiece = async (req: Request, res: Response) => {
  try {
    const { id, pieceId } = req.params

    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    const piece = asBox(await InventoryItemModel.findById(pieceId))
    if (!piece) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Pieza no encontrada'
      })
    }

    // Verify the piece belongs to this box
    if (piece.sourceBoxId !== id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Esta pieza no pertenece a esta caja'
      })
    }

    // Delete or reduce quantity
    if (piece.quantity > 1) {
      piece.quantity -= 1
      await piece.save()
    } else {
      await InventoryItemModel.findByIdAndDelete(pieceId)
    }

    // Update box registered pieces count
    box.registeredPieces = Math.max(0, (box.registeredPieces || 0) - 1)
    await box.save()

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Pieza eliminada exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Delete box piece error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al eliminar la pieza'
    }
    res.status(500).json(errorResponse)
  }
}

// Update quantity of a registered piece
export const updateBoxPieceQuantity = async (req: Request, res: Response) => {
  try {
    const { id, pieceId } = req.params
    const { quantity } = req.body

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La cantidad debe ser al menos 1'
      })
    }

    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    const piece = asBox(await InventoryItemModel.findById(pieceId))
    if (!piece) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Pieza no encontrada'
      })
    }

    // Verify the piece belongs to this box
    if (piece.sourceBoxId !== id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Esta pieza no pertenece a esta caja'
      })
    }

    const oldQuantity = piece.quantity
    const quantityDiff = quantity - oldQuantity

    // Update piece quantity
    piece.quantity = quantity
    await piece.save()

    // Update box registered pieces count
    box.registeredPieces = Math.max(0, (box.registeredPieces || 0) + quantityDiff)
    await box.save()

    const response: ApiResponse<any> = {
      success: true,
      data: piece,
      message: 'Cantidad actualizada exitosamente'
    }

    res.json(response)
  } catch (error: any) {
    console.error('Update box piece quantity error:', error)
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
      message: 'Error al actualizar la cantidad'
    }
    res.status(500).json(errorResponse)
  }
}

// PUT /api/boxes/:id - Update box information (like adjusting boxSize)
export const updateBox = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    const box = asBox(await InventoryItemModel.findById(id))
    if (!box || !box.isBox) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Caja no encontrada'
      })
    }

    // Allow updating specific fields
    if (updates.boxName) box.boxName = updates.boxName
    if (updates.boxSize) box.boxSize = updates.boxSize
    if (updates.boxPrice) box.boxPrice = updates.boxPrice
    if (updates.location) box.location = updates.location
    if (updates.notes) box.notes = updates.notes

    await box.save()

    res.json({
      success: true,
      data: box,
      message: 'Caja actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error updating box:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar la caja'
    })
  }
}
