import React from 'react'

interface SaleDetailContentProps {
    sale: any
    theme?: 'light' | 'dark'
    onOpenImageModal?: (photos: string[]) => void
}

const proxifyImageUrl = (url: string) => {
    if (!url) return '/placeholder.png'
    // Si la URL ya es un placeholder, devolverla sin cambios
    if (url.includes('placeholder')) return url
    // Si es una URL de Cloudinary, proxificarla
    if (url.includes('cloudinary') || url.includes('http')) {
        return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400&h=400&fit=cover&q=75`
    }
    return url
}

export const SaleDetailContent: React.FC<SaleDetailContentProps> = ({
    sale,
    theme = 'light',
    onOpenImageModal
}) => {
    const isDark = theme === 'dark'

    // const borderColor = isDark ? 'border-slate-600' : 'border-gray-300'
    const textPrimary = isDark ? 'text-white' : 'text-gray-900'
    const textSecondary = isDark ? 'text-slate-100' : 'text-gray-700'
    const textMuted = isDark ? 'text-slate-300' : 'text-gray-600'
    const badgeBg = isDark ? 'bg-emerald-500/20' : 'bg-green-100'
    const badgeText = isDark ? 'text-emerald-300' : 'text-green-800'
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white'
    const cardBorder = isDark ? 'border-slate-700' : 'border-gray-200'
    const labelBg = isDark ? 'bg-slate-900/50' : 'bg-gray-50'

    const totalProfit = sale.items?.reduce((total: number, item: any) => {
        const profit = item.profit !== undefined && item.profit !== null ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)
        return total + profit
    }, 0) || 0

    const totalCost = sale.items?.reduce((total: number, item: any) => {
        return total + ((item.costPrice || 0) * item.quantity)
    }, 0) || 0

    const margin = sale.totalAmount > 0 ? ((totalProfit / sale.totalAmount) * 100).toFixed(1) : '0'

    return (
        <div className={isDark ? 'space-y-6' : 'space-y-6'}>
            {/* General Info and Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className={`font-semibold ${textPrimary} mb-3`}>
                        {isDark ? '📋 Información General' : 'Información General'}
                    </h3>
                    <div className={`space-y-2 text-sm ${textSecondary}`}>
                        <p>
                            <span className={textMuted}>Cliente:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{sale.customer?.name || 'Cliente POS'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Email:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{sale.customer?.email || 'N/A'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Teléfono:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{sale.customer?.phone || 'N/A'}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Fecha:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{new Date(sale.saleDate).toLocaleDateString('es-ES')}</span>
                        </p>
                        <p>
                            <span className={textMuted}>Método de Pago:</span>
                            <span className={`${textPrimary} font-medium ml-2`}>{sale.paymentMethod || 'N/A'}</span>
                        </p>
                        <div>
                            <span className={textMuted}>Estado:</span>
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${sale.status === 'completed' ? `${badgeBg} ${badgeText}` :
                                sale.status === 'pending' ? (isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                                    (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800')
                                }`}>
                                {sale.status === 'completed' && '✓ Completada'}
                                {sale.status === 'pending' && 'Pendiente'}
                                {sale.status === 'cancelled' && 'Cancelada'}
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
                            <span className={textMuted}>Total de Venta:</span>
                            <span className={`font-semibold ml-2 ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>
                                ${(sale.totalAmount || 0).toFixed(2)}
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

            {/* Items with Photos */}
            <div>
                <h3 className={`font-semibold ${textPrimary} mb-3`}>
                    {isDark ? '📦 Piezas Vendidas' : 'Piezas Vendidas'} ({sale.items?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sale.items?.map((item: any, idx: number) => {
                        const inventoryItem = item.inventoryItemId ? (typeof item.inventoryItemId === 'object' ? item.inventoryItemId : null) : null
                        const photos = item.photos || inventoryItem?.photos || []

                        return (
                            <div key={idx} className={`border rounded-lg overflow-hidden ${cardBorder} ${cardBg} shadow-md hover:shadow-lg transition-shadow`}>
                                {/* Photos Grid - Always Show */}
                                <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-100'} p-3 border-b ${cardBorder} min-h-[120px] flex items-center justify-center`}>
                                    {photos.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-2 w-full">
                                            {photos.slice(0, 4).map((photo: string, photoIdx: number) => (
                                                <div
                                                    key={photoIdx}
                                                    className={`aspect-square rounded overflow-hidden ${isDark ? 'bg-slate-700 border-slate-600 hover:border-emerald-500' : 'bg-gray-200 border-gray-300 hover:border-emerald-500'} border transition-all cursor-pointer`}
                                                    onClick={() => onOpenImageModal && onOpenImageModal(photos)}
                                                >
                                                    <img
                                                        src={proxifyImageUrl(photo)}
                                                        alt={`${item.carName} - Foto ${photoIdx + 1}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/placeholder.png'
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center w-full">
                                            <p className={`text-sm ${textMuted} font-medium`}>📷 Sin imágenes</p>
                                            <p className={`text-xs ${textMuted} mt-1`}>No hay fotos disponibles</p>
                                        </div>
                                    )}
                                </div>
                                {photos.length > 4 && (
                                    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-100'} px-3 py-2 border-b ${cardBorder}`}>
                                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                            +{photos.length - 4} fotos más
                                        </p>
                                    </div>
                                )}

                                {/* Item Info */}
                                <div className="p-4 space-y-3">
                                    <p className={`font-bold text-lg ${textPrimary}`}>{item.carName || 'Artículo desconocido'}</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className={`${labelBg} p-3 rounded border ${cardBorder}`}>
                                            <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-1`}>Cantidad</p>
                                            <p className={`${textPrimary} font-bold text-base`}>{item.quantity}</p>
                                        </div>
                                        <div className={`${labelBg} p-3 rounded border ${cardBorder}`}>
                                            <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-1`}>P. Unitario</p>
                                            <p className={`${isDark ? 'text-emerald-400' : 'text-green-600'} font-bold text-base`}>${item.unitPrice?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div className={`${labelBg} p-3 rounded border ${cardBorder}`}>
                                            <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-1`}>Costo Unit.</p>
                                            <p className={`${isDark ? 'text-orange-400' : 'text-orange-600'} font-bold text-base`}>${(item.costPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div className={`${labelBg} p-3 rounded border ${cardBorder}`}>
                                            <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-1`}>Ganancia</p>
                                            <p className={`font-bold text-base ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                ${((item.profit !== undefined && item.profit !== null) ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`pt-3 border-t ${cardBorder} text-sm`}>
                                        <div className="flex justify-between items-center">
                                            <span className={`font-semibold ${textMuted}`}>Subtotal:</span>
                                            <span className={`font-bold text-lg ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>
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
            {sale.notes && (
                <div className={`rounded-lg p-4 border ${cardBorder} ${cardBg} shadow-md`}>
                    <h3 className={`font-semibold ${textPrimary} mb-2`}>
                        {isDark ? '📝 Notas' : 'Notas'}
                    </h3>
                    <p className={`text-sm ${textSecondary}`}>{sale.notes}</p>
                </div>
            )}
        </div>
    )
}
