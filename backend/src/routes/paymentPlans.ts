import express from 'express'
import {
  getAllPaymentPlans,
  getPaymentPlanByDelivery,
  createPaymentPlan,
  recordPayment,
  updatePaymentPlanStatus,
  deletePaymentPlan
} from '../controllers/paymentPlansController'

const router = express.Router()

// Get all payment plans
router.get('/', getAllPaymentPlans)

// Get payment plan by delivery ID
router.get('/delivery/:deliveryId', getPaymentPlanByDelivery)

// Create payment plan
router.post('/', createPaymentPlan)

// Record payment for a plan
router.post('/:planId/payment', recordPayment)

// Update payment plan status
router.patch('/:planId/status', updatePaymentPlanStatus)

// Delete payment plan
router.delete('/:planId', deletePaymentPlan)

export default router
