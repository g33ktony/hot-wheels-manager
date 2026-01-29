import { Delivery, InventoryItem } from '../../../shared/types'
import Button from '@/components/common/Button'
import { CheckCircle, Clock, MapPin, Package, Calendar, Eye, Edit, Share2, Trash2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

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
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    // Colores dinámicos basados en el tema
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white'
    const cardBorder = isDark ? 'border-slate-700' : 'border-gray-200'
    const textPrimary = isDark ? 'text-white' : 'text-gray-900'
    const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600'
    const textMuted = isDark ? 'text-slate-400' : 'text-gray-500'
    const bgCollage = isDark ? 'bg-slate-900' : 'bg-gray-100'
    const photoBg = isDark ? 'bg-slate-700' : 'bg-gray-300'
    const photoBorder = isDark ? 'border-slate-600' : 'border-gray-300'

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
        scheduled: { bg: isDark ? 'bg-blue-900/40' : 'bg-blue-100', text: isDark ? 'text-blue-300' : 'text-blue-800', label: 'Programada', icon: Clock },
        prepared: { bg: isDark ? 'bg-orange-900/40' : 'bg-orange-100', text: isDark ? 'text-orange-300' : 'text-orange-800', label: 'Preparada', icon: Package },
        completed: { bg: isDark ? 'bg-green-900/40' : 'bg-green-100', text: isDark ? 'text-green-300' : 'text-green-800', label: 'Completada', icon: CheckCircle },
        rescheduled: { bg: isDark ? 'bg-yellow-900/40' : 'bg-yellow-100', text: isDark ? 'text-yellow-300' : 'text-yellow-800', label: 'Reprogramada', icon: Clock },
        cancelled: { bg: isDark ? 'bg-red-900/40' : 'bg-red-100', text: isDark ? 'text-red-300' : 'text-red-800', label: 'Cancelada', icon: Clock }
    }

    const paymentConfig = {
        paid: { bg: isDark ? 'bg-green-900/40' : 'bg-green-100', text: isDark ? 'text-green-300' : 'text-green-800', label: '✓ Pagado' },
        partial: { bg: isDark ? 'bg-orange-900/40' : 'bg-orange-100', text: isDark ? 'text-orange-300' : 'text-orange-800', label: `Parcial: $${(delivery.paidAmount || 0).toFixed(2)}` },
        pending: { bg: isDark ? 'bg-red-900/40' : 'bg-red-100', text: isDark ? 'text-red-300' : 'text-red-800', label: 'Sin pagar' }
    }

    const status = delivery.status as keyof typeof statusConfig
    const paymentStatus = (delivery.paymentStatus || 'pending') as keyof typeof paymentConfig
    const statusInfo = statusConfig[status]
    const paymentInfo = paymentConfig[paymentStatus]

    const dateStr = delivery.scheduledDate.toString().split('T')[0]
    const [year, month, day] = dateStr.split('-')
    const formattedDate = `${day}/${month}/${year}`

    return (
        <div className={`${cardBg} rounded-lg border ${cardBorder} hover:shadow-lg transition-all overflow-hidden flex flex-col h-full`}>
            {/* Header with status and customer name */}
            <div className={`p-4 border-b ${cardBorder} ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-800' : 'bg-gray-50'} flex-shrink-0`}>
                <div className="flex items-start justify-between mb-2">
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>{delivery.customer?.name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className={`text-sm ${textSecondary}`}>{delivery.items.length} items en esta entrega</div>
            </div>

            {/* Photo collage */}
            {itemPhotos.length > 0 && (
                <div className={`p-4 ${bgCollage} border-b ${cardBorder} flex-shrink-0`}>
                    <div className="grid grid-cols-6 gap-1">
                        {itemPhotos.map((photo, idx) => (
                            <div
                                key={idx}
                                className={`aspect-square rounded overflow-hidden ${photoBg} border ${photoBorder}`}
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
                        <div className="bg-purple-900/40 rounded-lg p-2 border border-purple-700/50">
                            <p className="text-xs text-purple-300 font-medium">Entrega a tercero</p>
                            <p className="text-sm font-semibold text-purple-200 truncate">{delivery.thirdPartyRecipient}</p>
                            {delivery.thirdPartyPhone && (
                                <p className="text-xs text-purple-300">📱 {delivery.thirdPartyPhone}</p>
                            )}
                        </div>
                    )}

                    {/* Date and location */}
                    <div className="space-y-2">
                        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                            <Calendar size={16} className={`${textMuted} flex-shrink-0`} />
                            <span>{formattedDate}{delivery.scheduledTime ? ` a las ${delivery.scheduledTime}` : ''}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                            <MapPin size={16} className={`${textMuted} flex-shrink-0`} />
                            <span className="font-medium">{delivery.location}</span>
                        </div>
                    </div>

                    {/* Amount and payment status */}
                    <div className={`${isDark ? 'bg-slate-900/50' : 'bg-gray-100'} rounded-lg p-3 space-y-2`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm ${textSecondary}`}>Total:</span>
                            <span className={`text-xl font-bold ${textPrimary}`}>${delivery.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm ${textSecondary}`}>Estado de pago:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentInfo.bg} ${paymentInfo.text}`}>
                                {paymentInfo.label}
                            </span>
                        </div>
                    </div>

                    {/* Notes */}
                    {delivery.notes && (
                        <div className={`${isDark ? 'bg-blue-900/40 border-blue-700/50' : 'bg-blue-100 border-blue-300'} rounded-lg p-3 border`}>
                            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{delivery.notes}</p>
                        </div>
                    )}
                </div>

                {/* Action buttons - Always at bottom */}
                <div className={`flex items-center gap-2 pt-4 flex-wrap border-t ${cardBorder} mt-auto`}>
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
