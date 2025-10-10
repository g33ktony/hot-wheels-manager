import { useQuery, useMutation, useQueryClient } from 'react-query'
import { pendingItemsService } from '@/services/pendingItems'

// Get all pending items
export const usePendingItems = (filters?: { status?: string; overdue?: boolean }) => {
  return useQuery({
    queryKey: ['pending-items', filters],
    queryFn: () => pendingItemsService.getAll(filters),
  })
}

// Get pending items statistics
export const usePendingItemsStats = () => {
  return useQuery({
    queryKey: ['pending-items-stats'],
    queryFn: () => pendingItemsService.getStats(),
  })
}

// Create pending item
export const useCreatePendingItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: pendingItemsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] })
      queryClient.invalidateQueries({ queryKey: ['pending-items-stats'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  })
}

// Update pending item
export const useUpdatePendingItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      pendingItemsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] })
      queryClient.invalidateQueries({ queryKey: ['pending-items-stats'] })
    }
  })
}

// Link to purchase
export const useLinkToPurchase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, purchaseId }: { id: string; purchaseId: string }) =>
      pendingItemsService.linkToPurchase(id, { purchaseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  })
}

// Mark as refunded
export const useMarkAsRefunded = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      pendingItemsService.markAsRefunded(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] })
      queryClient.invalidateQueries({ queryKey: ['pending-items-stats'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  })
}

// Delete pending item
export const useDeletePendingItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => pendingItemsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] })
      queryClient.invalidateQueries({ queryKey: ['pending-items-stats'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  })
}
