import api from './api'
import type { InventoryItem, ApiResponse } from '@shared/types'

interface BoxResponse {
  success: boolean
  data: any
  message: string
}

interface BoxDetailResponse {
  box: InventoryItem
  registeredPieces: InventoryItem[]
}

interface RegisterPiecesPayload {
  pieces: Array<{
    carId: string
    condition?: 'mint' | 'good' | 'fair' | 'poor'
    isTreasureHunt?: boolean
    isSuperTreasureHunt?: boolean
    isChase?: boolean
    photos?: string[]
    location?: string
    notes?: string
    suggestedPrice?: number
  }>
}

interface CompleteBoxPayload {
  reason?: string
}

interface UpdateBoxPayload {
  boxName?: string
  boxSize?: number
  boxPrice?: number
  location?: string
  notes?: string
}

export const boxesService = {
  // Get all boxes (sealed or unpacking)
  getAll: async (): Promise<InventoryItem[]> => {
    const response = await api.get<ApiResponse<InventoryItem[]>>('/boxes')
    return response.data.data || []
  },

  // Get box details with registered pieces
  getById: async (id: string): Promise<BoxDetailResponse> => {
    const response = await api.get<ApiResponse<BoxDetailResponse>>(`/boxes/${id}`)
    if (!response.data.data) {
      throw new Error('Box not found')
    }
    return response.data.data
  },

  // Register piece(s) from a box
  registerPieces: async (boxId: string, payload: RegisterPiecesPayload): Promise<void> => {
    await api.post(`/boxes/${boxId}/pieces`, payload)
  },

  // Complete a box (mark as fully unpacked)
  complete: async (boxId: string, payload?: CompleteBoxPayload): Promise<void> => {
    await api.post(`/boxes/${boxId}/complete`, payload)
  },

  // Update box details
  update: async (boxId: string, payload: UpdateBoxPayload): Promise<InventoryItem> => {
    const response = await api.put<ApiResponse<InventoryItem>>(`/boxes/${boxId}`, payload)
    if (!response.data.data) {
      throw new Error('Failed to update box')
    }
    return response.data.data
  },

  // Delete a box
  delete: async (boxId: string): Promise<void> => {
    await api.delete(`/boxes/${boxId}`)
  },
}

export default boxesService
