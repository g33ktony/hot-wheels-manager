import React from 'react'
import { MapPin } from 'lucide-react'

interface DeliveryDetailContentProps {
    delivery: any
    theme?: 'light' | 'dark'
    onOpenImageModal?: (photos: string[]) => void
}

export const DeliveryDetailContent: React.FC<DeliveryDetailContentProps> = ({
    delivery,
    theme = 'light',
    onOpenImageModal
}) => {
    const isDark = theme === 'dark'

    const borderColor = isDark ? 'border-slate-600' : 'border-gray-300'
    const textPrimary = isDark ? 'text-white' : 'text-gray-900'
    const textSecondary = isDark ? 'text-slate-300' : 'text-gray-700'
    const textMuted = isDark ? 'text-slate-400' : 'text-gray-600'

    const totalProfit = delivery.items?.reduce((total: number, item: any) => {
        const profit = item.profit !== undefined && item.profit !== null ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)
        return total + profit
    }, 0) || 0

    const totalCost = delivery.items?.reduce((total: number, item: any) => {
        return total + ((item.costPrice || 0) * item.quantity)
    }, 0) || 0

    const margin = delivery.totalAmount > 0 ? ((totalProfit / delivery.totalAmount) * 100).toFixed(1) : '0'

    const getStatusColor = (status: string) => {
        if (isDark) {
            switch (status) {
                case 'completed': return 'bg-emerald-500/20 text-emerald-300'
                case 'prepared': return 'bg-blue-500/20 text-blue-300'
                default: return 'bg-yellow-500/20 text-yellow-300'
            }
        } else {
            switch (status) {
                case 'completed': return 'bg-green-100 text-green-800'
                case 'prepared': return 'bg-blue-100 text-blue-800'
                default: return 'bg-yellow-100 text-yellow-800'
            }
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
        <div className={isDark ? 'space-y-6' : 'space-y-6'}>
            {/* General Info and Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className={`font-semibold ${textPrimary} mb-3`}>
                        {isDark ? '📋 Información de Entrega' : 'Información de Entrega'}
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
                        {isDark ? '💰 Resumen Financiero' : 'Resumen Financiero'}
                    </h3>
                    <div className={`space-y-2 text-sm`}>
                        <p>
                            <span className={textMuted}>Total de Entrega:</span>
                            <span className={`font-semibold ml-2 ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>
                                ${(delivery.totalAmount || 0).toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Ganancia Total:</span>
                            <span className={`font-semibold ml-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                ${totalProfit.toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Costo Total:</span>
                            <span className={`font-semibold ml-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                ${totalCost.toFixed(2)}
                            </span>
                        </p>
                        <p>
                            <span className={textMuted}>Margen:</span>
                            <span className={`font-semibold ml-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                {margin}%
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Location Info */}
            <div className={`rounded-lg p-4 border ${borderColor} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                    <MapPin className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-600'} flex-shrink-0 mt-0.5`} />
                    <div>
                        <p className={`text-sm font-semibold ${textPrimary} mb-1`}>Ubicación de Entrega</p>
                        <p className={textSecondary}>{delivery.location || 'Sin ubicación'}</p>
                    </div>
                </div>
            </div>

            {/* Items with Photos */}
            <div>
                <h3 className={`font-semibold ${textPrimary} mb-3`}>
                    {isDark ? '📦 Piezas en Entrega' : 'Piezas en Entrega'} ({delivery.items?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {delivery.items?.map((item: any, idx: number) => {
                        const inventoryItem = item.inventoryItemId ? (typeof item.inventoryItemId === 'object' ? item.inventoryItemId : null) : null
                        const photos = item.photos || inventoryItem?.photos || []

                        return (
                            <div key={idx} className={`border rounded-lg overflow-hidden ${borderColor} ${isDark ? 'bg-slate-700/30' : 'bg-white'}`}>
                                {/* Photos Grid */}
                                {photos.length > 0 && (
                                    <div className={`${isDark ? 'bg-slate-800/50' : 'bg-gray-100'} p-3 border-b ${borderColor}`}>
                                        <div className="grid grid-cols-4 gap-2">
                                            {photos.slice(0, 4).map((photo: string, photoIdx: number) => (
                                                <div
                                                    key={photoIdx}
                                                    className={`aspect-square rounded overflow-hidden ${isDark ? 'bg-slate-600 border-slate-500 hover:border-blue-500' : 'bg-gray-200 border-gray-300 hover:border-blue-500'} border transition-all cursor-pointer`}
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
                                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-2`}>
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
                                            <p className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                ${((item.profit !== undefined && item.profit !== null) ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`pt-3 border-t ${borderColor} text-sm`}>
                                        <div className="flex justify-between">
                                            <span className={textMuted}>Subtotal:</span>
                                            <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>
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
                <div className={`rounded-lg p-4 border ${borderColor} ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <h3 className={`font-semibold ${textPrimary} mb-2`}>
                        {isDark ? '📝 Notas' : 'Notas'}
                    </h3>
                    <p className={`text-sm ${textSecondary}`}>{delivery.notes}</p>
                </div>
            )}
        </div>
    )
}
