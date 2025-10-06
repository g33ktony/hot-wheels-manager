import api from './api'
import type { PendingItem, ApiResponse } from '@shared/types'

interface PendingItemsResponse {
  items: PendingItem[]
  count: number
  totalValue: number
}

interface PendingItemsStats {
  totalCount: number
  totalValue: number
  byStatus: {
    'pending-reshipment': number
    'requesting-refund': number
    'refunded': number
    'cancelled': number
  }
  overdueCount: number
}

interface CreatePendingItemPayload {
  originalPurchaseId: string
  carId: string
  quantity: number
  unitPrice: number
  condition: 'mint' | 'good' | 'fair' | 'poor'
  brand?: string
  pieceType?: 'basic' | 'premium' | 'rlc'
  isTreasureHunt?: boolean
  isSuperTreasureHunt?: boolean
  isChase?: boolean
  photos?: string[]
  notes?: string
  status?: 'pending-reshipment' | 'requesting-refund'
}

interface UpdatePendingItemPayload {
  status?: 'pending-reshipment' | 'requesting-refund' | 'cancelled'
  notes?: string
}

interface LinkToPurchasePayload {
  purchaseId: string
}

interface MarkRefundedPayload {
  refundAmount: number
  refundDate?: Date
  refundMethod?: string
  notes?: string
}

export const pendingItemsService = {
  // Get all pending items with optional filters
  getAll: async (filters?: {
    status?: string
    overdue?: boolean
  }): Promise<PendingItemsResponse> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.overdue) params.append('overdue', 'true')
    
    const response = await api.get<ApiResponse<PendingItemsResponse>>(
      `/pending-items${params.toString() ? `?${params.toString()}` : ''}`
    )
    return response.data.data || { items: [], count: 0, totalValue: 0 }
  },

  // Get statistics
  getStats: async (): Promise<PendingItemsStats> => {
    const response = await api.get<ApiResponse<PendingItemsStats>>('/pending-items/stats')
    return response.data.data!
  },

  // Create new pending item
  create: async (payload: CreatePendingItemPayload): Promise<PendingItem> => {
    const response = await api.post<ApiResponse<PendingItem>>('/pending-items', payload)
    return response.data.data!
  },

  // Update pending item
  update: async (id: string, payload: UpdatePendingItemPayload): Promise<PendingItem> => {
    const response = await api.put<ApiResponse<PendingItem>>(`/pending-items/${id}`, payload)
    return response.data.data!
  },

  // Link to purchase
  linkToPurchase: async (id: string, payload: LinkToPurchasePayload): Promise<PendingItem> => {
    const response = await api.put<ApiResponse<PendingItem>>(
      `/pending-items/${id}/link-to-purchase`,
      payload
    )
    return response.data.data!
  },

  // Mark as refunded
  markAsRefunded: async (id: string, payload: MarkRefundedPayload): Promise<PendingItem> => {
    const response = await api.put<ApiResponse<PendingItem>>(
      `/pending-items/${id}/mark-refunded`,
      payload
    )
    return response.data.data!
  },

  // Delete pending item
  delete: async (id: string): Promise<void> => {
    await api.delete(`/pending-items/${id}`)
  }
}
