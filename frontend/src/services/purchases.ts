import api from './api'
import type { 
  Purchase, 
  CreatePurchaseDto,
  ApiResponse 
} from '@shared/types'

export const purchasesService = {
  // Obtener todas las compras
  getAll: async (): Promise<Purchase[]> => {
    const response = await api.get<ApiResponse<Purchase[]>>('/purchases')
    return response.data.data || []
  },

  // Obtener compra por ID
  getById: async (id: string): Promise<Purchase> => {
    const response = await api.get<ApiResponse<Purchase>>(`/purchases/${id}`)
    if (!response.data.data) {
      throw new Error('Purchase not found')
    }
    return response.data.data
  },

  // Crear nueva compra
  create: async (data: CreatePurchaseDto): Promise<Purchase> => {
    const response = await api.post<ApiResponse<Purchase>>('/purchases', data)
    if (!response.data.data) {
      throw new Error('Failed to create purchase')
    }
    return response.data.data
  },

  // Actualizar compra
  update: async (id: string, data: Partial<CreatePurchaseDto>): Promise<Purchase> => {
    const response = await api.put<ApiResponse<Purchase>>(`/purchases/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update purchase')
    }
    return response.data.data
  },

  // Eliminar compra
  delete: async (id: string): Promise<void> => {
    await api.delete(`/purchases/${id}`)
  },

  // Marcar compra como recibida y agregar al inventario
  markAsReceived: async (id: string, receivedItems: { 
    carId: string; 
    quantity: number; 
    condition: 'mint' | 'good' | 'fair' | 'poor';
    suggestedPrice: number;
    photos?: string[];
    notes?: string;
  }[]): Promise<Purchase> => {
    const response = await api.patch<ApiResponse<Purchase>>(`/purchases/${id}/received`, {
      receivedItems
    })
    if (!response.data.data) {
      throw new Error('Failed to mark purchase as received')
    }
    return response.data.data
  },

  // Actualizar número de rastreo
  updateTracking: async (id: string, trackingNumber: string): Promise<Purchase> => {
    const response = await api.patch<ApiResponse<Purchase>>(`/purchases/${id}/tracking`, {
      trackingNumber
    })
    if (!response.data.data) {
      throw new Error('Failed to update tracking number')
    }
    return response.data.data
  },

  // Actualizar estado de compra
  updateStatus: async (id: string, status: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled'): Promise<Purchase> => {
    const response = await api.put<ApiResponse<Purchase>>(`/purchases/${id}/status`, {
      status
    })
    if (!response.data.data) {
      throw new Error('Failed to update purchase status')
    }
    return response.data.data
  },

  // Obtener compras pendientes
  getPending: async (): Promise<Purchase[]> => {
    const response = await api.get<ApiResponse<Purchase[]>>('/purchases/pending')
    return response.data.data || []
  },

  // Obtener estadísticas de compras
  getStats: async (period?: 'day' | 'week' | 'month' | 'year') => {
    const response = await api.get<ApiResponse<{
      totalPurchases: number
      totalSpent: number
      totalShippingCost: number
      averagePurchaseValue: number
      pendingPurchases: number
      purchasesBySupplier: { supplier: string; count: number; total: number }[]
      purchasesByPeriod: { date: string; purchases: number; amount: number }[]
    }>>(`/purchases/stats${period ? `?period=${period}` : ''}`)
    return response.data.data
  },

  // Buscar compras
  search: async (term: string): Promise<Purchase[]> => {
    const response = await api.get<ApiResponse<Purchase[]>>(`/purchases/search?q=${encodeURIComponent(term)}`)
    return response.data.data || []
  }
}
