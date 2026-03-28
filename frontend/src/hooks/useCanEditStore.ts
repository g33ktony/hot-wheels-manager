import { useStore } from '@/contexts/StoreContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

/**
 * Hook que determina si el usuario puede editar contenido de una tienda específica.
 * Patrón: "Read All, Write Own" - Leer todas las tiendas, editar solo la propia.
 * Solo admin y sys_admin pueden ELIMINAR items.
 * 
 * @returns {canEdit, canDelete, isReadOnly}
 */
export const useCanEditStore = () => {
  const { userStore, selectedStore, availableStores } = useStore()
  const { user } = useAuth()
  const canDeleteByRole = user?.role === 'admin' || user?.role === 'sys_admin'

  // Debug logging
  useEffect(() => {
    console.log('🔐 [useCanEditStore] Comparison values:', {
      userStore: userStore,
      selectedStore: selectedStore,
      isEqual: userStore === selectedStore,
      userStoreType: typeof userStore,
      selectedStoreType: typeof selectedStore,
      availableStoresCount: availableStores?.length || 0
    })
  }, [userStore, selectedStore, availableStores])

  // Si no hay tienda seleccionada (modo consolidado), se muestran solo los datos del userStore
  // Por lo tanto, el usuario PUEDE editar (solo ve sus propios datos)
  // Pero solo admin/sys_admin pueden ELIMINAR
  if (!selectedStore) {
    console.log('🔐 [useCanEditStore] No selectedStore - consolidated view (only own data) - CAN EDIT')
    return {
      canEdit: true,
      canDelete: canDeleteByRole, // Only admin/sys_admin can delete
      canCreate: true,
      isReadOnly: false,
      reason: null
    }
  }

  // Comparación simple ahora que ambos están normalizados
  const canEdit = selectedStore === userStore
  const canDelete = selectedStore === userStore && canDeleteByRole // Must be admin/sys_admin AND own store to delete
  const canCreate = selectedStore === userStore

  // Obtener nombre de tienda para el mensaje
  const selectedStoreInfo = availableStores.find(s => s.storeId === selectedStore)

  if (canCreate) {
    console.log('✅ [useCanEditStore] Can create/edit in:', selectedStoreInfo?.storeName || selectedStore)
  } else {
    console.log('🛑 [useCanEditStore] Cannot edit - different store selected')
  }

  return {
    canEdit,
    canDelete,
    canCreate,
    isReadOnly: !canEdit,
    reason: canEdit ? null : `Solo lectura - seleccionaste: ${selectedStoreInfo?.storeName || selectedStore}`
  }
}
