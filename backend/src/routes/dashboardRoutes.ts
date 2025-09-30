import { Router } from 'express'
import { getDashboardMetrics, getRecentActivity } from '../controllers/dashboardController'

const router = Router()

// GET /api/dashboard/metrics - Get dashboard metrics
router.get('/metrics', getDashboardMetrics)

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', getRecentActivity)

export default router
