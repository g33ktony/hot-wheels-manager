import React from 'react'
import { TrendingUp, Package, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react'

interface PreSaleItem {
    status: 'active' | 'completed' | 'cancelled' | 'paused'
    totalQuantity: number
    assignedQuantity: number
    availableQuantity: number
    totalSaleAmount: number
    totalCostAmount: number
    totalProfit: number
}

interface PreSaleStatsProps {
    items: PreSaleItem[]
}

const PreSaleStats: React.FC<PreSaleStatsProps> = ({ items = [] }) => {
    // Calculate metrics
    const activeItems = items.filter((item) => item.status === 'active').length
    const completedItems = items.filter((item) => item.status === 'completed').length
    const pausedItems = items.filter((item) => item.status === 'paused').length
    const cancelledItems = items.filter((item) => item.status === 'cancelled').length

    const totalSaleAmount = items.reduce((sum, item) => sum + item.totalSaleAmount, 0)
    const totalCostAmount = items.reduce((sum, item) => sum + item.totalCostAmount, 0)
    const totalProfit = items.reduce((sum, item) => sum + item.totalProfit, 0)
    const availableQuantity = items.reduce((sum, item) => sum + item.availableQuantity, 0)

    const stats = [
        {
            label: 'Activos',
            value: activeItems,
            icon: Zap,
            bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-700',
            valueColor: 'text-blue-900',
        },
        {
            label: 'Completados',
            value: completedItems,
            icon: CheckCircle,
            bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
            borderColor: 'border-green-200',
            textColor: 'text-green-700',
            valueColor: 'text-green-900',
        },
        {
            label: 'En Pausa',
            value: pausedItems,
            icon: Clock,
            bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-700',
            valueColor: 'text-yellow-900',
        },
        {
            label: 'Cancelados',
            value: cancelledItems,
            icon: AlertCircle,
            bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
            borderColor: 'border-red-200',
            textColor: 'text-red-700',
            valueColor: 'text-red-900',
        },
        {
            label: 'Unidades Disponibles',
            value: availableQuantity,
            icon: Package,
            bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-700',
            valueColor: 'text-purple-900',
        },
        {
            label: 'Ganancia Total',
            value: `$${totalProfit.toFixed(2)}`,
            icon: TrendingUp,
            bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
            borderColor: 'border-emerald-200',
            textColor: 'text-emerald-700',
            valueColor: 'text-emerald-900',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <div
                        key={index}
                        className={`${stat.bgColor} border-2 ${stat.borderColor} rounded-lg p-4 transition-transform hover:scale-105`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-xs font-medium ${stat.textColor} mb-1 uppercase tracking-wide`}>
                                    {stat.label}
                                </p>
                                <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                            </div>
                            {Icon && <Icon className={`w-6 h-6 ${stat.textColor} opacity-60`} />}
                        </div>
                    </div>
                )
            })}

            {/* Summary Bar */}
            <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Costo Total</p>
                        <p className="text-2xl font-bold text-red-600">${totalCostAmount.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Venta Total</p>
                        <p className="text-2xl font-bold text-blue-600">${totalSaleAmount.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Ganancia Neta</p>
                        <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${totalProfit.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PreSaleStats
