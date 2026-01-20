import { Eye, Trash2 } from 'lucide-react'
import Button from '@/components/common/Button'

interface SaleCardProps {
    sale: any
    onViewDetails: (sale: any) => void
    onDelete: (saleId: string) => void
    isLoadingDelete?: boolean
}

export default function SaleCard({
    sale,
    onViewDetails,
    onDelete,
    isLoadingDelete
}: SaleCardProps) {
    const statusConfig = {
        completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' },
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' }
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
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full">
            {/* Header with status and customer */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {sale.customer?.name || 'Cliente no especificado'}
                        </h3>
                        <p className="text-sm text-gray-500">Venta #{sale._id?.slice(-8)}</p>
                    </div>
                    <span className={`ml-2 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${saleTypeInfo.color}`}>{saleTypeInfo.label}</span>
                    <span className="text-gray-600">{sale.items?.length || 0} pieza{sale.items?.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Sale details - Scrollable content */}
            <div className="p-4 flex-grow flex flex-col justify-between min-h-0">
                <div className="space-y-3 overflow-hidden">
                    {/* Customer info */}
                    {sale.customer && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-1">
                            <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Cliente</p>
                            {sale.customer.email && (
                                <p className="text-sm text-blue-900 truncate">📧 {sale.customer.email}</p>
                            )}
                            {sale.customer.phone && (
                                <p className="text-sm text-blue-900">📱 {sale.customer.phone}</p>
                            )}
                        </div>
                    )}

                    {/* Date and payment method */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">📅 {formattedDate}</span>
                            <span className="text-gray-600">{paymentMethodConfig[sale.paymentMethod] || sale.paymentMethod}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Total:</span>
                            <span className="text-2xl font-bold text-green-600">${sale.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Delivery info if exists */}
                    {sale.delivery && (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 space-y-1">
                            <p className="text-xs text-purple-700 font-medium uppercase tracking-wide">Entrega</p>
                            <p className="text-sm text-purple-900 font-medium">{sale.delivery.location}</p>
                            <p className="text-xs text-purple-700">
                                {new Date(sale.delivery.scheduledDate).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs text-blue-700 font-medium mb-1">📝 Notas:</p>
                            <p className="text-sm text-blue-900 line-clamp-2">{sale.notes}</p>
                        </div>
                    )}
                </div>

                {/* Action buttons - Always at bottom */}
                <div className="flex items-center gap-2 pt-4 flex-wrap border-t border-gray-100 mt-auto">
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
                </div>
            </div>
        </div>
    )
}
