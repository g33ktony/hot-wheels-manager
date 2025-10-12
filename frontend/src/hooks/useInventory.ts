import { useQuery, useMutation, useQueryClient } from 'react-query'
import { inventoryService } from '@/services/inventory'
import type { CreateInventoryItemDto } from '@shared/types'
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
    chase = false
  } = options
  
  return useQuery(
    ['inventory', page, limit, search, condition, brand, pieceType, treasureHunt, chase], 
    () => {
      console.log('🔄 Fetching inventory for page:', page)
      return inventoryService.getAll(page, limit, {
        search,
        condition,
        brand,
        pieceType,
        treasureHunt,
        chase
      })
    }, 
    {
      staleTime: 0, // Always consider stale to force refetch
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      keepPreviousData: false, // TEMP: Disable to see if we get correct data
      refetchOnWindowFocus: false,
    }
  )
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
