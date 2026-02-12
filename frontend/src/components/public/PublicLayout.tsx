import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import Button from '@/components/common/Button'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate()
  const { toggleTheme, mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🏎️</div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Explora Autos a Escala
              </h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                <span className="sr-only">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
              </Button>

              {/* Admin Login */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                icon={<LogIn size={18} />}
              >
                <span className="hidden sm:inline">Admin</span>
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
              <a href="#" className="hover:text-primary-600">Contacto</a>
              <span>•</span>
              <a href="#" className="hover:text-primary-600">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
