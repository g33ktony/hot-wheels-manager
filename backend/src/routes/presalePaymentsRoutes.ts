import { Router, Request, Response } from 'express'
import PreSalePaymentService from '../services/PreSalePaymentService'

const router = Router()

/**
 * Pre-Sale Payment Plans Routes
 * Handles payment plan management, payment recording, and analytics
 */

// POST /api/presale/payments - Create new payment plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      deliveryId,
      totalAmount,
      numberOfPayments,
      paymentFrequency,
      startDate,
      customerId,
      preIntegrationCustomer,
      earlyPaymentBonus
    } = req.body

    if (!deliveryId || !totalAmount || !numberOfPayments) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deliveryId, totalAmount, numberOfPayments'
      })
    }

    const paymentPlan = await PreSalePaymentService.createPaymentPlan(
      deliveryId,
      totalAmount,
      numberOfPayments,
      paymentFrequency || 'weekly',
      startDate ? new Date(startDate) : new Date(),
      customerId,
      preIntegrationCustomer,
      earlyPaymentBonus
    )

    res.status(201).json({
      success: true,
      message: 'Payment plan created successfully',
      data: paymentPlan
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment plan'
    })
  }
})

// GET /api/presale/payments/:id - Get payment plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const paymentPlan = await PreSalePaymentService.getPaymentPlan(id)

    if (!paymentPlan) {
      return res.status(404).json({
        success: false,
        error: 'Payment plan not found'
      })
    }

    res.json({
      success: true,
      data: paymentPlan
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment plan'
    })
  }
})

// GET /api/presale/payments/delivery/:deliveryId - Get payment plan by delivery
router.get('/delivery/:deliveryId', async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params
    const paymentPlan = await PreSalePaymentService.getPaymentPlanByDelivery(deliveryId)

    if (!paymentPlan) {
      return res.status(404).json({
        success: false,
        error: 'Payment plan not found for this delivery'
      })
    }

    res.json({
      success: true,
      data: paymentPlan
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment plan'
    })
  }
})

// POST /api/presale/payments/:id/record - Record a payment
router.post('/:id/record', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { amount, paymentDate, notes } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0'
      })
    }

    const result = await PreSalePaymentService.recordPayment(
      id,
      amount,
      paymentDate ? new Date(paymentDate) : new Date(),
      notes
    )

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment'
    })
  }
})

// GET /api/presale/payments/:id/schedule - Get payment schedule
router.get('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const payments = await PreSalePaymentService.getPayments(id)

    res.json({
      success: true,
      data: payments,
      count: payments.length
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment schedule'
    })
  }
})

// GET /api/presale/payments/:id/next - Get next payment due
router.get('/:id/next', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const nextPayment = await PreSalePaymentService.getNextPaymentDue(id)

    if (!nextPayment) {
      return res.json({
        success: true,
        message: 'No payments pending',
        data: null
      })
    }

    res.json({
      success: true,
      data: nextPayment
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch next payment'
    })
  }
})

// GET /api/presale/payments/:id/analytics - Get payment analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const analytics = await PreSalePaymentService.getPaymentAnalytics(id)

    res.json({
      success: true,
      data: analytics
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics'
    })
  }
})

// PUT /api/presale/payments/:id/check-overdue - Check for overdue payments
router.put('/:id/check-overdue', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const paymentPlan = await PreSalePaymentService.checkOverduePayments(id)

    res.json({
      success: true,
      message: 'Overdue check completed',
      data: paymentPlan
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check overdue payments'
    })
  }
})

// POST /api/presale/payments/:id/early-bonus - Apply early payment bonus if eligible
router.post('/:id/early-bonus', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await PreSalePaymentService.applyEarlyPaymentBonusIfEligible(id)

    res.json({
      success: true,
      message: result.bonusApplied
        ? `Bonus of ${result.bonusAmount} applied successfully`
        : 'Bonus not eligible or already applied',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to apply bonus'
    })
  }
})

// PUT /api/presale/payments/:id/cancel - Cancel payment plan
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const paymentPlan = await PreSalePaymentService.cancelPaymentPlan(id, reason)

    res.json({
      success: true,
      message: 'Payment plan cancelled successfully',
      data: paymentPlan
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel payment plan'
    })
  }
})

// GET /api/presale/payments/overdue/list - Get all overdue payment plans
router.get('/overdue/list', async (req: Request, res: Response) => {
  try {
    const plans = await PreSalePaymentService.getOverduePaymentPlans()

    res.json({
      success: true,
      data: plans,
      count: plans.length
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch overdue plans'
    })
  }
})

// GET /api/presale/payments/customer/:customerId/summary - Get customer payment summary
router.get('/customer/:customerId/summary', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params
    const summary = await PreSalePaymentService.getCustomerPaymentSummary(customerId)

    res.json({
      success: true,
      data: summary
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer summary'
    })
  }
})

// GET /api/presale/payments/statistics/global - Get global payment statistics
router.get('/statistics/global', async (req: Request, res: Response) => {
  try {
    const statistics = await PreSalePaymentService.getPaymentStatistics()

    res.json({
      success: true,
      data: statistics
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    })
  }
})

// PUT /api/presale/payments/check-all-overdue - Check overdue for all active plans
router.put('/check-all-overdue', async (req: Request, res: Response) => {
  try {
    const count = await PreSalePaymentService.checkOverduePaymentsForAll()

    res.json({
      success: true,
      message: `Checked ${count} payment plans for overdue`,
      data: { updatedCount: count }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check overdue payments'
    })
  }
})

export default router
