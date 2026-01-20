import { useQuery, useMutation, useQueryClient } from 'react-query'
import { deliveriesService } from '@/services/deliveries'
import type { CreateDeliveryDto } from '@shared/types'
import toast from 'react-hot-toast'

// Always fetch all deliveries (without status filter) for counting widget stats
export const useAllDeliveries = (fromDate?: string) => {
  return useQuery(['deliveries-all', fromDate], () => deliveriesService.getAll(undefined, fromDate, true), {
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce load
  })
}

// Fetch deliveries with optional status filter for display list
export const useDeliveries = (status?: string, fromDate?: string) => {
  return useQuery(['deliveries', status, fromDate], () => deliveriesService.getAll(status, fromDate), {
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce load
  })
}

export const useDeliveryStats = () => {
  return useQuery('deliveryStats', deliveriesService.getStats, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export const useDelivery = (id: string) => {
  return useQuery(['deliveries', id], () => deliveriesService.getById(id), {
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export const useCreateDelivery = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreateDeliveryDto) => deliveriesService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        toast.success('Entrega creada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear entrega')
      },
    }
  )
}

export const useUpdateDelivery = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateDeliveryDto> }) =>
      deliveriesService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        queryClient.invalidateQueries('sales') // Invalidar ventas porque se pueden crear automáticamente
        queryClient.invalidateQueries('inventory') // Invalidar inventario porque se reduce
        toast.success('Entrega actualizada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar entrega')
      },
    }
  )
}

export const useDeleteDelivery = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => deliveriesService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        toast.success('Entrega eliminada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar entrega')
      },
    }
  )
}

export const useMarkDeliveryAsCompleted = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => deliveriesService.markAsCompleted(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        queryClient.invalidateQueries('sales') // Invalidar ventas porque se pueden crear automáticamente
        queryClient.invalidateQueries('inventory') // Invalidar inventario porque se reduce
        toast.success('Entrega completada, venta creada y marcada como pagada')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al completar entrega')
      },
    }
  )
}

export const useMarkDeliveryAsPrepared = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => deliveriesService.markAsPrepared(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        toast.success('Entrega marcada como preparada')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al marcar entrega como preparada')
      },
    }
  )
}

export const useMarkDeliveryAsPending = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => deliveriesService.markAsPending(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        queryClient.invalidateQueries('sales') // Invalidar ventas porque se pueden eliminar
        queryClient.invalidateQueries('inventory') // Invalidar inventario porque se restaura
        toast.success('Entrega vuelta a pendiente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al volver entrega a pendiente')
      },
    }
  )
}

export const useAddPayment = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ deliveryId, amount, paymentMethod, notes }: { 
      deliveryId: string
      amount: number
      paymentMethod?: string
      notes?: string
    }) => deliveriesService.addPayment(deliveryId, amount, paymentMethod, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        toast.success('Pago registrado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al registrar pago')
      },
    }
  )
}

export const useDeletePayment = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ deliveryId, paymentId }: { deliveryId: string; paymentId: string }) =>
      deliveriesService.deletePayment(deliveryId, paymentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveries')
        toast.success('Pago eliminado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar pago')
      },
    }
  )
}
