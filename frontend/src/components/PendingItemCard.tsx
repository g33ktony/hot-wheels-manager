import { PendingItem } from '@shared/types'
import {
    Package,
    DollarSign,
    Calendar,
    AlertCircle,
    Edit,
    Link as LinkIcon,
    XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PendingItemCardProps {
    item: PendingItem
    onEdit: (item: PendingItem) => void
    onLinkToPurchase: (item: PendingItem) => void
    onMarkRefunded: (item: PendingItem) => void
    onCancel: (item: PendingItem) => void
}

export default function PendingItemCard({
    item,
    onEdit,
    onLinkToPurchase,
    onMarkRefunded,
    onCancel
}: PendingItemCardProps) {

    // Calculate days since reported
    const daysSinceReported = Math.floor(
        (new Date().getTime() - new Date(item.reportedDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    const isOverdue = daysSinceReported > 15

    // Status colors and labels
    const statusConfig = {
        'pending-reshipment': {
            color: 'orange',
            label: 'Pendiente de reenvío',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-300',
            textColor: 'text-orange-800'
        },
        'requesting-refund': {
            color: 'yellow',
            label: 'Solicitando reembolso',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-300',
            textColor: 'text-yellow-800'
        },
        'refunded': {
            color: 'green',
            label: 'Reembolsado',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-300',
            textColor: 'text-green-800'
        },
        'cancelled': {
            color: 'gray',
            label: 'Cancelado',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-300',
            textColor: 'text-gray-800'
        }
    }

    const status = statusConfig[item.status]
    const totalValue = item.unitPrice * item.quantity

    return (
        <div className={`bg-white rounded-lg shadow-sm border-2 ${status.borderColor} hover:shadow-md transition-shadow`}>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            🟠 {item.carId}
                            {isOverdue && (
                                <span className="text-red-500 text-sm">
                                    <AlertCircle size={16} className="inline" /> {daysSinceReported} días
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {item.brand && `${item.brand} • `}
                            {item.condition === 'mint' && '⭐ Mint'}
                            {item.condition === 'good' && '👍 Good'}
                            {item.condition === 'fair' && '👌 Fair'}
                            {item.condition === 'poor' && '⚠️ Poor'}
                            {item.pieceType && ` • ${item.pieceType.toUpperCase()}`}
                        </p>
                    </div>

                    <div className={`px-3 py-1 rounded-full ${status.bgColor} ${status.textColor} text-xs font-medium`}>
                        {status.label}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-gray-400" />
                        <span className="text-gray-600">Cantidad:</span>
                        <span className="font-semibold">{item.quantity}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign size={16} className="text-gray-400" />
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">${totalValue.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm col-span-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-600">Reportado:</span>
                        <span className="font-medium">
                            {format(new Date(item.reportedDate), "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                        <span className="text-gray-500">({daysSinceReported} días)</span>
                    </div>
                </div>

                {/* Purchase Info */}
                {item.originalPurchase && (
                    <div className="bg-gray-50 rounded p-2 mb-3 text-sm">
                        <p className="text-gray-600">
                            Compra original: <span className="font-medium">#{item.originalPurchaseId.slice(-6)}</span>
                        </p>
                    </div>
                )}

                {/* Linked Purchase */}
                {item.linkedToPurchaseId && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-sm">
                        <p className="text-blue-800 flex items-center gap-2">
                            <LinkIcon size={14} />
                            Vinculado a compra #{item.linkedToPurchaseId.slice(-6)}
                        </p>
                    </div>
                )}

                {/* Refund Info */}
                {item.status === 'refunded' && item.refundAmount && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 mb-3 text-sm">
                        <p className="text-green-800 font-medium">
                            💰 Reembolsado: ${item.refundAmount.toFixed(2)}
                        </p>
                        {item.refundDate && (
                            <p className="text-green-700 text-xs mt-1">
                                {format(new Date(item.refundDate), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        )}
                        {item.refundMethod && (
                            <p className="text-green-700 text-xs">
                                Método: {item.refundMethod}
                            </p>
                        )}
                    </div>
                )}

                {/* Notes */}
                {item.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
                        <p className="text-yellow-800 text-xs font-medium mb-1">Notas:</p>
                        <p className="text-yellow-900">{item.notes}</p>
                    </div>
                )}

                {/* Actions */}
                {item.status !== 'refunded' && item.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                        <button
                            onClick={() => onEdit(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                        >
                            <Edit size={14} />
                            Editar
                        </button>

                        {!item.linkedToPurchaseId && (
                            <button
                                onClick={() => onLinkToPurchase(item)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm transition-colors"
                            >
                                <LinkIcon size={14} />
                                Agregar a Compra
                            </button>
                        )}

                        <button
                            onClick={() => onMarkRefunded(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-sm transition-colors"
                        >
                            <DollarSign size={14} />
                            Marcar Reembolsado
                        </button>

                        <button
                            onClick={() => onCancel(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition-colors"
                        >
                            <XCircle size={14} />
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
