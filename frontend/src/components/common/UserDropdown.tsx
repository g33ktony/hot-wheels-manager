import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ChevronDown,
    Sun,
    Moon,
    Store,
    Lock,
    LogOut,
    Columns,
    Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/contexts/ThemeContext'

type SidebarDensity = 'compact' | 'normal'

interface UserDropdownProps {
    sidebarDensity: SidebarDensity
    onToggleSidebarDensity: () => void
}

export default function UserDropdown({ sidebarDensity, onToggleSidebarDensity }: UserDropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { isSysAdmin, isAdmin } = usePermissions()
    const { mode, toggleTheme } = useTheme()
    const isDark = mode === 'dark'

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    const handleLogout = () => {
        setOpen(false)
        logout()
        navigate('/login')
    }

    const goTo = (path: string) => {
        setOpen(false)
        navigate(path)
    }

    const roleBadge = isSysAdmin()
        ? { label: '👑 SYS ADMIN', cls: isDark ? 'bg-red-700/38 text-red-100' : 'bg-red-100/92 text-red-700' }
        : isAdmin()
            ? { label: '🔐 ADMIN', cls: isDark ? 'bg-amber-700/38 text-amber-100' : 'bg-amber-100/92 text-amber-700' }
            : null

    const triggerClass = isDark
        ? 'bg-slate-900/40 text-slate-200 shadow-[9px_9px_16px_rgba(2,6,23,0.5),-6px_-6px_10px_rgba(148,163,184,0.14)] hover:bg-slate-900/52'
        : 'bg-white/86 text-slate-600 shadow-[9px_9px_16px_rgba(148,163,184,0.24),-6px_-6px_10px_rgba(255,255,255,0.98)] hover:bg-white/92'

    const dropdownClass = isDark
        ? 'bg-slate-800/95 backdrop-blur-2xl border border-slate-700/60 shadow-[16px_16px_30px_rgba(2,6,23,0.6),-10px_-10px_20px_rgba(148,163,184,0.12)]'
        : 'bg-white border border-slate-200 shadow-[16px_16px_30px_rgba(148,163,184,0.3),-10px_-10px_20px_rgba(255,255,255,0.98)]'

    const itemClass = isDark
        ? 'text-slate-200 hover:bg-slate-700/60'
        : 'text-slate-700 hover:bg-slate-100/80'

    const dangerItemClass = isDark
        ? 'text-red-300 hover:bg-red-900/30'
        : 'text-red-600 hover:bg-red-50/80'

    const dividerClass = isDark ? 'border-slate-700/50' : 'border-slate-200/80'

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`hidden sm:flex items-center gap-2 select-none px-3 py-1.5 rounded-lg backdrop-blur-xl transition-colors cursor-pointer ${triggerClass}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <span className="font-medium text-sm">{user?.name || 'Usuario'}</span>
                {roleBadge && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${roleBadge.cls}`}>
                        {roleBadge.label}
                    </span>
                )}
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile: just icon trigger */}
            <button
                onClick={() => setOpen(!open)}
                className={`sm:hidden p-2 rounded-lg backdrop-blur-xl transition-colors cursor-pointer ${triggerClass}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Menú de usuario"
            >
                <Settings size={20} />
            </button>

            {open && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50 ${dropdownClass}`}>
                    {/* User info header */}
                    <div className={`px-4 py-3 border-b ${dividerClass}`}>
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {user?.name || 'Usuario'}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {user?.email || ''}
                        </p>
                    </div>

                    <div className="py-1">
                        {/* Theme toggle */}
                        <button
                            onClick={() => { toggleTheme(); setOpen(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemClass}`}
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                            <span>Cambiar a {isDark ? 'light' : 'dark'} mode</span>
                        </button>

                        {/* Store settings */}
                        <button
                            onClick={() => goTo('/store-settings')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemClass}`}
                        >
                            <Store size={16} />
                            <span>Configuración de Tienda</span>
                        </button>

                        {/* Theme settings */}
                        <button
                            onClick={() => goTo('/theme-settings')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemClass}`}
                        >
                            {isDark ? <Moon size={16} /> : <Sun size={16} />}
                            <span>Personalizar Tema</span>
                        </button>

                        {/* Change password */}
                        <button
                            onClick={() => goTo('/change-password')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemClass}`}
                        >
                            <Lock size={16} />
                            <span>Cambiar Contraseña</span>
                        </button>

                        {/* Sidebar density (desktop only) */}
                        <button
                            onClick={() => { onToggleSidebarDensity(); setOpen(false) }}
                            className={`hidden lg:flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemClass}`}
                        >
                            <Columns size={16} />
                            <span>Sidebar {sidebarDensity === 'compact' ? 'Normal' : 'Compacto'}</span>
                        </button>
                    </div>

                    <div className={`border-t ${dividerClass}`}>
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${dangerItemClass}`}
                        >
                            <LogOut size={16} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
