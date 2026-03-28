import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'

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
      const data = await api.post('/users/create-in-store', payload)
      toast.success('Usuario creado exitosamente')
      return data.data.data
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Error desconocido'
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
      const data = await api.patch('/users/profile', updates)
      toast.success('Perfil actualizado')
      return data.data.data
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Error al actualizar perfil'
      toast.error(errorMessage)
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
