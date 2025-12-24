import { Request, Response } from 'express'
import PreSalePaymentPlanModel from '../models/PreSalePaymentPlan'

// Get all payment plans
export const getAllPaymentPlans = async (req: Request, res: Response) => {
  try {
    const plans = await PreSalePaymentPlanModel.find()
      .sort({ createdAt: -1 })
    res.json(plans)
  } catch (error) {
    console.error('Error fetching payment plans:', error)
    res.status(500).json({ message: 'Error fetching payment plans' })
  }
}

// Get payment plan by delivery ID
export const getPaymentPlanByDelivery = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params
    const plan = await PreSalePaymentPlanModel.findOne({ deliveryId })
    
    if (!plan) {
      return res.status(404).json({ message: 'Payment plan not found' })
    }
    
    res.json(plan)
  } catch (error) {
    console.error('Error fetching payment plan:', error)
    res.status(500).json({ message: 'Error fetching payment plan' })
  }
}

// Create payment plan
export const createPaymentPlan = async (req: Request, res: Response) => {
  try {
    const {
      deliveryId,
      customerId,
      totalAmount,
      numberOfPayments,
      paymentFrequency,
      startDate,
      earlyPaymentBonus
    } = req.body

    console.log('📋 CREATE PAYMENT PLAN REQUEST:', {
      deliveryId,
      customerId,
      totalAmount,
      numberOfPayments,
      paymentFrequency,
      startDate
    });

    // Validate required fields
    if (!deliveryId || !totalAmount || !numberOfPayments || !paymentFrequency || !startDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: deliveryId, totalAmount, numberOfPayments, paymentFrequency, startDate' 
      })
    }

    // Check if plan already exists for this delivery
    const existing = await PreSalePaymentPlanModel.findOne({ deliveryId })
    if (existing) {
      return res.status(400).json({ 
        message: 'Payment plan already exists for this delivery' 
      })
    }

    // Create payment plan
    const plan = await PreSalePaymentPlanModel.create({
      deliveryId,
      customerId,
      totalAmount,
      numberOfPayments,
      paymentFrequency,
      startDate: new Date(startDate),
      earlyPaymentBonus: earlyPaymentBonus || undefined,
      status: 'pending'
    })

    console.log('✅ PAYMENT PLAN CREATED:', {
      _id: plan._id,
      deliveryId: plan.deliveryId,
      totalAmount: plan.totalAmount
    });

    res.status(201).json(plan)
  } catch (error) {
    console.error('❌ Error creating payment plan:', error)
    res.status(500).json({ 
      message: 'Error creating payment plan',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// Record payment
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params
    const { amount, date, notes } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' })
    }

    const plan = await PreSalePaymentPlanModel.findById(planId)
    if (!plan) {
      return res.status(404).json({ message: 'Payment plan not found' })
    }

    // Record payment using model method
    const paymentId = plan.recordPayment(amount, date ? new Date(date) : undefined)
    
    // Add notes if provided
    const payment = plan.payments.find(p => p.paymentId === paymentId)
    if (payment && notes) {
      payment.notes = notes
    }

    await plan.save()

    res.json(plan)
  } catch (error) {
    console.error('Error recording payment:', error)
    res.status(500).json({ message: 'Error recording payment' })
  }
}

// Update payment plan status
export const updatePaymentPlanStatus = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ message: 'Status is required' })
    }

    const validStatuses = ['pending', 'in-progress', 'completed', 'overdue', 'paused', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const plan = await PreSalePaymentPlanModel.findByIdAndUpdate(
      planId,
      { status },
      { new: true }
    )

    if (!plan) {
      return res.status(404).json({ message: 'Payment plan not found' })
    }

    res.json(plan)
  } catch (error) {
    console.error('Error updating payment plan status:', error)
    res.status(500).json({ message: 'Error updating payment plan status' })
  }
}

// Delete payment plan
export const deletePaymentPlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params

    const plan = await PreSalePaymentPlanModel.findByIdAndDelete(planId)

    if (!plan) {
      return res.status(404).json({ message: 'Payment plan not found' })
    }

    res.json({ message: 'Payment plan deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment plan:', error)
    res.status(500).json({ message: 'Error deleting payment plan' })
  }
}
