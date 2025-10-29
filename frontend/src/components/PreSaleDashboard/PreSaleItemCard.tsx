import React from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface PreSaleItem {
    _id: string
    carId: string
    quantity: number
    unitPrice: number
    markup: number
    baseTotalPrice: number
    finalTotalPrice: number
    profitPerUnit: number
    totalProfit: number
    status: 'pending' | 'in-progress' | 'completed'
    purchaseDate: string
    preSaleEndDate: string
    condition: string
    notes?: string
    supplierId: string
    supplierName?: string
}

interface PreSaleItemCardProps {
    item: PreSaleItem
}

const PreSaleItemCard: React.FC<PreSaleItemCardProps> = ({ item }) => {
    const [showActions, setShowActions] = useState(false)

    const statusConfig = {
        pending: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            badge: 'bg-yellow-100 text-yellow-800',
            icon: AlertCircle,
            label: 'Pendiente',
        },
        'in-progress': {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            badge: 'bg-blue-100 text-blue-800',
            icon: Clock,
            label: 'En Progreso',
        },
        completed: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            badge: 'bg-green-100 text-green-800',
            icon: CheckCircle,
            label: 'Completado',
        },
    }

    const config = statusConfig[item.status]
    const StatusIcon = config.icon

    const daysUntilEnd = Math.ceil(
        (new Date(item.preSaleEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    return (
        <div
            className={`${config.bg} border-2 ${config.border} rounded-lg p-6 transition-all hover:shadow-lg`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{item.carId}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {item.supplierName || item.supplierId}
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                </div>
            </div>

            {/* Quantity and Condition */}
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Cantidad</p>
                    <p className="text-2xl font-bold text-gray-900">{item.quantity}</p>
                    <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Condición</p>
                    <div className="text-lg font-semibold text-gray-900">
                        <span className="inline-block px-3 py-1 bg-white rounded text-sm mt-1">
                            {item.condition === 'mint'
                                ? '🔶 Mint'
                                : item.condition === 'good'
                                    ? '🟡 Good'
                                    : item.condition === 'fair'
                                        ? '🟠 Fair'
                                        : '🔴 Poor'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Precio Unit.</p>
                    <p className="text-lg font-semibold text-gray-900">${item.unitPrice.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Markup</p>
                    <p className="text-lg font-semibold text-blue-600">{item.markup}%</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Precio Final</p>
                    <p className="text-lg font-semibold text-green-600">${item.finalTotalPrice.toFixed(2)}</p>
                </div>
            </div>

            {/* Profit */}
            <div className="bg-white bg-opacity-60 rounded p-3 mb-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-600">Ganancia/Unidad</p>
                        <p className="text-lg font-bold text-green-600">${item.profitPerUnit.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600">Ganancia Total</p>
                        <p className="text-lg font-bold text-green-700">${item.totalProfit.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div>
                    <p className="text-gray-600">Compra</p>
                    <p className="font-medium text-gray-900">
                        {new Date(item.purchaseDate).toLocaleDateString('es-MX')}
                    </p>
                </div>
                <div>
                    <p className="text-gray-600">Fin Pre-Venta</p>
                    <p className={`font-medium ${daysUntilEnd > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {new Date(item.preSaleEndDate).toLocaleDateString('es-MX')}
                        {daysUntilEnd > 0 && <span className="text-gray-500"> ({daysUntilEnd}d)</span>}
                        {daysUntilEnd === 0 && <span className="text-red-600"> (Hoy)</span>}
                        {daysUntilEnd < 0 && <span className="text-red-600"> (Vencido)</span>}
                    </p>
                </div>
            </div>

            {/* Notes */}
            {item.notes && (
                <div className="mb-4 p-3 bg-white bg-opacity-60 rounded">
                    <p className="text-xs text-gray-600 mb-1">Notas</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{item.notes}</p>
                </div>
            )}

            {/* Actions */}
            <div
                className={`flex gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 md:opacity-100'
                    }`}
            >
                <Link
                    to={`/presale/purchase/${item._id}/edit`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Edit2 className="w-4 h-4" />
                    Editar
                </Link>
                <button className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                </button>
            </div>
        </div>
    )
}

export default PreSaleItemCard
