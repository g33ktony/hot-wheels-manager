import { useInfiniteQuery } from 'react-query'
import { inventoryService } from '@/services/inventory'
import type { PaginatedInventoryResponse } from '@/services/inventory'

interface UseInfiniteInventoryOptions {
  search?: string
  condition?: string
  brand?: string
  pieceType?: string
  treasureHunt?: 'all' | 'th' | 'sth'
  chase?: boolean
  pageSize?: number
}

export const useInfiniteInventory = (options: UseInfiniteInventoryOptions = {}) => {
  const {
    search = '',
    condition = '',
    brand = '',
    pieceType = '',
    treasureHunt = 'all',
    chase = false,
    pageSize = 50 // Load 50 items at a time (much better than 1000)
  } = options

  return useInfiniteQuery<PaginatedInventoryResponse, Error>(
    ['inventory-infinite', search, condition, brand, pieceType, treasureHunt, chase, pageSize],
    ({ pageParam = 1 }) =>
      inventoryService.getAll(pageParam, pageSize, {
        search,
        condition,
        brand,
        pieceType,
        treasureHunt,
        chase
      }),
    {
      getNextPageParam: (lastPage) => {
        // If we're on the last page, don't fetch more
        if (lastPage.pagination.currentPage >= lastPage.pagination.totalPages) {
          return undefined
        }
        return lastPage.pagination.currentPage + 1
      },
      getPreviousPageParam: (firstPage) => {
        if (firstPage.pagination.currentPage <= 1) {
          return undefined
        }
        return firstPage.pagination.currentPage - 1
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      keepPreviousData: true,
      refetchOnWindowFocus: true,
      refetchInterval: 3 * 60 * 1000 // 3 minutes
    }
  )
}
