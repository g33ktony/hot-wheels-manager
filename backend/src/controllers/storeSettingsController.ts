import { Request, Response } from 'express'
import { StoreSettingsModel, IStoreSettings } from '../models/StoreSettings'

export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    let settings = await StoreSettingsModel.findOne({})

    // Si no existe, crear con valores por defecto
    if (!settings) {
      settings = await StoreSettingsModel.create({
        storeName: 'Mi Tienda de Hot Wheels',
        customMessages: {
          welcome: '¡Bienvenido a nuestra tienda!',
          closing: '¡Gracias por su compra!',
          invoice: 'Factura de Venta',
          delivery: 'Entrega',
          custom: []
        }
      })
    }

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings obtenidos correctamente'
    })
  } catch (error: any) {
    console.error('Error getting store settings:', error)
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener settings: ' + error.message
    })
  }
}

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const { storeName, logo, description, customMessages, colors, contact, publicCatalog } = req.body

    // Validaciones básicas
    if (storeName && typeof storeName !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El nombre de la tienda debe ser un texto'
      })
    }

    // Obtener o crear settings
    let settings = await StoreSettingsModel.findOne({})

    if (!settings) {
      settings = await StoreSettingsModel.create({
        storeName: storeName || 'Mi Tienda de Hot Wheels',
        logo,
        description,
        customMessages: customMessages || {
          welcome: '¡Bienvenido a nuestra tienda!',
          closing: '¡Gracias por su compra!',
          invoice: 'Factura de Venta',
          delivery: 'Entrega',
          custom: []
        },
        colors,
        contact,
        publicCatalog
      })
    } else {
      // Actualizar
      if (storeName) settings.storeName = storeName
      if (logo !== undefined) settings.logo = logo
      if (description !== undefined) settings.description = description

      if (customMessages) {
        settings.customMessages = {
          ...settings.customMessages,
          ...customMessages
        }
      }

      if (colors) {
        settings.colors = {
          ...settings.colors,
          ...colors
        }
      }

      if (contact) {
        settings.contact = {
          ...settings.contact,
          ...contact
        }
      }

      if (publicCatalog) {
        settings.publicCatalog = {
          ...settings.publicCatalog,
          ...publicCatalog
        }
      }

      await settings.save()
    }

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings actualizados correctamente'
    })
  } catch (error: any) {
    console.error('Error updating store settings:', error)
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar settings: ' + error.message
    })
  }
}

export const updateStoreLogo = async (req: Request, res: Response) => {
  try {
    const { logoUrl } = req.body

    if (!logoUrl) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Logo URL es requerida'
      })
    }

    let settings = await StoreSettingsModel.findOne({})
    
    if (!settings) {
      settings = await StoreSettingsModel.create({
        storeName: 'Mi Tienda de Hot Wheels',
        logo: logoUrl
      })
    } else {
      settings.logo = logoUrl
      await settings.save()
    }

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Logo actualizado correctamente'
    })
  } catch (error: any) {
    console.error('Error updating logo:', error)
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar logo: ' + error.message
    })
  }
}

export const addCustomMessage = async (req: Request, res: Response) => {
  try {
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El mensaje debe ser un texto válido'
      })
    }

    let settings = await StoreSettingsModel.findOne({})
    
    if (!settings) {
      settings = await StoreSettingsModel.create({
        storeName: 'Mi Tienda de Hot Wheels',
        customMessages: {
          welcome: '¡Bienvenido a nuestra tienda!',
          closing: '¡Gracias por su compra!',
          invoice: 'Factura de Venta',
          delivery: 'Entrega',
          custom: [message]
        }
      })
    } else {
      if (!settings.customMessages.custom) {
        settings.customMessages.custom = []
      }
      settings.customMessages.custom.push(message)
      await settings.save()
    }

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Mensaje personalizado agregado'
    })
  } catch (error: any) {
    console.error('Error adding custom message:', error)
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al agregar mensaje: ' + error.message
    })
  }
}

export const deleteCustomMessage = async (req: Request, res: Response) => {
  try {
    const { index } = req.params

    const messageIndex = parseInt(index)
    if (isNaN(messageIndex)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Índice inválido'
      })
    }

    let settings = await StoreSettingsModel.findOne({})
    
    if (!settings || !settings.customMessages.custom) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Settings no encontrados'
      })
    }

    if (messageIndex < 0 || messageIndex >= settings.customMessages.custom.length) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Índice fuera de rango'
      })
    }

    settings.customMessages.custom.splice(messageIndex, 1)
    await settings.save()

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Mensaje eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Error deleting custom message:', error)
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar mensaje: ' + error.message
    })
  }
}
