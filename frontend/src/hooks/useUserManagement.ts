import { useState } from 'react'
import toast from 'react-hot-toast'

interface CreateUserPayload {
  name: string
  email: string
  role: 'admin' | 'editor' | 'analyst'
  storeId: string
}

export const useUserManagement = () => {
  const [isLoading, setIsLoading] = useState(false)

  const createUserInStore = async (payload: CreateUserPayload) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users/create-in-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorMsg = 'Error al crear usuario'
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorData.message || errorMsg
        } catch {
          errorMsg = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()
      toast.success('Usuario creado exitosamente')
      return data.data
    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido'
      console.error('❌ Error creating user:', error)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: any) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar perfil')
      }

      const data = await response.json()
      toast.success('Perfil actualizado')
      return data.data
    } catch (error: any) {
      toast.error(error.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    createUserInStore,
    updateProfile
  }
}
