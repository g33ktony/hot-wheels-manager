import React, { useState, useEffect } from 'react'
import { useStore } from '@/contexts/StoreContext'
import { useAssignPreSaleUnits, usePreSaleItem } from '@/hooks/usePresale'
import { useDeliveries, useCreateDelivery } from '@/hooks/useDeliveries'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/Loading'
import { AlertCircle, CreditCard, Calendar, UserPlus } from 'lucide-react'

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
    const [createNewDelivery, setCreateNewDelivery] = useState(false)
    const [selectedCustomerId, setSelectedCustomerId] = useState('')
    const [deliveryDate, setDeliveryDate] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Payment plan configuration
    const [enablePaymentPlan, setEnablePaymentPlan] = useState(false)
    const [customPrice, setCustomPrice] = useState(0) // For manual price adjustment
    const [numberOfPayments, setNumberOfPayments] = useState(3)
    const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'monthly'>('weekly')
    const [paymentDayOfWeek, setPaymentDayOfWeek] = useState(5) // Friday = 5
    const [paymentDayOfMonth, setPaymentDayOfMonth] = useState(25)

    // Get selected store
    const { selectedStore } = useStore()

    const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries(undefined, undefined, selectedStore || undefined)
    const { data: customers = [] } = useCustomers(selectedStore || undefined)
    const { data: preSaleItem } = usePreSaleItem(preSaleItemId)
    const assignUnits = useAssignPreSaleUnits()
    const createDelivery = useCreateDelivery()
    const createPaymentPlan = useCreatePaymentPlan()

    // Get the appropriate price based on status
    // When assigning (post-PreSale period), use normalPrice if available, otherwise preSalePrice
    const basePrice = preSaleItem?.normalPrice || preSaleItem?.preSalePrice || pricePerUnit
    const effectivePrice = customPrice > 0 ? customPrice : basePrice

    // Get selected delivery details
    const selectedDelivery = deliveries.find((d: any) => d._id === selectedDeliveryId)
    const customer = customers.find((c: any) => c._id === (createNewDelivery ? selectedCustomerId : selectedDelivery?.customerId))

    // Calculate totals
    const totalAmount = quantity * effectivePrice
    const paymentAmount = enablePaymentPlan && numberOfPayments > 0
        ? totalAmount / numberOfPayments
        : totalAmount

    // Set default delivery date to preSaleItem endDate
    useEffect(() => {
        if (preSaleItem?.endDate && !deliveryDate) {
            setDeliveryDate(new Date(preSaleItem.endDate).toISOString().split('T')[0])
        }
    }, [preSaleItem, deliveryDate])

    useEffect(() => {
        // Reset payment plan when delivery changes
        if (selectedDeliveryId || createNewDelivery) {
            setEnablePaymentPlan(false)
            setCustomPrice(0)
            setNumberOfPayments(3)
            setPaymentFrequency('weekly')
            setPaymentDayOfWeek(5)
            setPaymentDayOfMonth(25)
        }
    }, [selectedDeliveryId, createNewDelivery])

    const handleAssign = async () => {
        // Validate
        const newErrors: Record<string, string> = {}

        if (!createNewDelivery && !selectedDeliveryId) {
            newErrors.delivery = 'Debes seleccionar una entrega o crear una nueva'
        }

        if (createNewDelivery && !selectedCustomerId) {
            newErrors.customer = 'Debes seleccionar un cliente'
        }

        if (createNewDelivery && !deliveryDate) {
            newErrors.deliveryDate = 'Debes especificar una fecha de entrega'
        }

        if (quantity < 1 || quantity > availableQuantity) {
            newErrors.quantity = `La cantidad debe estar entre 1 y ${availableQuantity}`
        }

        if (enablePaymentPlan && numberOfPayments < 2) {
            newErrors.payments = 'Debe haber al menos 2 pagos para un plan de pagos'
        }

        if (enablePaymentPlan && customPrice > 0 && customPrice < 0) {
            newErrors.customPrice = 'El precio debe ser mayor a 0'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            let finalDeliveryId = selectedDeliveryId

            // 1. Create new delivery if needed
            if (createNewDelivery && selectedCustomerId && deliveryDate) {
                const newDelivery = await createDelivery.mutateAsync({
                    customerId: selectedCustomerId,
                    scheduledDate: new Date(deliveryDate),
                    location: 'Por definir', // Placeholder; can be edited later
                    items: [],
                    totalAmount, // Use calculated total so payments have pending balance
                    forPreSale: true // Flag to indicate this is for PreSale items
                })
                finalDeliveryId = newDelivery._id || ''
            }

            // 2. Assign units to delivery
            await assignUnits.mutateAsync({
                id: preSaleItemId,
                deliveryId: finalDeliveryId,
                quantity,
                purchaseId,
            })

            // 3. Create payment plan if enabled
            if (enablePaymentPlan && numberOfPayments > 1 && finalDeliveryId) {
                const startDate = new Date()

                try {
                    await createPaymentPlan.mutateAsync({
                        deliveryId: finalDeliveryId,
                        customerId: createNewDelivery ? selectedCustomerId : selectedDelivery?.customerId,
                        totalAmount,
                        numberOfPayments,
                        paymentFrequency,
                        startDate,
                    })
                    console.log('✅ Payment plan created successfully')
                } catch (paymentError) {
                    console.error('❌ Error creating payment plan:', paymentError)
                    // Don't fail the entire operation, just notify the user
                    alert('⚠️ La pre-venta fue asignada pero hubo un error al crear el plan de pagos. Puedes crearlo manualmente desde la sección de Pagos.')
                }
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

                {/* Delivery Selection or Creation */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <input
                            type="checkbox"
                            id="createNewDelivery"
                            checked={createNewDelivery}
                            onChange={(e) => {
                                setCreateNewDelivery(e.target.checked)
                                setSelectedDeliveryId('')
                                setErrors({ ...errors, delivery: '', customer: '' })
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="createNewDelivery" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <UserPlus className="w-4 h-4" />
                            Crear Nueva Entrega
                        </label>
                    </div>

                    {!createNewDelivery ? (
                        // Select existing delivery
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Entrega Existente
                            </label>
                            <select
                                value={selectedDeliveryId}
                                onChange={(e) => {
                                    setSelectedDeliveryId(e.target.value)
                                    setErrors({ ...errors, delivery: '' })
                                }}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.delivery ? 'border-red-500' : 'border-gray-300'
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
                            {errors.delivery && (
                                <p className="text-sm text-red-500 mt-1">{errors.delivery}</p>
                            )}
                        </div>
                    ) : (
                        // Create new delivery
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cliente
                                </label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => {
                                        setSelectedCustomerId(e.target.value)
                                        setErrors({ ...errors, customer: '' })
                                    }}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customer ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Selecciona un cliente...</option>
                                    {customers.map((cust: any) => (
                                        <option key={cust._id} value={cust._id}>
                                            {cust.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.customer && (
                                    <p className="text-sm text-red-500 mt-1">{errors.customer}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Fecha de Entrega
                                </label>
                                <Input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => {
                                        setDeliveryDate(e.target.value)
                                        setErrors({ ...errors, deliveryDate: '' })
                                    }}
                                    className={errors.deliveryDate ? 'border-red-500' : ''}
                                />
                                {errors.deliveryDate && (
                                    <p className="text-sm text-red-500 mt-1">{errors.deliveryDate}</p>
                                )}
                                {preSaleItem?.endDate && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default: Fin de Pre-Sale ({new Date(preSaleItem.endDate).toLocaleDateString('es-MX')})
                                    </p>
                                )}
                            </div>
                        </div>
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
                {(selectedDeliveryId || createNewDelivery) && (
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
                                Asignar con plan de pagos (a plazos)
                            </label>
                        </div>

                        {enablePaymentPlan && (
                            <>
                                {/* Custom Price */}
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <label className="block text-sm font-medium text-green-800 mb-2">
                                        Precio por Unidad
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <Input
                                                type="number"
                                                value={customPrice || basePrice}
                                                onChange={(e) => {
                                                    const price = parseFloat(e.target.value) || 0
                                                    setCustomPrice(price)
                                                }}
                                                min="0"
                                                step="0.01"
                                                placeholder={basePrice.toFixed(2)}
                                            />
                                        </div>
                                        {customPrice > 0 && customPrice !== basePrice && (
                                            <button
                                                type="button"
                                                onClick={() => setCustomPrice(0)}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Resetear
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-green-700 mt-1">
                                        Precio Base: ${basePrice.toFixed(2)} (precio usado para calcular el plan de pagos)
                                    </p>
                                </div>

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
                                    <div className="grid grid-cols-2 gap-2">
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

                                {/* Payment Day Selection */}
                                {paymentFrequency === 'weekly' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Día de Pago (Semanal)
                                        </label>
                                        <select
                                            value={paymentDayOfWeek}
                                            onChange={(e) => setPaymentDayOfWeek(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={0}>Domingo</option>
                                            <option value={1}>Lunes</option>
                                            <option value={2}>Martes</option>
                                            <option value={3}>Miércoles</option>
                                            <option value={4}>Jueves</option>
                                            <option value={5}>Viernes</option>
                                            <option value={6}>Sábado</option>
                                        </select>
                                    </div>
                                )}

                                {paymentFrequency === 'monthly' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Día del Mes
                                        </label>
                                        <select
                                            value={paymentDayOfMonth}
                                            onChange={(e) => setPaymentDayOfMonth(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                                <option key={day} value={day}>Día {day}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Los pagos se harán el día {paymentDayOfMonth} de cada mes
                                        </p>
                                    </div>
                                )}

                                {/* Payment Preview */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-blue-900 mb-2">Vista Previa del Plan</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Precio por unidad:</span>
                                            <span className="font-bold text-blue-900">${effectivePrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Cantidad:</span>
                                            <span className="font-bold text-blue-900">{quantity}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-blue-300 pt-1">
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
                                                {paymentFrequency === 'weekly'
                                                    ? `Semanal (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][paymentDayOfWeek]})`
                                                    : `Mensual (día ${paymentDayOfMonth})`}
                                            </span>
                                        </div>
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
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Precio unitario:</span>
                            <span className="font-bold text-gray-900">${effectivePrice.toFixed(2)}</span>
                        </div>
                        {enablePaymentPlan && customPrice > 0 && customPrice !== basePrice && (
                            <div className="flex justify-between text-xs">
                                <span className="text-blue-600">Precio personalizado:</span>
                                <span className="font-semibold text-blue-600">Aplicado</span>
                            </div>
                        )}
                        <div className="border-t border-gray-300 pt-2 flex justify-between text-sm">
                            <span className="text-gray-700 font-medium">Monto Total:</span>
                            <span className="font-bold text-blue-600 text-lg">${totalAmount.toFixed(2)}</span>
                        </div>
                        {enablePaymentPlan && (
                            <div className="flex justify-between text-xs text-green-600">
                                <span>Plan de pagos:</span>
                                <span className="font-semibold">{numberOfPayments} pagos de ${paymentAmount.toFixed(2)}</span>
                            </div>
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
                        disabled={assignUnits.isLoading || createPaymentPlan.isLoading || createDelivery.isLoading || deliveriesLoading}
                        className="flex-1"
                    >
                        {(assignUnits.isLoading || createPaymentPlan.isLoading || createDelivery.isLoading) ? (
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                {createDelivery.isLoading ? 'Creando entrega...' :
                                    createPaymentPlan.isLoading ? 'Creando plan...' : 'Asignando...'}
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
