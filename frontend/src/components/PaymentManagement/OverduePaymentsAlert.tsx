import React, { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OverduePayment {
    _id: string
    deliveryId: string
    deliveryNumber: string
    customerName: string
    dueDate: Date
    amount: number
    overdueAmount: number
    daysPastDue: number
    notes?: string
}

interface OverduePaymentsAlertProps {
    overduePayments: OverduePayment[]
    isLoading: boolean
    onPaymentClick: (paymentId: string) => void
}

const OverduePaymentsAlert: React.FC<OverduePaymentsAlertProps> = ({
    overduePayments,
    isLoading,
    onPaymentClick,
}) => {
    const [expanded, setExpanded] = useState(overduePayments.length > 0)

    if (overduePayments.length === 0) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-green-700">¡Excelente!</p>
                    <p className="text-sm text-green-600">No hay pagos vencidos</p>
                </div>
            </div>
        )
    }

    const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.overdueAmount, 0)
    const criticalOverdue = overduePayments.filter((p) => p.daysPastDue > 30)

    return (
        <div className="bg-red-50 border border-red-300 rounded-lg overflow-hidden shadow-md">
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="cursor-pointer p-4 bg-red-100 flex items-center justify-between hover:bg-red-150 transition-colors"
            >
                <div className="flex items-center gap-3 flex-1">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-700">{overduePayments.length} Pagos Vencidos</h3>
                        <p className="text-sm text-red-600">
                            Deuda total: ${totalOverdueAmount.toLocaleString('es-CO')}
                        </p>
                    </div>
                </div>
                <button className="p-2 hover:bg-red-200 rounded-lg transition-colors">
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                </button>
            </div>

            {/* Expanded List */}
            {expanded && (
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {/* Critical Overdue Warning */}
                    {criticalOverdue.length > 0 && (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                            <p className="text-sm font-semibold text-red-700">
                                ⚠️ {criticalOverdue.length} pago(s) con más de 30 días de vencimiento
                            </p>
                        </div>
                    )}

                    {/* Overdue Payments List */}
                    {overduePayments.map((payment) => (
                        <div
                            key={payment._id}
                            className={`p-3 rounded-lg border-2 ${payment.daysPastDue > 30 ? 'bg-red-100 border-red-400' : 'bg-orange-50 border-orange-200'
                                } hover:shadow-md transition-shadow`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{payment.customerName}</h4>
                                    <p className="text-xs text-gray-600">Entrega #{payment.deliveryNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-red-600">${payment.overdueAmount.toLocaleString('es-CO')}</p>
                                    <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-1 rounded">
                                        {payment.daysPastDue} días vencido
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span>Vencía: {format(new Date(payment.dueDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                            </div>

                            {payment.notes && <p className="text-sm text-gray-600 mb-2 italic">"{payment.notes}"</p>}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onPaymentClick(payment._id)}
                                    disabled={isLoading}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 text-sm"
                                >
                                    Registrar Pago
                                </button>
                                <button className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-3 rounded-lg transition-colors text-sm">
                                    Ver Detalles
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default OverduePaymentsAlert
