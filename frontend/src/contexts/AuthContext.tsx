import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Asegurar que siempre termine con /api si no lo tiene
const normalizedAPI_URL = API_URL.endsWith('/api') ? API_URL : API_URL.includes('/api') ? API_URL : `${API_URL}/api`

console.log('🔐 AuthContext: VITE_API_URL =', import.meta.env.VITE_API_URL)
console.log('🔐 AuthContext: API_URL =', API_URL)
console.log('🔐 AuthContext: normalizedAPI_URL =', normalizedAPI_URL)

interface User {
  id: string
  email: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  storeId: string  // ID de la tienda a la que pertenece
  phone?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  verifyToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))

        // Verificar si el token aún es válido
        const isValid = await verifyTokenAPI(storedToken)
        if (!isValid) {
          // Token expirado, limpiar
          logout()
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  const verifyTokenAPI = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${normalizedAPI_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
        return true
      }

      return false
    } catch (error) {
      console.error('Token verification error:', error)
      return false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      console.log('🔐 LOGIN: Enviando petición a:', `${normalizedAPI_URL}/auth/login`)
      console.log('📧 Email:', email)

      const response = await fetch(`${normalizedAPI_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('🔐 LOGIN: Respuesta recibida:', response.status, response.statusText)

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Error al iniciar sesión'
        try {
          const data = await response.json()
          console.log('❌ LOGIN ERROR:', data)
          errorMessage = data.message || errorMessage
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('✅ LOGIN: Datos recibidos:', data)

      // Guardar token y usuario
      if (data.data && data.data.token) {
        console.log('💾 Guardando token en localStorage')
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))

        console.log('📍 Token guardado:', data.data.token.substring(0, 20) + '...')
        console.log('👤 Usuario guardado:', data.data.user.email)

        setToken(data.data.token)
        setUser(data.data.user)

        toast.success('¡Bienvenido!')
      } else {
        throw new Error('Respuesta inválida del servidor: token no encontrado')
      }
    } catch (error) {
      console.error('❌ Login error:', error)

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('El servidor tardó demasiado en responder. Por favor intenta de nuevo.')
        }
        if (error.message.includes('fetch')) {
          throw new Error('No se puede conectar con el servidor. Por favor verifica tu conexión.')
        }
      }

      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    toast.success('Sesión cerrada')
  }

  const verifyToken = async (): Promise<boolean> => {
    if (!token) return false
    return await verifyTokenAPI(token)
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    verifyToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
