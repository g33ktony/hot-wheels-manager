import { useQuery, useMutation, useQueryClient } from 'react-query'
import { salesService } from '@/services/sales'
import type { CreateSaleDto } from '@shared/types'
import toast from 'react-hot-toast'

export const useSales = () => {
  return useQuery('sales', salesService.getAll, {
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

export const useSale = (id: string) => {
  return useQuery(
    ['sale', id],
    () => salesService.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const useCreateSale = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreateSaleDto) => salesService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sales')
        queryClient.invalidateQueries('inventory')
        toast.success('Venta registrada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al registrar venta')
      },
    }
  )
}

export const useUpdateSale = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateSaleDto> }) =>
      salesService.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('sales')
        queryClient.invalidateQueries(['sale', variables.id])
        toast.success('Venta actualizada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar venta')
      },
    }
  )
}

export const useDeleteSale = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => salesService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sales')
        queryClient.invalidateQueries('inventory')
        toast.success('Venta eliminada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar venta')
      },
    }
  )
}

export const useSalesStats = () => {
  return useQuery('sales-stats', salesService.getStats, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
