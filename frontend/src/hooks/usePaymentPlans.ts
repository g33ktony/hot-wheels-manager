import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface PaymentPlanCreate {
  deliveryId: string
  customerId?: string
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
  expectedCompletionDate?: Date
  actualCompletionDate?: Date
  lastPaymentDate?: Date
  earlyPaymentBonus?: number
  createdAt: Date
  updatedAt: Date
}

// Get all payment plans
export const usePaymentPlans = () => {
  return useQuery({
    queryKey: ['paymentPlans'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/payment-plans`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
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
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/payment-plans/delivery/${deliveryId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
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
      const token = localStorage.getItem('token')
      const response = await axios.post(`${API_URL}/api/payment-plans`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
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
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/payment-plans/${planId}/payment`,
        { amount, date, notes },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: (_data: any, variables: any) => {
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
      const token = localStorage.getItem('token')
      const response = await axios.patch(
        `${API_URL}/api/payment-plans/${planId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
    }
  })
}

// Delete payment plan
export const useDeletePaymentPlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (planId: string) => {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`${API_URL}/api/payment-plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
    }
  })
}
