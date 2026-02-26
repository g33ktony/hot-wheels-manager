import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface StoreUser {
  _id: string
  name: string
  email: string
  role: string
  status: string
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
  const { token } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  })

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/stores', {
        headers: getAuthHeaders()
      })
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autorizado. Se requiere ser administrador del sistema.')
        }
        throw new Error('Failed to fetch stores')
      }
      const data = await response.json()
      setStores(data.data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching stores:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchStores()
    }
  }, [token])

  const createStore = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description })
      })
      if (!response.ok) throw new Error('Failed to create store')
      const data = await response.json()
      setStores([...stores, data.data])
      return data.data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateStore = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update store')
      const data = await response.json()
      setStores(stores.map(s => s._id === id ? data.data : s))
      return data.data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateUserRole = async (storeId: string, userId: string, role: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
      })
      if (!response.ok) throw new Error('Failed to update user role')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const removeUser = async (storeId: string, userId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to remove user')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const assignUser = async (storeId: string, userId: string, role: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/assign-user`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, role })
      })
      if (!response.ok) throw new Error('Failed to assign user')
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const archiveStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/archive`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to archive store')
      }
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const restoreStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/restore`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to restore store')
      }
      await fetchStores()
      return true
    } catch (err: any) {
      setError(err.message)
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
    removeUser,
    assignUser,
    archiveStore,
    restoreStore
  }
}
