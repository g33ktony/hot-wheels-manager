import { useQuery, useMutation, useQueryClient } from 'react-query'
import { deliveryLocationsService } from '@/services/deliveryLocations'
import toast from 'react-hot-toast'

export const useDeliveryLocations = () => {
  return useQuery('deliveryLocations', deliveryLocationsService.getAll, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateDeliveryLocation = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (name: string) => deliveryLocationsService.create(name),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveryLocations')
        toast.success('Ubicación agregada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al agregar ubicación')
      },
    }
  )
}

export const useDeleteDeliveryLocation = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => deliveryLocationsService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deliveryLocations')
        toast.success('Ubicación eliminada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar ubicación')
      },
    }
  )
}
