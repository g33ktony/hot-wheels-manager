import express from 'express'
import {
  getLeads,
  getLeadStatistics,
  getLeadById,
  updateLead,
  deleteLead,
  exportLeads
} from '../controllers/leadsController'

const router = express.Router()

// All these routes are protected by auth middleware (applied in index.ts)

// Get all leads with filtering
router.get('/', getLeads)

// Get lead statistics
router.get('/statistics', getLeadStatistics)

// Export leads to CSV
router.get('/export', exportLeads)

// Get single lead
router.get('/:id', getLeadById)

// Update lead (status, notes)
router.patch('/:id', updateLead)

// Delete lead
router.delete('/:id', deleteLead)

export default router
