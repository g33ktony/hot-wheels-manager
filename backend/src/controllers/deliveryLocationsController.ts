import { Request, Response } from 'express'
import { DeliveryLocationModel } from '../models/DeliveryLocation'

// Get all delivery locations
export const getDeliveryLocations = async (req: Request, res: Response) => {
  try {
    const locations = await DeliveryLocationModel.find().sort({ name: 1 })
    
    res.json({
      success: true,
      data: locations,
      message: 'Ubicaciones obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error getting delivery locations:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las ubicaciones'
    })
  }
}

// Create delivery location
export const createDeliveryLocation = async (req: Request, res: Response) => {
  try {
    const { name } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El nombre es obligatorio'
      })
    }

    // Check if location already exists
    const existingLocation = await DeliveryLocationModel.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    })

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Esta ubicación ya existe'
      })
    }

    const location = new DeliveryLocationModel({
      name: name.trim()
    })

    await location.save()

    res.status(201).json({
      success: true,
      data: location,
      message: 'Ubicación creada exitosamente'
    })
  } catch (error) {
    console.error('Error creating delivery location:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear la ubicación'
    })
  }
}

// Delete delivery location
export const deleteDeliveryLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const location = await DeliveryLocationModel.findByIdAndDelete(id)

    if (!location) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Ubicación no encontrada'
      })
    }

    res.json({
      success: true,
      data: location,
      message: 'Ubicación eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting delivery location:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar la ubicación'
    })
  }
}
