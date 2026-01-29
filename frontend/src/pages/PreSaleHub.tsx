import { useState } from 'react'
import { Package, LayoutDashboard, CreditCard, TrendingUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import PreSalePurchase from './PreSalePurchase'
import PreSaleDashboardPage from './PreSaleDashboardPage'
import PreSalePayments from './PreSalePayments'
import PreSaleReports from './PreSaleReports'

type TabType = 'purchase' | 'dashboard' | 'payments' | 'reports'

export default function PreSaleHub() {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard')
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    const tabs = [
        {
            id: 'purchase' as TabType,
            name: 'Comprar',
            icon: Package,
            description: 'Registrar nuevas pre-ventas'
        },
        {
            id: 'dashboard' as TabType,
            name: 'Dashboard',
            icon: LayoutDashboard,
            description: 'Gestionar items'
        },
        {
            id: 'payments' as TabType,
            name: 'Planes de Pago',
            icon: CreditCard,
            description: 'Pagos e installments'
        },
        {
            id: 'reports' as TabType,
            name: 'Reportes',
            icon: TrendingUp,
            description: 'Análisis de rentabilidad'
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>🎯 Pre-Ventas</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Gestión completa del ciclo de pre-ventas
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className={`grid grid-cols-2 lg:grid-cols-4 gap-0 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative flex flex-col items-center justify-center p-4 lg:p-6
                                    transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                        : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700/30 border-b-2 border-transparent' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-b-2 border-transparent')
                                    }
                                `}
                            >
                                <Icon
                                    size={24}
                                    className={`
                                        mb-2 transition-transform duration-200
                                        ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                                    `}
                                />
                                <span className="text-sm font-medium">
                                    {tab.name}
                                </span>
                                <span className="text-xs text-gray-500 mt-1 hidden lg:block">
                                    {tab.description}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'purchase' && <PreSalePurchase />}
                {activeTab === 'dashboard' && <PreSaleDashboardPage />}
                {activeTab === 'payments' && <PreSalePayments />}
                {activeTab === 'reports' && <PreSaleReports />}
            </div>
        </div>
    )
}
