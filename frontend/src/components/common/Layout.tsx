import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    ShoppingBag,
    Truck,
    Menu,
    X,
    Users,
    Building2
} from 'lucide-react'
import { useState } from 'react'

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
                    <h1 className="text-xl font-bold text-gray-900">🏎️ Hot Wheels Manager</h1>
                    <button
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-8 px-4 space-y-2">
                    {navigationItems.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }
                `}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={20} className="mr-3" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Top bar - same height as sidebar header */}
                <div className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between">
                    <button
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 lg:flex lg:items-center lg:justify-end">
                        <div className="text-sm text-gray-500">
                            Bienvenido al gestor de Hot Wheels
                        </div>
                    </div>
                </div>

                {/* Page content - starts at same level as sidebar nav */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
