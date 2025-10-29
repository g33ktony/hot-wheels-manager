import React from 'react'
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PaymentStatsProps {
    totalAmount: number
    totalPaid: number
    remainingAmount: number
    overdueAmount: number
}

const PaymentStats: React.FC<PaymentStatsProps> = ({
    totalAmount,
    totalPaid,
    remainingAmount,
    overdueAmount,
}) => {
    const paidPercentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0

    const stats = [
        {
            label: 'Total a Cobrar',
            value: `$${totalAmount.toLocaleString('es-CO')}`,
            icon: DollarSign,
            color: 'from-blue-500 to-blue-600',
        },
        {
            label: 'Pagado',
            value: `$${totalPaid.toLocaleString('es-CO')}`,
            subtext: `${paidPercentage}% completado`,
            icon: CheckCircle2,
            color: 'from-green-500 to-green-600',
        },
        {
            label: 'Pendiente',
            value: `$${remainingAmount.toLocaleString('es-CO')}`,
            subtext: `${100 - paidPercentage}% restante`,
            icon: TrendingUp,
            color: 'from-yellow-500 to-yellow-600',
        },
        {
            label: 'Vencido',
            value: `$${overdueAmount.toLocaleString('es-CO')}`,
            highlight: overdueAmount > 0,
            icon: AlertCircle,
            color: overdueAmount > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <div
                        key={index}
                        className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${stat.highlight ? 'ring-2 ring-offset-2 ring-red-400' : ''
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-80 text-sm font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold mt-2">{stat.value}</p>
                                {stat.subtext && <p className="text-white text-opacity-70 text-xs mt-1">{stat.subtext}</p>}
                            </div>
                            <Icon className="w-8 h-8 text-white text-opacity-80" />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default PaymentStats
