import React from 'react'
import { X, Package, CheckCircle, Edit, User, Share2, DollarSign, Trash2 } from 'lucide-react'
import Button from './common/Button'

interface DeliveryDetailsModalProps {
    delivery: any | null
    isOpen: boolean
    onClose: () => void
    onMarkAsPrepared?: (id: string) => void
    onMarkAsCompleted?: (id: string) => void
    onEdit?: (delivery: any) => void
    onViewCustomer?: (customerId: string) => void
    onShareReport?: () => void
    onRegisterPayment?: () => void
    onDeletePayment?: (paymentId: string) => void
    onOpenImageModal?: (photos: string[]) => void
    inventoryItems?: any[]
    preSaleItems?: any[]
    markPreparedLoading?: boolean
    markCompletedLoading?: boolean
    isFromCustomerProfile?: boolean
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
    onOpenImageModal,
    inventoryItems = [],
    preSaleItems = [],
    markPreparedLoading = false,
    markCompletedLoading = false,
    isFromCustomerProfile = false,
}) => {
    if (!isOpen || !delivery) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-900">Detalles de Entrega</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Action Buttons - Only show if not from customer profile */}
                {!isFromCustomerProfile && (
                    <div className="px-6 py-4 bg-gray-50 border-b">
                        <div className="flex flex-wrap gap-2">
                            {delivery.status === 'scheduled' && onMarkAsPrepared && (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        onMarkAsPrepared(delivery._id!)
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
                                    onClick={() => {
                                        if (confirm('¿Estás seguro de que quieres marcar esta entrega como completada? Los items serán eliminados del inventario y se marcará como pagada.')) {
                                            onMarkAsCompleted(delivery._id!)
                                            onClose()
                                        }
                                    }}
                                    disabled={markCompletedLoading}
                                    variant="success"
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircle size={16} />
                                    <span>Marcar como Completada</span>
                                </Button>
                            )}
                            {delivery.status !== 'completed' && onEdit && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        onEdit(delivery)
                                        onClose()
                                    }}
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
                                        const customerId = typeof delivery.customerId === 'string'
                                            ? delivery.customerId
                                            : delivery.customerId?._id
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
                                <p><span className="font-medium">Fecha programada:</span> {new Date(delivery.scheduledDate).toLocaleDateString()}{delivery.scheduledTime ? ` a las ${delivery.scheduledTime}` : ''}</p>
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
                                    delivery.items?.forEach((item: any) => {
                                        if (item.inventoryItemId) {
                                            let inventoryItem
                                            let isPresaleItem = false
                                            let preSaleItemData = null

                                            if (typeof item.inventoryItemId === 'string') {
                                                if (item.inventoryItemId.startsWith('presale_')) {
                                                    isPresaleItem = true
                                                    const preSaleId = item.inventoryItemId.replace('presale_', '')
                                                    preSaleItemData = preSaleItems?.find(ps => ps._id === preSaleId)
                                                } else {
                                                    inventoryItem = inventoryItems?.find((inv: any) => inv._id === item.inventoryItemId)
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
                                {delivery.payments.map((payment: any) => (
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
                                                    {new Date(payment.paymentDate).toLocaleDateString()} {new Date(payment.paymentDate).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            {payment.notes && (
                                                <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                                            )}
                                        </div>
                                        {onDeletePayment && !isFromCustomerProfile && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={() => onDeletePayment(payment._id)}
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
                            {delivery.items?.map((item: any, index: number) => {
                                let inventoryItem
                                let isPresaleItem = false
                                let preSaleItemData = null

                                if (typeof item.inventoryItemId === 'string') {
                                    if (item.inventoryItemId.startsWith('presale_')) {
                                        isPresaleItem = true
                                        const preSaleId = item.inventoryItemId.replace('presale_', '')
                                        preSaleItemData = preSaleItems?.find(ps => ps._id === preSaleId)
                                        inventoryItem = null
                                    } else {
                                        inventoryItem = inventoryItems?.find((inv: any) => inv._id === item.inventoryItemId)
                                    }
                                } else if (typeof item.inventoryItemId === 'object' && item.inventoryItemId) {
                                    inventoryItem = item.inventoryItemId
                                }

                                const cost = isPresaleItem
                                    ? (preSaleItemData?.basePricePerUnit || item.basePricePerUnit || 0)
                                    : (inventoryItem && typeof inventoryItem.purchasePrice === 'number' && inventoryItem.purchasePrice > 0 ? inventoryItem.purchasePrice : 0)
                                const profit = item.unitPrice - cost
                                const itemPhotos = inventoryItem?.photos || item.photos || []

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
            </div>
        </div>
    )
}
