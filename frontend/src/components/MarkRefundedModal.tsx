import { useState } from 'react'
import { X, DollarSign, Calendar, CreditCard } from 'lucide-react'
import { PendingItem } from '@shared/types'

interface MarkRefundedModalProps {
    pendingItem: PendingItem
    onConfirm: (data: { refundAmount: number; refundDate: Date; refundMethod: string }) => void
    onClose: () => void
}

export default function MarkRefundedModal({
    pendingItem,
    onConfirm,
    onClose
}: MarkRefundedModalProps) {
    const suggestedRefund = pendingItem.unitPrice * pendingItem.quantity

    const [refundAmount, setRefundAmount] = useState<string>(suggestedRefund.toString())
    const [refundDate, setRefundDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    )
    const [refundMethod, setRefundMethod] = useState<string>('PayPal')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(refundAmount)
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor ingresa un monto válido')
            return
        }

        onConfirm({
            refundAmount: amount,
            refundDate: new Date(refundDate),
            refundMethod
        })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-green-500 text-white p-6 rounded-t-lg flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">💰 Marcar como Reembolsado</h2>
                        <p className="text-green-100 mt-1">
                            Registra el reembolso recibido del vendedor
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-green-600 rounded-full p-2 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Pending Item Info */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-orange-900 mb-2">Item Pendiente:</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-orange-700">Car ID:</p>
                                <p className="font-semibold text-orange-900">{pendingItem.carId}</p>
                            </div>
                            <div>
                                <p className="text-orange-700">Cantidad:</p>
                                <p className="font-semibold text-orange-900">{pendingItem.quantity}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-orange-700">Valor original:</p>
                                <p className="font-semibold text-orange-900">
                                    ${suggestedRefund.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Refund Amount */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign size={16} className="text-gray-400" />
                            Monto del Reembolso
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Valor sugerido: ${suggestedRefund.toFixed(2)}
                        </p>
                    </div>

                    {/* Refund Date */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            Fecha del Reembolso
                        </label>
                        <input
                            type="date"
                            value={refundDate}
                            onChange={(e) => setRefundDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                        />
                    </div>

                    {/* Refund Method */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <CreditCard size={16} className="text-gray-400" />
                            Método de Reembolso
                        </label>
                        <select
                            value={refundMethod}
                            onChange={(e) => setRefundMethod(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                        >
                            <option value="Transferencia bancaria">Transferencia bancaria</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Crédito del vendedor">Crédito del vendedor</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-green-900 mb-3">Resumen:</h4>
                        <div className="space-y-2 text-sm">
                            <p className="text-green-800">
                                <span className="font-medium">Monto a recibir:</span> ${parseFloat(refundAmount || '0').toFixed(2)}
                            </p>
                            <p className="text-green-800">
                                <span className="font-medium">Fecha:</span> {new Date(refundDate).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className="text-green-800">
                                <span className="font-medium">Método:</span> {refundMethod}
                            </p>
                            <p className="text-green-700 text-xs mt-3 pt-3 border-t border-green-300">
                                ℹ️ El item pasará al estado "Reembolsado" y se actualizarán las estadísticas
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                        >
                            Confirmar Reembolso
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
