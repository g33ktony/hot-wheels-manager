import { useQuery, useMutation, useQueryClient } from 'react-query'
import { purchasesService } from '@/services/purchases'
import type { CreatePurchaseDto } from '@shared/types'
import toast from 'react-hot-toast'

export const usePurchases = () => {
  return useQuery('purchases', purchasesService.getAll, {
    staleTime: 2 * 60 * 1000,
  })
}

export const usePurchase = (id: string) => {
  return useQuery(
    ['purchase', id],
    () => purchasesService.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const useCreatePurchase = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreatePurchaseDto) => purchasesService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchases')
        toast.success('Compra registrada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al registrar compra')
      },
    }
  )
}

export const useMarkPurchaseAsReceived = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, receivedItems }: { 
      id: string; 
      receivedItems: { 
        carId: string; 
        quantity: number; 
        condition: 'mint' | 'good' | 'fair' | 'poor';
        suggestedPrice: number;
        photos?: string[];
        notes?: string;
      }[] 
    }) => purchasesService.markAsReceived(id, receivedItems),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('purchases')
        queryClient.invalidateQueries(['purchase', variables.id])
        queryClient.invalidateQueries('inventory')
        toast.success('Compra marcada como recibida y agregada al inventario')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al procesar la recepción de la compra')
      },
    }
  )
}

export const useUpdatePurchaseTracking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, trackingNumber }: { id: string; trackingNumber: string }) =>
      purchasesService.updateTracking(id, trackingNumber),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('purchases')
        queryClient.invalidateQueries(['purchase', variables.id])
        toast.success('Número de rastreo actualizado')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar número de rastreo')
      },
    }
  )
}

export const useUpdatePurchaseStatus = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, status }: { id: string; status: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled' }) =>
      purchasesService.updateStatus(id, status),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('purchases')
        queryClient.invalidateQueries(['purchase', variables.id])
        toast.success('Estado de compra actualizado')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar estado de compra')
      },
    }
  )
}

export const useDeletePurchase = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => purchasesService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchases')
        queryClient.invalidateQueries('inventory')
        toast.success('Compra eliminada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar la compra')
      },
    }
  )
}

export const usePendingPurchases = () => {
  return useQuery('pending-purchases', purchasesService.getPending, {
    staleTime: 1 * 60 * 1000,
  })
}

export const usePurchasesStats = (period?: 'day' | 'week' | 'month' | 'year') => {
  return useQuery(
    ['purchases-stats', period],
    () => purchasesService.getStats(period),
    {
      staleTime: 5 * 60 * 1000,
    }
  )
}

export const useSearchPurchases = (term: string) => {
  return useQuery(
    ['purchases-search', term],
    () => purchasesService.search(term),
    {
      enabled: term.length > 2,
      staleTime: 1 * 60 * 1000,
    }
  )
}
