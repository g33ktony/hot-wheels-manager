import { clearSelection, setSelectionMode } from '@/store/slices/selectionSlice'
import { updateCachedItem } from '@/store/slices/itemsCacheSlice'
import toast from 'react-hot-toast'
import type { AppDispatch } from '@/store/store'
import type { InventoryItem } from '../../../shared/types'

interface UseInventoryBulkActionsParams {
  selectedItems: Set<string>
  getSelectedItems: () => InventoryItem[]
  updateItem: (params: { id: string; data: Record<string, any> }) => Promise<any>
  deleteItem: (id: string) => Promise<any>
  dispatch: AppDispatch
  onBulkEditSuccess?: () => void
}

export const useInventoryBulkActions = ({
  selectedItems,
  getSelectedItems,
  updateItem,
  deleteItem,
  dispatch,
  onBulkEditSuccess,
}: UseInventoryBulkActionsParams) => {
  const handleBulkEditSave = async (updates: Record<string, unknown>) => {
    try {
      const selectedForEdit = getSelectedItems()
      await Promise.all(
        selectedForEdit.map((item: InventoryItem) =>
          updateItem({
            id: item._id!,
            data: updates as any,
          }).then(() => {
            dispatch(updateCachedItem({
              ...item,
              ...updates,
            }))
          })
        )
      )
      onBulkEditSuccess?.()
    } catch (error) {
      console.error('Error updating items:', error)
      throw error
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedItems.size} ${selectedItems.size === 1 ? 'pieza' : 'piezas'}?`

    if (confirm(confirmMessage)) {
      try {
        await Promise.all(Array.from(selectedItems).map(id => deleteItem(id)))

        dispatch(clearSelection())
        dispatch(setSelectionMode(false))
        toast.success('Piezas eliminadas correctamente')
      } catch (error) {
        console.error('Error deleting items:', error)
        alert('Error al eliminar algunas piezas. Por favor intenta de nuevo.')
      }
    }
  }

  return {
    handleBulkEditSave,
    handleBulkDelete,
  }
}
