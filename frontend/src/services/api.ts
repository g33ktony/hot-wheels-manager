import axios from 'axios'
import toast from 'react-hot-toast'

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
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
      // Evitar mostrar múltiples mensajes de error
      const hasShownError = sessionStorage.getItem('auth_error_shown')
      
      if (!hasShownError) {
        sessionStorage.setItem('auth_error_shown', 'true')
        
        // Token expirado o inválido - limpiar y redirigir a login
        console.log('⚠️ Sesión expirada - redirigiendo al login')
        
        // Mostrar notificación al usuario
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
          duration: 4000,
        })
        
        // Limpiar el flag después de 5 segundos
        setTimeout(() => {
          sessionStorage.removeItem('auth_error_shown')
        }, 5000)
        
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        // Solo redirigir si no estamos ya en la página de login
        if (window.location.pathname !== '/login') {
          // Guardar la ruta actual para redirigir después del login
          localStorage.setItem('redirectAfterLogin', window.location.pathname)
          
          // Redirigir inmediatamente sin delay
          window.location.href = '/login'
        }
      }
      
      // Rechazar la promesa para que el componente sepa que falló
      return Promise.reject(error)
    }
    
    // Para otros errores, simplemente rechazar
    return Promise.reject(error)
  }
)

export default api
