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
  const canWriteByRole = user?.role === 'admin' || user?.role === 'sys_admin' || user?.role === 'editor'
  const canDeleteByRole = user?.role === 'admin' || user?.role === 'sys_admin'

  // Debug logging
  useEffect(() => {
    console.log('🔐 [useCanEditStore] Comparison values:', {
      userStore: userStore,
      selectedStore: selectedStore,
      role: user?.role,
      canWriteByRole,
      isEqual: userStore === selectedStore,
      userStoreType: typeof userStore,
      selectedStoreType: typeof selectedStore,
      availableStoresCount: availableStores?.length || 0
    })
  }, [userStore, selectedStore, availableStores, user?.role, canWriteByRole])

  // Si no hay tienda seleccionada (modo consolidado), se muestran solo los datos del userStore
  // Por lo tanto, el usuario PUEDE editar (solo ve sus propios datos)
  // Pero el rol debe tener permisos de escritura y solo admin/sys_admin pueden ELIMINAR
  if (!selectedStore) {
    console.log('🔐 [useCanEditStore] No selectedStore - consolidated view', {
      canWriteByRole,
      role: user?.role
    })

    const roleReadOnlyReason = !canWriteByRole
      ? `Solo lectura - tu rol (${user?.role || 'desconocido'}) no puede editar`
      : null

    return {
      canEdit: canWriteByRole,
      canDelete: canDeleteByRole, // Only admin/sys_admin can delete
      canCreate: canWriteByRole,
      isReadOnly: !canWriteByRole,
      reason: roleReadOnlyReason
    }
  }

  // Comparación simple ahora que ambos están normalizados
  const canEdit = selectedStore === userStore && canWriteByRole
  const canDelete = selectedStore === userStore && canDeleteByRole // Must be admin/sys_admin AND own store to delete
  const canCreate = selectedStore === userStore && canWriteByRole

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
    reason: canEdit
      ? null
      : !canWriteByRole
        ? `Solo lectura - tu rol (${user?.role || 'desconocido'}) no puede editar`
        : `Solo lectura - seleccionaste: ${selectedStoreInfo?.storeName || selectedStore}`
  }
}
