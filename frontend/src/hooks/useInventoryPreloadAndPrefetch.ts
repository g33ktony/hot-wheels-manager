import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { inventoryService } from '@/services/inventory'
import { setInventoryItems } from '@/store/slices/inventorySlice'
import { cacheItems } from '@/store/slices/itemsCacheSlice'
import type { AppDispatch } from '@/store/store'

interface ReduxInventoryState {
    items: any[]
    totalItems: number
    totalPages: number
}

interface PaginationState {
    totalPages: number
}

interface UseInventoryPreloadAndPrefetchParams {
    reduxInventory: ReduxInventoryState
    inventoryDataItems?: any[]
    pagination?: PaginationState
    currentPage: number
    itemsPerPage: number
    debouncedSearchTerm: string
    filterCondition: string
    filterBrand: string
    filterPieceType: string
    filterTreasureHunt: 'all' | 'th' | 'sth'
    filterChase: boolean
    filterFantasy: boolean
    filterMoto: boolean
    filterCamioneta: boolean
    dispatch: AppDispatch
}

export const useInventoryPreloadAndPrefetch = ({
    reduxInventory,
    inventoryDataItems,
    pagination,
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    filterCondition,
    filterBrand,
    filterPieceType,
    filterTreasureHunt,
    filterChase,
    filterFantasy,
    filterMoto,
    filterCamioneta,
    dispatch,
}: UseInventoryPreloadAndPrefetchParams) => {
    const queryClient = useQueryClient()
    const prefetchedPagesRef = useRef<Set<number>>(new Set())
    const [isPrefetchingNext, setIsPrefetchingNext] = useState(false)

    useEffect(() => {
        const preloadInventory = async () => {
            if (reduxInventory.items && reduxInventory.items.length > 0) {
                console.log('✅ Inventory: Using cached inventory -', reduxInventory.items.length, 'items')
                return
            }

            try {
                console.log('🔄 Inventory: Preloading all inventory in background...')

                const firstBatch = await inventoryService.getAll(1, 100, {})
                if (!firstBatch || !firstBatch.items) {
                    throw new Error('Invalid response from server')
                }

                const allItems = [...firstBatch.items]
                const totalItems = firstBatch.pagination?.totalItems || firstBatch.items.length
                const totalPages = Math.ceil(totalItems / 100)

                console.log('✅ Inventory: First batch loaded -', firstBatch.items.length, 'items of', totalItems)

                dispatch(setInventoryItems({
                    items: firstBatch.items,
                    totalItems: totalItems,
                    currentPage: 1,
                    totalPages: totalPages,
                    itemsPerPage: 100
                }))

                if (totalPages > 1) {
                    console.log('🔄 Inventory: Loading remaining pages (' + (totalPages - 1) + ' more)...')

                    for (let page = 2; page <= totalPages; page++) {
                        try {
                            const batch = await inventoryService.getAll(page, 100, {})
                            allItems.push(...(batch.items || []))
                            console.log('✅ Inventory: Page', page, '/', totalPages, 'loaded')
                        } catch (pageError) {
                            console.warn('⚠️ Inventory: Error loading page', page, '-', pageError)
                        }
                    }

                    console.log('✅ Inventory: All pages loaded -', allItems.length, 'total items')

                    dispatch(setInventoryItems({
                        items: allItems,
                        totalItems: totalItems,
                        currentPage: 1,
                        totalPages: totalPages,
                        itemsPerPage: 100
                    }))
                }
            } catch (error: any) {
                console.error('❌ Inventory: Error preloading -', error)
            }
        }

        preloadInventory()
    }, [])

    useEffect(() => {
        if (inventoryDataItems && inventoryDataItems.length > 0) {
            dispatch(cacheItems(inventoryDataItems))
        }
    }, [inventoryDataItems, dispatch])

    useEffect(() => {
        if (!pagination) return

        const nextPage = currentPage + 1
        if (nextPage > pagination.totalPages) return
        if (prefetchedPagesRef.current.has(nextPage)) return

        setIsPrefetchingNext(true)
        queryClient.prefetchQuery(
            ['inventory', nextPage, itemsPerPage, debouncedSearchTerm, filterCondition, filterBrand, filterPieceType, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta],
            () => inventoryService.getAll(nextPage, itemsPerPage, {
                search: debouncedSearchTerm,
                condition: filterCondition,
                brand: filterBrand,
                pieceType: filterPieceType,
                treasureHunt: filterTreasureHunt,
                chase: filterChase,
                fantasy: filterFantasy,
                moto: filterMoto,
                camioneta: filterCamioneta
            })
        ).then(() => {
            prefetchedPagesRef.current.add(nextPage)
        }).catch(() => {
        }).finally(() => setIsPrefetchingNext(false))
    }, [
        currentPage,
        pagination,
        itemsPerPage,
        debouncedSearchTerm,
        filterCondition,
        filterBrand,
        filterPieceType,
        filterTreasureHunt,
        filterChase,
        filterFantasy,
        filterMoto,
        filterCamioneta,
        queryClient,
    ])

    useEffect(() => {
        prefetchedPagesRef.current.clear()
    }, [
        debouncedSearchTerm,
        filterCondition,
        filterBrand,
        filterPieceType,
        filterTreasureHunt,
        filterChase,
        filterFantasy,
        filterMoto,
        filterCamioneta,
    ])

    return { isPrefetchingNext }
}
