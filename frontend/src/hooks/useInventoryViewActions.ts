import { useState } from 'react'

interface ImageViewerState {
  images: string[]
  index: number
}

interface UseInventoryViewActionsParams {
  deleteItem: (id: string) => Promise<any>
}

export const useInventoryViewActions = ({ deleteItem }: UseInventoryViewActionsParams) => {
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null)

  const handleDeleteItem = async (id: string) => {
    if (!id) return

    if (confirm('¿Estás seguro de que quieres eliminar esta pieza?')) {
      try {
        await deleteItem(id)
      } catch (error) {
        console.error('Error deleting item:', error)
      }
    }
  }

  const handleImageClick = (photos: string[], index: number = 0) => {
    if (photos && photos.length > 0) {
      setImageViewer({ images: photos, index })
    }
  }

  const closeImageViewer = () => {
    setImageViewer(null)
  }

  return {
    imageViewer,
    handleDeleteItem,
    handleImageClick,
    closeImageViewer,
  }
}
