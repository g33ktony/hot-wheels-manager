import { useQuery, useMutation, useQueryClient } from 'react-query'
import { customBrandsService } from '@/services/customBrands'
import toast from 'react-hot-toast'

export const useCustomBrands = () => {
  return useQuery('customBrands', customBrandsService.getAll, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateCustomBrand = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (name: string) => customBrandsService.create(name),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customBrands')
        toast.success('Marca agregada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al agregar marca')
      },
    }
  )
}

export const useDeleteCustomBrand = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => customBrandsService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customBrands')
        toast.success('Marca eliminada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar marca')
      },
    }
  )
}
