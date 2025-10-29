# Pre-Sale Installments System - Design Document

## Overview
System to configure payment plans (installments) when adding presale items to deliveries, and display them in the Pre-Sale Payments view.

## Current Architecture

### Existing Models

#### PreSaleItem (`backend/src/models/PreSaleItem.ts`)
```typescript
interface PreSaleItem {
  carId: string;
  totalQuantity: number;
  basePricePerUnit: number;  // Cost price
  finalPricePerUnit: number;  // Sale price (with markup)
  units: PreSaleUnitAssignment[];
  deliveryAssignments: {
    deliveryId: string;
    unitsCount: number;
    assignedDate: Date;
  }[];
}
```

#### PreSalePaymentPlan (`backend/src/models/PreSalePaymentPlan.ts`)
```typescript
interface PreSalePaymentPlan {
  deliveryId: string;  // 1:1 with delivery
  customerId?: string;
  totalAmount: number;
  numberOfPayments: number;
  amountPerPayment: number;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  payments: PaymentRecord[];
  totalPaid: number;
  remainingAmount: number;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'paused' | 'cancelled';
}

interface PaymentRecord {
  paymentId: string;
  scheduledDate: Date;
  amountDue: number;
  amountPaid: number;
  actualDate?: Date;
  isOverdue: boolean;
  notes?: string;
}
```

#### Delivery (`shared/types.ts`)
```typescript
interface Delivery {
  _id?: string;
  customerId: string;
  items: DeliveryItem[];
  scheduledDate: Date;
  totalAmount: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  payments?: Payment[];
  status: 'scheduled' | 'prepared' | 'completed' | 'cancelled';
}
```

## Required Changes

### 1. Frontend: Add Installments Configuration to Delivery Modal

**Location:** `frontend/src/pages/Deliveries.tsx`

#### A. Add State for Payment Plan
```typescript
const [paymentPlanConfig, setPaymentPlanConfig] = useState({
  enabled: false,  // Whether to create payment plan
  numberOfPayments: 4,
  paymentFrequency: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  earlyPaymentBonus: 0  // Optional percentage discount
})
```

#### B. Add UI Section in Create/Edit Delivery Modal
Add after the items selection, before the submit button:

```tsx
{/* Payment Plan Configuration - Only show if delivery has presale items */}
{newDelivery.items.some(item => item.inventoryItemId?.startsWith('presale_')) && (
  <div className="border-t pt-4 mt-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-medium text-gray-900">Plan de Pagos (Preventa)</h3>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={paymentPlanConfig.enabled}
          onChange={(e) => setPaymentPlanConfig({
            ...paymentPlanConfig,
            enabled: e.target.checked
          })}
          className="mr-2"
        />
        <span className="text-sm">Habilitar pagos parciales</span>
      </label>
    </div>

    {paymentPlanConfig.enabled && (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Pagos
          </label>
          <input
            type="number"
            min="2"
            max="12"
            value={paymentPlanConfig.numberOfPayments}
            onChange={(e) => setPaymentPlanConfig({
              ...paymentPlanConfig,
              numberOfPayments: parseInt(e.target.value)
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frecuencia
          </label>
          <select
            value={paymentPlanConfig.paymentFrequency}
            onChange={(e) => setPaymentPlanConfig({
              ...paymentPlanConfig,
              paymentFrequency: e.target.value as any
            })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Primer Pago
          </label>
          <input
            type="date"
            value={paymentPlanConfig.startDate}
            onChange={(e) => setPaymentPlanConfig({
              ...paymentPlanConfig,
              startDate: e.target.value
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bono Pago Anticipado (%)
          </label>
          <input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={paymentPlanConfig.earlyPaymentBonus}
            onChange={(e) => setPaymentPlanConfig({
              ...paymentPlanConfig,
              earlyPaymentBonus: parseFloat(e.target.value)
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Payment Summary */}
        <div className="col-span-2 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Resumen del Plan</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total:</span>
              <div className="font-medium">${newDelivery.totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-600">Por Pago:</span>
              <div className="font-medium">
                ${(newDelivery.totalAmount / paymentPlanConfig.numberOfPayments).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Fecha Final:</span>
              <div className="font-medium text-xs">
                {(() => {
                  const start = new Date(paymentPlanConfig.startDate)
                  const freq = paymentPlanConfig.paymentFrequency
                  const days = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30
                  const end = new Date(start)
                  end.setDate(end.getDate() + (days * (paymentPlanConfig.numberOfPayments - 1)))
                  return end.toLocaleDateString()
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

#### C. Update handleCreateDelivery Function
```typescript
const handleCreateDelivery = async () => {
  // ... existing validation ...

  try {
    // Check if delivery has presale items
    const hasPresaleItems = newDelivery.items.some(item => 
      item.inventoryItemId?.startsWith('presale_')
    )

    // Create delivery
    const createdDelivery = await createDeliveryMutation.mutateAsync({
      customerId: newDelivery.customerId,
      items: newDelivery.items,
      scheduledDate: new Date(newDelivery.scheduledDate),
      location: newDelivery.location,
      totalAmount: newDelivery.totalAmount,
      notes: newDelivery.notes || undefined
    })

    // If payment plan is enabled for presale items, create it
    if (hasPresaleItems && paymentPlanConfig.enabled && createdDelivery._id) {
      await createPaymentPlanMutation.mutateAsync({
        deliveryId: createdDelivery._id,
        customerId: newDelivery.customerId,
        totalAmount: newDelivery.totalAmount,
        numberOfPayments: paymentPlanConfig.numberOfPayments,
        paymentFrequency: paymentPlanConfig.paymentFrequency,
        startDate: new Date(paymentPlanConfig.startDate),
        earlyPaymentBonus: paymentPlanConfig.earlyPaymentBonus > 0 
          ? paymentPlanConfig.earlyPaymentBonus 
          : undefined
      })
    }

    // Reset form
    handleCloseModal()
    // Reset payment plan config
    setPaymentPlanConfig({
      enabled: false,
      numberOfPayments: 4,
      paymentFrequency: 'weekly',
      startDate: new Date().toISOString().split('T')[0],
      earlyPaymentBonus: 0
    })
  } catch (error) {
    console.error('Error saving delivery:', error)
    alert('Error al crear la entrega')
  }
}
```

### 2. Frontend: Create usePaymentPlans Hook

**File:** `frontend/src/hooks/usePaymentPlans.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface PaymentPlanCreate {
  deliveryId: string
  customerId: string
  totalAmount: number
  numberOfPayments: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  earlyPaymentBonus?: number
}

export interface PaymentRecord {
  paymentId: string
  scheduledDate: Date
  amountDue: number
  amountPaid: number
  actualDate?: Date
  isOverdue: boolean
  notes?: string
}

export interface PaymentPlan {
  _id: string
  deliveryId: string
  customerId?: string
  totalAmount: number
  numberOfPayments: number
  amountPerPayment: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  payments: PaymentRecord[]
  totalPaid: number
  remainingAmount: number
  paymentsCompleted: number
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'paused' | 'cancelled'
  hasOverduePayments: boolean
  overdueAmount: number
  createdAt: Date
  updatedAt: Date
}

// Get all payment plans
export const usePaymentPlans = () => {
  return useQuery({
    queryKey: ['paymentPlans'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/payment-plans`)
      return response.data as PaymentPlan[]
    }
  })
}

// Get payment plan by delivery ID
export const usePaymentPlanByDelivery = (deliveryId: string | undefined) => {
  return useQuery({
    queryKey: ['paymentPlan', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null
      const response = await axios.get(`${API_URL}/api/payment-plans/delivery/${deliveryId}`)
      return response.data as PaymentPlan
    },
    enabled: !!deliveryId
  })
}

// Create payment plan
export const useCreatePaymentPlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: PaymentPlanCreate) => {
      const response = await axios.post(`${API_URL}/api/payment-plans`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    }
  })
}

// Record payment
export const useRecordPayment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      planId, 
      amount, 
      date, 
      notes 
    }: { 
      planId: string
      amount: number
      date?: Date
      notes?: string 
    }) => {
      const response = await axios.post(
        `${API_URL}/api/payment-plans/${planId}/payment`,
        { amount, date, notes }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
      queryClient.invalidateQueries({ queryKey: ['paymentPlan', variables.planId] })
    }
  })
}

// Update payment plan status
export const useUpdatePaymentPlanStatus = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      planId, 
      status 
    }: { 
      planId: string
      status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled'
    }) => {
      const response = await axios.patch(
        `${API_URL}/api/payment-plans/${planId}/status`,
        { status }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
    }
  })
}
```

### 3. Backend: Create Payment Plans Controller

**File:** `backend/src/controllers/paymentPlansController.ts`

```typescript
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
      earlyPaymentBonus,
      status: 'pending'
    })

    res.status(201).json(plan)
  } catch (error) {
    console.error('Error creating payment plan:', error)
    res.status(500).json({ message: 'Error creating payment plan' })
  }
}

// Record payment
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params
    const { amount, date, notes } = req.body

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
```

### 4. Backend: Add Payment Plans Routes

**File:** `backend/src/routes/paymentPlans.ts`

```typescript
import express from 'express'
import {
  getAllPaymentPlans,
  getPaymentPlanByDelivery,
  createPaymentPlan,
  recordPayment,
  updatePaymentPlanStatus
} from '../controllers/paymentPlansController'

const router = express.Router()

router.get('/', getAllPaymentPlans)
router.get('/delivery/:deliveryId', getPaymentPlanByDelivery)
router.post('/', createPaymentPlan)
router.post('/:planId/payment', recordPayment)
router.patch('/:planId/status', updatePaymentPlanStatus)

export default router
```

**Add to `backend/src/index.ts`:**
```typescript
import paymentPlansRoutes from './routes/paymentPlans'
app.use('/api/payment-plans', paymentPlansRoutes)
```

### 5. Frontend: Pre-Sale Payments View

**Create new page:** `frontend/src/pages/PreSalePayments.tsx`

```typescript
import React, { useState } from 'react'
import { usePaymentPlans, useRecordPayment, useUpdatePaymentPlanStatus } from '@/hooks/usePaymentPlans'
import { useCustomers } from '@/hooks/useCustomers'
import { useDeliveries } from '@/hooks/useDeliveries'

export default function PreSalePayments() {
  const { data: paymentPlans } = usePaymentPlans()
  const { data: customers } = useCustomers()
  const { data: deliveries } = useDeliveries()
  const recordPaymentMutation = useRecordPayment()
  const updateStatusMutation = useUpdatePaymentPlanStatus()

  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const handleRecordPayment = async () => {
    if (!selectedPlan || !paymentAmount) return

    try {
      await recordPaymentMutation.mutateAsync({
        planId: selectedPlan._id,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes
      })
      setPaymentAmount('')
      setPaymentNotes('')
      setSelectedPlan(null)
      alert('Pago registrado exitosamente')
    } catch (error) {
      alert('Error al registrar el pago')
    }
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers?.find(c => c._id === customerId)
    return customer?.name || 'Cliente desconocido'
  }

  const getDeliveryInfo = (deliveryId: string) => {
    return deliveries?.find(d => d._id === deliveryId)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pagos de Preventa</h1>

      {/* Active Payment Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paymentPlans?.filter(p => p.status !== 'completed' && p.status !== 'cancelled')
          .map(plan => {
            const delivery = getDeliveryInfo(plan.deliveryId)
            const progressPercent = (plan.totalPaid / plan.totalAmount) * 100

            return (
              <div key={plan._id} className="bg-white rounded-lg shadow p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">
                      {getCustomerName(plan.customerId || '')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Entrega: {delivery?.scheduledDate 
                        ? new Date(delivery.scheduledDate).toLocaleDateString() 
                        : 'Sin fecha'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    plan.hasOverduePayments ? 'bg-red-100 text-red-800' :
                    plan.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {plan.hasOverduePayments ? 'Atrasado' :
                     plan.status === 'in-progress' ? 'En progreso' : 'Pendiente'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <span className="font-medium">{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="font-bold">${plan.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pagado</p>
                    <p className="font-bold text-green-600">${plan.totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Restante</p>
                    <p className="font-bold text-orange-600">${plan.remainingAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Payment Schedule */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">
                    Próximo pago: ${plan.amountPerPayment.toFixed(2)} - 
                    Frecuencia: {plan.paymentFrequency === 'weekly' ? 'Semanal' : 
                                plan.paymentFrequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {plan.paymentsCompleted} de {plan.numberOfPayments} pagos completados
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Registrar Pago
                  </button>
                  <button
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Detalles
                  </button>
                </div>
              </div>
            )
          })}
      </div>

      {/* Record Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Registrar Pago</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Sugerido: $${selectedPlan.amountPerPayment.toFixed(2)}`}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setSelectedPlan(null)
                    setPaymentAmount('')
                    setPaymentNotes('')
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 6. Navigation: Add Pre-Sale Payments Link

**Update:** `frontend/src/App.tsx` or navigation component

Add route:
```typescript
<Route path="/presale-payments" element={<PreSalePayments />} />
```

Add to navigation menu:
```tsx
<Link to="/presale-payments" className="nav-link">
  💰 Pagos Preventa
</Link>
```

## User Flow

### Creating Delivery with Installments

1. User clicks "Nueva Entrega"
2. Selects customer and adds presale items
3. System detects presale items and shows "Plan de Pagos" section
4. User enables installments and configures:
   - Number of payments (2-12)
   - Frequency (weekly/biweekly/monthly)
   - Start date
   - Optional early payment bonus
5. System shows payment summary preview
6. User clicks "Crear Entrega"
7. System creates:
   - Delivery record
   - Payment plan record with payment schedule
8. User is redirected to deliveries list

### Managing Payments

1. User navigates to "Pagos Preventa" page
2. Sees all active payment plans with:
   - Customer name
   - Progress bar
   - Payment status
   - Overdue warnings
3. Clicks "Registrar Pago" on a plan
4. Enters payment amount and notes
5. System records payment and updates:
   - Total paid
   - Remaining amount
   - Payment schedule
   - Status (pending → in-progress → completed)

## Implementation Order

1. ✅ Backend routes and controller (30 min)
2. ✅ Frontend hook (usePaymentPlans) (20 min)
3. ✅ Update Deliveries.tsx - add payment plan UI (45 min)
4. ✅ Create PreSalePayments.tsx page (60 min)
5. ✅ Add navigation link (5 min)
6. ✅ Testing (30 min)

**Total estimated time:** ~3 hours

## Testing Checklist

- [ ] Create delivery with presale items
- [ ] Enable payment plan and configure
- [ ] Verify payment plan is created
- [ ] View payment plan in Pre-Sale Payments page
- [ ] Record partial payment
- [ ] Verify progress updates
- [ ] Record remaining payments until complete
- [ ] Verify status changes to "completed"
- [ ] Test overdue detection
- [ ] Test early payment bonus

## Future Enhancements

- Email/SMS reminders for upcoming payments
- WhatsApp integration for payment notifications
- Payment receipt generation (PDF)
- Payment history export
- Analytics dashboard for payment trends
- Integration with payment gateways (MercadoPago, PayPal)
