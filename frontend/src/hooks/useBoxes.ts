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
      return await boxesService.getAll()
    }
  })
}

// Get box details with registered pieces
export const useBoxById = (id: string) => {
  return useQuery({
    queryKey: ['boxes', id],
    queryFn: async () => {
      return await boxesService.getById(id)
    },
    enabled: !!id
  })
}

// Register piece(s) from a box
export const useRegisterBoxPieces = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boxId, pieces }: RegisterPiecesPayload) => {
      await boxesService.registerPieces(boxId, { pieces })
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
      await boxesService.complete(boxId, reason ? { reason } : undefined)
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
      // Note: This endpoint might not exist yet in boxesService
      // We'll need to add it if needed
      throw new Error('Delete piece endpoint not implemented yet')
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
      await boxesService.update(boxId, updates)
    },
    onSuccess: (_data, variables) => {
      // Invalidate specific box
      queryClient.invalidateQueries({ queryKey: ['boxes', variables.boxId] })
      // Invalidate boxes list
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    }
  })
}
