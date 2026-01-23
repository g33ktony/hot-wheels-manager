import { Delivery, InventoryItem } from '../../../shared/types'
import Button from '@/components/common/Button'
import { CheckCircle, Clock, MapPin, Package, Calendar, Eye, Edit, Share2, Trash2 } from 'lucide-react'

interface DeliveryCardProps {
    delivery: Delivery
    inventoryItems?: InventoryItem[]
    onViewDetails: (delivery: Delivery) => void
    onEdit: (delivery: Delivery) => void
    onMarkAsPrepared: (deliveryId: string) => void
    onMarkAsCompleted: (deliveryId: string) => void
    onDelete: (deliveryId: string) => void
    onShare: (delivery: Delivery) => void
    isLoadingPrepared?: boolean
    isLoadingCompleted?: boolean
    isLoadingDelete?: boolean
}

/**
 * Component to display a delivery as a card with mini photo collage
 */
export default function DeliveryCard({
    delivery,
    inventoryItems = [],
    onViewDetails,
    onEdit,
    onMarkAsPrepared,
    onMarkAsCompleted,
    onDelete,
    onShare,
    isLoadingPrepared,
    isLoadingCompleted,
    isLoadingDelete
}: DeliveryCardProps) {
    // Get photos from all items in the delivery (from inventory)
    const getItemPhotos = () => {
        const photos: string[] = []
        delivery.items.forEach(item => {
            // Get photos from inventoryItems
            const inventoryItem = inventoryItems.find(inv => inv._id === item.inventoryItemId)
            if (inventoryItem?.photos && inventoryItem.photos.length > 0) {
                photos.push(...inventoryItem.photos.slice(0, 2)) // Get up to 2 photos per item
            }
        })
        return photos.slice(0, 6) // Limit to 6 photos for the collage
    }

    const itemPhotos = getItemPhotos()

    const statusConfig = {
        scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Programada', icon: Clock },
        prepared: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Preparada', icon: Package },
        completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada', icon: CheckCircle },
        rescheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Reprogramada', icon: Clock },
        cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada', icon: Clock }
    }

    const paymentConfig = {
        paid: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Pagado' },
        partial: { bg: 'bg-orange-100', text: 'text-orange-800', label: `Parcial: $${(delivery.paidAmount || 0).toFixed(2)}` },
        pending: { bg: 'bg-red-100', text: 'text-red-800', label: 'Sin pagar' }
    }

    const status = delivery.status as keyof typeof statusConfig
    const paymentStatus = (delivery.paymentStatus || 'pending') as keyof typeof paymentConfig
    const statusInfo = statusConfig[status]
    const paymentInfo = paymentConfig[paymentStatus]

    const dateStr = delivery.scheduledDate.toString().split('T')[0]
    const [year, month, day] = dateStr.split('-')
    const formattedDate = `${day}/${month}/${year}`

    return (
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full">
            {/* Header with status and customer name */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{delivery.customer?.name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className="text-sm text-gray-600">{delivery.items.length} items en esta entrega</div>
            </div>

            {/* Photo collage */}
            {itemPhotos.length > 0 && (
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                    <div className="grid grid-cols-6 gap-1">
                        {itemPhotos.map((photo, idx) => (
                            <div
                                key={idx}
                                className="aspect-square rounded overflow-hidden bg-gray-200 border border-gray-300"
                            >
                                <img
                                    src={photo}
                                    alt={`Item ${idx}`}
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

            {/* Delivery details - Fixed height scrollable content */}
            <div className="p-4 flex-grow flex flex-col justify-between min-h-0">
                <div className="space-y-3 overflow-hidden">
                    {/* Recipient info - Only show if third party */}
                    {delivery.isThirdPartyDelivery && delivery.thirdPartyRecipient && (
                        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                            <p className="text-xs text-purple-900 font-medium">Entrega a tercero</p>
                            <p className="text-sm font-semibold text-purple-900 truncate">{delivery.thirdPartyRecipient}</p>
                            {delivery.thirdPartyPhone && (
                                <p className="text-xs text-purple-700">📱 {delivery.thirdPartyPhone}</p>
                            )}
                        </div>
                    )}

                    {/* Date and location */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                            <span>{formattedDate}{delivery.scheduledTime ? ` a las ${delivery.scheduledTime}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                            <span className="font-medium">{delivery.location}</span>
                        </div>
                    </div>

                    {/* Amount and payment status */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total:</span>
                            <span className="text-xl font-bold text-gray-900">${delivery.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Estado de pago:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentInfo.bg} ${paymentInfo.text}`}>
                                {paymentInfo.label}
                            </span>
                        </div>
                    </div>

                    {/* Notes */}
                    {delivery.notes && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs text-blue-900">{delivery.notes}</p>
                        </div>
                    )}
                </div>

                {/* Action buttons - Always at bottom */}
                <div className="flex items-center gap-2 pt-4 flex-wrap border-t border-gray-100 mt-auto">
                    {delivery.status === 'scheduled' && (
                        <Button
                            size="sm"
                            onClick={() => onMarkAsPrepared(delivery._id!)}
                            disabled={isLoadingPrepared}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                            title="Marcar como preparada"
                        >
                            <Package size={14} />
                            <span className="hidden sm:inline">Preparar</span>
                        </Button>
                    )}
                    {delivery.status === 'prepared' && (
                        <Button
                            size="sm"
                            onClick={() => {
                                if (confirm('¿Estás seguro de que quieres marcar esta entrega como completada?')) {
                                    onMarkAsCompleted(delivery._id!)
                                }
                            }}
                            disabled={isLoadingCompleted}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            title="Marcar como completada"
                        >
                            <CheckCircle size={14} />
                            <span className="hidden sm:inline">Completar</span>
                        </Button>
                    )}
                    {delivery.status === 'completed' && (
                        <div className="flex-1 text-xs text-gray-500 text-center">No reversible</div>
                    )}

                    {/* Secondary actions */}
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onViewDetails(delivery)}
                        title="Ver detalles"
                        className="px-2"
                    >
                        <Eye size={14} />
                    </Button>

                    {delivery.status !== 'completed' && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onEdit(delivery)}
                            title="Editar"
                            className="px-2 !text-blue-600 hover:!text-blue-700 !bg-blue-50"
                        >
                            <Edit size={14} />
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onShare(delivery)}
                        title="Compartir"
                        className="px-2"
                    >
                        <Share2 size={14} />
                    </Button>

                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDelete(delivery._id!)}
                        disabled={isLoadingDelete || delivery.status === 'completed'}
                        title={delivery.status === 'completed' ? 'No se puede eliminar' : 'Eliminar'}
                        className="px-2"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
