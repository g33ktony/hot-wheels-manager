import { useQuery, useMutation, useQueryClient } from 'react-query'
import { suppliersService } from '@/services/suppliers'
import type { CreateSupplierDto } from '@shared/types'
import toast from 'react-hot-toast'

export const useSuppliers = () => {
  return useQuery('suppliers', suppliersService.getAll, {
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

export const useSupplier = (id: string) => {
  return useQuery(['suppliers', id], () => suppliersService.getById(id), {
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreateSupplierDto) => suppliersService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers')
        toast.success('Proveedor creado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear proveedor')
      },
    }
  )
}

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateSupplierDto> }) =>
      suppliersService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers')
        toast.success('Proveedor actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar proveedor')
      },
    }
  )
}

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => suppliersService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers')
        toast.success('Proveedor eliminado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar proveedor')
      },
    }
  )
}
