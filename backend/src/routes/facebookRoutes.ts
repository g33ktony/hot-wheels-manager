import { Router } from 'express'
import facebookController from '../controllers/facebookController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All Facebook routes require authentication
router.use(authMiddleware)

/**
 * POST /api/facebook/publish
 * Publish selected inventory items to Facebook
 * Body: { itemIds: string[], message: string, includePrice?: boolean }
 */
router.post('/publish', facebookController.publishToFacebook.bind(facebookController))

/**
 * GET /api/facebook/verify
 * Verify Facebook configuration status
 */
router.get('/verify', facebookController.verifyConfiguration.bind(facebookController))

export default router
