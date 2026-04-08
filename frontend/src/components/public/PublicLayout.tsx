import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/common/Button'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate()
  const { toggleTheme, mode } = useTheme()
  const { user } = useAuth()
  const isDark = mode === 'dark'

  const headerSurfaceClass = isDark
    ? 'bg-slate-900/70 border-slate-700/70'
    : 'bg-[#edf3fa]/80 border-white/80'

  const headerInnerNeumorphClass = isDark
    ? 'rounded-2xl border border-slate-700/70 bg-slate-800/80 shadow-[14px_14px_30px_rgba(2,6,23,0.58),-12px_-12px_24px_rgba(51,65,85,0.22)]'
    : 'rounded-2xl border border-white/90 bg-[#edf3fa]/95 shadow-[14px_14px_30px_rgba(148,163,184,0.35),-14px_-14px_30px_rgba(255,255,255,0.98)]'

  const buttonNeumorphClass = isDark
    ? 'border border-slate-700/70 bg-slate-800 text-slate-100 shadow-[8px_8px_16px_rgba(2,6,23,0.45),-6px_-6px_12px_rgba(51,65,85,0.16)] hover:brightness-110'
    : 'border border-white/85 bg-[#eef3fa] text-slate-700 shadow-[8px_8px_16px_rgba(148,163,184,0.3),-8px_-8px_16px_rgba(255,255,255,0.9)] hover:brightness-95'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#e9f0f9]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b rounded-b-2xl ${headerSurfaceClass}
        }`}>
        <div className="container mx-auto px-4 py-2">
          <div className={`flex items-center justify-between h-16 px-3 sm:px-4 ${headerInnerNeumorphClass}`}>
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${buttonNeumorphClass}`}>
                🏎️
              </div>
              <div className="min-w-0">
                <h1 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Autos a Escala Multimarca
                </h1>
                <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Busca y descubre modelos coleccionables
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                className={buttonNeumorphClass}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                <span className="sr-only">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
              </Button>

              {/* Admin Login / Dashboard */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (user) {
                    // If already logged in, go to dashboard
                    navigate('/dashboard')
                  } else {
                    // If not logged in, go to login
                    navigate('/login')
                  }
                }}
                icon={<LogIn size={18} />}
                className={buttonNeumorphClass}
              >
                <span className="hidden sm:inline">{user ? 'Home' : 'Admin'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2 sm:mb-0`}>
              © 2026 evstoremx. Todos los derechos reservados.
            </p>
            <div className={`flex space-x-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <Link to="/contacto" className="hover:text-primary-600">Contacto</Link>
              <span>•</span>
              <Link to="/privacidad" className="hover:text-primary-600">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
