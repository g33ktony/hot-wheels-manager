import mongoose, { Schema, Document } from 'mongoose'

/**
 * PreSalePaymentPlan Model
 *
 * Tracks payment installments for pre-sale items in a delivery.
 * Handles flexible payment scheduling with automatic recalculation on early/late payments.
 *
 * Key Design:
 * - Each delivery with pre-sale items has one payment plan
 * - Tracks individual payment records with actual vs. scheduled dates
 * - Auto-calculates remaining amount based on payments received
 * - Detects overdue payments automatically
 */

export interface PaymentRecord {
  paymentId: string; // Unique identifier for this payment
  scheduledDate: Date; // When payment was supposed to be made
  amountDue: number; // Amount that should be paid
  amountPaid: number; // Actual amount paid
  actualDate?: Date; // When payment was actually made
  isOverdue: boolean; // If past limit date without full payment
  notes?: string;
}

export interface PreSalePaymentPlan extends Document {
  deliveryId: string; // Reference to Delivery
  customerId?: string; // Reference to Customer (if from existing customer)
  preIntegrationCustomer?: string; // Name of customer for pre-integration purchases

  // Payment Plan Details
  totalAmount: number; // Total amount to be paid for pre-sale items
  numberOfPayments: number; // Fixed number of installments
  amountPerPayment: number; // Fixed amount per installment (calculated)
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly' // How often payments occur
  startDate: Date; // When first payment is due

  // Payment tracking
  payments: PaymentRecord[] // Array of payment records
  totalPaid: number; // Sum of all amountPaid fields
  remainingAmount: number; // Calculated: totalAmount - totalPaid
  paymentsCompleted: number; // Count of fully completed payments

  // Status and dates
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'paused' | 'cancelled'
  expectedCompletionDate?: Date; // When all payments should be done (if on schedule)
  actualCompletionDate?: Date; // When payment actually completed
  lastPaymentDate?: Date; // Date of most recent payment

  // Overdue tracking
  hasOverduePayments: boolean;
  overdueAmount: number; // Total amount past due
  daysOverdue?: number; // Days since earliest overdue payment

  // Early payment bonus (optional)
  earlyPaymentBonus?: number; // Percentage discount for early full payment (e.g., 5%)
  earliestPaymentBonus?: Date; // Deadline to get bonus
  bonusApplied?: boolean;
  bonusAmount?: number; // Amount of bonus applied

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordPayment(amount: number, date?: Date): string; // Returns paymentId
  getRemainingAmount(): number;
  getNextPaymentDue(): PaymentRecord | null;
  isFullyPaid(): boolean;
  checkOverduePayments(): void;
  recalculateRemainingPayments(totalPaid: number): void;
  getPaymentSchedule(): PaymentRecord[];
  applyEarlyPaymentBonus(): void;
}

const PaymentRecordSchema = new Schema<PaymentRecord>(
  {
    paymentId: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    actualDate: { type: Date },
    isOverdue: { type: Boolean, default: false },
    notes: { type: String }
  },
  { _id: false }
)

const PreSalePaymentPlanSchema = new Schema<PreSalePaymentPlan>(
  {
    deliveryId: {
      type: String,
      required: true,
      index: true,
      unique: true // One payment plan per delivery
    },
    customerId: {
      type: String
    },
    preIntegrationCustomer: {
      type: String
    },

    // Payment Plan Details
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    numberOfPayments: {
      type: Number,
      required: true,
      min: 1
    },
    amountPerPayment: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.totalAmount / this.numberOfPayments
      }
    },
    paymentFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'weekly',
      required: true
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    // Payment tracking
    payments: [PaymentRecordSchema],
    totalPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.totalAmount - this.totalPaid
      }
    },
    paymentsCompleted: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue', 'paused', 'cancelled'],
      default: 'pending'
    },
    expectedCompletionDate: {
      type: Date
    },
    actualCompletionDate: {
      type: Date
    },
    lastPaymentDate: {
      type: Date
    },

    // Overdue tracking
    hasOverduePayments: {
      type: Boolean,
      default: false
    },
    overdueAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    daysOverdue: {
      type: Number
    },

    // Early payment bonus
    earlyPaymentBonus: {
      type: Number,
      min: 0,
      max: 100
    },
    earliestPaymentBonus: {
      type: Date
    },
    bonusApplied: {
      type: Boolean,
      default: false
    },
    bonusAmount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

// Indexes
PreSalePaymentPlanSchema.index({ deliveryId: 1 })
PreSalePaymentPlanSchema.index({ customerId: 1 })
PreSalePaymentPlanSchema.index({ status: 1 })
PreSalePaymentPlanSchema.index({ hasOverduePayments: 1 })
PreSalePaymentPlanSchema.index({ 'payments.scheduledDate': 1 })

// Instance methods
PreSalePaymentPlanSchema.methods.recordPayment = function(
  this: PreSalePaymentPlan,
  amount: number,
  date: Date = new Date()
): string {
  const paymentId = `${this._id}-PAY-${Date.now()}`

  // Find the next due payment
  const nextDue = this.payments.find((p) => p.amountPaid < p.amountDue)

  if (!nextDue) {
    throw new Error('No payments pending for this plan')
  }

  // Record payment
  nextDue.amountPaid += amount
  nextDue.actualDate = date

  if (nextDue.amountPaid >= nextDue.amountDue) {
    nextDue.isOverdue = false
    this.paymentsCompleted += 1
  }

  // Update totals
  this.totalPaid += amount
  this.remainingAmount = this.totalAmount - this.totalPaid
  this.lastPaymentDate = date

  // Update status
  if (this.totalPaid >= this.totalAmount) {
    this.status = 'completed'
    this.actualCompletionDate = date
  } else if (this.status === 'pending') {
    this.status = 'in-progress'
  }

  // Check for early payment bonus
  if (
    this.earlyPaymentBonus &&
    !this.bonusApplied &&
    this.earliestPaymentBonus &&
    date <= this.earliestPaymentBonus &&
    this.totalPaid >= this.totalAmount
  ) {
    this.applyEarlyPaymentBonus()
  }

  // Check overdue status
  this.checkOverduePayments()

  return paymentId
}

PreSalePaymentPlanSchema.methods.getRemainingAmount = function(
  this: PreSalePaymentPlan
): number {
  return this.totalAmount - this.totalPaid
}

PreSalePaymentPlanSchema.methods.getNextPaymentDue = function(
  this: PreSalePaymentPlan
): PaymentRecord | null {
  return this.payments.find((p) => p.amountPaid < p.amountDue) || null
}

PreSalePaymentPlanSchema.methods.isFullyPaid = function(this: PreSalePaymentPlan): boolean {
  return this.totalPaid >= this.totalAmount
}

PreSalePaymentPlanSchema.methods.checkOverduePayments = function(
  this: PreSalePaymentPlan
): void {
  const now = new Date()
  let hasOverdue = false
  let totalOverdue = 0
  let earliestOverdueDate: Date | null = null

  this.payments.forEach((payment) => {
    if (payment.amountPaid < payment.amountDue && payment.scheduledDate < now) {
      hasOverdue = true
      const unpaid = payment.amountDue - payment.amountPaid
      totalOverdue += unpaid
      payment.isOverdue = true

      if (!earliestOverdueDate || payment.scheduledDate < earliestOverdueDate) {
        earliestOverdueDate = payment.scheduledDate
      }
    }
  })

  this.hasOverduePayments = hasOverdue
  this.overdueAmount = totalOverdue

  if (earliestOverdueDate) {
    const daysMs = now.getTime() - (earliestOverdueDate as Date).getTime()
    this.daysOverdue = Math.floor(daysMs / (1000 * 60 * 60 * 24))
  }

  if (hasOverdue && this.status !== 'completed' && this.status !== 'cancelled') {
    this.status = 'overdue'
  }
}

PreSalePaymentPlanSchema.methods.recalculateRemainingPayments = function(
  this: PreSalePaymentPlan,
  totalPaidSoFar: number
): void {
  const remaining = this.totalAmount - totalPaidSoFar
  const unpaidPayments = this.payments.filter((p) => p.amountPaid < p.amountDue)

  if (unpaidPayments.length > 0) {
    const amountPerPayment = remaining / unpaidPayments.length
    unpaidPayments.forEach((p) => {
      p.amountDue = amountPerPayment
    })
  }
}

PreSalePaymentPlanSchema.methods.getPaymentSchedule = function(
  this: PreSalePaymentPlan
): PaymentRecord[] {
  return this.payments
}

PreSalePaymentPlanSchema.methods.applyEarlyPaymentBonus = function(
  this: PreSalePaymentPlan
): void {
  if (!this.earlyPaymentBonus || this.bonusApplied) {
    return
  }

  const bonusAmount = (this.totalAmount * this.earlyPaymentBonus) / 100
  this.bonusAmount = bonusAmount
  this.bonusApplied = true
  // In a real system, this might reduce the actual payment or be credited to customer
}

// Pre-save initialization
PreSalePaymentPlanSchema.pre('save', function(next) {
  const doc = this as PreSalePaymentPlan

  // Initialize payment schedule if not already done
  if (doc.payments.length === 0) {
    const amountPerPayment = doc.totalAmount / doc.numberOfPayments

    // Calculate frequency in days
    const frequencyDays = {
      weekly: 7,
      biweekly: 14,
      monthly: 30
    }

    const daysBetweenPayments = frequencyDays[doc.paymentFrequency]

    for (let i = 0; i < doc.numberOfPayments; i++) {
      const paymentDate = new Date(doc.startDate)
      paymentDate.setDate(paymentDate.getDate() + daysBetweenPayments * i)

      doc.payments.push({
        paymentId: `${doc.deliveryId}-PAY-${i + 1}`,
        scheduledDate: paymentDate,
        amountDue: amountPerPayment,
        amountPaid: 0,
        isOverdue: false
      })
    }

    // Set expected completion
    const completionDate = new Date(doc.startDate)
    completionDate.setDate(
      completionDate.getDate() + daysBetweenPayments * (doc.numberOfPayments - 1)
    )
    doc.expectedCompletionDate = completionDate

    // Set earliest bonus date (e.g., before first payment due date)
    if (doc.earlyPaymentBonus) {
      const bonusDeadline = new Date(doc.startDate)
      bonusDeadline.setDate(bonusDeadline.getDate() - 1) // 1 day before first payment
      doc.earliestPaymentBonus = bonusDeadline
    }
  }

  // Recalculate derived fields
  doc.remainingAmount = doc.totalAmount - doc.totalPaid
  doc.amountPerPayment = doc.totalAmount / doc.numberOfPayments

  next()
})

export default mongoose.model<PreSalePaymentPlan>('PreSalePaymentPlan', PreSalePaymentPlanSchema)
