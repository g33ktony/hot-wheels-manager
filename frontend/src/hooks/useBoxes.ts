import { useQuery, useMutation, useQueryClient } from 'react-query'
import { boxesService } from '@/services/boxes'
import type { InventoryItem } from '../../../shared/types'

interface RegisterPiecesPayload {
  boxId: string
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
  boxId: string
  reason?: string
}

interface UpdateBoxPayload {
  boxId: string
  boxName?: string
  boxSize?: number
  boxPrice?: number
  location?: string
  notes?: string
}

// Get all boxes (sealed or unpacking)
export const useBoxes = () => {
  return useQuery({
    queryKey: ['boxes'],
    queryFn: async () => {
      const response = await axios.get<BoxResponse>('/api/boxes', {
        headers: getAuthHeaders()
      })
      return response.data.data
    }
  })
}

// Get box details with registered pieces
export const useBoxById = (id: string) => {
  return useQuery({
    queryKey: ['boxes', id],
    queryFn: async () => {
      const response = await axios.get<BoxDetailResponse>(`/api/boxes/${id}`, {
        headers: getAuthHeaders()
      })
      return response.data.data
    },
    enabled: !!id
  })
}

// Register piece(s) from a box
export const useRegisterBoxPieces = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boxId, pieces }: RegisterPiecesPayload) => {
      const response = await axios.post<BoxResponse>(
        `/api/boxes/${boxId}/pieces`,
        { pieces },
        { headers: getAuthHeaders() }
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalidate boxes list
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      // Invalidate specific box
      queryClient.invalidateQueries({ queryKey: ['boxes', variables.boxId] })
      // Invalidate inventory (new pieces added)
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}

// Complete box (even if incomplete)
export const useCompleteBox = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boxId, reason }: CompleteBoxPayload) => {
      const response = await axios.put<BoxResponse>(
        `/api/boxes/${boxId}/complete`,
        { reason },
        { headers: getAuthHeaders() }
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate boxes list (box will be removed)
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}

// Delete a registered piece from a box
export const useDeleteBoxPiece = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boxId, pieceId }: { boxId: string; pieceId: string }) => {
      const response = await axios.delete<BoxResponse>(
        `/api/boxes/${boxId}/pieces/${pieceId}`,
        { headers: getAuthHeaders() }
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalidate specific box
      queryClient.invalidateQueries({ queryKey: ['boxes', variables.boxId] })
      // Invalidate boxes list
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}

// Update box information
export const useUpdateBox = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boxId, ...updates }: UpdateBoxPayload) => {
      const response = await axios.put<BoxResponse>(
        `/api/boxes/${boxId}`,
        updates,
        { headers: getAuthHeaders() }
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalidate specific box
      queryClient.invalidateQueries({ queryKey: ['boxes', variables.boxId] })
      // Invalidate boxes list
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    }
  })
}
