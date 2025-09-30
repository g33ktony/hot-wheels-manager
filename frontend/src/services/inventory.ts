import api from './api'
import type { 
  InventoryItem, 
  CreateInventoryItemDto,
  ApiResponse 
} from '@shared/types'

export const inventoryService = {
  // Obtener todos los items del inventario
  getAll: async (): Promise<InventoryItem[]> => {
    const response = await api.get<ApiResponse<{items: InventoryItem[]}>>('/inventory')
    return response.data.data?.items || []
  },

  // Obtener un item del inventario por ID
  getById: async (id: string): Promise<InventoryItem> => {
    const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`)
    if (!response.data.data) {
      throw new Error('Item not found')
    }
    return response.data.data
  },

  // Crear nuevo item en inventario
  create: async (data: CreateInventoryItemDto): Promise<InventoryItem> => {
    const response = await api.post<ApiResponse<InventoryItem>>('/inventory', data)
    if (!response.data.data) {
      throw new Error('Failed to create item')
    }
    return response.data.data
  },

  // Actualizar item del inventario
  update: async (id: string, data: Partial<CreateInventoryItemDto>): Promise<InventoryItem> => {
    const response = await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update item')
    }
    return response.data.data
  },

  // Eliminar item del inventario
  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`)
  },

  // Buscar en inventario por término
  search: async (term: string): Promise<InventoryItem[]> => {
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/inventory/search?q=${encodeURIComponent(term)}`)
    return response.data.data || []
  },

  // Actualizar cantidad
  updateQuantity: async (id: string, quantity: number): Promise<InventoryItem> => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/quantity`, { quantity })
    if (!response.data.data) {
      throw new Error('Failed to update quantity')
    }
    return response.data.data
  },

  // Actualizar precio
  updatePrice: async (id: string, suggestedPrice: number, actualPrice?: number): Promise<InventoryItem> => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/price`, { 
      suggestedPrice, 
      actualPrice 
    })
    if (!response.data.data) {
      throw new Error('Failed to update price')
    }
    return response.data.data
  },

  // Obtener estadísticas del inventario
  getStats: async () => {
    const response = await api.get<ApiResponse<{
      totalItems: number
      totalValue: number
      lowStockItems: number
      categories: { [key: string]: number }
    }>>('/inventory/stats')
    return response.data.data
  }
}
