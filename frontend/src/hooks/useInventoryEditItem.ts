import { useState } from 'react'
import toast from 'react-hot-toast'
import { buildInventoryEditPatch } from '@/utils/inventoryEditPatch'

interface UseInventoryEditItemParams {
  updateItem: (params: { id: string; data: Record<string, any> }) => Promise<any>
}

export const useInventoryEditItem = ({ updateItem }: UseInventoryEditItemParams) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingItemSnapshot, setEditingItemSnapshot] = useState<any>(null)

  const handleEditItem = (item: any) => {
    setEditingItem({
      ...item,
      carId: item.carId || '',
      quantity: item.quantity || 1,
      purchasePrice: item.purchasePrice || 0,
      suggestedPrice: item.suggestedPrice || 0,
      actualPrice: item.actualPrice,
      condition: item.condition || 'mint',
      notes: item.notes || '',
      photos: item.photos || [],
      location: item.location || '',
      brand: item.brand || '',
      pieceType: item.pieceType || '',
      isTreasureHunt: item.isTreasureHunt || false,
      isSuperTreasureHunt: item.isSuperTreasureHunt || false,
      isChase: item.isChase || false,
      isFantasy: item.isFantasy || false,
      isMoto: item.isMoto || false,
      isCamioneta: item.isCamioneta || false,
      seriesId: item.seriesId || '',
      seriesName: item.seriesName || '',
      seriesSize: item.seriesSize,
      seriesPosition: item.seriesPosition,
      seriesPrice: item.seriesPrice,
      seriesDefaultPrice: item.seriesDefaultPrice || 0
    })
    setEditingItemSnapshot(JSON.parse(JSON.stringify(item)))
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setEditingItemSnapshot(null)
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    try {
      const diff = buildInventoryEditPatch(editingItemSnapshot, editingItem)

      if (Object.keys(diff).length === 0) {
        toast('Sin cambios nuevos para guardar')
        return
      }

      await updateItem({
        id: editingItem._id,
        data: diff
      })

      closeEditModal()
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  return {
    showEditModal,
    editingItem,
    setEditingItem,
    handleEditItem,
    handleUpdateItem,
    closeEditModal,
  }
}
