import api from './api'
import type { CustomBrand, ApiResponse } from '@shared/types'

export const customBrandsService = {
  // Get all custom brands
  getAll: async (): Promise<CustomBrand[]> => {
    const response = await api.get<ApiResponse<CustomBrand[]>>('/custom-brands')
    return response.data.data || []
  },

  // Create a new custom brand
  create: async (name: string): Promise<CustomBrand> => {
    const response = await api.post<ApiResponse<CustomBrand>>('/custom-brands', { name })
    if (!response.data.data) {
      throw new Error('Failed to create brand')
    }
    return response.data.data
  },

  // Delete a custom brand
  delete: async (id: string): Promise<void> => {
    await api.delete(`/custom-brands/${id}`)
  }
}
