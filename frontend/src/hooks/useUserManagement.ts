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

  const sanitizeToken = (rawToken: string | null) => {
    if (!rawToken) return ''
    return rawToken
      .trim()
      .replace(/^['\"]|['\"]$/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
  }

  const getErrorMessage = (error: any, fallback = 'Error desconocido') => {
    return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback
  }

  const createUserInStore = async (payload: CreateUserPayload) => {
    try {
      setIsLoading(true)
      const data = await api.post('/users/create-in-store', payload)
      toast.success('Usuario creado exitosamente')
      return data.data.data
    } catch (error: any) {
      const errorMessage = getErrorMessage(error)
      const shouldFallbackToFetch = !error?.response && /(expected pattern|invalid url|failed to construct|failed to parse)/i.test(errorMessage)

      if (shouldFallbackToFetch) {
        try {
          const sanitizedToken = sanitizeToken(localStorage.getItem('token'))
          console.warn('⚠️ Axios URL error detected, falling back to fetch /api path')
          const response = await fetch('/api/users/create-in-store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sanitizedToken ? { 'Authorization': `Bearer ${sanitizedToken}` } : {})
            },
            body: JSON.stringify(payload)
          })

          if (!response.ok) {
            let fallbackError = `Error ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              fallbackError = errorData.error || errorData.message || fallbackError
            } catch {
              // ignore json parse errors
            }
            throw new Error(fallbackError)
          }

          const data = await response.json()
          toast.success('Usuario creado exitosamente')
          return data.data
        } catch (fallbackError: any) {
          const finalMessage = getErrorMessage(fallbackError, 'Error al crear usuario')
          console.error('❌ Fallback create user failed:', fallbackError)
          toast.error(finalMessage)
          throw fallbackError
        }
      }

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
      const errorMessage = getErrorMessage(error, 'Error al actualizar perfil')
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
