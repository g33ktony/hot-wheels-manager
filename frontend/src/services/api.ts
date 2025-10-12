import axios from 'axios'
import toast from 'react-hot-toast'

// Debug environment variables
console.log('🔧 Environment Debug:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
})

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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
