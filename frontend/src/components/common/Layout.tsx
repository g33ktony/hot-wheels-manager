import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    ShoppingBag,
    CreditCard,
    DollarSign,
    ClipboardList,
    BookOpen,
    Truck,
    Menu,
    X,
    Users,
    Building2,
    LogOut,
    PackageOpen,
    Search as SearchIcon,
    Sun,
    Moon,
    Settings,
    Mail,
    Store,
    Flag,
    Lock
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '../../contexts/ThemeContext'
import { useBoxes } from '@/hooks/useBoxes'
import { useLeadStatistics } from '@/hooks/useLeads'
import { useDataReportsSummary } from '@/hooks/useDataReports'
import { usePendingUsersCount } from '@/hooks/usePendingUsers'
import { useAppSelector } from '@/hooks/redux'
import FloatingActionButton from './FloatingActionButton'
import DeliveryCartModal from '../DeliveryCartModal'
import StoreSelector from '../StoreSelector'

interface LayoutProps {
    children: ReactNode
}

type SidebarDensity = 'compact' | 'normal'

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed')
        return saved === 'true'
    })
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDeliveryCartModal, setShowDeliveryCartModal] = useState(false)
    const [sidebarDensity, setSidebarDensity] = useState<SidebarDensity>(() => {
        const saved = localStorage.getItem('sidebarDensity')
        return saved === 'normal' ? 'normal' : 'compact'
    })
    const sidebarRef = useRef<HTMLDivElement>(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { isSysAdmin, isAdmin } = usePermissions()
    const { toggleTheme, mode } = useTheme()
    const { data: boxes } = useBoxes()
    const { data: leadStats } = useLeadStatistics()
    const { data: reportsSummary } = useDataReportsSummary()
    const pendingUsersCount = usePendingUsersCount()
    const cartItems = useAppSelector(state => state.cart.items)
    const deliveryCartItems = useAppSelector(state => state.deliveryCart.items)
    const cartItemCount = cartItems.length
    const deliveryCartCount = deliveryCartItems.length

    // Persist sidebar collapsed state
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
    }, [sidebarCollapsed])

    // Persist sidebar density preference
    useEffect(() => {
        localStorage.setItem('sidebarDensity', sidebarDensity)
    }, [sidebarDensity])

    // Toggle sidebar collapse
    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed)
    }

    const toggleSidebarDensity = () => {
        setSidebarDensity(prev => (prev === 'compact' ? 'normal' : 'compact'))
    }
    const collapsedWidthClass = sidebarDensity === 'normal' ? 'lg:w-20' : 'lg:w-16'
    const collapsedHeaderOffsetClass = sidebarDensity === 'normal' ? 'lg:left-20' : 'lg:left-16'
    const collapsedItemLayoutClass = sidebarDensity === 'normal'
        ? 'lg:flex-col lg:justify-center lg:gap-1 lg:px-1.5 lg:py-2'
        : 'lg:flex-col lg:justify-center lg:gap-1 lg:px-1 lg:py-2'
    const collapsedLabelClass = sidebarDensity === 'normal'
        ? 'hidden lg:block text-[11px] leading-tight font-semibold text-center w-full px-0.5'
        : 'hidden lg:block text-[9px] leading-none font-semibold uppercase text-center w-full px-0.5'

    // Handle navigation item click
    const handleNavClick = () => {
        // En mobile, cerrar el sidebar
        if (window.innerWidth < 1024) {
            setSidebarOpen(false)
        }
        // En desktop siempre colapsar
        if (window.innerWidth >= 1024) {
            setSidebarCollapsed(true)
        }
    }

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50

    // Filter active boxes (exclude completed ones)
    const activeBoxes = boxes?.filter((box: any) => box.boxStatus !== 'completed') || []

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
            // Guardar en localStorage para sincronizar con Search page
            localStorage.setItem('globalSearchQuery', searchQuery)
            setSearchQuery('')
        }
    }

    // Sincronizar cambios de búsqueda con localStorage para que Search page los vea
    useEffect(() => {
        localStorage.setItem('globalSearchQuery', searchQuery)
    }, [searchQuery])

    // Badge counts
    const newLeadsCount = leadStats?.statusBreakdown?.new || 0
    const pendingReportsCount = reportsSummary?.pending || 0

    const navigationItems = [
        { name: 'Dashboard', shortName: 'Dash', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Inventario', shortName: 'Inv', href: '/inventory', icon: Package },
        {
            name: '🛒 POS',
            shortName: 'POS',
            href: '/pos',
            icon: CreditCard,
            ...(cartItemCount > 0 && { badge: cartItemCount })
        },
        { name: 'Ventas', shortName: 'Vta', href: '/sales', icon: DollarSign },
        { name: 'Compras', shortName: 'Comp', href: '/purchases', icon: ShoppingBag },
        { name: 'Pre-Ventas', shortName: 'PreV', href: '/presale', icon: ClipboardList },
        // Conditional: Only show if there are pending items
        // HIDDEN: Items Pendientes (pending items) - TODO: improve in the future
        // ...(pendingItemsStats && pendingItemsStats.totalCount > 0 ? [{
        //     name: 'Items Pendientes',
        //     href: '/pending-items',
        //     icon: AlertCircle,
        //     badge: pendingItemsStats.totalCount,
        //     highlight: true
        // }] : []),
        // Conditional: Only show if there are active boxes (sealed or unpacking)
        ...(activeBoxes.length > 0 ? [{
            name: 'Cajas',
            shortName: 'Caja',
            href: '/boxes',
            icon: PackageOpen,
            badge: activeBoxes.length
        }] : []),
        { name: 'Entregas', shortName: 'Ent', href: '/deliveries', icon: Truck },
        { name: 'Clientes', shortName: 'Clie', href: '/customers', icon: Users },
        // Conditional: Only show for sys_admin
        ...(isSysAdmin() ? [
            {
                name: 'Leads',
                shortName: 'Lead',
                href: '/leads',
                icon: Mail,
                ...(newLeadsCount > 0 && { badge: newLeadsCount })
            },
            {
                name: 'Reportes de Datos',
                shortName: 'Rpt',
                href: '/data-reports',
                icon: Flag,
                ...(pendingReportsCount > 0 && { badge: pendingReportsCount })
            },
            {
                name: 'Gestión de Usuarios',
                href: '/admin/users',
                shortName: 'Usr',
                icon: Lock,
                highlight: true,
                ...(pendingUsersCount > 0 && { badge: pendingUsersCount })
            },
            {
                name: 'Administración de Tiendas',
                shortName: 'Tda',
                href: '/admin/stores',
                icon: Building2,
                highlight: true
            },
            {
                name: '📋 Gestión de Catálogo',
                shortName: 'Cat',
                href: '/catalog',
                icon: BookOpen
            }
        ] : []),
        { name: 'Catálogo Público', shortName: 'Pub', href: '/browse?adminView=true', icon: SearchIcon },
        { name: 'Proveedores', shortName: 'Prov', href: '/suppliers', icon: Building2 },
        { name: 'Configuración de Tienda', shortName: 'Cfg', href: '/store-settings', icon: Store },
        { name: 'Tema', shortName: 'Tema', href: '/theme-settings', icon: Settings },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const onTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement
        if (target.closest('[role="dialog"]')) {
            setTouchStart(null)
            setTouchEnd(null)
            return
        }
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return
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
            fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col overflow-hidden border backdrop-blur-xl
                ${sidebarCollapsed && window.innerWidth >= 1024 ? collapsedWidthClass : 'w-64'}
            ${mode === 'dark'
                        ? 'bg-slate-800/72 border-transparent shadow-[0_16px_34px_rgba(2,6,23,0.42),inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-2px_2px_rgba(148,163,184,0.12)]'
                        : 'bg-white/84 border-transparent shadow-[0_16px_34px_rgba(148,163,184,0.28),inset_0_3px_3px_rgba(148,163,184,0.24),inset_0_-2px_2px_rgba(255,255,255,0.98)]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
            >
                {/* Fixed Sidebar Header */}
                <div className={`flex items-center h-16 border-b border-transparent flex-shrink-0 z-10 backdrop-blur-xl ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'} ${mode === 'dark' ? 'bg-slate-900/42 shadow-[inset_0_-1px_1px_rgba(148,163,184,0.12)]' : 'bg-white/52 shadow-[inset_0_-1px_1px_rgba(148,163,184,0.18)]'}`}>
                    {/* Logo/Title - ocultar texto cuando está colapsado en desktop */}
                    <h1 className={`text-lg lg:text-xl font-bold select-none transition-all ${mode === 'dark' ? 'text-white' : 'text-gray-900'} ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                        🏎️ {import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'}
                    </h1>

                    {/* Botón toggle collapse (solo desktop) */}
                    <button
                        className={`hidden lg:block p-2 rounded-lg transition-colors border border-transparent backdrop-blur-xl ${mode === 'dark'
                            ? 'bg-slate-900/36 text-slate-300 hover:bg-slate-800/52 shadow-[inset_0_2px_2px_rgba(2,6,23,0.6),inset_0_-1px_1px_rgba(148,163,184,0.12)]'
                            : 'bg-white/82 text-slate-600 hover:bg-white/94 shadow-[inset_0_2px_2px_rgba(148,163,184,0.22),inset_0_-1px_1px_rgba(255,255,255,0.98)]'}`}
                        onClick={toggleSidebarCollapse}
                        aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                        title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                    >
                        <Menu size={20} className={mode === 'dark' ? 'text-slate-300' : 'text-gray-600'} />
                    </button>

                    {/* Botón cerrar (solo mobile) */}
                    <button
                        className={`lg:hidden p-2 -mr-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center border border-transparent backdrop-blur-xl ${mode === 'dark'
                            ? 'bg-slate-900/36 text-slate-300 hover:bg-slate-800/52 shadow-[inset_0_2px_2px_rgba(2,6,23,0.6),inset_0_-1px_1px_rgba(148,163,184,0.12)]'
                            : 'bg-white/82 text-slate-600 hover:bg-white/94 shadow-[inset_0_2px_2px_rgba(148,163,184,0.22),inset_0_-1px_1px_rgba(255,255,255,0.98)]'}`}
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
                  flex items-center py-3 text-base font-medium rounded-lg transition-all duration-200 border border-transparent backdrop-blur-xl
                  min-h-[44px] touch-manipulation relative select-none
                  ${sidebarCollapsed ? collapsedItemLayoutClass : 'px-4'}
                  ${isActive
                                            ? item.highlight
                                                ? (mode === 'dark' ? 'bg-emerald-500/16 text-emerald-200 shadow-[inset_0_2px_2px_rgba(6,78,59,0.5),inset_0_-1px_1px_rgba(255,255,255,0.14)]' : 'bg-emerald-100/82 text-emerald-800 shadow-[inset_0_2px_2px_rgba(16,185,129,0.18),inset_0_-1px_1px_rgba(255,255,255,0.98)]')
                                                : (mode === 'dark' ? 'bg-blue-500/16 text-blue-200 shadow-[inset_0_2px_2px_rgba(30,58,138,0.48),inset_0_-1px_1px_rgba(255,255,255,0.14)]' : 'bg-blue-100/82 text-blue-800 shadow-[inset_0_2px_2px_rgba(37,99,235,0.18),inset_0_-1px_1px_rgba(255,255,255,0.98)]')
                                            : item.highlight
                                                ? (mode === 'dark' ? 'text-orange-300 bg-orange-500/8 hover:bg-orange-500/16 hover:text-orange-200 active:bg-orange-500/22 shadow-[inset_0_2px_2px_rgba(124,45,18,0.45),inset_0_-1px_1px_rgba(255,255,255,0.1)]' : 'text-orange-700 bg-orange-50/70 hover:bg-orange-50 hover:text-orange-800 active:bg-orange-100 shadow-[inset_0_2px_2px_rgba(251,146,60,0.18),inset_0_-1px_1px_rgba(255,255,255,0.98)]')
                                                : (mode === 'dark' ? 'text-slate-200 bg-slate-900/20 hover:bg-slate-800/42 hover:text-white active:bg-slate-700/55 shadow-[inset_0_2px_2px_rgba(2,6,23,0.52),inset_0_-1px_1px_rgba(148,163,184,0.1)]' : 'text-slate-700 bg-white/68 hover:bg-white/86 hover:text-slate-900 active:bg-slate-100 shadow-[inset_0_2px_2px_rgba(148,163,184,0.18),inset_0_-1px_1px_rgba(255,255,255,0.99)]')
                                        }
                `}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                    }}
                                    onClick={handleNavClick}
                                    title={sidebarCollapsed ? item.name : undefined}
                                >
                                    <item.icon size={22} className={`flex-shrink-0 ${!sidebarCollapsed ? 'mr-3' : ''}`} />
                                    {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                                    {sidebarCollapsed && <span className={collapsedLabelClass}>{item.shortName || item.name}</span>}
                                    {item.badge && item.badge > 0 && (
                                        <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full
                    ${sidebarCollapsed ? 'lg:absolute lg:top-0.5 lg:right-0.5' : ''}
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

                        {/* Change Password button */}
                        <Link
                            to="/change-password"
                            onClick={handleNavClick}
                            className={`w-full flex items-center py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation mt-4 border border-transparent backdrop-blur-xl ${sidebarCollapsed ? collapsedItemLayoutClass : 'px-4'} ${mode === 'dark'
                                ? 'text-blue-300 bg-blue-500/10 hover:bg-blue-500/16 hover:text-blue-200 active:bg-blue-500/22 shadow-[inset_0_2px_2px_rgba(30,58,138,0.48),inset_0_-1px_1px_rgba(255,255,255,0.1)]'
                                : 'text-blue-700 bg-blue-50/78 hover:bg-blue-50 hover:text-blue-800 active:bg-blue-100 shadow-[inset_0_2px_2px_rgba(37,99,235,0.16),inset_0_-1px_1px_rgba(255,255,255,0.99)]'}`}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                            }}
                            title={sidebarCollapsed ? 'Cambiar contraseña' : undefined}
                        >
                            <Lock size={22} className={`flex-shrink-0 ${!sidebarCollapsed ? 'mr-3' : ''}`} />
                            {!sidebarCollapsed && <span className="flex-1 select-none">Cambiar contraseña</span>}
                            {sidebarCollapsed && <span className={collapsedLabelClass}>Clave</span>}
                        </Link>

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation border border-transparent backdrop-blur-xl ${sidebarCollapsed ? collapsedItemLayoutClass : 'px-4'} ${mode === 'dark'
                                ? 'text-red-300 bg-red-500/10 hover:bg-red-500/16 hover:text-red-200 active:bg-red-500/22 shadow-[inset_0_2px_2px_rgba(127,29,29,0.45),inset_0_-1px_1px_rgba(255,255,255,0.1)]'
                                : 'text-red-700 bg-red-50/78 hover:bg-red-50 hover:text-red-800 active:bg-red-100 shadow-[inset_0_2px_2px_rgba(220,38,38,0.16),inset_0_-1px_1px_rgba(255,255,255,0.99)]'}`}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                            }}
                            title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
                        >
                            <LogOut size={22} className={`flex-shrink-0 ${!sidebarCollapsed ? 'mr-3' : ''}`} />
                            {!sidebarCollapsed && <span className="flex-1 select-none">Cerrar sesión</span>}
                            {sidebarCollapsed && <span className={collapsedLabelClass}>Salir</span>}
                        </button>

                        {/* Density toggle (desktop only) */}
                        <button
                            onClick={toggleSidebarDensity}
                            className={`hidden lg:flex w-full items-center justify-center py-2 mt-1 rounded-lg text-xs font-semibold transition-all duration-200 border border-transparent backdrop-blur-xl ${mode === 'dark'
                                ? 'text-slate-200 bg-slate-900/24 hover:bg-slate-800/44 active:bg-slate-700/58 shadow-[inset_0_2px_2px_rgba(2,6,23,0.52),inset_0_-1px_1px_rgba(148,163,184,0.1)]'
                                : 'text-slate-700 bg-white/68 hover:bg-white/86 active:bg-slate-100 shadow-[inset_0_2px_2px_rgba(148,163,184,0.18),inset_0_-1px_1px_rgba(255,255,255,0.99)]'}`}
                            title={`Cambiar a modo ${sidebarDensity === 'compact' ? 'normal' : 'compacto'}`}
                        >
                            {sidebarDensity === 'compact' ? 'Normal' : 'Compacto'}
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden min-h-screen">
                {/* Top bar - Fixed header */}
                <div className={`h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-40 w-full lg:w-auto backdrop-blur-xl transition-all duration-300 ${sidebarCollapsed ? collapsedHeaderOffsetClass : 'lg:left-64'} ${mode === 'dark' ? 'bg-slate-900/30 !shadow-[0_8px_20px_rgba(2,6,23,0.28),inset_0_3px_3px_rgba(2,6,23,0.58),inset_0_-2px_2px_rgba(148,163,184,0.08)]' : 'bg-white/72 !shadow-[0_8px_20px_rgba(148,163,184,0.2),inset_0_3px_3px_rgba(148,163,184,0.24),inset_0_-2px_2px_rgba(255,255,255,0.98)]'}`}>
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

                    {/* Search form */}
                    <form onSubmit={handleSearch} className="flex items-center flex-1 mx-2 md:mx-4 md:max-w-md">
                        <div className="relative w-full">
                            <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${mode === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm transition-colors backdrop-blur-xl ${mode === 'dark'
                                    ? 'bg-slate-900/34 text-slate-100 placeholder-slate-400 !shadow-[inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-1px_1px_rgba(148,163,184,0.1)] focus:ring-1 focus:ring-emerald-500'
                                    : 'bg-white/80 text-slate-700 placeholder-slate-500 !shadow-[inset_0_3px_3px_rgba(148,163,184,0.24),inset_0_-1px_1px_rgba(255,255,255,0.98)] focus:ring-1 focus:ring-emerald-500'
                                    }`}
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2 sm:gap-4 flex-1 lg:flex-initial lg:justify-end">
                        {/* Store Selector for sys_admin */}
                        <StoreSelector />

                        {/* Theme toggle button */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center backdrop-blur-xl ${mode === 'dark'
                                ? 'bg-slate-900/36 text-slate-200 hover:bg-slate-900/52 !shadow-[inset_0_2px_2px_rgba(2,6,23,0.6),inset_0_-1px_1px_rgba(148,163,184,0.12)]'
                                : 'bg-white/82 text-slate-600 hover:bg-white/94 !shadow-[inset_0_2px_2px_rgba(148,163,184,0.22),inset_0_-1px_1px_rgba(255,255,255,0.99)]'}`}
                            aria-label={`Cambiar a ${mode === 'dark' ? 'light' : 'dark'} mode`}
                            title={`Cambiar a ${mode === 'dark' ? 'light' : 'dark'} mode`}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                            }}
                        >
                            {mode === 'dark' ? (
                                <Sun size={20} className="text-slate-200" />
                            ) : (
                                <Moon size={20} className="text-slate-600" />
                            )}
                        </button>

                        <div className={`text-sm hidden sm:flex items-center gap-2 select-none px-3 py-1.5 rounded-lg backdrop-blur-xl ${mode === 'dark' ? 'bg-slate-900/34 text-slate-300 !shadow-[inset_0_2px_2px_rgba(2,6,23,0.58),inset_0_-1px_1px_rgba(148,163,184,0.1)]' : 'bg-white/80 text-slate-600 !shadow-[inset_0_2px_2px_rgba(148,163,184,0.2),inset_0_-1px_1px_rgba(255,255,255,0.98)]'}`}>
                            <span className="font-medium">{user?.name || 'Usuario'}</span>
                            {isSysAdmin() && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-xl ${mode === 'dark' ? 'bg-red-700/35 text-red-100 !shadow-[inset_0_2px_2px_rgba(127,29,29,0.45),inset_0_-1px_1px_rgba(148,163,184,0.1)]' : 'bg-red-100/85 text-red-700 !shadow-[inset_0_2px_2px_rgba(252,165,165,0.28),inset_0_-1px_1px_rgba(255,255,255,0.98)]'}`}>
                                    👑 SYS ADMIN
                                </span>
                            )}
                            {isAdmin() && !isSysAdmin() && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-xl ${mode === 'dark' ? 'bg-amber-700/35 text-amber-100 !shadow-[inset_0_2px_2px_rgba(120,53,15,0.45),inset_0_-1px_1px_rgba(148,163,184,0.1)]' : 'bg-amber-100/85 text-amber-700 !shadow-[inset_0_2px_2px_rgba(253,186,116,0.28),inset_0_-1px_1px_rgba(255,255,255,0.98)]'}`}>
                                    🔐 ADMIN
                                </span>
                            )}
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

            {/* Floating Action Buttons */}
            {/* FAB for Delivery Cart - show when not on deliveries page */}
            {deliveryCartCount > 0 && location.pathname !== '/deliveries' && (
                <FloatingActionButton
                    icon={<Truck size={24} />}
                    badge={deliveryCartCount}
                    onClick={() => setShowDeliveryCartModal(true)}
                    variant="delivery"
                    ariaLabel="Abrir carrito de entrega"
                    bottomOffset={cartItemCount > 0 && location.pathname !== '/pos' ? 96 : 24}
                />
            )}

            {/* FAB for POS Cart - show when not on POS page */}
            {cartItemCount > 0 && location.pathname !== '/pos' && (
                <FloatingActionButton
                    icon={<ShoppingCart size={24} />}
                    badge={cartItemCount}
                    onClick={() => navigate('/pos')}
                    variant="pos"
                    ariaLabel="Ir a punto de venta"
                    bottomOffset={24}
                />
            )}

            {/* Delivery Cart Modal */}
            <DeliveryCartModal
                isOpen={showDeliveryCartModal}
                onClose={() => setShowDeliveryCartModal(false)}
            />
        </div>
    )
}
