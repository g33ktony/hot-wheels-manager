import api from './api'
import type { 
  HotWheelsCar, 
  MarketPrice,
  UpdateMarketPriceDto,
  ApiResponse 
} from '@shared/types'

export const hotWheelsService = {
  // Obtener todos los coches de Hot Wheels
  getAll: async (): Promise<HotWheelsCar[]> => {
    const response = await api.get<ApiResponse<HotWheelsCar[]>>('/hotwheels')
    return response.data.data || []
  },

  // Obtener coche por ID
  getById: async (id: string): Promise<HotWheelsCar> => {
    const response = await api.get<ApiResponse<HotWheelsCar>>(`/hotwheels/${id}`)
    if (!response.data.data) {
      throw new Error('Car not found')
    }
    return response.data.data
  },

  // Buscar coches
  search: async (term: string): Promise<HotWheelsCar[]> => {
    const response = await api.get<ApiResponse<HotWheelsCar[]>>(`/hotwheels/search?q=${encodeURIComponent(term)}`)
    return response.data.data || []
  },

  // Filtrar coches
  filter: async (filters: {
    series?: string
    year?: number
    color?: string
    car_make?: string
    segment?: string
  }): Promise<HotWheelsCar[]> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString())
    })
    
    const response = await api.get<ApiResponse<HotWheelsCar[]>>(`/hotwheels/filter?${params}`)
    return response.data.data || []
  },

  // Obtener todas las series disponibles
  getSeries: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/hotwheels/series')
    return response.data.data || []
  },

  // Obtener todos los años disponibles
  getYears: async (): Promise<number[]> => {
    const response = await api.get<ApiResponse<number[]>>('/hotwheels/years')
    return response.data.data || []
  },

  // Obtener todas las marcas de coches
  getMakes: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/hotwheels/makes')
    return response.data.data || []
  }
}

export const marketPricesService = {
  // Obtener precio de mercado por carId
  getByCarId: async (carId: string): Promise<MarketPrice | null> => {
    try {
      const response = await api.get<ApiResponse<MarketPrice>>(`/market-prices/${carId}`)
      return response.data.data || null
    } catch (error) {
      return null
    }
  },

  // Actualizar precio de mercado
  update: async (data: UpdateMarketPriceDto): Promise<MarketPrice> => {
    const response = await api.put<ApiResponse<MarketPrice>>('/market-prices', data)
    if (!response.data.data) {
      throw new Error('Failed to update market price')
    }
    return response.data.data
  },

  // Obtener todos los precios de mercado
  getAll: async (): Promise<MarketPrice[]> => {
    const response = await api.get<ApiResponse<MarketPrice[]>>('/market-prices')
    return response.data.data || []
  },

  // Eliminar precio de mercado
  delete: async (carId: string): Promise<void> => {
    await api.delete(`/market-prices/${carId}`)
  },

  // Obtener precios desactualizados (más de X días)
  getOutdated: async (days: number = 30): Promise<MarketPrice[]> => {
    const response = await api.get<ApiResponse<MarketPrice[]>>(`/market-prices/outdated?days=${days}`)
    return response.data.data || []
  },

  // Búsqueda de precios
  search: async (term: string): Promise<MarketPrice[]> => {
    const response = await api.get<ApiResponse<MarketPrice[]>>(`/market-prices/search?q=${encodeURIComponent(term)}`)
    return response.data.data || []
  }
}
