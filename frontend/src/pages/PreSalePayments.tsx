import { useState } from 'react'
import { usePaymentPlans, useRecordPayment } from '@/hooks/usePaymentPlans'
import { useCustomers } from '@/hooks/useCustomers'
import { useDeliveries } from '@/hooks/useDeliveries'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import { DollarSign, Calendar, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'

export default function PreSalePayments() {
    const { data: paymentPlans, isLoading } = usePaymentPlans()
    const { data: customers } = useCustomers()
    const { data: allDeliveries } = useDeliveries()
    const recordPaymentMutation = useRecordPayment()
    // const updateStatusMutation = useUpdatePaymentPlanStatus() // Future use

    // Filter deliveries to only show those related to payment plans
    const deliveries = allDeliveries?.filter(delivery => {
        // Check if this delivery has an associated payment plan
        return paymentPlans?.some(plan => plan.deliveryId === delivery._id)
    })

    const [selectedPlan, setSelectedPlan] = useState<any>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)

    const handleRecordPayment = async () => {
        if (!selectedPlan || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            alert('Por favor ingresa un monto válido')
            return
        }

        try {
            await recordPaymentMutation.mutateAsync({
                planId: selectedPlan._id,
                amount: parseFloat(paymentAmount),
                notes: paymentNotes || undefined
            })
            setPaymentAmount('')
            setPaymentNotes('')
            setShowPaymentModal(false)
            setSelectedPlan(null)
            alert('✅ Pago registrado exitosamente')
        } catch (error) {
            console.error('Error recording payment:', error)
            alert('❌ Error al registrar el pago')
        }
    }

    const getCustomerName = (customerId: string | undefined) => {
        if (!customerId) return 'Cliente desconocido'
        const customer = customers?.find(c => c._id === customerId)
        return customer?.name || 'Cliente desconocido'
    }

    const getDeliveryInfo = (deliveryId: string) => {
        return deliveries?.find(d => d._id === deliveryId)
    }

    const getFrequencyLabel = (freq: string) => {
        const labels: Record<string, string> = {
            weekly: 'Semanal',
            biweekly: 'Quincenal',
            monthly: 'Mensual'
        }
        return labels[freq] || freq
    }

    const getStatusBadge = (plan: any) => {
        if (plan.status === 'completed') {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Completado</span>
        }
        if (plan.hasOverduePayments) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">⚠ Atrasado</span>
        }
        if (plan.status === 'in-progress') {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">▶ En progreso</span>
        }
        if (plan.status === 'paused') {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏸ Pausado</span>
        }
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-gray-800">○ Pendiente</span>
    }

    // Filter active plans (not completed or cancelled)
    const activePlans = paymentPlans?.filter(p => p.status !== 'completed' && p.status !== 'cancelled') || []
    const completedPlans = paymentPlans?.filter(p => p.status === 'completed') || []

    // Calculate totals
    const totalOwed = activePlans.reduce((sum, p) => sum + p.remainingAmount, 0)
    // const totalOverdue = activePlans.reduce((sum, p) => sum + (p.overdueAmount || 0), 0) // Future use
    const plansOverdue = activePlans.filter(p => p.hasOverduePayments).length

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando pagos de preventa...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pagos de Preventa</h1>
                    <p className="text-slate-400 mt-1">Gestiona los planes de pago para entregas con items de preventa</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Planes Activos</p>
                            <p className="text-2xl font-bold">{activePlans.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <TrendingUp className="text-orange-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total Por Cobrar</p>
                            <p className="text-2xl font-bold">${totalOwed.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Pagos Atrasados</p>
                            <p className="text-2xl font-bold">{plansOverdue}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Completados</p>
                            <p className="text-2xl font-bold">{completedPlans.length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Active Payment Plans */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-4">Planes de Pago Activos</h2>

                    {activePlans.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No hay planes de pago activos</h3>
                            <p className="text-slate-400">Los planes de pago se crean automáticamente al crear entregas con items de preventa</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {activePlans.map(plan => {
                                const delivery = getDeliveryInfo(plan.deliveryId)
                                const progressPercent = (plan.totalPaid / plan.totalAmount) * 100

                                return (
                                    <div key={plan._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg">
                                                    {getCustomerName(plan.customerId)}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                                    <Calendar size={14} />
                                                    <span>Entrega: {delivery?.scheduledDate
                                                        ? new Date(delivery.scheduledDate).toLocaleDateString()
                                                        : 'Sin fecha'}
                                                    </span>
                                                </div>
                                            </div>
                                            {getStatusBadge(plan)}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-400">Progreso</span>
                                                <span className="font-medium">{progressPercent.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all ${plan.hasOverduePayments ? 'bg-red-600' : 'bg-blue-600'
                                                        }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Amounts */}
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs text-slate-400">Total</p>
                                                <p className="font-bold text-white">${plan.totalAmount.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Pagado</p>
                                                <p className="font-bold text-green-600">${plan.totalPaid.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Restante</p>
                                                <p className="font-bold text-orange-600">${plan.remainingAmount.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Payment Info */}
                                        <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-slate-400">Por pago:</span>
                                                    <span className="ml-2 font-medium">${plan.amountPerPayment.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Frecuencia:</span>
                                                    <span className="ml-2 font-medium">{getFrequencyLabel(plan.paymentFrequency)}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-400">Progreso:</span>
                                                    <span className="ml-2 font-medium">
                                                        {plan.paymentsCompleted} de {plan.numberOfPayments} pagos
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Overdue Warning */}
                                        {plan.hasOverduePayments && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                                <div className="flex items-center gap-2 text-red-800 text-sm">
                                                    <AlertTriangle size={16} />
                                                    <span className="font-medium">
                                                        Atrasado: ${plan.overdueAmount.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    setSelectedPlan(plan)
                                                    setShowPaymentModal(true)
                                                }}
                                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                                size="sm"
                                            >
                                                💰 Registrar Pago
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedPlan(plan)
                                                    setShowDetailsModal(true)
                                                }}
                                                variant="secondary"
                                                size="sm"
                                            >
                                                Ver Detalles
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Completed Plans Section */}
            {completedPlans.length > 0 && (
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-bold mb-4">Planes Completados</h2>
                        <div className="space-y-3">
                            {completedPlans.map(plan => (
                                <div key={plan._id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div>
                                        <p className="font-medium">{getCustomerName(plan.customerId)}</p>
                                        <p className="text-sm text-slate-400">
                                            ${plan.totalAmount.toFixed(2)} - Completado el {plan.actualCompletionDate
                                                ? new Date(plan.actualCompletionDate).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <CheckCircle className="text-green-600" size={24} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Record Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false)
                    setSelectedPlan(null)
                    setPaymentAmount('')
                    setPaymentNotes('')
                }}
                title="Registrar Pago"
                maxWidth="md"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowPaymentModal(false)
                                setSelectedPlan(null)
                                setPaymentAmount('')
                                setPaymentNotes('')
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRecordPayment}
                            disabled={!paymentAmount || recordPaymentMutation.isLoading}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {recordPaymentMutation.isLoading ? 'Guardando...' : 'Confirmar Pago'}
                        </Button>
                    </div>
                }
            >
                {selectedPlan && (
                    <div className="space-y-4">
                        {/* Plan Info */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="font-medium">{getCustomerName(selectedPlan.customerId)}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <div>
                                    <span className="text-slate-400">Restante:</span>
                                    <span className="ml-2 font-bold text-orange-600">
                                        ${selectedPlan.remainingAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Sugerido:</span>
                                    <span className="ml-2 font-medium">
                                        ${selectedPlan.amountPerPayment.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto del Pago *
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder={`Ej: ${selectedPlan.amountPerPayment.toFixed(2)}`}
                                className="w-full"
                            />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPaymentAmount(selectedPlan.amountPerPayment.toFixed(2))}
                                className="flex-1"
                            >
                                Pago Sugerido
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPaymentAmount(selectedPlan.remainingAmount.toFixed(2))}
                                className="flex-1"
                            >
                                Pagar Todo
                            </Button>
                        </div>

                        {/* Notes Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas (opcional)
                            </label>
                            <textarea
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                className="input w-full h-20 resize-none"
                                placeholder="Ej: Pago en efectivo, Transferencia bancaria, etc."
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false)
                    setSelectedPlan(null)
                }}
                title="Detalles del Plan de Pagos"
                maxWidth="2xl"
            >
                {selectedPlan && (
                    <div className="space-y-6">
                        {/* Plan Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-400">Cliente</p>
                                <p className="font-medium">{getCustomerName(selectedPlan.customerId)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Estado</p>
                                {getStatusBadge(selectedPlan)}
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Monto Total</p>
                                <p className="font-medium">${selectedPlan.totalAmount.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Pagado</p>
                                <p className="font-medium text-green-600">${selectedPlan.totalPaid.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Frecuencia</p>
                                <p className="font-medium">{getFrequencyLabel(selectedPlan.paymentFrequency)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Número de Pagos</p>
                                <p className="font-medium">{selectedPlan.numberOfPayments}</p>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div>
                            <h3 className="font-medium mb-3">Historial de Pagos</h3>
                            {selectedPlan.payments && selectedPlan.payments.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedPlan.payments.map((payment: any, index: number) => (
                                        <div key={payment.paymentId} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">Pago #{index + 1}</p>
                                                <p className="text-sm text-slate-400">
                                                    {payment.actualDate
                                                        ? new Date(payment.actualDate).toLocaleDateString()
                                                        : `Programado: ${new Date(payment.scheduledDate).toLocaleDateString()}`}
                                                </p>
                                                {payment.notes && (
                                                    <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">${payment.amountPaid.toFixed(2)}</p>
                                                {payment.amountPaid >= payment.amountDue ? (
                                                    <span className="text-xs text-green-600">✓ Pagado</span>
                                                ) : payment.isOverdue ? (
                                                    <span className="text-xs text-red-600">⚠ Atrasado</span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">○ Pendiente</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No hay pagos registrados aún</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
