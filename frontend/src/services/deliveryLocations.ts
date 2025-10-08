import api from './api'
import type { DeliveryLocation, ApiResponse } from '@shared/types'

export const deliveryLocationsService = {
  // Get all delivery locations
  getAll: async (): Promise<DeliveryLocation[]> => {
    const response = await api.get<ApiResponse<DeliveryLocation[]>>('/delivery-locations')
    return response.data.data || []
  },

  // Create a new delivery location
  create: async (name: string): Promise<DeliveryLocation> => {
    const response = await api.post<ApiResponse<DeliveryLocation>>('/delivery-locations', { name })
    if (!response.data.data) {
      throw new Error('Failed to create delivery location')
    }
    return response.data.data
  },

  // Delete a delivery location
  delete: async (id: string): Promise<void> => {
    await api.delete(`/delivery-locations/${id}`)
  }
}
