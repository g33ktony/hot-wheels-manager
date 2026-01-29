import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    ShoppingBag,
    Truck,
    Menu,
    X,
    Users,
    Building2,
    LogOut,
    PackageOpen,
    AlertCircle,
    Search as SearchIcon,
    Sun,
    Moon,
    Settings
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { usePendingItemsStats } from '@/hooks/usePendingItems'
import { useBoxes } from '@/hooks/useBoxes'
import { useAppSelector } from '@/hooks/redux'

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const sidebarRef = useRef<HTMLDivElement>(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { toggleTheme, mode } = useTheme()
    const { data: pendingItemsStats } = usePendingItemsStats()
    const { data: boxes } = useBoxes()
    const cartItems = useAppSelector(state => state.cart.items)
    const cartItemCount = cartItems.length

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50

    // Filter active boxes (exclude completed ones)
    const activeBoxes = boxes?.filter((box: any) => box.boxStatus !== 'completed') || []

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
            setSearchQuery('')
        }
    }

    const navigationItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Inventario', href: '/inventory', icon: Package },
        {
            name: '🛒 POS',
            href: '/pos',
            icon: ShoppingCart,
            ...(cartItemCount > 0 && { badge: cartItemCount })
        },
        { name: 'Ventas', href: '/sales', icon: ShoppingCart },
        { name: 'Compras', href: '/purchases', icon: ShoppingBag },
        { name: 'Pre-Ventas', href: '/presale', icon: Package },
        // Conditional: Only show if there are pending items
        ...(pendingItemsStats && pendingItemsStats.totalCount > 0 ? [{
            name: 'Items Pendientes',
            href: '/pending-items',
            icon: AlertCircle,
            badge: pendingItemsStats.totalCount,
            highlight: true
        }] : []),
        // Conditional: Only show if there are active boxes (sealed or unpacking)
        ...(activeBoxes.length > 0 ? [{
            name: 'Cajas',
            href: '/boxes',
            icon: PackageOpen,
            badge: activeBoxes.length
        }] : []),
        { name: 'Entregas', href: '/deliveries', icon: Truck },
        { name: 'Clientes', href: '/customers', icon: Users },
        { name: 'Proveedores', href: '/suppliers', icon: Building2 },
        { name: 'Tema', href: '/theme-settings', icon: Settings },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        // Swipe right from left edge to open sidebar
        if (isRightSwipe && touchStart < 50 && !sidebarOpen) {
            setSidebarOpen(true)
        }
        // Swipe left to close sidebar
        if (isLeftSwipe && sidebarOpen) {
            setSidebarOpen(false)
        }
    }

    // Close sidebar when route changes
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    return (
        <div
            className={`min-h-screen ${mode === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'} flex overflow-x-hidden w-full max-w-full`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                    }}
                />
            )}

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={`
        fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col overflow-hidden border-r
        ${mode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
            >
                {/* Fixed Sidebar Header */}
                <div className={`flex items-center justify-between h-16 px-4 border-b flex-shrink-0 z-10 ${mode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h1 className={`text-lg lg:text-xl font-bold select-none ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>🏎️ {import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'}</h1>
                    <button
                        className={`lg:hidden p-2 -mr-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center ${mode === 'dark' ? 'hover:bg-slate-700 active:bg-slate-600' : 'hover:bg-gray-100 active:bg-gray-200'}`}
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            WebkitTouchCallout: 'none',
                        }}
                    >
                        <X size={24} className={mode === 'dark' ? 'text-slate-300' : 'text-gray-600'} />
                    </button>
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto">
                    <nav className="px-3 pt-4 pb-20 space-y-1">
                        {navigationItems.map((item: any) => {
                            const isActive = location.pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`
                  flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200
                  min-h-[44px] touch-manipulation relative select-none
                  ${isActive
                                            ? item.highlight
                                                ? (mode === 'dark' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200')
                                                : (mode === 'dark' ? 'bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/30' : 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200')
                                            : item.highlight
                                                ? (mode === 'dark' ? 'text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 active:bg-orange-500/20 border border-orange-500/20' : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 active:bg-orange-100 border border-orange-200')
                                                : (mode === 'dark' ? 'text-slate-300 hover:bg-slate-700 hover:text-white active:bg-slate-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200')
                                        }
                `}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                    }}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon size={22} className="mr-3 flex-shrink-0" />
                                    <span className="flex-1">{item.name}</span>
                                    {item.badge && item.badge > 0 && (
                                        <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full
                    ${isActive
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-orange-500 text-white'
                                            }
                  `}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation mt-4 ${mode === 'dark' ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 active:bg-red-500/20' : 'text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100'}`}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                            }}
                        >
                            <LogOut size={22} className="mr-3 flex-shrink-0" />
                            <span className="flex-1 select-none">Cerrar sesión</span>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden min-h-screen">
                {/* Top bar - Fixed header */}
                <div className={`h-16 border-b px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 lg:left-64 z-40 w-full lg:w-auto shadow-sm backdrop-blur ${mode === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
                    <button
                        className={`lg:hidden p-2 -ml-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center ${mode === 'dark' ? 'hover:bg-slate-700 active:bg-slate-600' : 'hover:bg-gray-100 active:bg-gray-200'}`}
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Abrir menú"
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            WebkitTouchCallout: 'none',
                        }}
                    >
                        <Menu size={24} className={mode === 'dark' ? 'text-slate-300' : 'text-gray-600'} />
                    </button>

                    {/* Búsqueda global */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-sm">
                        <div className="relative">
                            <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${mode === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Busca piezas, clientes, ventas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${mode === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:bg-slate-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-emerald-500'}`}
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2 sm:gap-4 flex-1 lg:flex-initial lg:justify-end">
                        {/* Theme toggle button */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center ${mode === 'dark' ? 'hover:bg-slate-700 active:bg-slate-600' : 'hover:bg-gray-100 active:bg-gray-200'}`}
                            aria-label={`Cambiar a ${mode === 'dark' ? 'light' : 'dark'} mode`}
                            title={`Cambiar a ${mode === 'dark' ? 'light' : 'dark'} mode`}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                            }}
                        >
                            {mode === 'dark' ? (
                                <Sun size={20} className="text-slate-300" />
                            ) : (
                                <Moon size={20} className="text-gray-600" />
                            )}
                        </button>

                        <div className={`text-sm hidden sm:block select-none ${mode === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {user?.name || 'Usuario'}
                        </div>
                    </div>
                </div>

                {/* Page content - Add padding-top to account for fixed header */}
                <main className="flex-1 w-full pt-16">
                    <div className="py-4 px-3 sm:px-4 lg:py-6 lg:px-6 pb-safe w-full max-w-full overflow-x-hidden">
                        <div className="w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
