import axios from 'axios'
import toast from 'react-hot-toast'

// Debug environment variables
console.log('🔧 Environment Debug:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
})

// Use absolute URL for both development and production
// In development, this will be http://localhost:3001/api
// In production, this will be from VITE_API_URL or the Railway/Vercel backend URL
let baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Asegurar que siempre termine con /api si no lo tiene
if (!baseURL.endsWith('/api') && !baseURL.includes('/api')) {
  baseURL = `${baseURL}/api`
}

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
