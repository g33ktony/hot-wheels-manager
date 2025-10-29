import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PaymentTransaction {
    _id: string
    date: Date
    amount: number
    type: 'payment' | 'adjustment'
    notes?: string
    status: 'completed' | 'pending' | 'failed'
}

interface PaymentHistoryTableProps {
    transactions: PaymentTransaction[]
    isLoading: boolean
    onDeleteTransaction?: (transactionId: string) => void
}

const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
    transactions,
    isLoading,
    onDeleteTransaction,
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const sortedTransactions = [...transactions].sort((a, b) => {
        let compareValue = 0
        if (sortBy === 'date') {
            compareValue = new Date(a.date).getTime() - new Date(b.date).getTime()
        } else {
            compareValue = a.amount - b.amount
        }
        return sortOrder === 'asc' ? compareValue : -compareValue
    })

    const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : 0), 0)
    const totalAdjustments = transactions.reduce((sum, t) => sum + (t.type === 'adjustment' ? t.amount : 0), 0)

    const handleSort = (newSortBy: 'date' | 'amount') => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(newSortBy)
            setSortOrder('desc')
        }
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay transacciones registradas</p>
                <p className="text-sm text-gray-500 mt-1">Los pagos aparecerán aquí cuando se registren</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
                <div>
                    <p className="text-sm text-gray-600 font-medium">Total Pagos</p>
                    <p className="text-2xl font-bold text-green-600">${totalAmount.toLocaleString('es-CO')}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600 font-medium">Transacciones</p>
                    <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600 font-medium">Ajustes</p>
                    <p className="text-2xl font-bold text-orange-600">${totalAdjustments.toLocaleString('es-CO')}</p>
                </div>
            </div>

            {/* Table Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Historial de Pagos</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSort('date')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortBy === 'date'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Fecha {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            onClick={() => handleSort('amount')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortBy === 'amount'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Monto {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="max-h-96 overflow-y-auto">
                {sortedTransactions.map((transaction) => (
                    <div key={transaction._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <div
                            onClick={() =>
                                setExpandedId(expandedId === transaction._id ? null : transaction._id)
                            }
                            className="cursor-pointer px-6 py-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div
                                    className={`p-2 rounded-lg ${transaction.type === 'payment'
                                            ? 'bg-green-100'
                                            : 'bg-orange-100'
                                        }`}
                                >
                                    {transaction.type === 'payment' ? (
                                        <ArrowDownLeft className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <ArrowUpRight className="w-5 h-5 text-orange-600" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">
                                        {transaction.type === 'payment' ? 'Pago Recibido' : 'Ajuste'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {format(new Date(transaction.date), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                                            locale: es,
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p
                                        className={`font-bold text-lg ${transaction.type === 'payment' ? 'text-green-600' : 'text-orange-600'
                                            }`}
                                    >
                                        {transaction.type === 'payment' ? '+' : ''}${transaction.amount.toLocaleString('es-CO')}
                                    </p>
                                    <span
                                        className={`text-xs font-medium px-2 py-1 rounded-full ${transaction.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : transaction.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        {transaction.status === 'completed'
                                            ? 'Completado'
                                            : transaction.status === 'pending'
                                                ? 'Pendiente'
                                                : 'Fallido'}
                                    </span>
                                </div>

                                <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    {expandedId === transaction._id ? (
                                        <ChevronUp className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === transaction._id && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">ID de Transacción</p>
                                    <p className="text-sm text-gray-600 font-mono">{transaction._id}</p>
                                </div>

                                {transaction.notes && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Notas</p>
                                        <p className="text-sm text-gray-600">{transaction.notes}</p>
                                    </div>
                                )}

                                {transaction.status === 'completed' && onDeleteTransaction && (
                                    <div className="pt-3 border-t border-gray-300">
                                        <button
                                            onClick={() => {
                                                if (
                                                    window.confirm('¿Estás seguro de que deseas eliminar esta transacción?')
                                                ) {
                                                    onDeleteTransaction(transaction._id)
                                                }
                                            }}
                                            disabled={isLoading}
                                            className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                                        >
                                            Eliminar Transacción
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default PaymentHistoryTable
