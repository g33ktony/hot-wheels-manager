import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    ShoppingBag,
    DollarSign,
    ClipboardList,
    BookOpen,
    Truck,
    Menu,
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
import { useStoreSettings } from '@/hooks/useStoreSettings'
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed')
        return saved === 'true'
    })
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
    const { data: storeSettings } = useStoreSettings()
    const hiddenSections = storeSettings?.navigation?.hiddenSections ?? []

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
        '/contacts': {
            darkGlow: 'rgba(14,165,233,0.22)',
            lightGlow: 'rgba(14,165,233,0.18)',
            darkFrom: 'rgba(14,165,233,0.28)',
            darkTo: 'rgba(15,23,42,0.62)',
            lightFrom: 'rgba(240,249,255,0.98)',
            lightTo: 'rgba(186,230,253,0.9)',
            darkText: 'rgb(186,230,253)',
            lightText: 'rgb(3,105,161)'
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

    // Restaurar fondo dinámico por ruta, pero usando el mismo efecto vistoso para todos
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
    // Mobile: always w-14 (icon-only). Desktop: collapsed w-16/20, expanded w-64
    const collapsedWidthClass = sidebarDensity === 'normal' ? 'lg:w-20' : 'lg:w-16'
    const collapsedHeaderOffsetClass = sidebarDensity === 'normal' ? 'lg:left-20' : 'lg:left-16'
    const mainOffsetClass = sidebarCollapsed
        ? (sidebarDensity === 'normal' ? 'lg:ml-20' : 'lg:ml-16')
        : 'lg:ml-64'
    // Item layout: on mobile always icon-only (flex-col); on desktop follow collapsed state
    const collapsedItemLayoutClass = sidebarDensity === 'normal'
        ? 'flex-col justify-center gap-0.5 px-1 py-2 lg:gap-1 lg:px-1.5'
        : 'flex-col justify-center gap-0.5 px-1 py-2 lg:gap-1 lg:px-1'
    // Expanded on desktop: horizontal layout
    const expandedItemLayoutClass = 'flex-col justify-center gap-0.5 px-1 py-2 lg:flex-row lg:items-center lg:px-4 lg:gap-0 lg:py-0'
    const collapsedLabelClass = sidebarDensity === 'normal'
        ? 'hidden lg:block text-[10px] leading-tight font-semibold text-center w-full px-0.5'
        : 'hidden lg:block text-[9px] leading-none font-semibold uppercase text-center w-full px-0.5'

    // Handle navigation item click — collapse desktop sidebar
    const handleNavClick = () => {
        if (window.innerWidth >= 1024) {
            setSidebarCollapsed(true)
        }
    }

    // Minimum swipe distance (in px)
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
        { name: 'Contactos', shortName: 'Cont', href: '/contacts', icon: Users },
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
    ].filter(item => {
        // sys_admin always sees everything
        if (isSysAdmin()) return true
        const route = item.href.split('?')[0]
        return !hiddenSections.includes(route)
    })

    return (
        <div
            className="min-h-screen overflow-x-hidden w-full max-w-full"
            style={{
                background: mode === 'dark'
                    ? `linear-gradient(145deg,${withAlpha(currentPalette.darkGlow, 0.22)} 0%,rgba(15,23,42,0.72) 100%), radial-gradient(circle at 12% 6%, ${withAlpha(currentPalette.darkGlow, 0.2)} 0%, transparent 40%), linear-gradient(180deg, #020617 0%, #0f172a 100%)`
                    : `linear-gradient(145deg,${withAlpha(currentPalette.lightGlow, 0.18)} 0%,rgba(196,181,253,0.22) 100%), radial-gradient(circle at 12% 6%, ${withAlpha(currentPalette.lightGlow, 0.22)} 0%, transparent 40%), linear-gradient(180deg, #f8fbff 0%, #eef3fa 100%)`
            }}
        >
            {/* Sidebar — always fixed, always visible. Mobile: icon-only w-14. Desktop: collapsed or expanded. */}
            <div
                ref={sidebarRef}
                className={`
                    fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300
                    w-14 ${sidebarCollapsed ? collapsedWidthClass : 'lg:w-64'}
                    ${mode === 'dark'
                        ? 'bg-slate-800/74 shadow-[18px_18px_34px_rgba(2,6,23,0.58),-12px_-12px_22px_rgba(148,163,184,0.18)]'
                        : 'bg-white/88 shadow-[18px_18px_34px_rgba(148,163,184,0.3),-12px_-12px_22px_rgba(255,255,255,0.98)]'}
                `}
            >
                {/* Fixed Sidebar Header */}
                <div className={`flex items-center h-16 flex-shrink-0 z-10 backdrop-blur-xl justify-center px-2 lg:px-4 ${!sidebarCollapsed ? 'lg:justify-between' : ''} ${mode === 'dark' ? 'bg-slate-900/45 shadow-[0_6px_14px_rgba(2,6,23,0.35)]' : 'bg-white/56 shadow-[0_6px_14px_rgba(148,163,184,0.18)]'}`}>
                    {/* Logo/Title — hidden on mobile, hidden when collapsed on desktop */}
                    <h1 className={`hidden text-lg lg:text-xl font-bold select-none transition-all ${mode === 'dark' ? 'text-white' : 'text-gray-900'} ${sidebarCollapsed ? '' : 'lg:block'}`}>
                        🏎️ {import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'}
                    </h1>

                    {/* Collapse toggle — desktop only */}
                    <button
                        className={`p-2 rounded-lg transition-colors backdrop-blur-xl ${mode === 'dark'
                            ? 'bg-slate-900/44 text-slate-200 hover:bg-slate-800/58 shadow-[10px_10px_18px_rgba(2,6,23,0.55),-7px_-7px_12px_rgba(148,163,184,0.16)]'
                            : 'bg-white/90 text-slate-600 hover:bg-white shadow-[10px_10px_18px_rgba(148,163,184,0.28),-7px_-7px_12px_rgba(255,255,255,0.98)]'}`}
                        onClick={toggleSidebarCollapse}
                        aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                        title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                    >
                        <Menu size={20} className={mode === 'dark' ? 'text-slate-300' : 'text-gray-600'} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-hidden">
                    <nav className="px-1.5 pt-3 pb-3 space-y-0.5 lg:px-2 lg:pt-4 lg:pb-4 lg:space-y-1">
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
                                        flex items-center text-base font-medium rounded-lg transition-all duration-200 backdrop-blur-xl will-change-transform
                                        min-h-[40px] touch-manipulation relative select-none
                                        ${sidebarCollapsed ? collapsedItemLayoutClass : expandedItemLayoutClass}
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
                                                ? 'linear-gradient(145deg, rgba(30,41,59,0.5), rgba(15,23,42,0.58))'
                                                : 'linear-gradient(145deg, rgba(248,250,252,0.9), rgba(241,245,249,0.8))'),
                                        border: mode === 'dark'
                                            ? `1px solid ${isActive ? withAlpha(itemPalette.darkGlow, 0.7) : 'rgba(148,163,184,0.1)'}`
                                            : `1px solid ${isActive ? withAlpha(itemPalette.lightGlow, 0.5) : 'transparent'}`,
                                        color: isActive
                                            ? (mode === 'dark' ? itemPalette.darkText : itemPalette.lightText)
                                            : (mode === 'dark' ? 'rgb(226,232,240)' : 'rgb(51,65,85)')
                                    }}
                                    onClick={handleNavClick}
                                    title={item.name}
                                >
                                    <item.icon size={20} className={`flex-shrink-0 ${!sidebarCollapsed ? 'lg:mr-3' : ''}`} />
                                    {/* Text label: hidden on mobile always; on desktop only when expanded */}
                                    {!sidebarCollapsed && <span className="hidden lg:inline flex-1">{item.name}</span>}
                                    {/* Short label: shown on desktop only when collapsed */}
                                    {sidebarCollapsed && (
                                        <span className={collapsedLabelClass}>{item.shortName || item.name}</span>
                                    )}
                                    {item.badge && item.badge > 0 && (
                                        <span className={`
                    px-1.5 py-0.5 text-xs font-semibold rounded-full absolute top-0.5 right-0.5 lg:static lg:px-2
                    ${sidebarCollapsed ? '' : 'lg:relative lg:top-0 lg:right-0'}
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

            {/* Main content — always offset by sidebar width */}
            <div className={`flex flex-col overflow-x-hidden min-h-screen ml-14 ${mainOffsetClass}`}>
                {/* Top bar - Fixed header */}
                <div className={`h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-4 fixed top-0 right-0 z-40 backdrop-blur-xl transition-all duration-300 left-14 ${sidebarCollapsed ? collapsedHeaderOffsetClass : 'lg:left-64'} ${mode === 'dark' ? 'bg-slate-900/32 !shadow-[0_10px_22px_rgba(2,6,23,0.34)]' : 'bg-white/76 !shadow-[0_10px_22px_rgba(148,163,184,0.22)]'}`}>
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
