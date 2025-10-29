import React, { useState } from 'react'
import { ChevronDown, ChevronUp, DollarSign, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PaymentScheduleItem {
    dueDate: Date
    amount: number
    paid: boolean
    paidDate?: Date
    isOverdue: boolean
    notes?: string
}

interface PaymentPlanTrackerProps {
    paymentPlan: {
        _id: string
        totalAmount: number
        numberOfPayments: number
        amountPerPayment: number
        paymentFrequency: string
        totalPaid: number
        remainingAmount: number
        paymentsCompleted: number
        hasOverduePayments: boolean
    }
    schedule: PaymentScheduleItem[]
    isLoading: boolean
    onRecordPayment: (amount: number, paymentDate: Date, notes?: string) => void
}

const PaymentPlanTracker: React.FC<PaymentPlanTrackerProps> = ({
    paymentPlan,
    schedule,
    isLoading,
    onRecordPayment,
}) => {
    const [expanded, setExpanded] = useState(false)
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState(paymentPlan.amountPerPayment.toString())
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [paymentNotes, setPaymentNotes] = useState('')

    const handleRecordPayment = () => {
        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor ingresa un monto válido')
            return
        }
        if (!paymentDate) {
            alert('Por favor selecciona una fecha')
            return
        }

        onRecordPayment(amount, new Date(paymentDate), paymentNotes)
        setPaymentAmount(paymentPlan.amountPerPayment.toString())
        setPaymentDate(new Date().toISOString().split('T')[0])
        setPaymentNotes('')
        setShowPaymentForm(false)
    }

    const progressPercentage = (paymentPlan.totalPaid / paymentPlan.totalAmount) * 100

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="cursor-pointer flex items-center justify-between mb-4"
            >
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        Plan de Pago #{paymentPlan._id?.slice(-6)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {paymentPlan.paymentsCompleted} de {paymentPlan.numberOfPayments} pagos completados
                    </p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                    className={`h-3 rounded-full transition-all duration-300 ${paymentPlan.hasOverduePayments
                        ? 'bg-red-500'
                        : progressPercentage === 100
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-medium">Pagado</p>
                    <p className="text-lg font-bold text-blue-600">${paymentPlan.totalPaid.toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-medium">Pendiente</p>
                    <p className="text-lg font-bold text-yellow-600">${paymentPlan.remainingAmount.toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-medium">Por Pago</p>
                    <p className="text-lg font-bold text-purple-600">${paymentPlan.amountPerPayment.toLocaleString('es-CO')}</p>
                </div>
            </div>

            {/* Overdue Alert */}
            {paymentPlan.hasOverduePayments && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Pagos Vencidos</p>
                        <p className="text-sm text-red-600">Hay pagos pendientes que han excedido su fecha</p>
                    </div>
                </div>
            )}

            {/* Expanded Content */}
            {expanded && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    {/* Payment Form */}
                    {showPaymentForm && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Registrar Pago</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monto a Pagar
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha del Pago
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notas (Opcional)
                                    </label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Ej: Pago parcial, efectivo, cheque..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRecordPayment}
                                        disabled={isLoading}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Guardando...' : 'Guardar Pago'}
                                    </button>
                                    <button
                                        onClick={() => setShowPaymentForm(false)}
                                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-3 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showPaymentForm && paymentPlan.remainingAmount > 0 && (
                        <button
                            onClick={() => setShowPaymentForm(true)}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            + Registrar Pago
                        </button>
                    )}

                    {/* Schedule List */}
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Cronograma de Pagos</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {schedule.map((item, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border-2 transition-all ${item.paid
                                        ? 'bg-green-50 border-green-200'
                                        : item.isOverdue
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p
                                                className={`font-medium ${item.paid ? 'text-green-700' : item.isOverdue ? 'text-red-700' : 'text-gray-700'
                                                    }`}
                                            >
                                                {format(new Date(item.dueDate), "d 'de' MMMM", { locale: es })}
                                            </p>
                                            {item.paid && item.paidDate && (
                                                <p className="text-xs text-green-600">
                                                    Pagado: {format(new Date(item.paidDate), "d 'de' MMMM", { locale: es })}
                                                </p>
                                            )}
                                            {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">${item.amount.toLocaleString('es-CO')}</p>
                                            <span
                                                className={`text-xs font-medium px-2 py-1 rounded-full ${item.paid
                                                    ? 'bg-green-200 text-green-800'
                                                    : item.isOverdue
                                                        ? 'bg-red-200 text-red-800'
                                                        : 'bg-yellow-200 text-yellow-800'
                                                    }`}
                                            >
                                                {item.paid ? 'Pagado' : item.isOverdue ? 'Vencido' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PaymentPlanTracker
