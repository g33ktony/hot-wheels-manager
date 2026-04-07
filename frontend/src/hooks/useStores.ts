import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

interface StoreUser {
  _id: string
  name: string
  email: string
  role: string
  status: 'pending' | 'approved' | 'rejected' | 'inactive' | string
}

interface StoreUsers {
  admin: number
  editor: number
  analyst: number
  total: number
  userDetails: StoreUser[]
}

interface Store {
  _id: string
  name: string
  description?: string
  users: StoreUsers
  createdAt: string
  isArchived?: boolean
  archivedAt?: string
  archivedBy?: string
  isSysAdminStore?: boolean
  canDelete?: boolean
}

export const useStores = () => {
  const { token, user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sanitizeToken = (rawToken: string | null) => {
    if (!rawToken) return ''

    let normalized = rawToken
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/^['\"]+|['\"]+$/g, '')

    if (/^bearer\s+/i.test(normalized)) {
      normalized = normalized.replace(/^bearer\s+/i, '').trim()
    }

    normalized = normalized.replace(/^['\"]+|['\"]+$/g, '')

    const jwtMatch = normalized.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
    if (jwtMatch) {
      return jwtMatch[0]
    }

    return ''
  }

  const safeToken = sanitizeToken(token)

  const normalizeStore = (store: any): Store => {
    const users = store?.users || {}
    const userDetails = Array.isArray(users.userDetails)
      ? users.userDetails
      : Array.isArray(store?.users)
        ? store.users
        : []

    return {
      _id: store?._id || '',
      name: store?.name || store?.storeName || 'Tienda sin nombre',
      description: store?.description,
      createdAt: store?.createdAt || new Date(0).toISOString(),
      isArchived: !!store?.isArchived,
      archivedAt: store?.archivedAt,
      archivedBy: store?.archivedBy,
      isSysAdminStore: !!store?.isSysAdminStore,
      canDelete: store?.canDelete,
      users: {
        admin: Number(users.admin || 0),
        editor: Number(users.editor || 0),
        analyst: Number(users.analyst || 0),
        total: Number(users.total || userDetails.length || 0),
        userDetails: userDetails.map((u: any) => ({
          _id: u?._id || '',
          name: u?.name || 'Usuario sin nombre',
          email: u?.email || '',
          role: u?.role || 'analyst',
          status: u?.status || 'unknown'
        }))
      }
    }
  }

  const normalizeStoresPayload = (payload: any): Store[] => {
    if (Array.isArray(payload)) {
      return payload.map(normalizeStore)
    }

    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.stores)) {
        return payload.stores.map(normalizeStore)
      }

      if (payload._id || payload.name || payload.storeName) {
        return [normalizeStore(payload)]
      }
    }

    return []
  }

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // If user is sys_admin, fetch all stores; otherwise fetch user's store
      const endpoint = user?.role === 'sys_admin' ? '/stores' : '/stores/my'

      const response = await api.get(endpoint)
      if (response.status !== 200) {
        if (response.status === 401) {
          throw new Error('No autorizado. Se requiere ser administrador del sistema.')
        }
        throw new Error('Failed to fetch stores')
      }
      const data = response.data

      setStores(normalizeStoresPayload(data?.data))
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error
      const fallbackMessage = err?.message || 'No se pudieron cargar las tiendas'
      const message = String(backendMessage || fallbackMessage)
      setError(message.includes('expected pattern') ? 'Error de autenticacion. Inicia sesion nuevamente.' : message)
      console.error('Error fetching stores:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (safeToken) {
      fetchStores()
      return
    }

    setStores([])
    setIsLoading(false)
  }, [safeToken, user?.role])

  const createStore = async (name: string, description?: string) => {
    try {
      const response = await api.post('/stores', { name, description })
      if (response.status !== 200 && response.status !== 201) throw new Error('Failed to create store')
      const data = response.data
      setStores([...stores, data.data])
      return data.data
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const updateStore = async (id: string, updates: any) => {
    try {
      const response = await api.put(`/stores/${id}`, updates)
      if (response.status !== 200) throw new Error('Failed to update store')
      const data = response.data
      setStores(stores.map(s => s._id === id ? data.data : s))
      return data.data
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const updateUserRole = async (storeId: string, userId: string, role: string) => {
    try {
      const response = await api.put(`/stores/${storeId}/users/${userId}/role`, { role })
      if (response.status !== 200) throw new Error('Failed to update user role')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const removeUser = async (storeId: string, userId: string) => {
    try {
      const response = await api.delete(`/stores/${storeId}/users/${userId}`)
      if (response.status !== 200) throw new Error('Failed to remove user')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const assignUser = async (storeId: string, userId: string, role: string) => {
    try {
      const response = await api.post(`/stores/${storeId}/assign-user`, { userId, role })
      if (response.status !== 200) throw new Error('Failed to assign user')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const updateUserStatus = async (storeId: string, userId: string, status: 'approved' | 'inactive') => {
    try {
      const response = await api.patch(`/stores/${storeId}/users/${userId}/status`, { status })
      if (response.status !== 200) {
        throw new Error(response?.data?.error || response?.data?.message || 'Failed to update user status')
      }

      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const archiveStore = async (storeId: string) => {
    try {
      const response = await api.patch(`/stores/${storeId}/archive`)
      if (response.status !== 200) {
        throw new Error(response?.data?.message || 'Failed to archive store')
      }
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  const restoreStore = async (storeId: string) => {
    try {
      const response = await api.patch(`/stores/${storeId}/restore`)
      if (response.status !== 200) {
        throw new Error(response?.data?.message || 'Failed to restore store')
      }
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message)
      throw err
    }
  }

  return {
    stores,
    isLoading,
    error,
    refetch: fetchStores,
    createStore,
    updateStore,
    updateUserRole,
    updateUserStatus,
    removeUser,
    assignUser,
    archiveStore,
    restoreStore
  }
}
