import { useAppSelector, useAppDispatch } from './redux'
import { setInventoryItems } from '@/store/slices/inventorySlice'
import { useQuery } from 'react-query'
import { inventoryService } from '@/services/inventory'

/**
 * Hook para obtener inventario en caché Redux
 * Útil para búsquedas rápidas en POS sin refrescar
 * Retorna los datos almacenados en Redux instantáneamente
 */
export const useInventoryCacheOnly = () => {
  return useAppSelector(state => state.inventory)
}

/**
 * Hook que sincroniza el caché de Redux en background
 * Útil para mantener el inventario actualizado sin bloquear la UI
 * Se puede usar en la raíz de la app o en componentes clave
 */
export const useInventorySyncInBackground = () => {
  const dispatch = useAppDispatch()
  
  // Refetch del inventario completo cada 2 minutos
  return useQuery(
    ['inventory-background-sync'],
    () => inventoryService.getAll(1, 1000), // Get large batch to have full inventory
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
      refetchIntervalInBackground: true, // Continue refetching even in background
      onSuccess: (data) => {
        // Silently update Redux with full inventory
        dispatch(setInventoryItems({
          items: data.items,
          totalItems: data.pagination.totalItems,
          currentPage: 1,
          totalPages: 1,
          itemsPerPage: data.pagination.totalItems
        }))
      },
      // Keep errors quiet (don't show toast for background sync failures)
      onError: () => {
        // Silent fail - inventory is already in cache
      }
    }
  )
}

/**
 * Hook para búsqueda rápida en caché Redux
 * Útil para POS - busca en el inventario almacenado localmente
 * No hace llamadas al servidor
 */
export const useInventorySearch = (query: string) => {
  const inventory = useAppSelector(state => state.inventory)
  
  if (!query || query.length === 0) {
    return {
      results: [],
      count: 0,
      isSearching: false
    }
  }

  // Búsqueda rápida en caché
  const searchQuery = query.toLowerCase()
  const results = inventory.items.filter(item => {
    const carId = typeof item.carId === 'object' ? item.carId?.name || '' : item.carId || ''
    const notes = item.notes || ''
    
    return (
      carId.toLowerCase().includes(searchQuery) ||
      notes.toLowerCase().includes(searchQuery) ||
      item.brand?.toLowerCase().includes(searchQuery) ||
      item.location?.toLowerCase().includes(searchQuery)
    )
  })

  return {
    results,
    count: results.length,
    isSearching: false // Local search is instant
  }
}
