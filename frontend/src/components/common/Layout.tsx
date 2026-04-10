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
    PackageOpen,
    Search as SearchIcon,
    Mail,
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
import UserDropdown from './UserDropdown'

interface LayoutProps {
    children: ReactNode
}

type SidebarDensity = 'compact' | 'normal'

interface RoutePalette {
    darkGlow: string
    lightGlow: string
    darkFrom: string
    darkTo: string
    lightFrom: string
    lightTo: string
    darkText: string
    lightText: string
}

const withAlpha = (color: string, alpha: number): string => {
    const match = color.match(/rgba?\(([^)]+)\)/)
    if (!match) return color
    const [r, g, b] = match[1].split(',').map(part => part.trim())
    if (!r || !g || !b) return color
    return `rgba(${r},${g},${b},${alpha})`
}

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
    const { } = useAuth()
    const { isSysAdmin } = usePermissions()
    const { mode } = useTheme()
    const { data: boxes } = useBoxes()
    const { data: leadStats } = useLeadStatistics()
    const { data: reportsSummary } = useDataReportsSummary()
    const pendingUsersCount = usePendingUsersCount()
    const cartItems = useAppSelector(state => state.cart.items)
    const deliveryCartItems = useAppSelector(state => state.deliveryCart.items)
    const cartItemCount = cartItems.length
    const deliveryCartCount = deliveryCartItems.length

    const routePalettes: Record<string, RoutePalette> = {
        '/dashboard': {
            darkGlow: 'rgba(59,130,246,0.24)',
            lightGlow: 'rgba(59,130,246,0.2)',
            darkFrom: 'rgba(59,130,246,0.3)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(239,246,255,0.98)',
            lightTo: 'rgba(219,234,254,0.92)',
            darkText: 'rgb(219,234,254)',
            lightText: 'rgb(30,64,175)'
        },
        '/inventory': {
            darkGlow: 'rgba(16,185,129,0.24)',
            lightGlow: 'rgba(16,185,129,0.2)',
            darkFrom: 'rgba(16,185,129,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(236,253,245,0.98)',
            lightTo: 'rgba(209,250,229,0.92)',
            darkText: 'rgb(209,250,229)',
            lightText: 'rgb(6,95,70)'
        },
        '/pos': {
            darkGlow: 'rgba(6,182,212,0.24)',
            lightGlow: 'rgba(6,182,212,0.2)',
            darkFrom: 'rgba(6,182,212,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(236,254,255,0.98)',
            lightTo: 'rgba(207,250,254,0.92)',
            darkText: 'rgb(207,250,254)',
            lightText: 'rgb(14,116,144)'
        },
        '/sales': {
            darkGlow: 'rgba(168,85,247,0.22)',
            lightGlow: 'rgba(168,85,247,0.18)',
            darkFrom: 'rgba(168,85,247,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(245,243,255,0.98)',
            lightTo: 'rgba(233,213,255,0.9)',
            darkText: 'rgb(233,213,255)',
            lightText: 'rgb(91,33,182)'
        },
        '/purchases': {
            darkGlow: 'rgba(245,158,11,0.22)',
            lightGlow: 'rgba(245,158,11,0.18)',
            darkFrom: 'rgba(245,158,11,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(255,251,235,0.98)',
            lightTo: 'rgba(254,243,199,0.9)',
            darkText: 'rgb(254,243,199)',
            lightText: 'rgb(146,64,14)'
        },
        '/presale': {
            darkGlow: 'rgba(236,72,153,0.22)',
            lightGlow: 'rgba(236,72,153,0.18)',
            darkFrom: 'rgba(236,72,153,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(253,242,248,0.98)',
            lightTo: 'rgba(251,207,232,0.9)',
            darkText: 'rgb(251,207,232)',
            lightText: 'rgb(157,23,77)'
        },
        '/boxes': {
            darkGlow: 'rgba(251,146,60,0.22)',
            lightGlow: 'rgba(251,146,60,0.18)',
            darkFrom: 'rgba(251,146,60,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(255,247,237,0.98)',
            lightTo: 'rgba(254,215,170,0.9)',
            darkText: 'rgb(254,215,170)',
            lightText: 'rgb(154,52,18)'
        },
        '/deliveries': {
            darkGlow: 'rgba(34,197,94,0.22)',
            lightGlow: 'rgba(34,197,94,0.18)',
            darkFrom: 'rgba(34,197,94,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(240,253,244,0.98)',
            lightTo: 'rgba(187,247,208,0.9)',
            darkText: 'rgb(187,247,208)',
            lightText: 'rgb(22,101,52)'
        },
        '/customers': {
            darkGlow: 'rgba(14,165,233,0.22)',
            lightGlow: 'rgba(14,165,233,0.18)',
            darkFrom: 'rgba(14,165,233,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(240,249,255,0.98)',
            lightTo: 'rgba(186,230,253,0.9)',
            darkText: 'rgb(186,230,253)',
            lightText: 'rgb(3,105,161)'
        },
        '/leads': {
            darkGlow: 'rgba(99,102,241,0.22)',
            lightGlow: 'rgba(99,102,241,0.18)',
            darkFrom: 'rgba(99,102,241,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(238,242,255,0.98)',
            lightTo: 'rgba(199,210,254,0.9)',
            darkText: 'rgb(199,210,254)',
            lightText: 'rgb(55,48,163)'
        },
        '/data-reports': {
            darkGlow: 'rgba(244,63,94,0.22)',
            lightGlow: 'rgba(244,63,94,0.18)',
            darkFrom: 'rgba(244,63,94,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(255,241,242,0.98)',
            lightTo: 'rgba(254,205,211,0.9)',
            darkText: 'rgb(254,205,211)',
            lightText: 'rgb(159,18,57)'
        },
        '/admin/users': {
            darkGlow: 'rgba(132,204,22,0.22)',
            lightGlow: 'rgba(132,204,22,0.18)',
            darkFrom: 'rgba(132,204,22,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(247,254,231,0.98)',
            lightTo: 'rgba(217,249,157,0.9)',
            darkText: 'rgb(217,249,157)',
            lightText: 'rgb(77,124,15)'
        },
        '/admin/stores': {
            darkGlow: 'rgba(249,115,22,0.22)',
            lightGlow: 'rgba(249,115,22,0.18)',
            darkFrom: 'rgba(249,115,22,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(255,247,237,0.98)',
            lightTo: 'rgba(254,215,170,0.9)',
            darkText: 'rgb(254,215,170)',
            lightText: 'rgb(154,52,18)'
        },
        '/catalog': {
            darkGlow: 'rgba(20,184,166,0.22)',
            lightGlow: 'rgba(20,184,166,0.18)',
            darkFrom: 'rgba(20,184,166,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(240,253,250,0.98)',
            lightTo: 'rgba(153,246,228,0.9)',
            darkText: 'rgb(153,246,228)',
            lightText: 'rgb(15,118,110)'
        },
        '/suppliers': {
            darkGlow: 'rgba(217,70,239,0.22)',
            lightGlow: 'rgba(217,70,239,0.18)',
            darkFrom: 'rgba(217,70,239,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(253,244,255,0.98)',
            lightTo: 'rgba(245,208,254,0.9)',
            darkText: 'rgb(245,208,254)',
            lightText: 'rgb(134,25,143)'
        }
    }

    const resolvePaletteKey = (path: string): string => {
        const nestedKeys = ['/inventory', '/customers', '/presale', '/catalog', '/admin/users', '/admin/stores']
        const nestedMatch = nestedKeys.find((key) => path === key || path.startsWith(`${key}/`))
        if (nestedMatch) return nestedMatch
        return routePalettes[path] ? path : '/dashboard'
    }

    const currentPalette = routePalettes[resolvePaletteKey(location.pathname)]

    const isItemActive = (href: string): boolean => {
        const cleanHref = href.split('?')[0]
        if (cleanHref === '/dashboard') return location.pathname === '/dashboard'
        return location.pathname === cleanHref || location.pathname.startsWith(`${cleanHref}/`)
    }

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
    ]

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
            className="min-h-screen flex overflow-x-hidden w-full max-w-full"
            style={{
                background: mode === 'dark'
                    ? `linear-gradient(180deg, ${withAlpha(currentPalette.darkGlow, 0.12)} 0%, rgba(2,6,23,0) 8%), radial-gradient(circle at 12% 6%, ${withAlpha(currentPalette.darkGlow, 0.2)} 0%, transparent 11%), radial-gradient(circle at 90% 90%, rgba(56,189,248,0.03) 0%, transparent 16%), linear-gradient(180deg, #020617 0%, #0f172a 100%)`
                    : `linear-gradient(180deg, ${withAlpha(currentPalette.lightGlow, 0.15)} 0%, rgba(248,251,255,0) 9%), radial-gradient(circle at 12% 6%, ${withAlpha(currentPalette.lightGlow, 0.22)} 0%, transparent 11%), radial-gradient(circle at 90% 90%, rgba(14,165,233,0.03) 0%, transparent 18%), linear-gradient(180deg, #f8fbff 0%, #eef3fa 100%)`
            }}
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
            fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col overflow-hidden backdrop-blur-xl
                ${sidebarCollapsed && window.innerWidth >= 1024 ? collapsedWidthClass : 'w-64'}
            ${mode === 'dark'
                        ? 'bg-slate-800/74 shadow-[18px_18px_34px_rgba(2,6,23,0.58),-12px_-12px_22px_rgba(148,163,184,0.18)]'
                        : 'bg-white/88 shadow-[18px_18px_34px_rgba(148,163,184,0.3),-12px_-12px_22px_rgba(255,255,255,0.98)]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
            >
                {/* Fixed Sidebar Header */}
                <div className={`flex items-center h-16 flex-shrink-0 z-10 backdrop-blur-xl ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'} ${mode === 'dark' ? 'bg-slate-900/45 shadow-[0_6px_14px_rgba(2,6,23,0.35)]' : 'bg-white/56 shadow-[0_6px_14px_rgba(148,163,184,0.18)]'}`}>
                    {/* Logo/Title - ocultar texto cuando está colapsado en desktop */}
                    <h1 className={`text-lg lg:text-xl font-bold select-none transition-all ${mode === 'dark' ? 'text-white' : 'text-gray-900'} ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                        🏎️ {import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'}
                    </h1>

                    {/* Botón toggle collapse (solo desktop) */}
                    <button
                        className={`hidden lg:block p-2 rounded-lg transition-colors backdrop-blur-xl ${mode === 'dark'
                            ? 'bg-slate-900/44 text-slate-200 hover:bg-slate-800/58 shadow-[10px_10px_18px_rgba(2,6,23,0.55),-7px_-7px_12px_rgba(148,163,184,0.16)]'
                            : 'bg-white/90 text-slate-600 hover:bg-white shadow-[10px_10px_18px_rgba(148,163,184,0.28),-7px_-7px_12px_rgba(255,255,255,0.98)]'}`}
                        onClick={toggleSidebarCollapse}
                        aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                        title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                    >
                        <Menu size={20} className={mode === 'dark' ? 'text-slate-300' : 'text-gray-600'} />
                    </button>

                    {/* Botón cerrar (solo mobile) */}
                    <button
                        className={`lg:hidden p-2 -mr-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center backdrop-blur-xl ${mode === 'dark'
                            ? 'bg-slate-900/44 text-slate-200 hover:bg-slate-800/58 shadow-[10px_10px_18px_rgba(2,6,23,0.55),-7px_-7px_12px_rgba(148,163,184,0.16)]'
                            : 'bg-white/90 text-slate-600 hover:bg-white shadow-[10px_10px_18px_rgba(148,163,184,0.28),-7px_-7px_12px_rgba(255,255,255,0.98)]'}`}
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
                            const isActive = isItemActive(item.href)
                            const itemPalette = routePalettes[resolvePaletteKey(item.href.split('?')[0])] || routePalettes['/dashboard']
                            const tabStateClass = isActive
                                ? (mode === 'dark'
                                    ? 'shadow-[12px_12px_22px_rgba(2,6,23,0.6),-9px_-9px_16px_rgba(148,163,184,0.2)] hover:-translate-y-1'
                                    : 'shadow-[12px_12px_22px_rgba(148,163,184,0.3),-9px_-9px_16px_rgba(255,255,255,0.98)] hover:-translate-y-1')
                                : (mode === 'dark'
                                    ? 'hover:-translate-y-1 active:brightness-95 shadow-[11px_11px_20px_rgba(2,6,23,0.56),-8px_-8px_14px_rgba(148,163,184,0.12)]'
                                    : 'hover:-translate-y-1 active:brightness-95 shadow-[11px_11px_20px_rgba(148,163,184,0.24),-8px_-8px_14px_rgba(255,255,255,0.98)]')
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`
                  flex items-center py-3 text-base font-medium rounded-lg transition-all duration-200 backdrop-blur-xl will-change-transform
                  min-h-[44px] touch-manipulation relative select-none
                  ${sidebarCollapsed ? collapsedItemLayoutClass : 'px-4'}
                  ${tabStateClass}
                `}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                        background: isActive
                                            ? (mode === 'dark'
                                                ? `linear-gradient(145deg, ${withAlpha(itemPalette.darkGlow, 0.66)}, rgba(15,23,42,0.74))`
                                                : `linear-gradient(145deg, ${withAlpha(itemPalette.lightGlow, 0.62)}, ${withAlpha(itemPalette.lightGlow, 0.28)})`)
                                            : (mode === 'dark'
                                                ? `linear-gradient(145deg, ${withAlpha(itemPalette.darkGlow, 0.34)}, rgba(15,23,42,0.58))`
                                                : `linear-gradient(145deg, ${withAlpha(itemPalette.lightGlow, 0.34)}, rgba(241,245,249,0.9))`),
                                        border: mode === 'dark'
                                            ? `1px solid ${isActive ? withAlpha(itemPalette.darkGlow, 0.7) : withAlpha(itemPalette.darkGlow, 0.42)}`
                                            : undefined,
                                        color: isActive
                                            ? (mode === 'dark' ? itemPalette.darkText : itemPalette.lightText)
                                            : (mode === 'dark' ? 'rgb(226,232,240)' : 'rgb(51,65,85)')
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
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden min-h-screen">
                {/* Top bar - Fixed header */}
                <div className={`h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-40 w-full lg:w-auto backdrop-blur-xl transition-all duration-300 ${sidebarCollapsed ? collapsedHeaderOffsetClass : 'lg:left-64'} ${mode === 'dark' ? 'bg-slate-900/32 !shadow-[0_10px_22px_rgba(2,6,23,0.34)]' : 'bg-white/76 !shadow-[0_10px_22px_rgba(148,163,184,0.22)]'}`}>
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
                                    ? 'bg-slate-800 border border-slate-600/40 text-slate-100 placeholder-slate-400 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)] focus:ring-1 focus:ring-emerald-500'
                                    : 'bg-slate-100 border border-slate-300/60 text-slate-700 placeholder-slate-500 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)] focus:ring-1 focus:ring-emerald-500'
                                    }`}
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2 sm:gap-4 flex-1 lg:flex-initial lg:justify-end">
                        {/* Store Selector for sys_admin */}
                        <StoreSelector />

                        {/* User dropdown menu */}
                        <UserDropdown
                            sidebarDensity={sidebarDensity}
                            onToggleSidebarDensity={toggleSidebarDensity}
                        />
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
