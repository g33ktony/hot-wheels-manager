import { Eye, Trash2 } from 'lucide-react'
import Button from '@/components/common/Button'
import { useTheme } from '@/contexts/ThemeContext'
import { DEFAULT_PLACEHOLDER } from '@/utils/placeholderLogo'

interface SaleCardProps {
    sale: any
    onViewDetails: (sale: any) => void
    onDelete: (saleId: string) => void
    isLoadingDelete?: boolean
    canEdit?: boolean
    canDelete?: boolean
}

export default function SaleCard({
    sale,
    onViewDetails,
    onDelete,
    isLoadingDelete,
    canEdit = true,
    canDelete = true
}: SaleCardProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    // Colores dinámicos basados en el tema
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white'
    const cardBorder = isDark ? 'border-slate-700' : 'border-gray-200'
    const headerBg = isDark ? 'bg-gradient-to-r from-slate-800 to-slate-750' : 'bg-gray-50'
    const textPrimary = isDark ? 'text-white' : 'text-gray-900'
    const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600'
    const textMuted = isDark ? 'text-slate-400' : 'text-gray-500'

    const statusConfig = {
        completed: { bg: isDark ? 'bg-green-900/40' : 'bg-green-100', text: isDark ? 'text-green-300' : 'text-green-800', label: 'Completada' },
        pending: { bg: isDark ? 'bg-yellow-900/40' : 'bg-yellow-100', text: isDark ? 'text-yellow-300' : 'text-yellow-800', label: 'Pendiente' },
        cancelled: { bg: isDark ? 'bg-red-900/40' : 'bg-red-100', text: isDark ? 'text-red-300' : 'text-red-800', label: 'Cancelada' }
    }

    const saleTypeConfig = {
        delivery: { label: '🚚 Entrega', color: 'text-blue-600' },
        pos: { label: '🏪 POS', color: 'text-purple-600' }
    }

    const paymentMethodConfig: Record<string, string> = {
        cash: '💵 Efectivo',
        transfer: '🏦 Transferencia',
        paypal: '📱 PayPal',
        mercadopago: '🛍️ Mercado Pago',
        other: '📌 Otro'
    }

    const status = sale.status as keyof typeof statusConfig
    const saleType = sale.saleType as keyof typeof saleTypeConfig
    const statusInfo = statusConfig[status] || statusConfig.pending
    const saleTypeInfo = saleTypeConfig[saleType] || saleTypeConfig.pos

    const dateStr = sale.saleDate.toString().split('T')[0]
    const [year, month, day] = dateStr.split('-')
    const formattedDate = `${day}/${month}/${year}`

    return (
        <div className={`${cardBg} rounded-lg border ${cardBorder} hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full`}>
            {/* Header with status and customer */}
            <div className={`p-4 border-b ${cardBorder} ${headerBg} flex-shrink-0`}>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold ${textPrimary} truncate`}>
                            {sale.customer?.name || 'Cliente no especificado'}
                        </h3>
                        <p className={`text-sm ${textMuted}`}>Venta #{sale._id?.slice(-8)}</p>
                    </div>
                    <span className={`ml-2 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${saleTypeInfo.color}`}>{saleTypeInfo.label}</span>
                    <span className={textSecondary}>{sale.items?.length || 0} pieza{sale.items?.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Sale details - Scrollable content */}
            <div className="p-4 flex-grow flex flex-col justify-between min-h-0">
                <div className="space-y-3 overflow-hidden">
                    {/* Customer info */}
                    {sale.customer && (
                        <div className={`${isDark ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-100 border-blue-300'} rounded-lg p-3 border space-y-1`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Cliente</p>
                            {sale.customer.email && (
                                <p className={`text-sm truncate ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>📧 {sale.customer.email}</p>
                            )}
                            {sale.customer.phone && (
                                <p className={`text-sm ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>📱 {sale.customer.phone}</p>
                            )}
                        </div>
                    )}

                    {/* Date and payment method */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className={textSecondary}>📅 {formattedDate}</span>
                            <span className={textSecondary}>{paymentMethodConfig[sale.paymentMethod] || sale.paymentMethod}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className={`${isDark ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50' : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'} rounded-lg p-3 border`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Total:</span>
                            <span className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>${sale.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Delivery info if exists */}
                    {sale.delivery && (
                        <div className={`${isDark ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-100 border-purple-300'} rounded-lg p-3 border space-y-1`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Entrega</p>
                            <p className={`text-sm font-medium ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>{sale.delivery.location}</p>
                            <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                                {new Date(sale.delivery.scheduledDate).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    )}

                    {/* Item Thumbnails */}
                    {sale.items && sale.items.length > 0 && (
                        <div className={`${isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-gray-100 border-gray-300'} rounded-lg p-3 border space-y-2`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Piezas ({sale.items.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {sale.items.map((item: any, index: number) => (
                                    <div
                                        key={index}
                                        className="relative group"
                                        title={`${item.carId || item.carName || 'Sin nombre'}`}
                                    >
                                        {/* Image thumbnail */}
                                        {item.photos && item.photos.length > 0 ? (
                                            <img
                                                src={item.photos[item.primaryPhotoIndex || 0].includes('weserv')
                                                    ? item.photos[item.primaryPhotoIndex || 0]
                                                    : `https://images.weserv.nl/?url=${encodeURIComponent(item.photos[item.primaryPhotoIndex || 0])}&w=80&h=60&fit=contain`
                                                }
                                                alt={item.carId || 'Item'}
                                                className="w-16 h-12 object-cover rounded border border-slate-600 hover:border-primary-400 transition-colors"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
                                                }}
                                            />
                                        ) : (
                                            <div className="w-16 h-12 bg-slate-700 rounded border border-slate-600 flex items-center justify-center overflow-hidden">
                                                <img src={DEFAULT_PLACEHOLDER} alt="Auto a Escala" className="w-full h-full object-contain p-0.5" />
                                            </div>
                                        )}
                                        {/* Quantity badge */}
                                        {item.quantity > 1 && (
                                            <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {item.quantity}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div className={`${isDark ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-100 border-blue-300'} rounded-lg p-3 border`}>
                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>📝 Notas:</p>
                            <p className={`text-sm line-clamp-2 ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{sale.notes}</p>
                        </div>
                    )}
                </div>

                {/* Action buttons - Always at bottom */}
                <div className={`flex items-center gap-2 pt-4 flex-wrap border-t ${cardBorder} mt-auto`}>
                    {canEdit && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onViewDetails(sale)}
                            className="flex-1"
                            title="Ver detalles"
                        >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Detalles</span>
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                                if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
                                    onDelete(sale._id)
                                }
                            }}
                            disabled={isLoadingDelete}
                            title="Eliminar venta"
                        >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
