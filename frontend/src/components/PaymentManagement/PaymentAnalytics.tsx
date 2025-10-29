import React, { useState } from 'react'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react'

interface AnalyticsData {
    totalPayments: number
    averagePaymentAmount: number
    onTimePaymentPercentage: number
    averageDaysToPayment: number
    earlyPaymentBonus?: number
    overdueRate: number
}

interface PaymentAnalyticsProps {
    analytics: AnalyticsData
    isLoading: boolean
}

const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ analytics, isLoading }) => {
    const [view, setView] = useState<'overview' | 'trends'>('overview')

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
                <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full" />
                </div>
            </div>
        )
    }

    const metrics = [
        {
            label: 'Pagos Totales',
            value: analytics.totalPayments.toString(),
            icon: TrendingUp,
            color: 'from-blue-500 to-blue-600',
            suffix: 'pagos',
        },
        {
            label: 'Pago Promedio',
            value: `$${analytics.averagePaymentAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
            icon: BarChart3,
            color: 'from-green-500 to-green-600',
            suffix: 'por pago',
        },
        {
            label: 'A Tiempo',
            value: `${Math.round(analytics.onTimePaymentPercentage)}%`,
            icon: Calendar,
            color: analytics.onTimePaymentPercentage > 80 ? 'from-emerald-500 to-emerald-600' : 'from-yellow-500 to-yellow-600',
            suffix: 'de pagos',
        },
        {
            label: 'Días Promedio',
            value: analytics.averageDaysToPayment.toFixed(1),
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600',
            suffix: 'para pagar',
        },
    ]

    return (
        <div className="space-y-6">
            {/* View Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setView('overview')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${view === 'overview'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-600 border-transparent hover:text-gray-800'
                        }`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setView('trends')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${view === 'trends'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-600 border-transparent hover:text-gray-800'
                        }`}
                >
                    Tendencias
                </button>
            </div>

            {view === 'overview' ? (
                <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((metric, index) => {
                            const Icon = metric.icon
                            return (
                                <div
                                    key={index}
                                    className={`bg-gradient-to-br ${metric.color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-white text-opacity-80 text-sm font-medium">{metric.label}</p>
                                            <p className="text-3xl font-bold mt-2">{metric.value}</p>
                                            <p className="text-white text-opacity-70 text-xs mt-1">{metric.suffix}</p>
                                        </div>
                                        <Icon className="w-8 h-8 text-white text-opacity-80" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Performance Indicator */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Indicadores de Desempeño</h3>
                        <div className="space-y-4">
                            {/* On-Time Payments */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-gray-700">Pagos a Tiempo</p>
                                    <p className="font-bold text-green-600">{Math.round(analytics.onTimePaymentPercentage)}%</p>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                                        style={{ width: `${analytics.onTimePaymentPercentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Overdue Rate */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-gray-700">Tasa de Mora</p>
                                    <p className={`font-bold ${analytics.overdueRate > 20 ? 'text-red-600' : 'text-yellow-600'}`}>
                                        {analytics.overdueRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-300 ${analytics.overdueRate > 20
                                                ? 'bg-gradient-to-r from-red-400 to-red-600'
                                                : 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                            }`}
                                        style={{ width: `${analytics.overdueRate}%` }}
                                    />
                                </div>
                            </div>

                            {/* Early Payment Bonus */}
                            {analytics.earlyPaymentBonus && analytics.earlyPaymentBonus > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-blue-700">
                                        💰 Bonificación por Pago Anticipado Disponible
                                    </p>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">
                                        ${analytics.earlyPaymentBonus.toLocaleString('es-CO')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Análisis de Tendencias</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Los gráficos de tendencias estarán disponibles cuando haya más datos históricos
                    </p>
                </div>
            )}
        </div>
    )
}

export default PaymentAnalytics
