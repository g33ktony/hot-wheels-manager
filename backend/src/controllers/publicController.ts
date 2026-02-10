import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { InventoryItemModel } from '../models/InventoryItem'
import { StoreSettingsModel } from '../models/StoreSettings'
import Lead from '../models/Lead'
import axios from 'axios'

/**
 * Función para calcular similitud entre dos strings usando bigramas
 * Útil para búsquedas fuzzy que permiten encontrar coincidencias parciales
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // Si una string contiene a la otra, alta similitud
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85
  }

  // Calcular caracteres en común
  const chars1 = new Set(s1.split(''))
  const chars2 = new Set(s2.split(''))
  const intersection = new Set([...chars1].filter(x => chars2.has(x)))

  // Calcular similitud básica por caracteres comunes
  const charSimilarity = (intersection.size * 2) / (chars1.size + chars2.size)

  // Calcular similitud por secuencias (n-gramas de 2 caracteres)
  const bigrams1 = []
  const bigrams2 = []

  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.push(s1.substring(i, i + 2))
  }
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.push(s2.substring(i, i + 2))
  }

  if (bigrams1.length === 0 || bigrams2.length === 0) {
    return charSimilarity
  }

  const bigramSet1 = new Set(bigrams1)
  const bigramSet2 = new Set(bigrams2)
  const bigramIntersection = new Set([...bigramSet1].filter(x => bigramSet2.has(x)))
  const bigramSimilarity = (bigramIntersection.size * 2) / (bigramSet1.size + bigramSet2.size)

  // Combinar ambas métricas (dar más peso a la similitud de secuencias)
  return (charSimilarity * 0.3 + bigramSimilarity * 0.7)
}

/**
 * Función para buscar con fuzzy matching en todos los campos
 * Mejoras:
 * - Threshold dinámico según longitud de búsqueda
 * - Prioriza coincidencias en carModel
 * - Reduce falsos positivos en búsquedas numéricas
 * - EXCEPCIÓN: Si el término está contenido, siempre match
 */
const fuzzyMatch = (car: any, searchTerm: string, baseThreshold = 0.45): { match: boolean; score: number } => {
  const searchLower = searchTerm.toLowerCase().trim()

  // Ignore empty search terms
  if (!searchLower) {
    return { match: false, score: 0 }
  }

  // Threshold dinámico: búsquedas más cortas necesitan mayor precisión
  // PERO si el término está contenido en el campo, siempre es válido
  const dynamicThreshold = searchLower.length <= 4
    ? Math.max(baseThreshold + 0.25, 0.7) // Búsquedas cortas: threshold alto
    : baseThreshold

  // Campos con pesos diferentes (priorizar carModel)
  const fieldsWithWeights = [
    { field: String(car.carModel || ''), weight: 1.0, name: 'carModel' },      // Máxima prioridad
    { field: String(car.series || ''), weight: 0.8, name: 'series' },          // Alta prioridad
    { field: String(car.car_make || ''), weight: 0.9, name: 'car_make' },      // Alta prioridad
    { field: String(car.year || ''), weight: 0.6, name: 'year' },              // Media prioridad
    { field: String(car.toy_num || ''), weight: 0.5, name: 'toy_num' },        // Baja prioridad
    { field: String(car.col_num || ''), weight: 0.4, name: 'col_num' },        // Baja prioridad
    { field: String(car.series_num || ''), weight: 0.4, name: 'series_num' }   // Baja prioridad
  ]

  let maxScore = 0
  let bestFieldName = ''

  for (const { field, weight, name } of fieldsWithWeights) {
    const fieldLower = field.toLowerCase()

    // Skip empty fields
    if (!fieldLower) continue

    let fieldScore = 0

    // Coincidencia exacta = máxima puntuación
    if (fieldLower === searchLower) {
      return { match: true, score: 1.0 }
    }

    // IMPORTANTE: Si el término está CONTENIDO en el campo, asignar score alto independiente del threshold
    if (fieldLower.includes(searchLower)) {
      fieldScore = 0.95 // Score muy alto para términos contenidos
    } else {
      // Calcular similitud
      const similarity = calculateSimilarity(fieldLower, searchLower)
      fieldScore = similarity
    }

    // Aplicar peso del campo
    const weightedScore = fieldScore * weight

    if (weightedScore > maxScore) {
      maxScore = weightedScore
      bestFieldName = name
    }
  }

  // Boost adicional si la mejor coincidencia es en carModel o car_make
  if (bestFieldName === 'carModel' || bestFieldName === 'car_make') {
    maxScore = Math.min(maxScore * 1.1, 1.0)
  }

  // Para términos contenidos (score 0.95), siempre hacer match independiente del threshold
  const effectiveThreshold = maxScore >= 0.9 ? 0.45 : dynamicThreshold

  return {
    match: maxScore >= effectiveThreshold,
    score: maxScore
  }
}

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

    const pageNum = parseInt(page as string)
    const limitNum = Math.min(parseInt(limit as string), 50) // Max 50 items
    const skip = (pageNum - 1) * limitNum

    // Build search filter for catalog
    const catalogSearchFilter: any = {}

    // Year filter
    if (year) {
      catalogSearchFilter.year = year.toString()
    }

    // Series filter (still use regex for series)
    if (series) {
      catalogSearchFilter.series = { $regex: series, $options: 'i' }
    }

    // Get catalog items
    // If there's a search query, get more items to apply fuzzy matching
    const searchTerm = query ? query.toString().trim() : ''
    let catalogItems = []
    let catalogTotal = 0

    if (searchTerm) {
      // Get items that match via regex (fast initial filter)
      const preFilter: any = {
        ...catalogSearchFilter,
        $or: [
          { carModel: { $regex: searchTerm, $options: 'i' } },
          { series: { $regex: searchTerm, $options: 'i' } },
          { car_make: { $regex: searchTerm, $options: 'i' } },
          { toy_num: { $regex: searchTerm, $options: 'i' } }
        ]
      }

      const matchedItems = await HotWheelsCarModel
        .find(preFilter)
        .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment pack_contents')
        .limit(1000) // Increased to get more potential matches
        .lean()

      // Debug: check if pack_contents is in query result
      const packsFound = matchedItems.filter((i: any) => i.pack_contents && i.pack_contents.length > 0)
      if (packsFound.length > 0) {
        console.log(`DEBUG: Query found ${packsFound.length} items with pack_contents`)
        console.log(`DEBUG: First pack:`, JSON.stringify(packsFound[0].pack_contents?.[0], null, 2))
      }

      // ALWAYS score and sort results when there's a search term
      if (matchedItems.length > 0) {
        const scoredResults = matchedItems
          .map(item => {
            const { score } = fuzzyMatch(item, searchTerm, 0.45)
            return { item, score }
          })
          .filter(result => result.score >= 0.45) // Only keep items above threshold
          .sort((a, b) => b.score - a.score) // Sort by best match FIRST

        catalogItems = scoredResults.map(result => result.item)
      } else {
        // No regex matches - try fuzzy on larger dataset
        const allItems = await HotWheelsCarModel
          .find(catalogSearchFilter)
          .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment pack_contents')
          .limit(5000)
          .lean()

        const fuzzyResults = allItems
          .map(item => {
            const { match, score } = fuzzyMatch(item, searchTerm, 0.45)
            return { item, match, score }
          })
          .filter(result => result.match)
          .sort((a, b) => b.score - a.score)
          .map(result => result.item)

        catalogItems = fuzzyResults
      }

      catalogTotal = catalogItems.length
    } else {
      // No search term - get all items with filters
      catalogItems = await HotWheelsCarModel
        .find(catalogSearchFilter)
        .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment pack_contents')
        .sort({ year: -1, carModel: 1 })
        .lean()

      catalogTotal = await HotWheelsCarModel.countDocuments(catalogSearchFilter)
    }

    // Get toy_nums to check inventory
    const toyNums = catalogItems.map(item => item.toy_num)

    // Fetch inventory data for catalog items (including items without stock)
    const catalogInventoryItems = await InventoryItemModel
      .find({
        carId: { $in: toyNums }
        // Show all items, not just those with stock
      })
      .select('carId quantity reservedQuantity actualPrice suggestedPrice')
      .lean()

    // Create a map for quick lookup: carId -> inventory data
    const inventoryMap = new Map()
    catalogInventoryItems.forEach(item => {
      const available = item.quantity - (item.reservedQuantity || 0)
      inventoryMap.set(item.carId, {
        available: available > 0,
        price: item.actualPrice || item.suggestedPrice,
        quantity: Math.max(0, available)
      })
    })

    // Enrich pack contents with photos from catalog
    // Get all unique casting names from all packs
    const allCastingNames = new Set<string>()
    catalogItems.forEach(item => {
      if (item.pack_contents && item.pack_contents.length > 0) {
        item.pack_contents.forEach(car => {
          // Add both original name and cleaned name (without leading apostrophes)
          allCastingNames.add(car.casting_name.trim())
          const cleanName = car.casting_name.replace(/^'+/, '').trim()
          if (cleanName !== car.casting_name.trim()) {
            allCastingNames.add(cleanName)
          }
        })
      }
    })

    // Fetch photos for all casting names in one query
    const castingPhotos = new Map<string, string>()
    if (allCastingNames.size > 0) {
      const castingNameArray = Array.from(allCastingNames)

      // Build regex query for case-insensitive matching
      // Use startsWith pattern to handle variations (e.g., "'12 Corvette Z06" matches "'12 Corvette Z06" or "'12 Corvette Z06 (2012)")
      const regexQueries = castingNameArray.map(name => ({
        carModel: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' }
      }))

      const carsWithPhotos = await HotWheelsCarModel.find({
        $or: regexQueries
      }).select('carModel photo_url').lean()

      carsWithPhotos.forEach(car => {
        if (car.photo_url) {
          // Map both exact name and cleaned name (without leading apostrophes)
          const exactKey = car.carModel.toLowerCase()
          const cleanedKey = car.carModel.replace(/^'+/, '').toLowerCase()
          castingPhotos.set(exactKey, car.photo_url)
          castingPhotos.set(cleanedKey, car.photo_url)
        }
      })
    }

    // Enrich catalog items with inventory data
    const enrichedCatalogItems = catalogItems.map(item => {
      const inventoryData = inventoryMap.get(item.toy_num)

      // Enrich pack_contents with photos if available
      let enrichedPackContents = item.pack_contents
      if (item.pack_contents && item.pack_contents.length > 0) {
        enrichedPackContents = item.pack_contents.map(car => {
          const cleanName = car.casting_name.replace(/^'+/, '').trim()
          // Try both with and without apostrophes
          const photo = castingPhotos.get(cleanName.toLowerCase()) ||
                       castingPhotos.get(car.casting_name.toLowerCase())
          return {
            ...car,
            photo_url: photo || undefined
          }
        })
      }

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
        pack_contents: enrichedPackContents, // Include pack contents with photos
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

    // Check store settings to see if custom inventory should be shown in public catalog
    const storeSettings = await StoreSettingsModel.findOne({})
    const showCustomInventory = storeSettings?.publicCatalog?.showCustomInventory ?? false

    // ALSO search custom inventory items (not in catalog) - ONLY if enabled in settings
    let customInventoryItems = []
    if (showCustomInventory) {
      if (searchTerm) {
        // Try regex first
        const regexFilter: any = {
          $or: [
            { carName: { $regex: searchTerm, $options: 'i' } },
            { carId: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } }
          ]
        }

        customInventoryItems = await InventoryItemModel
          .find(regexFilter)
          .select('_id carId carName brand quantity reservedQuantity actualPrice suggestedPrice photos primaryPhotoIndex')
          .lean()

        // If not enough results, try fuzzy matching
        if (customInventoryItems.length < 10) {
          const allCustomItems = await InventoryItemModel
            .find({})
            .select('_id carId carName brand quantity reservedQuantity actualPrice suggestedPrice photos primaryPhotoIndex')
            .limit(1000)
            .lean()

          const fuzzyCustomResults = allCustomItems
            .map(item => {
              // Create a searchable object similar to catalog items
              const searchableItem = {
                carModel: item.carName || item.carId,
                series: '',
                year: '',
                toy_num: item.carId,
                col_num: '',
                series_num: ''
              }
              const { match, score } = fuzzyMatch(searchableItem, searchTerm, 0.45)
              return { item, match, score }
            })
            .filter(result => result.match)
            .sort((a, b) => b.score - a.score)
            .map(result => result.item)

          // Combine regex and fuzzy results
          const customMap = new Map()
          customInventoryItems.forEach(item => customMap.set(item._id.toString(), item))
          fuzzyCustomResults.forEach(item => {
            if (!customMap.has(item._id.toString())) {
              customMap.set(item._id.toString(), item)
            }
          })

          customInventoryItems = Array.from(customMap.values())
        }
      } else {
        // No search term - get all custom items
        customInventoryItems = await InventoryItemModel
          .find({})
          .select('_id carId carName brand quantity reservedQuantity actualPrice suggestedPrice photos primaryPhotoIndex')
          .lean()
      }
    }

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
        availability: {
          available: available > 0,
          price: item.actualPrice || item.suggestedPrice,
          quantity: Math.max(0, available)
        }
      }
    })

    // Combine catalog and custom items
    const allItems = [...enrichedCatalogItems, ...enrichedCustomItems]
    const total = catalogTotal + customOnlyItems.length

    // Sort combined results only if NO search term (preserve score-based ordering when searching)
    if (!searchTerm) {
      allItems.sort((a, b) => {
        // Available items first
        if (a.availability.available && !b.availability.available) return -1
        if (!a.availability.available && b.availability.available) return 1
        // Then alphabetically (handle undefined/null carModel)
        const aModel = a.carModel || ''
        const bModel = b.carModel || ''
        return aModel.localeCompare(bModel)
      })
    }

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
      .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment pack_contents')
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
