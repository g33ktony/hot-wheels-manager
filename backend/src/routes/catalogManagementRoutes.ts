import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { IHotWheelsCar } from '../models/HotWheelsCar'

const router = express.Router()

// Configurar multer para uploads
const uploadsDir = path.join(__dirname, '../../uploads/photos')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    cb(null, `${timestamp}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

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
 * Subir/actualizar foto de un item
 * Soporta tanto MongoDB ObjectId como cache keys (cache-{toy_num})
 */
router.post('/items/:id/photos', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { photoType } = req.body // 'main', 'carded', 'gallery'

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      })
    }

    if (!photoType || !['main', 'carded', 'gallery'].includes(photoType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid photoType. Must be: main, carded, or gallery',
      })
    }

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

    // Construct the file URL as absolute URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    const fileUrl = `${backendUrl}/uploads/photos/${req.file.filename}`

    if (!item) {
      // Borrar archivo si item no existe
      fs.unlinkSync(req.file.path)
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      })
    }

    // Actualizar según tipo de foto
    if (photoType === 'main') {
      item.photo_url = fileUrl
    } else if (photoType === 'carded') {
      item.photo_url_carded = fileUrl
    } else if (photoType === 'gallery') {
      if (!Array.isArray(item.photo_gallery)) {
        item.photo_gallery = []
      }
      item.photo_gallery.push(fileUrl)
    }

    await item.save()

    res.json({
      success: true,
      data: item.toObject(),
      message: `${photoType} photo uploaded successfully`,
      fileUrl,
    })
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
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
