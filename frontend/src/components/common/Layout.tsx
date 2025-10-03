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
    LogOut
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface LayoutProps {
    children: ReactNode
}

const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventario', href: '/inventory', icon: Package },
    { name: 'Ventas', href: '/sales', icon: ShoppingCart },
    { name: 'Compras', href: '/purchases', icon: ShoppingBag },
    { name: 'Entregas', href: '/deliveries', icon: Truck },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Proveedores', href: '/suppliers', icon: Building2 },
]

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <h1 className="text-lg lg:text-xl font-bold text-gray-900">🏎️ Hot Wheels Manager</h1>
                    <button
                        className="lg:hidden p-2 -mr-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-4 px-3 space-y-1 pb-20 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
                    {navigationItems.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`
                  flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200
                  min-h-[44px] touch-manipulation
                  ${isActive
                                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
                                    }
                `}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={22} className="mr-3 flex-shrink-0" />
                                <span className="flex-1">{item.name}</span>
                            </Link>
                        )
                    })}

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation text-red-600 hover:bg-red-50 active:bg-red-100 mt-4"
                    >
                        <LogOut size={22} className="mr-3 flex-shrink-0" />
                        <span className="flex-1">Cerrar sesión</span>
                    </button>
                </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Top bar - same height as sidebar header */}
                <div className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
                    <button
                        className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Abrir menú"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 lg:flex lg:items-center lg:justify-end">
                        <div className="text-sm text-gray-500 hidden sm:block">
                            {user?.name || 'Usuario'}
                        </div>
                    </div>
                </div>

                {/* Page content - properly aligned with top bar */}
                <main className="flex-1 overflow-auto">
                    <div className="py-4 px-4 lg:py-6 lg:px-6 pb-safe">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
