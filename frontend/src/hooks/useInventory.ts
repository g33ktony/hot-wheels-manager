import { useQuery, useMutation, useQueryClient } from 'react-query'
import { inventoryService, type PaginatedInventoryResponse } from '@/services/inventory'
import type { CreateInventoryItemDto } from '@shared/types'
import { useAppDispatch, useAppSelector } from './redux'
import { setInventoryItems, setError } from '@/store/slices/inventorySlice'
import toast from 'react-hot-toast'

interface UseInventoryOptions {
  page?: number
  limit?: number
  search?: string
  condition?: string
  brand?: string
  pieceType?: string
  treasureHunt?: 'all' | 'th' | 'sth'
  chase?: boolean
  fantasy?: boolean
  moto?: boolean
  camioneta?: boolean
  useRedux?: boolean // Use Redux cache alongside React Query
}

export const useInventory = (options: UseInventoryOptions = {}) => {
  const { 
    page = 1, 
    limit = 15,
    search = '',
    condition = '',
    brand = '',
    pieceType = '',
    treasureHunt = 'all',
    chase = false,
    fantasy = false,
    moto = false,
    camioneta = false,
    useRedux = true
  } = options

  const dispatch = useAppDispatch()
  
  return useQuery<PaginatedInventoryResponse, Error>(
    ['inventory', page, limit, search, condition, brand, pieceType, treasureHunt, chase, fantasy, moto, camioneta],
    () => inventoryService.getAll(page, limit, { search, condition, brand, pieceType, treasureHunt, chase, fantasy, moto, camioneta }),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter for more frequent updates
      cacheTime: 10 * 60 * 1000, // 10 minutes in cache
      keepPreviousData: true,
      refetchOnWindowFocus: true, // Refetch when user returns to window
      refetchInterval: 3 * 60 * 1000, // Auto-refetch every 3 minutes
      refetchIntervalInBackground: true, // Keep refetching even when tab is not focused
      onSuccess: (data) => {
        // Update Redux store when data is fetched successfully
        if (useRedux) {
          dispatch(setInventoryItems({
            items: data.items,
            totalItems: data.pagination.totalItems,
            currentPage: data.pagination.currentPage,
            totalPages: data.pagination.totalPages,
            itemsPerPage: data.pagination.itemsPerPage
          }))
        }
      },
      onError: (error) => {
        if (useRedux) {
          dispatch(setError(error.message))
        }
      }
    }
  )
}

/**
 * Hook to get all inventory from Redux cache (instant access)
 * Useful for POS and quick lookups
 */
export const useInventoryCache = () => {
  return useAppSelector(state => state.inventory)
}

export const useInventoryItem = (id: string) => {
  return useQuery(
    ['inventory', id],
    () => inventoryService.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreateInventoryItemDto) => inventoryService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventory')
        toast.success('Item agregado al inventario exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al agregar item al inventario')
      },
    }
  )
}

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateInventoryItemDto> }) =>
      inventoryService.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('inventory')
        queryClient.invalidateQueries(['inventory', variables.id])
        toast.success('Item actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar item')
      },
    }
  )
}

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => inventoryService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventory')
        toast.success('Item eliminado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al eliminar item')
      },
    }
  )
}

export const useUpdateQuantity = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, quantity }: { id: string; quantity: number }) =>
      inventoryService.updateQuantity(id, quantity),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('inventory')
        queryClient.invalidateQueries(['inventory', variables.id])
        toast.success('Cantidad actualizada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar cantidad')
      },
    }
  )
}

export const useUpdatePrice = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, suggestedPrice, actualPrice }: { 
      id: string; 
      suggestedPrice: number; 
      actualPrice?: number 
    }) => inventoryService.updatePrice(id, suggestedPrice, actualPrice),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('inventory')
        queryClient.invalidateQueries(['inventory', variables.id])
        toast.success('Precio actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar precio')
      },
    }
  )
}

export const useInventoryStats = () => {
  return useQuery('inventory-stats', inventoryService.getStats, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export const useSearchInventory = (term: string) => {
  return useQuery(
    ['inventory-search', term],
    () => inventoryService.search(term),
    {
      enabled: term.length > 2,
      staleTime: 1 * 60 * 1000, // 1 minuto
    }
  )
}
