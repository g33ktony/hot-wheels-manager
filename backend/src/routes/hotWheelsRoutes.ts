import { Router } from 'express'
import {
  searchHotWheelsJSON,
  getHotWheelsCars,
  getHotWheelsCar,
  getSeries,
  getYears,
  loadDatabase,
  downloadDatabase,
  proxyImage
} from '../controllers/hotWheelsController'
import { updateHotWheelsCatalog, getUpdateStatus } from '../controllers/hotWheelsUpdateController'

const router = Router()

// Las rutas más específicas deben venir ANTES que las parametrizadas
// POST /api/hotwheels/update-catalog - Update Hot Wheels catalog from Wiki
router.post('/update-catalog', updateHotWheelsCatalog)

// GET /api/hotwheels/update-status - Get last update status
router.get('/update-status', getUpdateStatus)

// GET /api/hotwheels/download - Download database as JSON
router.get('/download', downloadDatabase)

// GET /api/hotwheels/image - Proxy image URLs to handle CORS
router.get('/image', proxyImage)

// GET /api/hotwheels/search - Search in JSON database
router.get('/search', searchHotWheelsJSON)

// GET /api/hotwheels/series - Get all available series
router.get('/series', getSeries)

// GET /api/hotwheels/years - Get all available years
router.get('/years', getYears)

// POST /api/hotwheels/load-database - Load database from JSON file
router.post('/load-database', loadDatabase)

// GET /api/hotwheels - Get all Hot Wheels cars with pagination and filters
router.get('/', getHotWheelsCars)

// GET /api/hotwheels/:toy_num - Get single Hot Wheels car by toy number (debe ir al final)
router.get('/:toy_num', getHotWheelsCar)

export default router
