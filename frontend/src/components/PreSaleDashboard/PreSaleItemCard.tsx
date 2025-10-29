import React from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2, CheckCircle, Clock, AlertCircle, Package, ChevronDown, CreditCard } from 'lucide-react'
import { useState } from 'react'
import PreSaleAssignmentModal from './PreSaleAssignmentModal'
import PreSalePaymentModal from './PreSalePaymentModal'
import { useUpdatePreSaleStatus } from '@/hooks/usePresale'

interface PreSaleItem {
    _id: string
    carId: string
    totalQuantity: number
    assignedQuantity: number
    availableQuantity: number
    basePricePerUnit: number
    markupPercentage: number
    finalPricePerUnit: number
    totalSaleAmount: number
    totalCostAmount: number
    totalProfit: number
    status: 'active' | 'completed' | 'cancelled' | 'paused'
    startDate: string
    endDate?: string
    condition?: string
    notes?: string
    carModel?: string
    brand?: string
    photo?: string
    purchaseIds?: string[]
    createdAt?: string
    updatedAt?: string
}

interface PreSaleItemCardProps {
    item: PreSaleItem
}

const PreSaleItemCard: React.FC<PreSaleItemCardProps> = ({ item }) => {
    const [showActions, setShowActions] = useState(false)
    const [showAssignmentModal, setShowAssignmentModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showStatusMenu, setShowStatusMenu] = useState(false)
    const updateStatus = useUpdatePreSaleStatus()

    const statusConfig = {
        active: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            badge: 'bg-blue-100 text-blue-800',
            icon: Clock,
            label: 'Activo',
        },
        completed: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            badge: 'bg-green-100 text-green-800',
            icon: CheckCircle,
            label: 'Completado',
        },
        cancelled: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            badge: 'bg-red-100 text-red-800',
            icon: AlertCircle,
            label: 'Cancelado',
        },
        paused: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            badge: 'bg-yellow-100 text-yellow-800',
            icon: AlertCircle,
            label: 'En Pausa',
        },
    }

    const config = statusConfig[item.status]
    const StatusIcon = config.icon

    const daysUntilEnd = item.endDate ? Math.ceil(
        (new Date(item.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ) : null

    return (
        <div
            className={`${config.bg} border-2 ${config.border} rounded-lg p-6 transition-all hover:shadow-lg`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{item.carModel || item.carId}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {item.brand || 'Hot Wheels'} • {item.carId}
                    </p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge} flex items-center gap-1 hover:opacity-80 transition`}
                    >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {/* Status Dropdown Menu */}
                    {showStatusMenu && (
                        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-40">
                            {(['active', 'completed', 'paused', 'cancelled'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={async () => {
                                        await updateStatus.mutateAsync({
                                            id: item._id,
                                            status,
                                        })
                                        setShowStatusMenu(false)
                                    }}
                                    disabled={updateStatus.isLoading || item.status === status}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition ${item.status === status ? 'bg-blue-50 font-semibold' : ''
                                        }`}
                                >
                                    {statusConfig[status].label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Display */}
            {item.photo && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-300">
                    <img
                        src={item.photo}
                        alt={item.carModel || item.carId}
                        className="w-full h-48 object-cover"
                    />
                </div>
            )}

            {/* Quantity and Condition */}
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Cantidad Total</p>
                    <p className="text-2xl font-bold text-gray-900">{item.totalQuantity}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Asignadas: {item.assignedQuantity} | Disponibles: {item.availableQuantity}
                    </p>
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
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Precio Base/U</p>
                    <p className="text-lg font-semibold text-gray-900">${item.basePricePerUnit.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Markup</p>
                    <p className="text-lg font-semibold text-blue-600">{item.markupPercentage.toFixed(1)}%</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Precio Final/U</p>
                    <p className="text-lg font-semibold text-green-600">${item.finalPricePerUnit.toFixed(2)}</p>
                </div>
            </div>

            {/* Profit */}
            <div className="bg-white bg-opacity-60 rounded p-3 mb-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-600">Costo Total</p>
                        <p className="text-lg font-bold text-red-600">${item.totalCostAmount.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600">Venta Total</p>
                        <p className="text-lg font-bold text-blue-600">${item.totalSaleAmount.toFixed(2)}</p>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">Ganancia Total</p>
                    <p className="text-lg font-bold text-green-700">${item.totalProfit.toFixed(2)}</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div>
                    <p className="text-gray-600">Inicio Pre-Venta</p>
                    <p className="font-medium text-gray-900">
                        {item.startDate ? new Date(item.startDate).toLocaleDateString('es-MX') : 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="text-gray-600">Fin Pre-Venta</p>
                    {item.endDate ? (
                        <p className={`font-medium ${daysUntilEnd && daysUntilEnd > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            {new Date(item.endDate).toLocaleDateString('es-MX')}
                            {daysUntilEnd && daysUntilEnd > 0 && <span className="text-gray-500"> ({daysUntilEnd}d)</span>}
                            {daysUntilEnd === 0 && <span className="text-red-600"> (Hoy)</span>}
                            {daysUntilEnd && daysUntilEnd < 0 && <span className="text-red-600"> (Vencido)</span>}
                        </p>
                    ) : (
                        <p className="font-medium text-gray-500">Sin especificar</p>
                    )}
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
                className={`flex gap-2 transition-opacity flex-wrap ${showActions ? 'opacity-100' : 'opacity-0 md:opacity-100'
                    }`}
            >
                {item.assignedQuantity > 0 && (
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Pagos
                    </button>
                )}
                {item.availableQuantity > 0 && (
                    <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <Package className="w-4 h-4" />
                        Asignar
                    </button>
                )}
                <Link
                    to={`/presale/${item._id}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Edit2 className="w-4 h-4" />
                    Ver Detalles
                </Link>
                <button className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                </button>
            </div>

            {/* Assignment Modal */}
            <PreSaleAssignmentModal
                isOpen={showAssignmentModal}
                onClose={() => setShowAssignmentModal(false)}
                preSaleItemId={item._id}
                availableQuantity={item.availableQuantity}
                carId={item.carId}
                purchaseId={item.purchaseIds?.[0] || ''}
            />

            {/* Payment Modal */}
            <PreSalePaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                totalAmount={item.totalSaleAmount}
                carId={item.carId}
            />
        </div>
    )
}

export default PreSaleItemCard
