import api from './api'
import type { ApiResponse } from '@shared/types'

export interface PreSaleItem {
  _id?: string
  carId: string
  totalQuantity: number
  assignedQuantity: number
  availableQuantity: number
  basePricePerUnit: number
  markupPercentage: number
  finalPricePerUnit: number
  status: 'active' | 'completed' | 'cancelled' | 'paused'
  startDate: Date
  endDate?: Date
  purchaseIds: string[]
  totalSaleAmount: number
  totalCostAmount: number
  totalProfit: number
  createdAt: Date
  updatedAt: Date
}

export interface CreatePreSaleItemDto {
  purchaseId: string
  carId: string
  quantity: number
  unitPrice: number
  markupPercentage?: number
  finalPrice?: number
}

export interface PreSalePaymentPlan {
  _id?: string
  deliveryId: string
  totalAmount: number
  numberOfPayments: number
  amountPerPayment: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'paused' | 'cancelled'
  totalPaid: number
  remainingAmount: number
  paymentsCompleted: number
  hasOverduePayments: boolean
}

export const presaleService = {
  // Pre-Sale Items
  items: {
    // Get all pre-sale items
    getAll: async (filters?: { status?: string; carId?: string; onlyActive?: boolean }): Promise<PreSaleItem[]> => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.carId) params.append('carId', filters.carId)
      if (filters?.onlyActive) params.append('onlyActive', 'true')

      const response = await api.get<ApiResponse<PreSaleItem[]>>(
        `/presale/items${params.toString() ? '?' + params.toString() : ''}`
      )
      return response.data.data || []
    },

    // Get pre-sale item by ID
    getById: async (id: string): Promise<PreSaleItem> => {
      const response = await api.get<ApiResponse<PreSaleItem>>(`/presale/items/${id}`)
      if (!response.data.data) {
        throw new Error('Pre-sale item not found')
      }
      return response.data.data
    },

    // Get pre-sale item by car ID
    getByCarId: async (carId: string): Promise<PreSaleItem> => {
      const response = await api.get<ApiResponse<PreSaleItem>>(`/presale/items/car/${carId}`)
      if (!response.data.data) {
        throw new Error('Pre-sale item not found for this car')
      }
      return response.data.data
    },

    // Create new pre-sale item
    create: async (data: CreatePreSaleItemDto): Promise<PreSaleItem> => {
      const response = await api.post<ApiResponse<PreSaleItem>>('/presale/items', data)
      if (!response.data.data) {
        throw new Error('Failed to create pre-sale item')
      }
      return response.data.data
    },

    // Update markup
    updateMarkup: async (id: string, markupPercentage: number): Promise<PreSaleItem> => {
      const response = await api.put<ApiResponse<PreSaleItem>>(
        `/presale/items/${id}/markup`,
        { markupPercentage }
      )
      if (!response.data.data) {
        throw new Error('Failed to update markup')
      }
      return response.data.data
    },

    // Update final price per unit
    updateFinalPrice: async (id: string, finalPrice: number): Promise<PreSaleItem> => {
      const response = await api.put<ApiResponse<PreSaleItem>>(
        `/presale/items/${id}/final-price`,
        { finalPrice }
      )
      if (!response.data.data) {
        throw new Error('Failed to update final price')
      }
      return response.data.data
    },

    // Update status
    updateStatus: async (
      id: string,
      status: 'active' | 'completed' | 'cancelled' | 'paused'
    ): Promise<PreSaleItem> => {
      const response = await api.put<ApiResponse<PreSaleItem>>(
        `/presale/items/${id}/status`,
        { status }
      )
      if (!response.data.data) {
        throw new Error('Failed to update status')
      }
      return response.data.data
    },

    // Assign units to delivery
    assignUnits: async (
      id: string,
      deliveryId: string,
      quantity: number,
      purchaseId: string
    ): Promise<any> => {
      const response = await api.post<ApiResponse<any>>(
        `/presale/items/${id}/assign`,
        { deliveryId, quantity, purchaseId }
      )
      if (!response.data.data) {
        throw new Error('Failed to assign units')
      }
      return response.data.data
    },

    // Unassign units from delivery
    unassignUnits: async (id: string, unitIds: string[]): Promise<PreSaleItem> => {
      const response = await api.post<ApiResponse<PreSaleItem>>(
        `/presale/items/${id}/unassign`,
        { unitIds }
      )
      if (!response.data.data) {
        throw new Error('Failed to unassign units')
      }
      return response.data.data
    },

    // Get profit analytics
    getProfitAnalytics: async (id: string): Promise<any> => {
      const response = await api.get<ApiResponse<any>>(`/presale/items/${id}/profit`)
      return response.data.data
    },

    // Get active sales summary
    getActiveSummary: async (): Promise<any> => {
      const response = await api.get<ApiResponse<any>>('/presale/items/summary/active')
      return response.data.data
    },

    // Cancel pre-sale item
    cancel: async (id: string): Promise<PreSaleItem> => {
      const response = await api.delete<ApiResponse<PreSaleItem>>(`/presale/items/${id}`)
      if (!response.data.data) {
        throw new Error('Failed to cancel pre-sale item')
      }
      return response.data.data
    }
  },

  // Pre-Sale Payments
  payments: {
    // Get payment plan by ID
    getById: async (id: string): Promise<PreSalePaymentPlan> => {
      const response = await api.get<ApiResponse<PreSalePaymentPlan>>(`/presale/payments/${id}`)
      if (!response.data.data) {
        throw new Error('Payment plan not found')
      }
      return response.data.data
    },

    // Get payment plan by delivery ID
    getByDelivery: async (deliveryId: string): Promise<PreSalePaymentPlan> => {
      const response = await api.get<ApiResponse<PreSalePaymentPlan>>(
        `/presale/payments/delivery/${deliveryId}`
      )
      if (!response.data.data) {
        throw new Error('Payment plan not found for this delivery')
      }
      return response.data.data
    },

    // Create payment plan
    create: async (data: {
      deliveryId: string
      totalAmount: number
      numberOfPayments: number
      paymentFrequency?: 'weekly' | 'biweekly' | 'monthly'
      startDate?: Date
      customerId?: string
      preIntegrationCustomer?: string
      earlyPaymentBonus?: number
    }): Promise<PreSalePaymentPlan> => {
      const response = await api.post<ApiResponse<PreSalePaymentPlan>>('/presale/payments', data)
      if (!response.data.data) {
        throw new Error('Failed to create payment plan')
      }
      return response.data.data
    },

    // Record payment
    recordPayment: async (
      id: string,
      amount: number,
      paymentDate?: Date,
      notes?: string
    ): Promise<any> => {
      const response = await api.post<ApiResponse<any>>(`/presale/payments/${id}/record`, {
        amount,
        paymentDate,
        notes
      })
      if (!response.data.data) {
        throw new Error('Failed to record payment')
      }
      return response.data.data
    },

    // Get payment analytics
    getAnalytics: async (id: string): Promise<any> => {
      const response = await api.get<ApiResponse<any>>(`/presale/payments/${id}/analytics`)
      return response.data.data
    },

    // Get payment schedule
    getSchedule: async (id: string): Promise<any[]> => {
      const response = await api.get<ApiResponse<any[]>>(`/presale/payments/${id}/schedule`)
      return response.data.data || []
    },

    // Check overdue
    checkOverdue: async (id: string): Promise<PreSalePaymentPlan> => {
      const response = await api.put<ApiResponse<PreSalePaymentPlan>>(
        `/presale/payments/${id}/check-overdue`,
        {}
      )
      if (!response.data.data) {
        throw new Error('Failed to check overdue')
      }
      return response.data.data
    },

    // Get overdue plans
    getOverdue: async (): Promise<PreSalePaymentPlan[]> => {
      const response = await api.get<ApiResponse<PreSalePaymentPlan[]>>(
        '/presale/payments/overdue/list'
      )
      return response.data.data || []
    }
  }
}
