import React, { useState } from 'react'
import { X, Package, CheckCircle, Edit, User, Share2, DollarSign, Trash2 } from 'lucide-react'
import Button from './common/Button'
import DeliveryEditForm from './DeliveryEditForm'
import { deliveriesService } from '../services/deliveries'
import type { CreateDeliveryDto, Delivery, InventoryItem, Payment } from '@shared/types'
import type { PreSaleItem } from '@/services/presale'

type PaymentStatus = 'paid' | 'pending' | 'partial'

type InventoryRef = { _id?: string; purchasePrice?: number; photos?: string[] }

interface DeliveryDetailsItem {
    inventoryItemId?: string | InventoryRef
    hotWheelsCarId?: string | { _id?: string }
    carId: string
    carName: string
    quantity: number
    unitPrice: number
    photos?: string[]
    basePricePerUnit?: number
}

interface DeliveryDetailsModalProps {
    delivery: Delivery | null
    isOpen: boolean
    onClose: () => void
    onMarkAsPrepared?: (id: string) => void
    onMarkAsCompleted?: (id: string, paymentStatus?: PaymentStatus) => void
    onEdit?: (delivery: Delivery) => void
    onViewCustomer?: (customerId: string) => void
    onShareReport?: () => void
    onRegisterPayment?: () => void
    onDeletePayment?: (paymentId: string) => void
    onDelete?: (id: string) => void
    onOpenImageModal?: (photos: string[]) => void
    inventoryItems?: InventoryItem[]
    preSaleItems?: PreSaleItem[]
    markPreparedLoading?: boolean
    markCompletedLoading?: boolean
    readonly?: boolean
}

export const DeliveryDetailsModal: React.FC<DeliveryDetailsModalProps> = ({
    delivery,
    isOpen,
    onClose,
    onMarkAsPrepared,
    onMarkAsCompleted,
    onEdit,
    onViewCustomer,
    onShareReport,
    onRegisterPayment,
    onDeletePayment,
    onDelete,
    onOpenImageModal,
    inventoryItems = [],
    preSaleItems = [],
    markPreparedLoading = false,
    markCompletedLoading = false,
    readonly = false,
}) => {
    const [isEditingDelivery, setIsEditingDelivery] = useState(false)
    const [showPaymentStatusDialog, setShowPaymentStatusDialog] = useState(false)
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>('pending')

    if (!isOpen || !delivery) return null

    // Helper function to safely format dates
    const formatDate = (dateValue: unknown): string => {
        try {
            const date = typeof dateValue === 'string'
                ? new Date(dateValue)
                : dateValue instanceof Date
                    ? dateValue
                    : new Date()

            if (isNaN(date.getTime())) {
                return 'Fecha inválida'
            }
            return date.toLocaleDateString('es-MX')
        } catch (e) {
            return 'Fecha inválida'
        }
    }

    const formatDateTime = (dateValue: unknown): string => {
        try {
            const date = typeof dateValue === 'string'
                ? new Date(dateValue)
                : dateValue instanceof Date
                    ? dateValue
                    : new Date()

            if (isNaN(date.getTime())) {
                return 'Fecha inválida'
            }
            return `${date.toLocaleDateString('es-MX')} ${date.toLocaleTimeString('es-MX')}`
        } catch (e) {
            return 'Fecha inválida'
        }
    }

    // Check if delivery is active (not completed)
    const isDeliveryActive = delivery.status !== 'completed'

    const handleSaveDelivery = async (updatedDelivery: unknown) => {
        try {
            if (!delivery._id) {
                throw new Error('Delivery ID is required')
            }
            await deliveriesService.update(delivery._id, updatedDelivery as Partial<CreateDeliveryDto>)
            setIsEditingDelivery(false)
            // Optionally refresh or call a callback
            if (onEdit) {
                onEdit(updatedDelivery as Delivery)
            }
            onClose()
        } catch (error) {
            console.error('Error saving delivery:', error)
            throw error
        }
    }

    const handleMarkAsCompletedClick = () => {
        if (confirm('¿Marcar esta entrega como completada?')) {
            setShowPaymentStatusDialog(true)
        }
    }

    const handleConfirmPaymentStatus = () => {
        if (onMarkAsCompleted && delivery._id) {
            onMarkAsCompleted(delivery._id, selectedPaymentStatus)
            onClose()
        }
        setShowPaymentStatusDialog(false)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditingDelivery ? 'Editar Entrega' : 'Detalles de Entrega'}
                    </h2>
                    <button
                        onClick={() => isEditingDelivery ? setIsEditingDelivery(false) : onClose()}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isEditingDelivery ? (
                    <div className="p-6">
                        <DeliveryEditForm
                            delivery={delivery}
                            onCancel={() => setIsEditingDelivery(false)}
                            onSave={handleSaveDelivery}
                        />
                    </div>
                ) : (
                    <>
                        {/* Action Buttons - Hide when readonly */}
                        {!readonly && (
                            <div className="px-6 py-4 bg-gray-50 border-b">
                                <div className="flex flex-wrap gap-2">
                                    {delivery.status === 'scheduled' && onMarkAsPrepared && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (!delivery._id) return
                                                onMarkAsPrepared(delivery._id)
                                                onClose()
                                            }}
                                            disabled={markPreparedLoading}
                                            className="flex items-center gap-2"
                                        >
                                            <Package size={16} />
                                            <span>Marcar como Preparada</span>
                                        </Button>
                                    )}
                                    {delivery.status === 'prepared' && onMarkAsCompleted && (
                                        <Button
                                            size="sm"
                                            onClick={handleMarkAsCompletedClick}
                                            disabled={markCompletedLoading}
                                            variant="success"
                                            className="flex items-center gap-2"
                                        >
                                            <CheckCircle size={16} />
                                            <span>Marcar como Completada</span>
                                        </Button>
                                    )}
                                    {isDeliveryActive && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setIsEditingDelivery(true)}
                                            className="flex items-center gap-2"
                                        >
                                            <Edit size={16} />
                                            <span>Editar</span>
                                        </Button>
                                    )}
                                    {onViewCustomer && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                const rawCustomerId = (delivery as { customerId?: unknown }).customerId
                                                let customerId: string | undefined

                                                if (typeof rawCustomerId === 'string') {
                                                    customerId = rawCustomerId
                                                } else if (
                                                    rawCustomerId &&
                                                    typeof rawCustomerId === 'object' &&
                                                    '_id' in rawCustomerId &&
                                                    typeof (rawCustomerId as { _id?: unknown })._id === 'string'
                                                ) {
                                                    customerId = (rawCustomerId as { _id: string })._id
                                                }

                                                if (customerId) {
                                                    onViewCustomer(customerId)
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <User size={16} />
                                            <span>Ver Perfil del Cliente</span>
                                        </Button>
                                    )}
                                    {onShareReport && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={onShareReport}
                                            className="flex items-center gap-2"
                                        >
                                            <Share2 size={16} />
                                            <span>Compartir Reporte</span>
                                        </Button>
                                    )}
                                    {onDelete && delivery.status === 'completed' && (
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => {
                                                if (!delivery._id) return
                                                if (confirm('⚠️ ¿Estás seguro de que quieres eliminar esta entrega completada? Se restaurarán todos los items al inventario.')) {
                                                    onDelete(delivery._id)
                                                    onClose()
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            <span>Eliminar</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-6">
                            {/* Delivery Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Información General</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Cliente:</span> {delivery.customer?.name}</p>
                                        <p><span className="font-medium">Email:</span> {delivery.customer?.email}</p>
                                        <p><span className="font-medium">Teléfono:</span> {delivery.customer?.phone}</p>
                                        <p><span className="font-medium">Fecha programada:</span> {formatDate(delivery.scheduledDate)}{delivery.scheduledTime ? ` a las ${delivery.scheduledTime}` : ''}</p>
                                        <p><span className="font-medium">Ubicación:</span> {delivery.location}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${delivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                delivery.status === 'prepared' ? 'bg-orange-100 text-orange-800' :
                                                    delivery.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {delivery.status === 'completed' ? 'Completada' :
                                                    delivery.status === 'prepared' ? 'Preparada' :
                                                        delivery.status === 'scheduled' ? 'Programada' : 'Pendiente'}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Resumen Financiero</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Total venta:</span> ${delivery.totalAmount?.toFixed(2)}</p>
                                        {(() => {
                                            let totalCost = 0
                                            let itemsWithCost = 0
                                            let itemsWithoutCost = 0
                                            delivery.items?.forEach((item: DeliveryDetailsItem) => {
                                                if (item.inventoryItemId) {
                                                    let inventoryItem: InventoryItem | InventoryRef | undefined
                                                    let isPresaleItem = false
                                                    let preSaleItemData: PreSaleItem | undefined

                                                    if (typeof item.inventoryItemId === 'string') {
                                                        if (item.inventoryItemId.startsWith('presale_')) {
                                                            isPresaleItem = true
                                                            const preSaleId = item.inventoryItemId.replace('presale_', '')
                                                            preSaleItemData = preSaleItems?.find(ps => ps._id === preSaleId)
                                                        } else {
                                                            inventoryItem = inventoryItems?.find((inv) => inv._id === item.inventoryItemId)
                                                        }
                                                    } else {
                                                        inventoryItem = item.inventoryItemId
                                                    }

                                                    const cost = isPresaleItem
                                                        ? (preSaleItemData?.basePricePerUnit || item.basePricePerUnit || 0)
                                                        : (inventoryItem && typeof inventoryItem.purchasePrice === 'number' && inventoryItem.purchasePrice > 0 ? inventoryItem.purchasePrice : 0)

                                                    if (cost > 0) {
                                                        totalCost += cost * item.quantity
                                                        itemsWithCost++
                                                    } else {
                                                        itemsWithoutCost++
                                                    }
                                                } else if (item.hotWheelsCarId) {
                                                    itemsWithoutCost++
                                                } else {
                                                    itemsWithoutCost++
                                                }
                                            })
                                            const profit = delivery.totalAmount - totalCost
                                            return (
                                                <>
                                                    <p><span className="font-medium">Costo total:</span> ${totalCost.toFixed(2)} {itemsWithoutCost > 0 && <span className="text-xs text-gray-500">({itemsWithCost} con costo, {itemsWithoutCost} sin costo)</span>}</p>
                                                    <p><span className="font-medium">Ganancia potencial:</span>
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            ${profit.toFixed(2)}
                                                        </span>
                                                    </p>
                                                    <p><span className="font-medium">Margen:</span>
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </p>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>

                                {/* Payment Status */}
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Estado de Pago</h3>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <span className="font-medium">Total:</span> ${delivery.totalAmount?.toFixed(2)}
                                        </p>
                                        <p>
                                            <span className="font-medium">Pagado:</span>
                                            <span className="text-green-600 ml-2">
                                                ${(delivery.paidAmount || 0).toFixed(2)}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-medium">Pendiente:</span>
                                            <span className="text-orange-600 ml-2">
                                                ${(delivery.totalAmount - (delivery.paidAmount || 0)).toFixed(2)}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-medium">Estado:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${(delivery.paymentStatus || 'pending') === 'paid' ? 'bg-green-100 text-green-800' :
                                                (delivery.paymentStatus || 'pending') === 'partial' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {(delivery.paymentStatus || 'pending') === 'paid' ? 'Pagado' :
                                                    (delivery.paymentStatus || 'pending') === 'partial' ? 'Parcial' : 'Pendiente'}
                                            </span>
                                        </p>
                                        {(delivery.paymentStatus || 'pending') !== 'paid' && onRegisterPayment && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="w-full mt-3"
                                                onClick={onRegisterPayment}
                                            >
                                                <DollarSign size={16} className="mr-2" />
                                                Registrar Pago
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            {delivery.payments && delivery.payments.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-medium text-gray-900 mb-3">Historial de Pagos</h3>
                                    <div className="space-y-2">
                                        {delivery.payments.map((payment: Payment) => (
                                            <div key={payment._id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-gray-900">
                                                            ${payment.amount.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                            {payment.paymentMethod === 'cash' ? 'Efectivo' :
                                                                payment.paymentMethod === 'transfer' ? 'Transferencia' :
                                                                    payment.paymentMethod === 'card' ? 'Tarjeta' : 'Otro'}
                                                        </span>
                                                        <span className="text-sm text-gray-600">
                                                            {formatDateTime(payment.paymentDate)}
                                                        </span>
                                                    </div>
                                                    {payment.notes && (
                                                        <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                                                    )}
                                                </div>
                                                {onDeletePayment && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={() => payment._id && onDeletePayment(payment._id)}
                                                        className="ml-3"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items List */}
                            <div>
                                <h3 className="font-medium text-gray-900 mb-4">Piezas en la Entrega</h3>
                                <div className="space-y-4">
                                    {delivery.items?.map((item: DeliveryDetailsItem, index: number) => {
                                        let inventoryItem: InventoryItem | InventoryRef | null | undefined
                                        let isPresaleItem = false
                                        let preSaleItemData: PreSaleItem | undefined

                                        if (typeof item.inventoryItemId === 'string') {
                                            if (item.inventoryItemId.startsWith('presale_')) {
                                                isPresaleItem = true
                                                const preSaleId = item.inventoryItemId.replace('presale_', '')
                                                preSaleItemData = preSaleItems?.find(ps => ps._id === preSaleId)
                                                inventoryItem = null
                                            } else {
                                                inventoryItem = inventoryItems?.find((inv) => inv._id === item.inventoryItemId)
                                            }
                                        } else if (typeof item.inventoryItemId === 'object' && item.inventoryItemId) {
                                            inventoryItem = item.inventoryItemId
                                        }

                                        const cost = isPresaleItem
                                            ? (preSaleItemData?.basePricePerUnit || item.basePricePerUnit || 0)
                                            : (inventoryItem && typeof inventoryItem.purchasePrice === 'number' && inventoryItem.purchasePrice > 0 ? inventoryItem.purchasePrice : 0)
                                        const profit = item.unitPrice - cost
                                        const itemPhotos = item.photos || inventoryItem?.photos || []

                                        return (
                                            <div key={index} className="border rounded-lg overflow-hidden">
                                                {/* Item Photos */}
                                                {itemPhotos.length > 0 && (
                                                    <div className="bg-gray-100 p-3 border-b">
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                            {itemPhotos.slice(0, 6).map((photo: string, photoIdx: number) => (
                                                                <div
                                                                    key={photoIdx}
                                                                    className="aspect-square rounded overflow-hidden bg-gray-200 border border-gray-300 hover:shadow-md transition-shadow cursor-pointer"
                                                                    onClick={() => onOpenImageModal && onOpenImageModal(itemPhotos)}
                                                                >
                                                                    <img
                                                                        src={photo}
                                                                        alt={`${item.carName} - Foto ${photoIdx + 1}`}
                                                                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).style.display = 'none'
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Item Info */}
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-medium text-gray-900">{item.carName || item.carId}</h4>
                                                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">Qty: {item.quantity}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Costo:</span>
                                                            <span className="ml-2 font-medium">${cost.toFixed(2)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Venta:</span>
                                                            <span className="ml-2 font-medium text-green-600">${item.unitPrice.toFixed(2)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Ganancia:</span>
                                                            <span className={`ml-2 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ${profit.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {delivery.notes && (
                                <div className="mt-6">
                                    <h3 className="font-medium text-gray-900 mb-2">Notas</h3>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{delivery.notes}</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Payment Status Dialog */}
                {showPaymentStatusDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                💳 Estado de Pago al Entregar
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                ¿Cuál es el estado de pago de esta entrega?
                            </p>

                            <div className="space-y-3 mb-6">
                                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                                    style={{
                                        borderColor: selectedPaymentStatus === 'paid' ? '#10b981' : '#e5e7eb',
                                        backgroundColor: selectedPaymentStatus === 'paid' ? '#f0fdf4' : '#ffffff'
                                    }}>
                                    <input
                                        type="radio"
                                        name="paymentStatus"
                                        value="paid"
                                        checked={selectedPaymentStatus === 'paid'}
                                        onChange={() => setSelectedPaymentStatus('paid')}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <div className="ml-3">
                                        <span className="font-medium text-gray-900">✅ Pagado</span>
                                        <p className="text-xs text-gray-600">Se cobrará el total y se creará la venta</p>
                                    </div>
                                </label>

                                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                                    style={{
                                        borderColor: selectedPaymentStatus === 'pending' ? '#ef4444' : '#e5e7eb',
                                        backgroundColor: selectedPaymentStatus === 'pending' ? '#fef2f2' : '#ffffff'
                                    }}>
                                    <input
                                        type="radio"
                                        name="paymentStatus"
                                        value="pending"
                                        checked={selectedPaymentStatus === 'pending'}
                                        onChange={() => setSelectedPaymentStatus('pending')}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <div className="ml-3">
                                        <span className="font-medium text-gray-900">❌ No pagado</span>
                                        <p className="text-xs text-gray-600">Pendiente cobro. No se creará venta</p>
                                    </div>
                                </label>

                                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                                    style={{
                                        borderColor: selectedPaymentStatus === 'partial' ? '#f59e0b' : '#e5e7eb',
                                        backgroundColor: selectedPaymentStatus === 'partial' ? '#fffbeb' : '#ffffff'
                                    }}>
                                    <input
                                        type="radio"
                                        name="paymentStatus"
                                        value="partial"
                                        checked={selectedPaymentStatus === 'partial'}
                                        onChange={() => setSelectedPaymentStatus('partial')}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <div className="ml-3">
                                        <span className="font-medium text-gray-900">⚠️ Pago Parcial</span>
                                        <p className="text-xs text-gray-600">Se cobrará lo faltante después</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowPaymentStatusDialog(false)}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirmPaymentStatus}
                                    variant="success"
                                    disabled={markCompletedLoading}
                                    className="flex-1"
                                >
                                    {markCompletedLoading ? 'Completando...' : 'Confirmar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
