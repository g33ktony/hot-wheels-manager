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

  const headerBarClass = isDark
    ? 'backdrop-blur-xl bg-slate-900/72 shadow-[0_8px_24px_rgba(2,6,23,0.5)]'
    : 'backdrop-blur-xl bg-white/88 shadow-[0_8px_24px_rgba(148,163,184,0.22)]'

  const buttonNeumorphClass = isDark
    ? 'rounded-xl border border-slate-700/80 bg-[linear-gradient(145deg,rgba(51,65,85,0.32),rgba(30,41,59,0.82))] text-slate-100 shadow-[10px_10px_20px_rgba(2,6,23,0.55),-8px_-8px_18px_rgba(71,85,105,0.22),inset_1px_1px_0_rgba(255,255,255,0.08)] hover:brightness-110'
    : 'rounded-xl border border-white/90 bg-[linear-gradient(145deg,#f5f8fd,#e6edf7)] text-slate-700 shadow-[10px_10px_20px_rgba(148,163,184,0.3),-8px_-8px_16px_rgba(255,255,255,0.96),inset_1px_1px_0_rgba(255,255,255,0.85)] hover:brightness-95'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#e9f0f9]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${headerBarClass}`}>
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-7xl mx-auto">
          {/* Logo/Brand */}
          <div className="flex items-center min-w-0">
            <img
              src="/scalesearch-logo.svg"
              alt="ScaleSearch"
              className="h-8 sm:h-9 w-auto rounded-md bg-slate-900 px-2 py-1"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${buttonNeumorphClass}`}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
              aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-medium transition-all duration-200 ${buttonNeumorphClass}`}
            >
              <LogIn size={18} />
              <span>Entrar</span>
            </button>
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
              © 2026 ScaleFind. Todos los derechos reservados.
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
