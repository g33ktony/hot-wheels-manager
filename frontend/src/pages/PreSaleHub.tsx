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
    const pageBackdropClass = isDark
        ? 'bg-[radial-gradient(circle_at_12%_12%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]'
        : 'bg-[radial-gradient(circle_at_10%_15%,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#f5f8ff_0%,#e9eff8_100%)]'
    const surfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_22px_rgba(51,65,85,0.2)]'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'

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
        <div className={`space-y-6 rounded-3xl p-4 lg:p-6 ${pageBackdropClass}`}>
            {/* Header */}
            <div className={`p-4 lg:p-5 ${surfaceClass}`}>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>🎯 Pre-Ventas</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Gestión completa del ciclo de pre-ventas
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className={`overflow-hidden ${surfaceClass}`}>
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
