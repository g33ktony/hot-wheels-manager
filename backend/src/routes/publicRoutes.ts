import { Router } from 'express'
import {
  searchCatalog,
  getCatalogItem,
  createLead,
  trackItemView
} from '../controllers/publicController'

const router = Router()

// GET /api/public/catalog/search - Search catalog with availability
router.get('/catalog/search', searchCatalog)

// GET /api/public/catalog/:id - Get single catalog item with availability
router.get('/catalog/:id', getCatalogItem)

// POST /api/public/leads - Create or update lead (with reCAPTCHA)
router.post('/leads', createLead)

// POST /api/public/track-view - Track item view (optional analytics)
router.post('/track-view', trackItemView)

export default router
