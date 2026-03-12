import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { IHotWheelsCar } from '../models/HotWheelsCar'
import { getAllCars, refreshCache } from '../services/hotWheelsCacheService'

const router = express.Router()

/**
 * GET /api/catalog/items
 * Lista items con búsqueda, filtrado y paginación
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { search, series, year, color, page = 1, limit = 50 } = req.query

    // Construir filtro
    let filter: any = {}

    if (search) {
      filter.$or = [
        { carModel: { $regex: search, $options: 'i' } },
        { toy_num: { $regex: search, $options: 'i' } },
        { series: { $regex: search, $options: 'i' } },
      ]
    }

    if (series) {
      filter.hwSeriesType = series
    }

    if (year) {
      filter.year = year
    }

    if (color) {
      filter.colorGroup = color
    }

    const pageNum = Number(page) || 1
    const limitNum = Math.min(Number(limit) || 50, 100)
    const skip = (pageNum - 1) * limitNum

    const items = await HotWheelsCarModel.find(filter)
      .sort({ carModel: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()

    const total = await HotWheelsCarModel.countDocuments(filter)

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('[CATALOG_LIST]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching items',
    })
  }
})

/**
 * GET /api/catalog/items/:id
 * Obtener detalle de un item
 * Soporta tanto MongoDB ObjectId como cache keys (cache-{toy_num})
 */
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    let item = null

    // Check if it's a cache ID (format: cache-{toy_num})
    if (id.startsWith('cache-')) {
      const toy_num = id.replace('cache-', '')
      item = await HotWheelsCarModel.findOne({ toy_num }).lean()
    } else {
      // Try as MongoDB ObjectId first
      try {
        item = await HotWheelsCarModel.findById(id).lean()
      } catch (e) {
        // If not valid ObjectId, try as toy_num
        if (!item) {
          item = await HotWheelsCarModel.findOne({ toy_num: id }).lean()
        }
      }
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      })
    }

    res.json({
      success: true,
      data: item,
    })
  } catch (error) {
    console.error('[CATALOG_DETAIL]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching item',
    })
  }
})

/**
 * PUT /api/catalog/items/:id
 * Actualizar item (campos editables)
 * Soporta tanto MongoDB ObjectId como cache keys (cache-{toy_num})
 */
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Campos permitidos para edición
    const allowedFields = [
      'carModel',
      'color',
      'year',
      'series',
      'colorGroup',
      'colorVariant',
      'colorHex',
      'tampo',
      'wheel_type',
      'segment',
    ]

    // Filtrar solo campos permitidos
    const filteredUpdates: any = {}
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field]
      }
    }

    let updatedItem = null

    // Handle cache ID format (cache-{toy_num})
    if (id.startsWith('cache-')) {
      const toy_num = id.replace('cache-', '')
      updatedItem = await HotWheelsCarModel.findOneAndUpdate(
        { toy_num },
        filteredUpdates,
        { new: true, lean: true }
      )
    } else {
      // Try as MongoDB ObjectId or toy_num
      try {
        updatedItem = await HotWheelsCarModel.findByIdAndUpdate(id, filteredUpdates, {
          new: true,
          lean: true,
        })
      } catch (e) {
        // If not valid ObjectId, try as toy_num
        if (!updatedItem) {
          updatedItem = await HotWheelsCarModel.findOneAndUpdate(
            { toy_num: id },
            filteredUpdates,
            { new: true, lean: true }
          )
        }
      }
    }

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      })
    }

    // Sincronizar con JSON (opcional - si quieres guardarlo)
    // await syncItemToJSON(updatedItem)

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item actualizado correctamente',
    })
  } catch (error) {
    console.error('[CATALOG_UPDATE]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error updating item',
    })
  }
})

/**
 * POST /api/catalog/items/:id/photos
 * Guardar URL de foto (Cloudinary) para un item
 * Soporta tanto MongoDB ObjectId como cache keys (cache-{toy_num})
 */
router.post('/items/:id/photos', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { photoType, photoUrl } = req.body

    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'photoUrl is required and must be a valid HTTPS URL',
      })
    }

    if (!photoType || !['main', 'carded', 'gallery'].includes(photoType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid photoType. Must be: main, carded, or gallery',
      })
    }

    let item = null
    let toyNum = ''

    // Handle cache ID format (cache-{toy_num})
    if (id.startsWith('cache-')) {
      toyNum = id.replace('cache-', '')
      item = await HotWheelsCarModel.findOne({ toy_num: toyNum })
    } else {
      // Try as MongoDB ObjectId or toy_num
      try {
        item = await HotWheelsCarModel.findById(id)
        if (item) toyNum = item.toy_num
      } catch (e) {
        // If not valid ObjectId, try as toy_num
        if (!item) {
          item = await HotWheelsCarModel.findOne({ toy_num: id })
          if (item) toyNum = item.toy_num
          else toyNum = id
        }
      }
    }

    // If item not found, create it from catalog cache
    if (!item && toyNum) {
      const allCars = getAllCars()
      const cachedItem = allCars.find((car: any) => car.toy_num === toyNum)
      
      if (cachedItem) {
        // Parse series_num like "3/8" to extract position number
        const parsePosition = (val: string | undefined): number | undefined => {
          if (!val) return undefined
          const match = val.match(/^(\d+)/)
          return match ? parseInt(match[1], 10) : undefined
        }

        // Create new MongoDB document from cache data
        item = new HotWheelsCarModel({
          toy_num: cachedItem.toy_num,
          col_num: cachedItem.col_num || '',
          carModel: cachedItem.carModel || '',
          series: cachedItem.series || '',
          series_num: cachedItem.series_num || '',
          sub_series: cachedItem.sub_series || '',
          year: cachedItem.year || '',
          brand: cachedItem.brand || 'Hot Wheels',
          color: cachedItem.color || '',
          tampo: cachedItem.tampo || '',
          wheel_type: cachedItem.wheel_type || '',
          car_make: cachedItem.car_make || '',
          segment: cachedItem.segment || '',
          photo_url: cachedItem.photo_url || '',
          photo_url_carded: cachedItem.photo_url_carded || '',
          photo_gallery: Array.isArray(cachedItem.photo_gallery) ? cachedItem.photo_gallery : [],
          seriesPosition: parsePosition(cachedItem.series_num),
        })
        await item.save()
        console.log(`[PHOTO_UPLOAD] Created new item from cache: ${toyNum}`)
      }
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in catalog or cache',
      })
    }

    // Actualizar según tipo de foto
    if (photoType === 'main') {
      item.photo_url = photoUrl
    } else if (photoType === 'carded') {
      item.photo_url_carded = photoUrl
    } else if (photoType === 'gallery') {
      if (!Array.isArray(item.photo_gallery)) {
        item.photo_gallery = []
      }
      item.photo_gallery.push(photoUrl)
    }

    await item.save()

    // Sync photos back to JSON cache so public catalog can see them
    try {
      const cacheDataPath = path.join(__dirname, '../../../backend/data/hotwheels_database.json')
      if (fs.existsSync(cacheDataPath)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheDataPath, 'utf8'))
        const cacheItem = cacheData.find((c: any) => c.toy_num === item.toy_num)
        if (cacheItem) {
          cacheItem.photo_url = item.photo_url || ''
          cacheItem.photo_url_carded = item.photo_url_carded || ''
          cacheItem.photo_gallery = item.photo_gallery || []
          fs.writeFileSync(cacheDataPath, JSON.stringify(cacheData, null, 2))
          // Refresh the in-memory cache so public API serves updated photos immediately
          refreshCache()
          console.log(`[PHOTO_SYNC] Updated cache for ${item.toy_num} (in-memory cache refreshed)`)
        }
      } else {
        console.warn(`[PHOTO_SYNC] Cache file not found at: ${cacheDataPath}`)
      }
    } catch (syncErr) {
      console.warn(`[PHOTO_SYNC] Warning: Failed to sync to cache:`, syncErr instanceof Error ? syncErr.message : syncErr)
    }

    res.json({
      success: true,
      data: item.toObject(),
      message: `${photoType} photo uploaded successfully`,
      fileUrl: photoUrl,
    })
  } catch (error) {
    console.error('[PHOTO_UPLOAD]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error uploading photo',
    })
  }
})

/**
 * DELETE /api/catalog/items/:id/photos/:photoIndex
 * Eliminar foto de galería
 * Soporta tanto MongoDB ObjectId como cache keys (cache-{toy_num})
 */
router.delete('/items/:id/photos/:photoIndex', async (req: Request, res: Response) => {
  try {
    const { id, photoIndex } = req.params
    let item = null

    // Handle cache ID format (cache-{toy_num})
    if (id.startsWith('cache-')) {
      const toy_num = id.replace('cache-', '')
      item = await HotWheelsCarModel.findOne({ toy_num })
    } else {
      // Try as MongoDB ObjectId or toy_num
      try {
        item = await HotWheelsCarModel.findById(id)
      } catch (e) {
        // If not valid ObjectId, try as toy_num
        if (!item) {
          item = await HotWheelsCarModel.findOne({ toy_num: id })
        }
      }
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      })
    }

    const index = Number(photoIndex)

    if (index < 0 || !Array.isArray(item.photo_gallery) || index >= item.photo_gallery.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid photo index',
      })
    }

    // Eliminar archivo físico si es local
    const photoUrl = item.photo_gallery[index]
    if (photoUrl?.startsWith('/uploads/photos/')) {
      const filePath = path.join(__dirname, `../../..${photoUrl}`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    item.photo_gallery.splice(index, 1)
    await item.save()

    res.json({
      success: true,
      data: item.toObject(),
      message: 'Photo deleted successfully',
    })
  } catch (error) {
    console.error('[PHOTO_DELETE]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting photo',
    })
  }
})

/**
 * GET /api/catalog/filters
 * Obtener valores únicos para filtros
 */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const series = await HotWheelsCarModel.distinct('hwSeriesType')
    const years = await HotWheelsCarModel.distinct('year')
    const colors = await HotWheelsCarModel.distinct('colorGroup')

    res.json({
      success: true,
      data: {
        series: series.filter(Boolean).sort(),
        years: (years.filter(Boolean) as any[]).sort((a, b) => Number(b) - Number(a)),
        colors: colors.filter(Boolean).sort(),
      },
    })
  } catch (error) {
    console.error('[CATALOG_FILTERS]', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching filters',
    })
  }
})

export default router
