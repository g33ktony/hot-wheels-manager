import axios from 'axios'
import toast from 'react-hot-toast'

// Debug environment variables
console.log('🔧 Environment Debug v2:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  baseURL_will_be: import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
})

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para requests - Agregar token JWT
api.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación
    const token = localStorage.getItem('token')
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
      
      // Mostrar notificación al usuario
      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
        duration: 4000,
      })
      
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Solo redirigir si no estamos ya en la página de login
      if (window.location.pathname !== '/login') {
        // Guardar la ruta actual para redirigir después del login
        localStorage.setItem('redirectAfterLogin', window.location.pathname)
        
        // Redirigir después de mostrar el mensaje
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
      }
    }
    return Promise.reject(error)
  }
)

export default api
