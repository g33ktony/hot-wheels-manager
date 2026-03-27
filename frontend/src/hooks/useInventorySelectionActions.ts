import { useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { addMultipleToCart } from '@/store/slices/cartSlice'
import { addMultipleToDeliveryCart } from '@/store/slices/deliveryCartSlice'
import { setSelectionMode, toggleItemSelection, selectAllItems, clearSelection } from '@/store/slices/selectionSlice'
import type { AppDispatch } from '@/store/store'
import type { InventoryItem } from '../../../shared/types'

interface UseInventorySelectionActionsParams {
    reduxSelection: {
        isSelectionMode: boolean
        selectedItemIds: string[]
    }
    filteredItems: InventoryItem[]
    itemsById: Record<string, InventoryItem>
    dispatch: AppDispatch
}

export const useInventorySelectionActions = ({
    reduxSelection,
    filteredItems,
    itemsById,
    dispatch,
}: UseInventorySelectionActionsParams) => {
    const isSelectionMode = reduxSelection.isSelectionMode
    const selectedItemIds = reduxSelection.selectedItemIds
    const selectedItems = useMemo(() => new Set(selectedItemIds), [selectedItemIds])

    const handleToggleSelectionMode = useCallback(() => {
        dispatch(setSelectionMode(!isSelectionMode))
    }, [dispatch, isSelectionMode])

    const handleToggleItemSelection = useCallback((itemId: string) => {
        dispatch(toggleItemSelection(itemId))
    }, [dispatch])

    const handleSelectAllItems = useCallback(() => {
        const allIds = filteredItems.map((item: InventoryItem) => item._id).filter(Boolean) as string[]
        dispatch(selectAllItems(allIds))
    }, [dispatch, filteredItems])

    const handleDeselectAllItems = useCallback(() => {
        dispatch(clearSelection())
    }, [dispatch])

    const getSelectedItems = useCallback((): InventoryItem[] => {
        if (selectedItems.size === 0) return []

        return Array.from(selectedItems)
            .map(id => itemsById[id])
            .filter(Boolean) as InventoryItem[]
    }, [selectedItems, itemsById])

    const handleAddToCart = useCallback(() => {
        if (selectedItems.size === 0) return

        const itemsToAdd = getSelectedItems()
        dispatch(addMultipleToCart(itemsToAdd as any))

        toast.success(`${itemsToAdd.length} ${itemsToAdd.length === 1 ? 'item agregado' : 'items agregados'} al carrito`)
        dispatch(clearSelection())
        dispatch(setSelectionMode(false))
    }, [dispatch, getSelectedItems, selectedItems.size])

    const handleCreateDeliveryFromInventory = useCallback(() => {
        if (selectedItems.size === 0) return

        const itemsToDeliver = getSelectedItems()

        const deliveryCartItems = itemsToDeliver
            .filter(item => item._id !== undefined)
            .map(item => ({
                inventoryItemId: item._id!,
                carId: item.carId,
                carName: item.carName || `${item.brand} - ${item.color || 'Unknown'}`,
                quantity: 1,
                unitPrice: item.actualPrice || item.suggestedPrice || 0,
                photos: item.photos,
                primaryPhotoIndex: item.primaryPhotoIndex,
                maxAvailable: item.quantity - (item.reservedQuantity || 0),
                brand: item.brand,
                color: item.color
            }))

        dispatch(addMultipleToDeliveryCart(deliveryCartItems))
        dispatch(clearSelection())
        dispatch(setSelectionMode(false))

        toast.success(`${deliveryCartItems.length} items agregados al carrito de entrega`)
    }, [dispatch, getSelectedItems, selectedItems.size])

    return {
        isSelectionMode,
        selectedItems,
        getSelectedItems,
        handleToggleSelectionMode,
        handleToggleItemSelection,
        handleSelectAllItems,
        handleDeselectAllItems,
        handleAddToCart,
        handleCreateDeliveryFromInventory,
    }
}
