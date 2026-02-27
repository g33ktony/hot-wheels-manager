import api from './api'
import type { 
  Sale, 
  CreateSaleDto,
  ApiResponse 
} from '@shared/types'

export const salesService = {
  // Obtener todas las ventas
  getAll: async (selectedStore?: string): Promise<Sale[]> => {
    const params = selectedStore ? `?storeId=${selectedStore}` : ''
    const response = await api.get<ApiResponse<Sale[]>>(`/sales${params}`)
    return response.data.data || []
  },

  // Obtener venta por ID
  getById: async (id: string): Promise<Sale> => {
    const response = await api.get<ApiResponse<Sale>>(`/sales/${id}`)
    if (!response.data.data) {
      throw new Error('Sale not found')
    }
    return response.data.data
  },

  // Crear nueva venta
  create: async (data: CreateSaleDto): Promise<Sale> => {
    const response = await api.post<ApiResponse<Sale>>('/sales', data)
    if (!response.data.data) {
      throw new Error('Failed to create sale')
    }
    return response.data.data
  },

  // Actualizar venta
  update: async (id: string, data: Partial<CreateSaleDto>): Promise<Sale> => {
    const response = await api.put<ApiResponse<Sale>>(`/sales/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update sale')
    }
    return response.data.data
  },

  // Eliminar venta
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sales/${id}`)
  },

  // Obtener estadísticas de ventas
  getStats: async () => {
    const response = await api.get<ApiResponse<{
      totalSales: number
      totalRevenue: number
      monthlyCount: number
      monthlyRevenue: number
      recentSales: Sale[]
    }>>('/sales/stats')
    return response.data.data
  }
}
