import React, { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import { useStore } from '@/contexts/StoreContext'
import { useDeliveries } from '@/hooks/useDeliveries'
import { usePaymentPlans, useCreatePaymentPlan, useRecordPayment } from '@/hooks/usePaymentPlans'

interface PreSalePaymentModalProps {
    isOpen: boolean
    onClose: () => void
    totalAmount: number
    carId: string
}

const PreSalePaymentModal: React.FC<PreSalePaymentModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    carId,
}) => {
    const [activeTab, setActiveTab] = useState<'create' | 'record' | 'view'>('view')
    const [selectedDelivery, setSelectedDelivery] = useState<string>('')
    const [paymentPlanId, setPaymentPlanId] = useState<string>('')
    const [existingPlan, setExistingPlan] = useState<any>(null)

    // Get selected store
    const { selectedStore } = useStore()

    // Fetch real deliveries and payment plans
    const { data: allDeliveries = [] } = useDeliveries(undefined, undefined, selectedStore || undefined)
    const { data: paymentPlans = [] } = usePaymentPlans()

    // Filter to show only deliveries that don't have a payment plan yet
    const deliveries = allDeliveries.filter((delivery: any) => {
        const hasPaymentPlan = paymentPlans.some((plan: any) => plan.deliveryId === delivery._id)
        return !hasPaymentPlan
    })

    // Form state for creating payment plan
    const [editableTotalAmount, setEditableTotalAmount] = useState(totalAmount)
    const [numberOfPayments, setNumberOfPayments] = useState('4')
    const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
    const [startDate, setStartDate] = useState('')

    // Form state for recording payment
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentDate, setPaymentDate] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')

    const createPaymentPlan = useCreatePaymentPlan()
    const recordPayment = useRecordPayment()

    // Update editable total when prop changes
    useEffect(() => {
        setEditableTotalAmount(totalAmount)
    }, [totalAmount])

    // Find existing payment plan when delivery is selected
    useEffect(() => {
        if (selectedDelivery) {
            const plan = paymentPlans.find((p: any) => p.deliveryId === selectedDelivery)
            if (plan) {
                setExistingPlan(plan)
                setPaymentPlanId(plan._id || '')
                setActiveTab('view')
            } else {
                setExistingPlan(null)
                setPaymentPlanId('')
                setActiveTab('create')
            }
        }
    }, [selectedDelivery, paymentPlans])

    const handleCreatePaymentPlan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDelivery || !numberOfPayments) return

        try {
            await createPaymentPlan.mutateAsync({
                deliveryId: selectedDelivery,
                totalAmount: editableTotalAmount,
                numberOfPayments: parseInt(numberOfPayments),
                paymentFrequency,
                startDate: startDate ? new Date(startDate) : new Date(),
            })
            // Reset form
            setEditableTotalAmount(totalAmount)
            setNumberOfPayments('4')
            setPaymentFrequency('weekly')
            setStartDate('')
            // Refresh payment plan view
            setActiveTab('view')
        } catch (error) {
            console.error('Error creating payment plan:', error)
        }
    }

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!paymentPlanId || !paymentAmount) return

        try {
            await recordPayment.mutateAsync({
                planId: paymentPlanId,
                amount: parseFloat(paymentAmount),
                notes: paymentNotes,
            })
            // Reset form
            setPaymentAmount('')
            setPaymentDate('')
            setPaymentNotes('')
            // Refresh payment plan view
            setActiveTab('view')
        } catch (error) {
            console.error('Error recording payment:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                    <h2 className="text-2xl font-bold text-gray-900">
                        💳 Plan de Pagos - {carId}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Delivery Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Selecciona Entrega
                        </label>
                        <select
                            value={selectedDelivery}
                            onChange={(e) => setSelectedDelivery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Selecciona una entrega --</option>
                            {deliveries.map((d: any) => {
                                const customerName = typeof d.customerId === 'object' ? d.customerId?.name : d.customer?.name || 'Sin nombre'
                                const deliveryDate = d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : 'Sin fecha'
                                return (
                                    <option key={d._id} value={d._id}>
                                        {customerName} - {deliveryDate}
                                    </option>
                                )
                            })}
                        </select>
                    </div>

                    {selectedDelivery && (
                        <>
                            {/* Tabs */}
                            <div className="flex gap-2 mb-6 border-b border-gray-200">
                                <button
                                    onClick={() => setActiveTab('view')}
                                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'view'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Ver Plan
                                </button>
                                {!existingPlan && (
                                    <button
                                        onClick={() => setActiveTab('create')}
                                        className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'create'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Crear Plan
                                    </button>
                                )}
                                {existingPlan && (
                                    <button
                                        onClick={() => setActiveTab('record')}
                                        className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'record'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Registrar Pago
                                    </button>
                                )}
                            </div>

                            {/* View Payment Plan */}
                            {activeTab === 'view' && (
                                <div>
                                    {existingPlan ? (
                                        <div className="space-y-4">
                                            {/* Summary */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <p className="text-xs text-blue-600 font-semibold uppercase">Monto Total</p>
                                                    <p className="text-2xl font-bold text-blue-900">${existingPlan.totalAmount?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <p className="text-xs text-green-600 font-semibold uppercase">Pagado</p>
                                                    <p className="text-2xl font-bold text-green-900">${existingPlan.totalPaid?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                    <p className="text-xs text-orange-600 font-semibold uppercase">Restante</p>
                                                    <p className="text-2xl font-bold text-orange-900">${existingPlan.remainingAmount?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <div className={`${existingPlan.status === 'completed' ? 'bg-green-50 border-green-200' :
                                                    existingPlan.hasOverduePayments ? 'bg-red-50 border-red-200' :
                                                        'bg-gray-50 border-gray-200'
                                                    } border rounded-lg p-4`}>
                                                    <p className={`text-xs font-semibold uppercase ${existingPlan.status === 'completed' ? 'text-green-600' :
                                                        existingPlan.hasOverduePayments ? 'text-red-600' :
                                                            'text-gray-600'
                                                        }`}>Estado</p>
                                                    <p className={`text-lg font-bold ${existingPlan.status === 'completed' ? 'text-green-900' :
                                                        existingPlan.hasOverduePayments ? 'text-red-900' :
                                                            'text-gray-900'
                                                        }`}>
                                                        {existingPlan.status === 'completed' ? '✓ Completado' :
                                                            existingPlan.hasOverduePayments ? '⚠ Vencido' :
                                                                existingPlan.status}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Payment Progress */}
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">Progreso de Pagos</p>
                                                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${existingPlan.status === 'completed' ? 'bg-green-500' :
                                                            existingPlan.hasOverduePayments ? 'bg-red-500' :
                                                                'bg-blue-500'
                                                            }`}
                                                        style={{
                                                            width: `${((existingPlan.totalPaid || 0) / (existingPlan.totalAmount || 1)) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {existingPlan.paymentsCompleted || 0} de {existingPlan.numberOfPayments || 0} pagos completados
                                                </p>
                                            </div>

                                            {/* Payment Schedule */}
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">Cronograma de Pagos</p>
                                                <div className="space-y-2">
                                                    {existingPlan.payments?.slice(0, 5).map((payment: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                            <div className="flex items-center gap-2">
                                                                {payment.amountPaid >= payment.amountDue ? (
                                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                                ) : new Date(payment.scheduledDate) < new Date() ? (
                                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                                ) : (
                                                                    <Calendar className="w-5 h-5 text-gray-400" />
                                                                )}
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">Pago {idx + 1}</p>
                                                                    <p className="text-xs text-gray-600">
                                                                        {new Date(payment.scheduledDate).toLocaleDateString('es-MX')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-semibold text-gray-900">${payment.amountDue?.toFixed(2)}</p>
                                                                <p className="text-xs text-gray-600">
                                                                    Pagado: ${payment.amountPaid?.toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-600 font-medium">No hay plan de pagos para esta entrega</p>
                                            <p className="text-sm text-gray-500 mt-1">Crea uno para comenzar a registrar pagos</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Create Payment Plan */}
                            {activeTab === 'create' && !existingPlan && (
                                <form onSubmit={handleCreatePaymentPlan} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Monto Total
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editableTotalAmount}
                                            onChange={(e) => setEditableTotalAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Número de Pagos
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={numberOfPayments}
                                                onChange={(e) => setNumberOfPayments(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Monto por Pago
                                            </label>
                                            <input
                                                type="number"
                                                value={numberOfPayments ? (editableTotalAmount / parseInt(numberOfPayments)).toFixed(2) : '0.00'}
                                                disabled
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Frecuencia de Pagos
                                        </label>
                                        <select
                                            value={paymentFrequency}
                                            onChange={(e) => setPaymentFrequency(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="weekly">Semanal</option>
                                            <option value="biweekly">Quincenal</option>
                                            <option value="monthly">Mensual</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Fecha de Inicio
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab('view')
                                                setEditableTotalAmount(totalAmount)
                                                setNumberOfPayments('4')
                                                setPaymentFrequency('weekly')
                                                setStartDate('')
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createPaymentPlan.isLoading}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                                        >
                                            {createPaymentPlan.isLoading ? 'Creando...' : 'Crear Plan'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Record Payment */}
                            {activeTab === 'record' && existingPlan && (
                                <form onSubmit={handleRecordPayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Monto a Pagar
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            Máximo disponible: ${existingPlan.remainingAmount?.toFixed(2)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Fecha del Pago
                                            </label>
                                            <input
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Notas (Opcional)
                                        </label>
                                        <textarea
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            placeholder="Ref. bancaria, método de pago, etc."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab('view')
                                                setPaymentAmount('')
                                                setPaymentDate('')
                                                setPaymentNotes('')
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={recordPayment.isLoading || !paymentAmount}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
                                        >
                                            {recordPayment.isLoading ? 'Guardando...' : 'Registrar Pago'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PreSalePaymentModal
