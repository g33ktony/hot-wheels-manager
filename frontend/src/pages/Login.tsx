import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { Lock, Mail, Car } from 'lucide-react'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { mode } = useTheme()
  const isDark = mode === 'dark'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const pageBackdropClass = isDark
    ? 'min-h-screen bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0b1220_100%)]'
    : 'min-h-screen bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.10),transparent_38%),radial-gradient(circle_at_86%_8%,rgba(59,130,246,0.10),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eaf0f8_100%)]'

  const surfaceClass = isDark
    ? 'rounded-2xl backdrop-blur-xl bg-slate-900/62 shadow-[14px_14px_26px_rgba(2,6,23,0.52),-10px_-10px_18px_rgba(148,163,184,0.16)]'
    : 'rounded-2xl backdrop-blur-xl bg-white/94 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'

  const iconSurfaceClass = isDark
    ? 'rounded-full border border-slate-600/40 bg-slate-800 text-emerald-300 shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)]'
    : 'rounded-full border border-slate-300/60 bg-white text-emerald-600 shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)]'

  const submitClass = isDark
    ? 'w-full rounded-xl border border-emerald-400/40 bg-emerald-600/20 text-emerald-100 shadow-[10px_10px_20px_rgba(2,6,23,0.55),-8px_-8px_16px_rgba(16,185,129,0.16)] hover:brightness-110 disabled:bg-slate-700 disabled:text-slate-400 disabled:border-slate-600/40'
    : 'w-full rounded-xl border border-emerald-300/70 bg-emerald-100 text-emerald-800 shadow-[10px_10px_20px_rgba(148,163,184,0.24),-8px_-8px_16px_rgba(255,255,255,0.96)] hover:brightness-105 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300/60'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Por favor ingresa email y contraseña')
      return
    }

    setIsLoading(true)

    try {
      // Usar la función login del AuthContext
      await login(email, password)

      // Verificar si hay una ruta guardada para redirigir después del login
      const redirectPath = localStorage.getItem('redirectAfterLogin')
      localStorage.removeItem('redirectAfterLogin')

      // El toast success ya se muestra en AuthContext
      navigate(redirectPath || '/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`${pageBackdropClass} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-md p-8 ${surfaceClass}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className={`p-4 ${iconSurfaceClass}`}>
            <Car className="w-12 h-12" />
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Iniciar Sesión
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="pl-10"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className={submitClass}
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        {/* Link a registrarse */}
        <div className="mt-6 text-center">
          <p className={`mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ¿No tienes cuenta?
          </p>
          <button
            onClick={() => navigate('/signup')}
            className={`font-medium transition-colors ${isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-700 hover:text-emerald-600'}`}
          >
            Crear una cuenta aquí
          </button>
        </div>

        {/* Footer */}
        <div className={`mt-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          <p>Gestiona tu colección de autos a escala</p>
        </div>
      </div>
    </div>
  )
}

export default Login
