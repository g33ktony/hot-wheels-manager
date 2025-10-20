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
    AlertCircle
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePendingItemsStats } from '@/hooks/usePendingItems'
import { useBoxes } from '@/hooks/useBoxes'

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const sidebarRef = useRef<HTMLDivElement>(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { data: pendingItemsStats } = usePendingItemsStats()
    const { data: boxes } = useBoxes()

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50

    // Filter active boxes (exclude completed ones)
    const activeBoxes = boxes?.filter((box: any) => box.boxStatus !== 'completed') || []

    const navigationItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Inventario', href: '/inventory', icon: Package },
        { name: 'Ventas', href: '/sales', icon: ShoppingCart },
        { name: 'Compras', href: '/purchases', icon: ShoppingBag },
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
            className="min-h-screen bg-gray-50 flex overflow-x-hidden w-full max-w-full"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
            >
                {/* Fixed Sidebar Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0 bg-white">
                    <h1 className="text-lg lg:text-xl font-bold text-gray-900 select-none">🏎️ Hot Wheels Manager</h1>
                    <button
                        className="lg:hidden p-2 -mr-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            WebkitTouchCallout: 'none',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-20 space-y-1">
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
                                            ? 'bg-orange-100 text-orange-700 shadow-sm'
                                            : 'bg-primary-100 text-primary-700 shadow-sm'
                                        : item.highlight
                                            ? 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 active:bg-orange-100 border-2 border-orange-300'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
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
                                            ? 'bg-orange-200 text-orange-900'
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
                        className="w-full flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation text-red-600 hover:bg-red-50 active:bg-red-100 mt-4"
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

            {/* Main content */}
            <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
                {/* Top bar - Fixed header */}
                <div className="h-16 bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 flex items-center justify-between fixed top-0 left-0 right-0 lg:left-64 z-40 w-full lg:w-auto">
                    <button
                        className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Abrir menú"
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            WebkitTouchCallout: 'none',
                        }}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 lg:flex lg:items-center lg:justify-end">
                        <div className="text-sm text-gray-500 hidden sm:block select-none">
                            {user?.name || 'Usuario'}
                        </div>
                    </div>
                </div>

                {/* Page content - Add padding-top to account for fixed header */}
                <main className="flex-1 overflow-auto w-full pt-16">
                    <div className="py-4 px-3 sm:px-4 lg:py-6 lg:px-6 pb-safe w-full">
                        <div className="w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
