import api from './api'
import type { ApiResponse } from '@shared/types'

interface PredictiveResult {
  id: string
  type: 'inventory' | 'sale' | 'delivery' | 'customer' | 'presale' | 'catalog'
  name: string
  price?: number
  photoUrl?: string
  extra?: string
}

export const searchService = {
  // Predictive search - returns top matching results
  predictive: async (query: string): Promise<PredictiveResult[]> => {
    if (!query || query.length < 3) return []
    
    try {
      const response = await api.get<ApiResponse<PredictiveResult[]>>('/search/predictive', {
        params: { q: query, limit: 10 }
      })
      return response.data.data || []
    } catch (error) {
      console.error('Predictive search error:', error)
      return []
    }
  },

  // Standard search
  search: async (query: string, filters?: any) => {
    const params: any = { q: query, ...filters }
    const response = await api.get<ApiResponse<any>>('/search', { params })
    return response.data.data || {}
  }
}
