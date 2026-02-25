import { useState, useEffect } from 'react'

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
}

export const useStores = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/stores')
      if (!response.ok) throw new Error('Failed to fetch stores')
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
    fetchStores()
  }, [])

  const createStore = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE'
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
        headers: { 'Content-Type': 'application/json' },
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

  return {
    stores,
    isLoading,
    error,
    refetch: fetchStores,
    createStore,
    updateStore,
    updateUserRole,
    removeUser,
    assignUser
  }
}
