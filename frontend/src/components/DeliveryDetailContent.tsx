import React from 'react'
import { MapPin } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface DeliveryDetailContentProps {
    delivery: any
    onOpenImageModal?: (photos: string[]) => void
}

export const DeliveryDetailContent: React.FC<DeliveryDetailContentProps> = ({
    delivery,
    onOpenImageModal
}) => {
    const { colors } = useTheme()

    const borderColor = colors.border.primary
    const textPrimary = colors.text.primary
    const textSecondary = colors.text.secondary
    const textMuted = colors.text.tertiary

    const totalProfit = delivery.items?.reduce((total: number, item: any) => {
        const profit = item.profit !== undefined && item.profit !== null ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)
        return total + profit
    }, 0) || 0

    const totalCost = delivery.items?.reduce((total: number, item: any) => {
        return total + ((item.costPrice || 0) * item.quantity)
    }, 0) || 0

    const margin = delivery.totalAmount > 0 ? ((totalProfit / delivery.totalAmount) * 100).toFixed(1) : '0'

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return colors.text.success
            case 'prepared': return colors.text.info
            default: return colors.text.warning
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return '✓ Entregada'
            case 'prepared': return '📦 Preparada'
            default: return '⏳ Pendiente'
        }
    }

    return (
        <div className='space-y-6'>
            {/* General Info and Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className={`font-semibold ${textPrimary} mb-3`}>
                        📋 Información de Entrega
                    </h3>
                    <div className={`space-y-2 text-sm ${textSecondary}`}>
                        <p>
                            <span className={textMuted}>Cliente:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{delivery.customer?.name || 'Cliente'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Email:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{delivery.customer?.email || 'N/A'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Teléfono:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{delivery.customer?.phone || 'N/A'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Fecha de Entrega:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{new Date(delivery.scheduledDate || delivery.createdAt).toLocaleDateString('es-ES')}</span>
                        </p>
                        <div>
                            <span className={textMuted}>Estado:</span>
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(delivery.status)}`}>
                                {getStatusLabel(delivery.status)}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className={`font-semibold ${textPrimary} mb-3`}>
                        💰 Resumen Financiero
                    </h3>
                    <div className={`space-y-2 text-sm`}>
                        <p>
                            <span className={textMuted}>Total de Entrega:</span>
                            <span className={`font-semibold ml-2 ${colors.ui.greenAccent}`}>
                                ${(delivery.totalAmount || 0).toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Ganancia Total:</span>
                            <span className={`font-semibold ml-2 ${colors.ui.blueAccent}`}>
                                ${totalProfit.toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Costo Total:</span>
                            <span className={`font-semibold ml-2 ${colors.ui.orangeAccent}`}>
                                ${totalCost.toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Margen:</span>
                            <span className={`font-semibold ml-2 ${colors.text.info}`}>
                                {margin}%
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Location Info */}
            <div className={`rounded-lg p-4 border ${borderColor} ${colors.bg.tertiary}`}>
                <div className="flex items-start gap-3">
                    <MapPin className={`w-5 h-5 ${colors.text.tertiary} flex-shrink-0 mt-0.5`} />
                    <div>
                        <p className={`text-sm font-semibold ${textPrimary} mb-1`}>Ubicación de Entrega</p>
                        <p className={textSecondary}>{delivery.location || 'Sin ubicación'}</p>
                    </div>
                </div>
            </div>

            {/* Items with Photos */}
            <div>
                <h3 className={`font-semibold ${textPrimary} mb-3`}>
                    📦 Piezas en Entrega ({delivery.items?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {delivery.items?.map((item: any, idx: number) => {
                        const inventoryItem = item.inventoryItemId ? (typeof item.inventoryItemId === 'object' ? item.inventoryItemId : null) : null
                        const photos = item.photos || inventoryItem?.photos || []

                        return (
                            <div key={idx} className={`border rounded-lg overflow-hidden ${borderColor} ${colors.bg.secondary}`}>
                                {/* Photos Grid */}
                                {photos.length > 0 && (
                                    <div className={`${colors.bg.tertiary} p-3 border-b ${borderColor}`}>
                                        <div className="grid grid-cols-4 gap-2">
                                            {photos.slice(0, 4).map((photo: string, photoIdx: number) => (
                                                <div
                                                    key={photoIdx}
                                                    className={`aspect-square rounded overflow-hidden ${colors.bg.input} ${colors.border.input} hover:border-blue-500 border transition-all cursor-pointer`}
                                                    onClick={() => onOpenImageModal && onOpenImageModal(photos)}
                                                >
                                                    <img
                                                        src={photo}
                                                        alt={`${item.carName} - Foto ${photoIdx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {photos.length > 4 && (
                                            <p className={`text-xs ${colors.text.tertiary} mt-2`}>
                                                +{photos.length - 4} fotos más
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Item Info */}
                                <div className="p-4">
                                    <p className={`font-semibold ${textPrimary} mb-3`}>{item.carName || 'Artículo desconocido'}</p>
                                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                        <div>
                                            <p className={`text-xs ${textMuted}`}>Cantidad</p>
                                            <p className={`${textPrimary} font-semibold`}>{item.quantity}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${textMuted}`}>P. Unitario</p>
                                            <p className={`${textPrimary} font-semibold`}>${item.unitPrice?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${textMuted}`}>Costo Unit.</p>
                                            <p className={`${textPrimary} font-semibold`}>${(item.costPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${textMuted}`}>Ganancia</p>
                                            <p className={`font-semibold ${colors.ui.blueAccent}`}>
                                                ${((item.profit !== undefined && item.profit !== null) ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`pt-3 border-t ${borderColor} text-sm`}>
                                        <div className="flex justify-between">
                                            <span className={textMuted}>Subtotal:</span>
                                            <span className={`font-semibold ${colors.ui.greenAccent}`}>
                                                ${(item.quantity * (item.unitPrice || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Notes */}
            {delivery.notes && (
                <div className={`rounded-lg p-4 border ${borderColor} ${colors.bg.tertiary}`}>
                    <h3 className={`font-semibold ${textPrimary} mb-2`}>
                        📝 Notas
                    </h3>
                    <p className={`text-sm ${textSecondary}`}>{delivery.notes}</p>
                </div>
            )}
        </div>
    )
}
