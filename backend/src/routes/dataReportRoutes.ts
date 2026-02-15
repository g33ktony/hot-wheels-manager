import { Router } from 'express'
import {
  getDataReports,
  updateDataReport,
  deleteDataReport
} from '../controllers/dataReportController'

const router = Router()

// GET /api/data-reports - List all reports (filtered)
router.get('/', getDataReports)

// PUT /api/data-reports/:id - Update report status
router.put('/:id', updateDataReport)

// DELETE /api/data-reports/:id - Delete a report
router.delete('/:id', deleteDataReport)

export default router
