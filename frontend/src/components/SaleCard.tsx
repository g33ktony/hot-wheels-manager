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

    // Neumorphic classes
    const neumorphSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-[14px_14px_26px_rgba(2,6,23,0.56),-10px_-10px_18px_rgba(148,163,184,0.1)]'
        : 'rounded-2xl backdrop-blur-xl bg-white/94 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'

    const neumorphInsetClass = isDark
        ? 'rounded-xl border border-slate-600/40 bg-slate-800/85 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
        : 'rounded-xl border border-slate-300/60 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'

    const neumorphPillClass = isDark
        ? 'rounded-full border border-slate-600/40 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.1)]'
        : 'rounded-full border border-slate-200/70 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.95)]'

    const textPrimary = isDark ? 'text-white' : 'text-slate-900'
    const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600'
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500'

    const statusConfig = {
        completed: { bg: isDark ? 'bg-emerald-900/35 border-emerald-600/30' : 'bg-emerald-50 border-emerald-200/80', text: isDark ? 'text-emerald-300' : 'text-emerald-700', label: 'Completada' },
        pending: { bg: isDark ? 'bg-amber-900/35 border-amber-600/30' : 'bg-amber-50 border-amber-200/80', text: isDark ? 'text-amber-300' : 'text-amber-700', label: 'Pendiente' },
        cancelled: { bg: isDark ? 'bg-rose-900/35 border-rose-600/30' : 'bg-rose-50 border-rose-200/80', text: isDark ? 'text-rose-300' : 'text-rose-700', label: 'Cancelada' }
    }

    const saleTypeConfig = {
        delivery: { label: '🚚 Entrega', bg: isDark ? 'bg-sky-900/30 border-sky-600/30' : 'bg-sky-50 border-sky-200/80', text: isDark ? 'text-sky-300' : 'text-sky-700' },
        pos: { label: '🏪 POS', bg: isDark ? 'bg-slate-700/60 border-slate-500/40' : 'bg-violet-50 border-violet-200/80', text: isDark ? 'text-slate-200' : 'text-violet-700' }
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
        <div className={`${neumorphSurfaceClass} overflow-hidden flex flex-col h-full hover:scale-[1.02] transition-all`}>
            {/* Header with status and customer */}
            <div className={`p-4 border-b ${isDark ? 'border-slate-600/40' : 'border-slate-200/60'} flex-shrink-0`}>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold ${textPrimary} truncate`}>
                            {sale.customer?.name || 'Cliente no especificado'}
                        </h3>
                        <p className={`text-sm ${textMuted}`}>Venta #{sale._id?.slice(-8)}</p>
                    </div>
                    <span className={`ml-2 px-3 py-1 text-xs font-semibold whitespace-nowrap ${neumorphPillClass} ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className={`px-2.5 py-1 text-xs font-semibold ${neumorphPillClass} ${saleTypeInfo.bg} ${saleTypeInfo.text}`}>
                        {saleTypeInfo.label}
                    </span>
                    <span className={textSecondary}>{sale.items?.length || 0} pieza{sale.items?.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Sale details - Scrollable content */}
            <div className="p-4 flex-grow flex flex-col justify-between min-h-0">
                <div className="space-y-3 overflow-hidden">
                    {/* Customer info */}
                    {sale.customer && (
                        <div className={`${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} ${neumorphInsetClass} p-3 space-y-1`}>
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
                    <div className={`${isDark ? 'bg-slate-800/30' : 'bg-slate-50'} ${neumorphInsetClass} p-3`}>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textSecondary}>📅 {formattedDate}</span>
                            <span className={textSecondary}>{paymentMethodConfig[sale.paymentMethod] || sale.paymentMethod}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className={`${isDark ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20' : 'bg-gradient-to-r from-green-50 to-emerald-50'} ${neumorphInsetClass} p-3`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Total:</span>
                            <span className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>${sale.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Delivery info if exists */}
                    {sale.delivery && (
                        <div className={`${isDark ? 'bg-slate-800/60' : 'bg-purple-50'} ${neumorphInsetClass} p-3 space-y-1`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Entrega</p>
                            <p className={`text-sm font-medium ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>{sale.delivery.location}</p>
                            <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                                {new Date(sale.delivery.scheduledDate).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    )}

                    {/* Item Thumbnails */}
                    {sale.items && sale.items.length > 0 && (
                        <div className={`${isDark ? 'bg-slate-800/40' : 'bg-slate-50'} ${neumorphInsetClass} p-3 space-y-2`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Piezas ({sale.items.length})</p>
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
                                                className="w-16 h-12 object-cover rounded border border-slate-600/40 hover:border-primary-400 transition-colors"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
                                                }}
                                            />
                                        ) : (
                                            <div className={`w-16 h-12 rounded border flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-700/60 border-slate-600/40' : 'bg-slate-100 border-slate-200/60'}`}>
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
                        <div className={`${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} ${neumorphInsetClass} p-3`}>
                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>📝 Notas:</p>
                            <p className={`text-sm line-clamp-2 ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{sale.notes}</p>
                        </div>
                    )}
                </div>

                {/* Action buttons - Always at bottom */}
                <div className={`flex items-center gap-2 pt-4 flex-wrap border-t ${isDark ? 'border-slate-600/40' : 'border-slate-200/60'} mt-auto`}>
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
