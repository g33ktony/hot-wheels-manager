import React, { useState, useEffect } from 'react'
import { useAssignPreSaleUnits } from '@/hooks/usePresale'
import { useDeliveries } from '@/hooks/useDeliveries'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/Loading'
import { AlertCircle, CreditCard, DollarSign } from 'lucide-react'

interface PreSaleAssignmentModalProps {
    isOpen: boolean
    onClose: () => void
    preSaleItemId: string
    availableQuantity: number
    carId: string
    purchaseId: string
    pricePerUnit?: number
}

const PreSaleAssignmentModal: React.FC<PreSaleAssignmentModalProps> = ({
    isOpen,
    onClose,
    preSaleItemId,
    availableQuantity,
    carId,
    purchaseId,
    pricePerUnit = 0,
}) => {
    const [quantity, setQuantity] = useState(1)
    const [selectedDeliveryId, setSelectedDeliveryId] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Payment plan configuration
    const [enablePaymentPlan, setEnablePaymentPlan] = useState(false)
    const [numberOfPayments, setNumberOfPayments] = useState(3)
    const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('biweekly')
    const [earlyPaymentBonus, setEarlyPaymentBonus] = useState(0)

    const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries()
    const { data: customers = [] } = useCustomers()
    const assignUnits = useAssignPreSaleUnits()
    const createPaymentPlan = useCreatePaymentPlan()

    // Get selected delivery details
    const selectedDelivery = deliveries.find((d: any) => d._id === selectedDeliveryId)
    const customer = customers.find((c: any) => c._id === selectedDelivery?.customerId)

    // Calculate totals
    const totalAmount = quantity * pricePerUnit
    const paymentAmount = enablePaymentPlan && numberOfPayments > 0
        ? totalAmount / numberOfPayments
        : totalAmount

    useEffect(() => {
        // Reset payment plan when delivery changes
        if (selectedDeliveryId) {
            setEnablePaymentPlan(false)
            setNumberOfPayments(3)
            setPaymentFrequency('biweekly')
            setEarlyPaymentBonus(0)
        }
    }, [selectedDeliveryId])

    const handleAssign = async () => {
        // Validate
        const newErrors: Record<string, string> = {}

        if (!selectedDeliveryId) {
            newErrors.delivery = 'Debes seleccionar una entrega'
        }

        if (quantity < 1 || quantity > availableQuantity) {
            newErrors.quantity = `La cantidad debe estar entre 1 y ${availableQuantity}`
        }

        if (enablePaymentPlan && numberOfPayments < 2) {
            newErrors.payments = 'Debe haber al menos 2 pagos para un plan de pagos'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            // 1. Assign units to delivery
            await assignUnits.mutateAsync({
                id: preSaleItemId,
                deliveryId: selectedDeliveryId,
                quantity,
                purchaseId,
            })

            // 2. Create payment plan if enabled and multiple payments
            if (enablePaymentPlan && numberOfPayments > 1 && selectedDelivery) {
                await createPaymentPlan.mutateAsync({
                    deliveryId: selectedDeliveryId,
                    customerId: selectedDelivery.customerId,
                    totalAmount,
                    numberOfPayments,
                    paymentFrequency,
                    startDate: new Date(),
                    earlyPaymentBonus: earlyPaymentBonus > 0 ? earlyPaymentBonus : undefined,
                })
            }

            onClose()
        } catch (error) {
            console.error('Error al asignar unidades o crear plan de pagos:', error)
            setErrors({ submit: 'Error al procesar la asignación' })
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Asignar Unidades - ${carId}`}
        >
            <div className="space-y-4">
                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">Disponible para asignar</p>
                        <p className="text-lg font-bold text-blue-600">{availableQuantity} unidades</p>
                    </div>
                </div>

                {/* Delivery Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entrega
                    </label>
                    <select
                        value={selectedDeliveryId}
                        onChange={(e) => {
                            setSelectedDeliveryId(e.target.value)
                            setErrors({ ...errors, deliveryId: '' })
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryId ? 'border-red-500' : 'border-gray-300'
                            }`}
                    >
                        <option value="">Selecciona una entrega...</option>
                        {deliveries.map((delivery: any) => {
                            const deliveryCustomer = customers.find((c: any) => c._id === delivery.customerId)
                            const customerName = deliveryCustomer?.name || 'Sin cliente'
                            const dateStr = delivery.scheduledDate
                                ? new Date(delivery.scheduledDate).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })
                                : 'Sin fecha'
                            const location = delivery.location || ''

                            return (
                                <option key={delivery._id} value={delivery._id}>
                                    {customerName} - {dateStr} {location && `- ${location}`}
                                </option>
                            )
                        })}
                    </select>
                    {errors.deliveryId && (
                        <p className="text-sm text-red-500 mt-1">{errors.deliveryId}</p>
                    )}
                </div>

                {/* Delivery Details (shown when a delivery is selected) */}
                {selectedDelivery && customer && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Información de Entrega</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Cliente:</span>
                                <span className="font-medium text-gray-900">{customer.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Fecha:</span>
                                <span className="font-medium text-gray-900">
                                    {selectedDelivery.scheduledDate
                                        ? new Date(selectedDelivery.scheduledDate).toLocaleDateString('es-MX', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'Sin fecha'}
                                </span>
                            </div>
                            {selectedDelivery.location && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Ubicación:</span>
                                    <span className="font-medium text-gray-900">{selectedDelivery.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Quantity Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad a Asignar
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            −
                        </button>
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                                const val = Math.max(1, Math.min(availableQuantity, parseInt(e.target.value) || 1))
                                setQuantity(val)
                                setErrors({ ...errors, quantity: '' })
                            }}
                            min="1"
                            max={availableQuantity}
                            className="text-center flex-1"
                        />
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            +
                        </button>
                    </div>
                    {errors.quantity && (
                        <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
                    )}
                </div>

                {/* Payment Plan Configuration */}
                {selectedDeliveryId && (
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-800">Plan de Pagos</h4>
                        </div>

                        {/* Enable Payment Plan Toggle */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="enablePaymentPlan"
                                checked={enablePaymentPlan}
                                onChange={(e) => setEnablePaymentPlan(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="enablePaymentPlan" className="text-sm font-medium text-gray-700">
                                Crear plan de pagos (pagos en parcialidades)
                            </label>
                        </div>

                        {enablePaymentPlan && (
                            <>
                                {/* Number of Payments */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de Pagos
                                    </label>
                                    <select
                                        value={numberOfPayments}
                                        onChange={(e) => setNumberOfPayments(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                            <option key={num} value={num}>{num} pagos</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Frequency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Periodicidad
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFrequency('weekly')}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${paymentFrequency === 'weekly'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Semanal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFrequency('biweekly')}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${paymentFrequency === 'biweekly'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Quincenal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFrequency('monthly')}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${paymentFrequency === 'monthly'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Mensual
                                        </button>
                                    </div>
                                </div>

                                {/* Early Payment Bonus */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bonificación por Pronto Pago (opcional)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="number"
                                            value={earlyPaymentBonus}
                                            onChange={(e) => setEarlyPaymentBonus(parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="10"
                                            className="pl-9"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Payment Preview */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-blue-900 mb-2">Vista Previa del Plan</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Monto total:</span>
                                            <span className="font-bold text-blue-900">${totalAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Número de pagos:</span>
                                            <span className="font-bold text-blue-900">{numberOfPayments}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Monto por pago:</span>
                                            <span className="font-bold text-blue-900">${paymentAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Frecuencia:</span>
                                            <span className="font-bold text-blue-900">
                                                {paymentFrequency === 'weekly' ? 'Semanal' :
                                                    paymentFrequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                            </span>
                                        </div>
                                        {earlyPaymentBonus > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">Bonificación:</span>
                                                <span className="font-bold text-green-600">${earlyPaymentBonus.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {errors.payments && (
                            <p className="text-sm text-red-500">{errors.payments}</p>
                        )}
                    </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Resumen de asignación</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Auto a asignar:</span>
                            <span className="font-bold text-gray-900">{carId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Unidades:</span>
                            <span className="font-bold text-gray-900">{quantity}</span>
                        </div>
                        {pricePerUnit > 0 && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Precio unitario:</span>
                                    <span className="font-bold text-gray-900">${pricePerUnit.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-300 pt-2 flex justify-between text-sm">
                                    <span className="text-gray-700 font-medium">Monto Total:</span>
                                    <span className="font-bold text-blue-600 text-lg">${totalAmount.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                        Cancelar
                    </button>
                    <Button
                        onClick={handleAssign}
                        disabled={assignUnits.isLoading || createPaymentPlan.isLoading || deliveriesLoading}
                        className="flex-1"
                    >
                        {(assignUnits.isLoading || createPaymentPlan.isLoading) ? (
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                {createPaymentPlan.isLoading ? 'Creando plan...' : 'Asignando...'}
                            </div>
                        ) : (
                            'Asignar Unidades'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

export default PreSaleAssignmentModal
