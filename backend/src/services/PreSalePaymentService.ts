import PreSalePaymentPlan, {
  PreSalePaymentPlan as PreSalePaymentPlanType,
  PaymentRecord
} from '../models/PreSalePaymentPlan'
import { DeliveryModel } from '../models/Delivery'

/**
 * PreSalePaymentService
 *
 * Manages payment plan creation, payment recording, and overdue tracking.
 * Handles:
 * - Creating payment plans from deliveries
 * - Recording individual payments
 * - Automatic overdue detection
 * - Early payment bonus application
 * - Payment analytics and reporting
 */

class PreSalePaymentService {
  /**
   * Create a new payment plan for a delivery
   */
  async createPaymentPlan(
    deliveryId: string,
    totalAmount: number,
    numberOfPayments: number,
    paymentFrequency: 'weekly' | 'biweekly' | 'monthly' = 'weekly',
    startDate: Date = new Date(),
    customerId?: string,
    preIntegrationCustomer?: string,
    earlyPaymentBonus?: number
  ): Promise<PreSalePaymentPlanType> {
    // Check if payment plan already exists
    let existingPlan = await PreSalePaymentPlan.findOne({ deliveryId })
    if (existingPlan) {
      throw new Error(`Payment plan already exists for delivery ${deliveryId}`)
    }

    const paymentPlan = new PreSalePaymentPlan({
      deliveryId,
      customerId,
      preIntegrationCustomer,
      totalAmount,
      numberOfPayments,
      amountPerPayment: totalAmount / numberOfPayments,
      paymentFrequency,
      startDate,
      payments: [], // Will be auto-generated on save
      totalPaid: 0,
      remainingAmount: totalAmount,
      paymentsCompleted: 0,
      status: 'pending',
      hasOverduePayments: false,
      overdueAmount: 0,
      earlyPaymentBonus
    })

    await paymentPlan.save()

    // Link payment plan to delivery
    await DeliveryModel.updateOne(
      { _id: deliveryId },
      {
        preSalePaymentPlanId: (paymentPlan._id as any).toString(),
        preSaleStatus: 'pending'
      }
    )

    return paymentPlan
  }

  /**
   * Get payment plan for a delivery
   */
  async getPaymentPlanByDelivery(deliveryId: string): Promise<PreSalePaymentPlanType | null> {
    return PreSalePaymentPlan.findOne({ deliveryId })
  }

  /**
   * Get payment plan by ID
   */
  async getPaymentPlan(id: string): Promise<PreSalePaymentPlanType | null> {
    return PreSalePaymentPlan.findById(id)
  }

  /**
   * Record a payment towards the plan
   */
  async recordPayment(
    paymentPlanId: string,
    amount: number,
    paymentDate: Date = new Date(),
    notes?: string
  ): Promise<{ paymentId: string; paymentPlan: PreSalePaymentPlanType }> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    if (paymentPlan.isFullyPaid()) {
      throw new Error('Payment plan is already fully paid')
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0')
    }

    // Record the payment using the model method
    const paymentId = paymentPlan.recordPayment(amount, paymentDate)

    // Add notes if provided
    const lastPayment = paymentPlan.payments[paymentPlan.payments.length - 1]
    if (lastPayment && notes) {
      lastPayment.notes = notes
    }

    await paymentPlan.save()

    // Update delivery status based on payment plan status
    await DeliveryModel.updateOne(
      { _id: paymentPlan.deliveryId },
      { preSaleStatus: paymentPlan.status }
    )

    return {
      paymentId,
      paymentPlan
    }
  }

  /**
   * Get all payments for a plan
   */
  async getPayments(paymentPlanId: string): Promise<PaymentRecord[]> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    return paymentPlan.getPaymentSchedule()
  }

  /**
   * Get next payment due
   */
  async getNextPaymentDue(paymentPlanId: string): Promise<PaymentRecord | null> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    return paymentPlan.getNextPaymentDue()
  }

  /**
   * Check and update overdue status for all active plans
   */
  async checkOverduePaymentsForAll(): Promise<number> {
    const activePlans = await PreSalePaymentPlan.find({
      status: { $in: ['pending', 'in-progress'] }
    })

    let overdueCount = 0

    for (const plan of activePlans) {
      const previousStatus = plan.status
      plan.checkOverduePayments()

      if (plan.status !== previousStatus) {
        await plan.save()
        overdueCount++
      }
    }

    return overdueCount
  }

  /**
   * Check overdue for specific plan
   */
  async checkOverduePayments(paymentPlanId: string): Promise<PreSalePaymentPlanType> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    paymentPlan.checkOverduePayments()
    await paymentPlan.save()

    return paymentPlan
  }

  /**
   * Get analytics for a payment plan
   */
  async getPaymentAnalytics(paymentPlanId: string): Promise<{
    totalAmount: number
    totalPaid: number
    remainingAmount: number
    percentagePaid: number
    paymentsCompleted: number
    totalPayments: number
    nextPaymentDue?: { date: Date; amount: number }
    isOverdue: boolean
    overdueAmount: number
    daysOverdue?: number
    status: string
  }> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    const nextPayment = paymentPlan.getNextPaymentDue()
    const percentagePaid = (paymentPlan.totalPaid / paymentPlan.totalAmount) * 100

    return {
      totalAmount: paymentPlan.totalAmount,
      totalPaid: paymentPlan.totalPaid,
      remainingAmount: paymentPlan.getRemainingAmount(),
      percentagePaid,
      paymentsCompleted: paymentPlan.paymentsCompleted,
      totalPayments: paymentPlan.numberOfPayments,
      nextPaymentDue: nextPayment
        ? {
            date: nextPayment.scheduledDate,
            amount: nextPayment.amountDue - nextPayment.amountPaid
          }
        : undefined,
      isOverdue: paymentPlan.hasOverduePayments,
      overdueAmount: paymentPlan.overdueAmount,
      daysOverdue: paymentPlan.daysOverdue,
      status: paymentPlan.status
    }
  }

  /**
   * Apply early payment bonus if applicable
   */
  async applyEarlyPaymentBonusIfEligible(paymentPlanId: string): Promise<{
    bonusApplied: boolean
    bonusAmount?: number
    paymentPlan: PreSalePaymentPlanType
  }> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    const previousBonus = paymentPlan.bonusApplied

    if (paymentPlan.earlyPaymentBonus && !paymentPlan.bonusApplied) {
      const now = new Date()

      if (
        paymentPlan.earliestPaymentBonus &&
        now <= paymentPlan.earliestPaymentBonus &&
        paymentPlan.isFullyPaid()
      ) {
        paymentPlan.applyEarlyPaymentBonus()
        await paymentPlan.save()

        return {
          bonusApplied: true,
          bonusAmount: paymentPlan.bonusAmount,
          paymentPlan
        }
      }
    }

    return {
      bonusApplied: previousBonus || false,
      paymentPlan
    }
  }

  /**
   * Get all overdue payment plans
   */
  async getOverduePaymentPlans(): Promise<PreSalePaymentPlanType[]> {
    return PreSalePaymentPlan.find({
      hasOverduePayments: true,
      status: { $ne: 'completed' }
    }).sort({ daysOverdue: -1 })
  }

  /**
   * Get payment summary for a customer
   */
  async getCustomerPaymentSummary(customerId: string): Promise<{
    totalPlans: number
    completedPlans: number
    activePlans: number
    overduePlans: number
    totalDue: number
    totalPaid: number
    overallStatus: string
  }> {
    const plans = await PreSalePaymentPlan.find({
      $or: [{ customerId }, { preIntegrationCustomer: customerId }]
    })

    const completed = plans.filter((p) => p.status === 'completed').length
    const overdue = plans.filter((p) => p.hasOverduePayments).length
    const active = plans.filter((p) =>
      ['pending', 'in-progress', 'overdue'].includes(p.status)
    ).length

    let totalDue = 0
    let totalPaid = 0

    plans.forEach((plan) => {
      totalDue += plan.totalAmount
      totalPaid += plan.totalPaid
    })

    let overallStatus = 'good'
    if (overdue > 0) overallStatus = 'overdue'
    if (completed === plans.length) overallStatus = 'completed'

    return {
      totalPlans: plans.length,
      completedPlans: completed,
      activePlans: active,
      overduePlans: overdue,
      totalDue,
      totalPaid,
      overallStatus
    }
  }

  /**
   * Cancel a payment plan
   */
  async cancelPaymentPlan(paymentPlanId: string, reason?: string): Promise<PreSalePaymentPlanType> {
    const paymentPlan = await PreSalePaymentPlan.findById(paymentPlanId)

    if (!paymentPlan) {
      throw new Error(`Payment plan ${paymentPlanId} not found`)
    }

    paymentPlan.status = 'cancelled'
    if (reason && paymentPlan.payments.length > 0) {
      const lastPayment = paymentPlan.payments[paymentPlan.payments.length - 1]
      lastPayment.notes = (lastPayment.notes || '') + ` | Cancelled: ${reason}`
    }

    await paymentPlan.save()

    // Update delivery
    await DeliveryModel.updateOne(
      { _id: paymentPlan.deliveryId },
      { preSaleStatus: 'cancelled' }
    )

    return paymentPlan
  }

  /**
   * Get payment statistics across all plans
   */
  async getPaymentStatistics(): Promise<{
    totalPlans: number
    completedPlans: number
    activePlans: number
    overduePlans: number
    totalAmountDue: number
    totalAmountPaid: number
    totalOverdueAmount: number
    averagePaymentPercentage: number
  }> {
    const allPlans = await PreSalePaymentPlan.find()

    const completed = allPlans.filter((p) => p.status === 'completed').length
    const overdue = allPlans.filter((p) => p.hasOverduePayments).length
    const active = allPlans.filter((p) =>
      ['pending', 'in-progress', 'overdue'].includes(p.status)
    ).length

    let totalDue = 0
    let totalPaid = 0
    let totalOverdue = 0

    allPlans.forEach((plan) => {
      totalDue += plan.totalAmount
      totalPaid += plan.totalPaid
      totalOverdue += plan.overdueAmount
    })

    const averagePercentage = allPlans.length > 0 ? (totalPaid / totalDue) * 100 : 0

    return {
      totalPlans: allPlans.length,
      completedPlans: completed,
      activePlans: active,
      overduePlans: overdue,
      totalAmountDue: totalDue,
      totalAmountPaid: totalPaid,
      totalOverdueAmount: totalOverdue,
      averagePaymentPercentage: averagePercentage
    }
  }
}

export default new PreSalePaymentService()
