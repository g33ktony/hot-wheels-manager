import axios from 'axios'
import toast from 'react-hot-toast'

const normalizeApiBaseUrl = (rawUrl?: string) => {
  const fallback = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'
  const trimmed = rawUrl?.trim()

  if (!trimmed) {
    return fallback
  }

  if (trimmed.startsWith('/')) {
    const cleanPath = trimmed.replace(/\/+$/, '')
    if (cleanPath.endsWith('/api') || cleanPath.includes('/api/')) {
      return cleanPath || '/api'
    }
    return `${cleanPath || ''}/api`
  }

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = new URL(candidate)
    const path = parsed.pathname.replace(/\/+$/, '')

    if (!path || path === '/') {
      parsed.pathname = '/api'
    } else if (!path.endsWith('/api') && !path.includes('/api/')) {
      parsed.pathname = `${path}/api`
    } else {
      parsed.pathname = path
    }

    return parsed.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

// Debug environment variables
console.log('🔧 Environment Debug:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
})

// Use absolute URL for both development and production
// In development, this will be http://localhost:3001/api
// In production, this will be from VITE_API_URL or the Railway/Vercel backend URL
const baseURL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

console.log('🔧 Axios baseURL Debug:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  baseURL: baseURL,
})

// Configuración base de Axios
const api = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased to 30 seconds for large datasets
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para requests - Agregar token JWT
api.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación
    const token = localStorage.getItem('token')
    try {
      console.log('➡️ API Request:', config.method, config.url, 'tokenPresent:', !!token)
    } catch (e) {
      // Ignore logging errors
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para responses - Manejar errores de autenticación
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Manejo global de errores
    if (error.response?.status === 401) {
      // Token expirado o inválido - limpiar y redirigir a login
      console.log('⚠️ Sesión expirada - redirigiendo al login')
      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
        duration: 4000,
      })
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

export default api
export { api }
