import api from './api'
import type { 
  InventoryItem, 
  CreateInventoryItemDto,
  ApiResponse 
} from '@shared/types'

interface PaginatedInventoryResponse {
  items: InventoryItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
}

interface InventoryFilters {
  search?: string
  condition?: string
  brand?: string
  pieceType?: string
  treasureHunt?: 'all' | 'th' | 'sth'
  chase?: boolean
}

export const inventoryService = {
  // Obtener todos los items del inventario con paginación y filtros
  getAll: async (
    page: number = 1, 
    limit: number = 15,
    filters: InventoryFilters = {}
  ): Promise<PaginatedInventoryResponse> => {
    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    // Add filters if they exist
    if (filters.search && filters.search.length > 0) {
      params.append('search', filters.search)
    }
    if (filters.condition && filters.condition.length > 0) {
      params.append('condition', filters.condition)
    }
    if (filters.brand && filters.brand.length > 0) {
      params.append('brand', filters.brand)
    }
    if (filters.pieceType && filters.pieceType.length > 0) {
      params.append('pieceType', filters.pieceType)
    }
    if (filters.treasureHunt && filters.treasureHunt !== 'all') {
      params.append('treasureHunt', filters.treasureHunt)
    }
    if (filters.chase) {
      params.append('chase', 'true')
    }

    console.log('🌐 API Call:', `/inventory?${params.toString()}`)
    const response = await api.get<ApiResponse<PaginatedInventoryResponse>>(
      `/inventory?${params.toString()}`
    )
    console.log('📦 API Response:', {
      itemCount: response.data.data?.items?.length,
      pagination: response.data.data?.pagination,
      firstItemId: response.data.data?.items?.[0]?._id
    })
    return response.data.data || { items: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: limit } }
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
