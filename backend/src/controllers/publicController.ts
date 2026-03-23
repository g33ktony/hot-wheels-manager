import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { InventoryItemModel } from '../models/InventoryItem'
import { StoreSettingsModel } from '../models/StoreSettings'
import Lead from '../models/Lead'
import axios from 'axios'
import { searchCache, fuzzyMatchCar, getAllCars } from '../services/hotWheelsCacheService'

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

const normalizeSearchValue = (value: string): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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
      brand,
      series,
      preferredToyNum,
      preferredYear,
      sort: sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = Math.min(parseInt(limit as string), 50) // Max 50 items
    const skip = (pageNum - 1) * limitNum
    const sortDir = (sortOrder as string) === 'asc' ? 'asc' : 'desc'

    // Get catalog items from local JSON cache
    const searchTerm = query ? query.toString().trim() : ''
    let catalogItems: any[] = []
    let catalogTotal = 0

    // First: get ALL matching results WITHOUT year filter to discover available years
    const allMatchingResult = searchCache({
      search: searchTerm,
      brand: brand ? brand.toString() : undefined,
      series: series ? series.toString() : undefined,
      page: 1,
      limit: 50000,
    })
    const availableYearsSet = new Set<string>()
    for (const car of allMatchingResult.cars) {
      if (car.year && /^(19|20)\d{2}$/.test(car.year)) availableYearsSet.add(car.year)
    }
    const availableYears = Array.from(availableYearsSet).sort((a, b) => parseInt(b) - parseInt(a))

    // Use local JSON cache for catalog search (with filters applied)
    const cacheResult = searchCache({
      search: searchTerm,
      year: year ? year.toString() : undefined,
      brand: brand ? brand.toString() : undefined,
      series: series ? series.toString() : undefined,
      page: 1,
      limit: 10000, // Get all matching for this request, paginate later with enriched data
    })

    catalogItems = cacheResult.cars.map((car, idx) => ({
      ...car,
      _id: `cache-${car.toy_num || idx}`,
    }))
    catalogTotal = cacheResult.total

    // Check store settings FIRST to see which store has public catalog enabled
    const activeStoreSettings = await StoreSettingsModel.findOne({ 'publicCatalog.showCustomInventory': true })
    const showCustomInventory = !!activeStoreSettings
    const activeStoreId = activeStoreSettings?.storeId

    // Get toy_nums and carModel names to check inventory
    const toyNums = catalogItems.map(item => item.toy_num)
    const carModelNames = catalogItems.map(item => (item.carModel || '').trim()).filter(Boolean)

    // Build reverse map: carModel (lowercase) -> toy_num for matching
    const modelToToyNum = new Map<string, string>()
    catalogItems.forEach(item => {
      if (item.carModel && item.toy_num) {
        modelToToyNum.set(item.carModel.toLowerCase().trim(), item.toy_num)
      }
    })

    // Fetch inventory data - match by BOTH toy_num AND carModel name
    // Inventory items may use car model names as carId instead of toy_nums
    const storeFilter: any = {}
    if (activeStoreId) storeFilter.storeId = activeStoreId

    const allStoreInventory = activeStoreId
      ? await InventoryItemModel
          .find({ storeId: activeStoreId })
          .select('carId carName quantity reservedQuantity actualPrice suggestedPrice photos primaryPhotoIndex')
          .lean()
      : []

    // Create a map for quick lookup: toy_num -> inventory data
    // Match inventory items by: exact toy_num, or carId matching a carModel name
    const inventoryMap = new Map()
    allStoreInventory.forEach(item => {
      const available = item.quantity - (item.reservedQuantity || 0)
      const invData = {
        available: available > 0,
        price: item.actualPrice || item.suggestedPrice,
        quantity: Math.max(0, available)
      }

      // Direct match: carId is a toy_num
      if (toyNums.includes(item.carId)) {
        inventoryMap.set(item.carId, invData)
      } else {
        // carId is a model name - find matching toy_num
        const matchedToyNum = modelToToyNum.get(item.carId.toLowerCase().trim())
        if (matchedToyNum) {
          inventoryMap.set(matchedToyNum, invData)
        }
      }
    })

    // Enrich pack contents with photos from cache (no MongoDB query)
    const allCastingNames = new Set<string>()
    catalogItems.forEach(item => {
      if (item.pack_contents && item.pack_contents.length > 0) {
        item.pack_contents.forEach((car: any) => {
          allCastingNames.add(car.casting_name.trim())
          const cleanName = car.casting_name.replace(/^'+/, '').trim()
          if (cleanName !== car.casting_name.trim()) {
            allCastingNames.add(cleanName)
          }
        })
      }
    })

    // Fetch photos for casting names from cache instead of MongoDB
    const castingPhotos = new Map<string, string>()
    if (allCastingNames.size > 0) {
      const allCachedCars = getAllCars()
      for (const car of allCachedCars) {
        if (car.photo_url && (car.carModel || car.model)) {
          const name = car.carModel || car.model || ''
          const exactKey = name.toLowerCase()
          const cleanedKey = name.replace(/^'+/, '').toLowerCase()
          if (allCastingNames.has(name.trim()) || allCastingNames.has(name.replace(/^'+/, '').trim())) {
            castingPhotos.set(exactKey, car.photo_url)
            castingPhotos.set(cleanedKey, car.photo_url)
          }
        }
      }
    }

    // Enrich catalog items with inventory data
    const enrichedCatalogItems = catalogItems.map(item => {
      const inventoryData = inventoryMap.get(item.toy_num)

      // Enrich pack_contents with photos if available
      let enrichedPackContents = item.pack_contents
      if (item.pack_contents && item.pack_contents.length > 0) {
        enrichedPackContents = item.pack_contents.map((car: any) => {
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
        sub_series: item.sub_series,
        photo_url: item.photo_url || undefined,
        photo_url_carded: item.photo_url_carded || undefined,
        photo_gallery: item.photo_gallery || [],
        year: item.year,
        brand: item.brand || 'Hot Wheels',
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
          ebayPrice: item.ebay_avg_price || null,
          ebayMinPrice: item.ebay_min_price || null,
          ebayMaxPrice: item.ebay_max_price || null,
          ebaySoldCount: item.ebay_sold_count || 0,
        } : {
          available: false,
          ebayPrice: item.ebay_avg_price || null,
          ebayMinPrice: item.ebay_min_price || null,
          ebayMaxPrice: item.ebay_max_price || null,
          ebaySoldCount: item.ebay_sold_count || 0,
        }
      }
    })

    // ALSO search custom inventory items (not in catalog) - ONLY if enabled in settings
    // Use the already-fetched allStoreInventory instead of querying again
    let customInventoryItems: any[] = []
    if (showCustomInventory && allStoreInventory.length > 0) {
      if (searchTerm) {
        // Filter from already-loaded inventory
        const searchLower = searchTerm.toLowerCase()

        // Regex match
        const regexMatches = allStoreInventory.filter(item => {
          const carId = (item.carId || '').toLowerCase()
          const carName = ((item as any).carName || '').toLowerCase()
          return carId.includes(searchLower) || carName.includes(searchLower)
        })

        // Fuzzy match for items not caught by regex
        const fuzzyMatches = allStoreInventory
          .map(item => {
            const searchableItem = {
              carModel: (item as any).carName || item.carId,
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
        const customMap = new Map<string, any>()
        regexMatches.forEach(item => customMap.set(item._id.toString(), item))
        fuzzyMatches.forEach(item => {
          if (!customMap.has(item._id.toString())) {
            customMap.set(item._id.toString(), item)
          }
        })

        customInventoryItems = Array.from(customMap.values())
      } else {
        // No search term - use all store inventory items
        customInventoryItems = [...allStoreInventory]
      }
    }

    // Filter out inventory items that already matched a catalog item (by toy_num or model name)
    const catalogCarIds = new Set(toyNums)
    const catalogModelNames = new Set(catalogItems.map((item: any) => (item.carModel || '').toLowerCase().trim()).filter(Boolean))
    const customOnlyItems = customInventoryItems.filter(item => {
      // Exclude if carId matches a toy_num directly
      if (catalogCarIds.has(item.carId)) return false
      // Exclude if carId (model name) matches a catalog carModel
      if (catalogModelNames.has(item.carId.toLowerCase().trim())) return false
      return true
    })

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
        photo_url_carded: null,
        photo_gallery: primaryPhoto ? [primaryPhoto] : [],
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

    // After enriching, build a position map to preserve the fuzzy-score order from searchCache
    const catalogItemPositionMap = new Map<string, number>()
    enrichedCatalogItems.forEach((item, idx) => {
      catalogItemPositionMap.set(item._id, idx)
    })

    // Combine catalog and custom items
    const allItems = [...enrichedCatalogItems, ...enrichedCustomItems]
    const total = catalogTotal + customOnlyItems.length

    if (searchTerm) {
      // When searching: sort by relevance
      // 1st priority: exact normalized carModel match
      // 2nd priority: preferred toy number / year (used by featured random item)
      // 3rd priority: preserve fuzzy-score position from searchCache for catalog items
      // Custom inventory items go after catalog items
      const normalizedSearch = normalizeSearchValue(searchTerm)
      const normalizedPreferredToyNum = normalizeSearchValue(preferredToyNum ? preferredToyNum.toString() : '')
      const preferredYearValue = preferredYear ? preferredYear.toString() : ''

      const getPriority = (item: any) => {
        let score = 0
        const normalizedModel = normalizeSearchValue(item.carModel || '')
        const normalizedToyNum = normalizeSearchValue(item.toy_num || '')

        if (normalizedModel === normalizedSearch) score += 1000
        else if (normalizedModel.startsWith(normalizedSearch) && normalizedSearch) score += 400

        if (normalizedPreferredToyNum && normalizedToyNum === normalizedPreferredToyNum) score += 250
        if (preferredYearValue && String(item.year || '') === preferredYearValue) score += 100

        return score
      }

      allItems.sort((a, b) => {
        const priorityDiff = getPriority(b) - getPriority(a)
        if (priorityDiff !== 0) return priorityDiff

        const aPos = catalogItemPositionMap.get(a._id)
        const bPos = catalogItemPositionMap.get(b._id)
        const safeAPos = aPos !== undefined ? aPos : Number.MAX_SAFE_INTEGER
        const safeBPos = bPos !== undefined ? bPos : Number.MAX_SAFE_INTEGER
        return safeAPos - safeBPos
      })
    } else {
      // When no search: sort by year (asc/desc), then available first, then alphabetically
      allItems.sort((a, b) => {
        const yA = parseInt(a.year) || 0
        const yB = parseInt(b.year) || 0
        if (yA !== yB) return sortDir === 'desc' ? yB - yA : yA - yB
        if (a.availability.available && !b.availability.available) return -1
        if (!a.availability.available && b.availability.available) return 1
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
      availableYears,
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
      .select('toy_num col_num carModel series series_num photo_url photo_url_carded photo_gallery year brand color tampo wheel_type car_make segment pack_contents')
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
/**
 * Get a random catalog item that has a photo (from in-memory JSON cache)
 */
export const getRandomCatalogItem = async (_req: Request, res: Response): Promise<void> => {
  try {
    const allCars = getAllCars()

    // Filter to items with valid HTTPS photos
    const withPhotos = allCars.filter(car => {
      const url = String(car.photo_url || '').trim()
      return url.startsWith('https://') && car.carModel
    })

    if (withPhotos.length === 0) {
      res.status(404).json({ success: false, error: 'No items found' })
      return
    }

    const randomIndex = Math.floor(Math.random() * withPhotos.length)
    const car = withPhotos[randomIndex]

    res.json({
      success: true,
      data: {
        _id: `cache-${car.toy_num || randomIndex}`,
        toy_num: car.toy_num,
        col_num: car.col_num,
        carModel: car.carModel,
        series: car.series,
        year: car.year,
        brand: (car as any).brand || 'Hot Wheels',
        color: car.color,
        wheel_type: car.wheel_type,
        car_make: car.car_make,
        segment: (car as any).segment,
        photo_url: car.photo_url,
        photo_url_carded: car.photo_url_carded,
        ebay_avg_price: car.ebay_avg_price || null,
      }
    })
  } catch (error) {
    console.error('Error getting random catalog item:', error)
    res.status(500).json({ success: false, error: 'Error al obtener item aleatorio' })
  }
}

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
