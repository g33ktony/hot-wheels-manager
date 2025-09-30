import { Router } from 'express'
import {
  getHotWheelsCars,
  getHotWheelsCar,
  getSeries,
  getYears,
  loadDatabase
} from '../controllers/hotWheelsController'

const router = Router()

// GET /api/hotwheels - Get all Hot Wheels cars with pagination and filters
router.get('/', getHotWheelsCars)

// GET /api/hotwheels/series - Get all available series
router.get('/series', getSeries)

// GET /api/hotwheels/years - Get all available years
router.get('/years', getYears)

// POST /api/hotwheels/load-database - Load database from JSON file
router.post('/load-database', loadDatabase)

// GET /api/hotwheels/:toy_num - Get single Hot Wheels car by toy number
router.get('/:toy_num', getHotWheelsCar)

export default router
