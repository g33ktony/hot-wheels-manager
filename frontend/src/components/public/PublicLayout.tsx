import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate()
  const { toggleTheme, mode } = useTheme()
  const { user } = useAuth()
  const isDark = mode === 'dark'

  const headerSurfaceClass = isDark
    ? 'bg-slate-900/78 shadow-[0_14px_30px_rgba(2,6,23,0.45)] backdrop-blur-sm'
    : 'bg-[#edf3fa]/88 shadow-[0_14px_30px_rgba(148,163,184,0.28)] backdrop-blur-sm'

  const headerInnerNeumorphClass = isDark
    ? 'rounded-2xl border border-slate-700/70 bg-slate-800/88 shadow-[14px_14px_30px_rgba(2,6,23,0.58),-12px_-12px_24px_rgba(51,65,85,0.22)]'
    : 'rounded-2xl border border-white/90 bg-[#edf3fa]/98 shadow-[14px_14px_30px_rgba(148,163,184,0.35),-14px_-14px_30px_rgba(255,255,255,0.98)]'

  const brandNeumorphClass = isDark
    ? 'rounded-xl bg-slate-900/40 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.58),inset_-4px_-4px_8px_rgba(51,65,85,0.2)] px-3 py-2'
    : 'rounded-xl bg-[#e7edf7] shadow-[inset_5px_5px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_8px_rgba(255,255,255,0.92)] px-3 py-2'

  const buttonNeumorphClass = isDark
    ? 'rounded-xl border border-slate-700/80 bg-[linear-gradient(145deg,rgba(51,65,85,0.32),rgba(30,41,59,0.82))] text-slate-100 shadow-[10px_10px_20px_rgba(2,6,23,0.55),-8px_-8px_18px_rgba(71,85,105,0.22),inset_1px_1px_0_rgba(255,255,255,0.08)] hover:brightness-110'
    : 'rounded-xl border border-white/90 bg-[linear-gradient(145deg,#f5f8fd,#e6edf7)] text-slate-700 shadow-[10px_10px_20px_rgba(148,163,184,0.3),-8px_-8px_16px_rgba(255,255,255,0.96),inset_1px_1px_0_rgba(255,255,255,0.85)] hover:brightness-95'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#e9f0f9]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${headerSurfaceClass}
        }`}>
        <div className="container mx-auto px-4 py-1">
          <div className={`flex items-center justify-between h-16 px-3 sm:px-4 ${headerInnerNeumorphClass}`}>
            {/* Logo/Brand */}
            <div className={`flex items-center space-x-3 min-w-0 ${brandNeumorphClass}`}>
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
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 font-medium transition-all duration-200 ${buttonNeumorphClass}`}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span className="sr-only">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
              </button>

              {/* Admin Login / Dashboard */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    // If already logged in, go to dashboard
                    navigate('/dashboard')
                  } else {
                    // If not logged in, go to login
                    navigate('/login')
                  }
                }}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 font-medium transition-all duration-200 ${buttonNeumorphClass}`}
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">{user ? 'Home' : 'Admin'}</span>
              </button>
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
