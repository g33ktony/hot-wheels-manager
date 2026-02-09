import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { InventoryItemModel } from '../models/InventoryItem'
import Lead from '../models/Lead'
import axios from 'axios'

/**
 * Search Hot Wheels catalog with inventory availability
 * Returns catalog items with availability, pricing, and eBay comparison
 * ALSO includes custom inventory items not in the catalog
 */
export const searchCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q: query = '',
      year,
      series,
      page = 1,
      limit = 20
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const limitNum = Math.min(parseInt(limit as string), 50) // Max 50 items

    // Build search filter for catalog
    const catalogSearchFilter: any = {}

    // Text search on model, series, car_make
    if (query && query.toString().trim()) {
      const searchTerm = query.toString().trim()
      catalogSearchFilter.$or = [
        { carModel: { $regex: searchTerm, $options: 'i' } },
        { series: { $regex: searchTerm, $options: 'i' } },
        { car_make: { $regex: searchTerm, $options: 'i' } }
      ]
    }

    // Year filter
    if (year) {
      catalogSearchFilter.year = year.toString()
    }

    // Series filter
    if (series) {
      catalogSearchFilter.series = { $regex: series, $options: 'i' }
    }

    // Get catalog items
    const catalogItems = await HotWheelsCarModel
      .find(catalogSearchFilter)
      .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment')
      .sort({ year: -1, carModel: 1 })
      .lean()

    // Get total count from catalog
    const catalogTotal = await HotWheelsCarModel.countDocuments(catalogSearchFilter)

    // Get toy_nums to check inventory
    const toyNums = catalogItems.map(item => item.toy_num)

    // Fetch inventory data for catalog items
    const catalogInventoryItems = await InventoryItemModel
      .find({
        carId: { $in: toyNums },
        quantity: { $gt: 0 } // Only items with stock
      })
      .select('carId quantity reservedQuantity actualPrice suggestedPrice')
      .lean()

    // Create a map for quick lookup: carId -> inventory data
    const inventoryMap = new Map()
    catalogInventoryItems.forEach(item => {
      const available = item.quantity - (item.reservedQuantity || 0)
      if (available > 0) {
        inventoryMap.set(item.carId, {
          available: true,
          price: item.actualPrice || item.suggestedPrice,
          quantity: available
        })
      }
    })

    // Enrich catalog items with inventory data
    const enrichedCatalogItems = catalogItems.map(item => {
      const inventoryData = inventoryMap.get(item.toy_num)

      return {
        _id: item._id,
        toy_num: item.toy_num,
        col_num: item.col_num,
        carModel: item.carModel,
        series: item.series,
        series_num: item.series_num,
        photo_url: item.photo_url,
        year: item.year,
        color: item.color,
        tampo: item.tampo,
        wheel_type: item.wheel_type,
        car_make: item.car_make,
        segment: item.segment,
        // Inventory data (if available)
        availability: inventoryData ? {
          available: true,
          price: inventoryData.price,
          quantity: inventoryData.quantity,
          // eBay price could be added here if available in catalog or separate collection
          // ebayPrice: item.ebayPrice || null
        } : {
          available: false
        }
      }
    })

    // ALSO search custom inventory items (not in catalog)
    const inventorySearchFilter: any = {
      quantity: { $gt: 0 } // Only items with stock
    }

    // Apply same search filters for inventory
    if (query && query.toString().trim()) {
      const searchTerm = query.toString().trim()
      inventorySearchFilter.$or = [
        { carName: { $regex: searchTerm, $options: 'i' } },
        { carId: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } }
      ]
    }

    // Get custom inventory items (not matching catalog)
    const customInventoryItems = await InventoryItemModel
      .find(inventorySearchFilter)
      .select('_id carId carName brand quantity reservedQuantity actualPrice suggestedPrice photos primaryPhotoIndex')
      .lean()

    // Filter out items that are already in catalog (matched by carId)
    const catalogCarIds = new Set(toyNums)
    const customOnlyItems = customInventoryItems.filter(item => !catalogCarIds.has(item.carId))

    // Convert custom inventory items to catalog format
    const enrichedCustomItems = customOnlyItems.map(item => {
      const available = item.quantity - (item.reservedQuantity || 0)
      const primaryPhoto = item.photos && item.photos.length > 0
        ? item.photos[item.primaryPhotoIndex || 0]
        : null

      return {
        _id: item._id,
        toy_num: item.carId,
        col_num: null,
        carModel: item.carName || item.carId,
        series: 'Custom / Sin Serie', // Custom items don't have series
        series_num: null,
        photo_url: primaryPhoto,
        year: new Date().getFullYear().toString(), // Use current year
        color: null,
        tampo: null,
        wheel_type: null,
        car_make: item.brand || 'Desconocido',
        segment: null,
        availability: available > 0 ? {
          available: true,
          price: item.actualPrice || item.suggestedPrice,
          quantity: available
        } : {
          available: false
        }
      }
    })

    // Combine catalog and custom items
    const allItems = [...enrichedCatalogItems, ...enrichedCustomItems]
    const total = catalogTotal + customOnlyItems.length

    // Sort combined results (available items first, then by name)
    allItems.sort((a, b) => {
      // Available items first
      if (a.availability.available && !b.availability.available) return -1
      if (!a.availability.available && b.availability.available) return 1
      // Then alphabetically (handle undefined/null carModel)
      const aModel = a.carModel || ''
      const bModel = b.carModel || ''
      return aModel.localeCompare(bModel)
    })

    // Apply pagination to combined results
    const paginatedItems = allItems.slice(skip, skip + limitNum)

    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error: any) {
    console.error('Error searching catalog:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      success: false,
      error: 'Error al buscar en el catálogo',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Get single catalog item with inventory details
 */
export const getCatalogItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Get catalog item
    const catalogItem = await HotWheelsCarModel
      .findById(id)
      .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment')
      .lean()

    if (!catalogItem) {
      res.status(404).json({
        success: false,
        error: 'Item no encontrado'
      })
      return
    }

    // Check inventory
    const inventoryItem = await InventoryItemModel
      .findOne({
        carId: catalogItem.toy_num,
        quantity: { $gt: 0 }
      })
      .select('quantity reservedQuantity actualPrice suggestedPrice')
      .lean()

    let availability
    if (inventoryItem) {
      const available = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)
      availability = available > 0 ? {
        available: true,
        price: inventoryItem.actualPrice || inventoryItem.suggestedPrice,
        quantity: available
      } : {
        available: false
      }
    } else {
      availability = { available: false }
    }

    res.json({
      success: true,
      data: {
        ...catalogItem,
        availability
      }
    })
  } catch (error) {
    console.error('Error getting catalog item:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener el item'
    })
  }
}

/**
 * Create a new lead (requires reCAPTCHA verification)
 */
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      estado,
      municipio,
      interestedInItem,
      message,
      recaptchaToken
    } = req.body

    // Validate required fields
    if (!name || !email || !estado || !municipio) {
      res.status(400).json({
        success: false,
        error: 'Nombre, email, estado y municipio son requeridos'
      })
      return
    }

    // Verify reCAPTCHA
    // TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas
    /*
    if (!recaptchaToken) {
      res.status(400).json({
        success: false,
        error: 'reCAPTCHA token es requerido'
      })
      return
    }

    try {
      const recaptchaResponse = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        null,
        {
          params: {
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: recaptchaToken
          }
        }
      )

      if (!recaptchaResponse.data.success || recaptchaResponse.data.score < 0.5) {
        res.status(400).json({
          success: false,
          error: 'Verificación de reCAPTCHA falló'
        })
        return
      }
    } catch (recaptchaError) {
      console.error('reCAPTCHA verification error:', recaptchaError)
      res.status(500).json({
        success: false,
        error: 'Error al verificar reCAPTCHA'
      })
      return
    }
    */

    // Extract metadata
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer')
    }

    // Check if lead already exists (update instead of create)
    const existingLead = await Lead.findOne({ email })

    if (existingLead) {
      // Update existing lead
      existingLead.name = name
      existingLead.phone = phone || existingLead.phone
      existingLead.estado = estado
      existingLead.municipio = municipio

      if (interestedInItem) {
        existingLead.interestedInItem = interestedInItem
      }

      if (message) {
        existingLead.message = message
      }

      existingLead.metadata = metadata
      existingLead.registeredAt = new Date() // Update timestamp

      await existingLead.save()

      res.json({
        success: true,
        message: 'Gracias! Hemos actualizado tu información.'
      })
    } else {
      // Create new lead
      const lead = new Lead({
        name,
        email,
        phone,
        estado,
        municipio,
        interestedInItem,
        message,
        metadata
      })

      await lead.save()

      res.json({
        success: true,
        message: 'Gracias por tu interés! Te contactaremos pronto.'
      })
    }
  } catch (error: any) {
    console.error('Error creating lead:', error)

    // Handle duplicate email error
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'Este email ya está registrado'
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Error al registrar tu información'
    })
  }
}

/**
 * Track item view (optional analytics)
 */
export const trackItemView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { catalogId, carModel } = req.body
    const { email } = req.query

    if (!email || !catalogId) {
      res.status(400).json({
        success: false,
        error: 'Email y catalogId son requeridos'
      })
      return
    }

    // Find lead and add viewed item
    const lead = await Lead.findOne({ email: email as string })

    if (lead) {
      // Check if item already viewed
      const alreadyViewed = lead.viewedItems.some(
        item => item.catalogId === catalogId
      )

      if (!alreadyViewed) {
        lead.viewedItems.push({
          catalogId,
          carModel,
          viewedAt: new Date()
        })
        await lead.save()
      }

      res.json({
        success: true,
        message: 'Vista registrada'
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Lead no encontrado'
      })
    }
  } catch (error) {
    console.error('Error tracking view:', error)
    res.status(500).json({
      success: false,
      error: 'Error al registrar vista'
    })
  }
}
