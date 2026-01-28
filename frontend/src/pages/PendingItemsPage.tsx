import { useState } from 'react'
import { AlertCircle, Package, DollarSign, Filter } from 'lucide-react'
import PendingItemCard from '../components/PendingItemCard'
import LinkToPurchaseModal from '../components/LinkToPurchaseModal'
import MarkRefundedModal from '../components/MarkRefundedModal'
import {
    usePendingItems,
    usePendingItemsStats,
    useLinkToPurchase,
    useMarkAsRefunded,
    useUpdatePendingItem
} from '../hooks/usePendingItems'

import { PendingItem } from '@shared/types'

export default function PendingItemsPage() {
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [overdueFilter, setOverdueFilter] = useState<boolean>(false)
    const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [showRefundModal, setShowRefundModal] = useState(false)

    // Prepare filters
    const filters: { status?: string; overdue?: boolean } = {}
    if (statusFilter !== 'all') {
        filters.status = statusFilter
    }
    if (overdueFilter) {
        filters.overdue = true
    }

    const { data: items, isLoading, error } = usePendingItems(filters)
    const { data: stats } = usePendingItemsStats()
    const linkToPurchase = useLinkToPurchase()
    const markAsRefunded = useMarkAsRefunded()
    const updatePendingItem = useUpdatePendingItem()

    const handleEdit = (_item: PendingItem) => {
        // TODO: Implement edit modal
        alert('Funcionalidad de edición pendiente')
    }

    const handleLinkToPurchase = (item: PendingItem) => {
        setSelectedItem(item)
        setShowLinkModal(true)
    }

    const handleConfirmLink = async (purchaseId: string) => {
        if (!selectedItem?._id) return

        try {
            await linkToPurchase.mutateAsync({
                id: selectedItem._id,
                purchaseId
            })
            setShowLinkModal(false)
            setSelectedItem(null)
            alert('✅ Item vinculado exitosamente a la compra')
        } catch (error: any) {
            alert(`❌ Error: ${error.response?.data?.message || 'No se pudo vincular el item'}`)
        }
    }

    const handleMarkRefunded = (item: PendingItem) => {
        setSelectedItem(item)
        setShowRefundModal(true)
    }

    const handleConfirmRefund = async (data: { refundAmount: number; refundDate: Date; refundMethod: string }) => {
        if (!selectedItem?._id) return

        try {
            await markAsRefunded.mutateAsync({
                id: selectedItem._id,
                payload: data
            })
            setShowRefundModal(false)
            setSelectedItem(null)
            alert('✅ Reembolso registrado exitosamente')
        } catch (error: any) {
            alert(`❌ Error: ${error.response?.data?.message || 'No se pudo registrar el reembolso'}`)
        }
    }

    const handleCancel = async (item: PendingItem) => {
        if (!item._id) return

        if (!confirm('¿Estás seguro de cancelar este item pendiente?')) {
            return
        }

        try {
            await updatePendingItem.mutateAsync({
                id: item._id,
                payload: { status: 'cancelled' }
            })
            alert('✅ Item cancelado exitosamente')
        } catch (error: any) {
            alert(`❌ Error: ${error.response?.data?.message || 'No se pudo cancelar el item'}`)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                    🟠 Items Pendientes
                </h1>
                <p className="text-slate-400 mt-2">
                    Gestiona los items que no llegaron completos en tus compras
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-700 text-sm font-medium">Total Pendientes</p>
                                <p className="text-3xl font-bold text-orange-900">{stats.totalCount}</p>
                            </div>
                            <Package className="text-orange-400" size={32} />
                        </div>
                    </div>

                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-yellow-700 text-sm font-medium">En Reenvío</p>
                                <p className="text-3xl font-bold text-yellow-900">{stats.byStatus['pending-reshipment'] || 0}</p>
                            </div>
                            <Package className="text-yellow-400" size={32} />
                        </div>
                    </div>

                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-700 text-sm font-medium">Vencidos (+15 días)</p>
                                <p className="text-3xl font-bold text-red-900">{stats.overdueCount}</p>
                            </div>
                            <AlertCircle className="text-red-400" size={32} />
                        </div>
                    </div>

                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-700 text-sm font-medium">Valor Total</p>
                                <p className="text-3xl font-bold text-green-900">${stats.totalValue.toFixed(2)}</p>
                            </div>
                            <DollarSign className="text-green-400" size={32} />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={20} className="text-slate-400" />
                    <h2 className="font-semibold text-white">Filtros</h2>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado:
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="all">Todos</option>
                            <option value="pending-reshipment">Pendiente de reenvío</option>
                            <option value="requesting-refund">Solicitando reembolso</option>
                            <option value="refunded">Reembolsado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={overdueFilter}
                                onChange={(e) => setOverdueFilter(e.target.checked)}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-slate-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Solo vencidos (+15 días)
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Items List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-slate-400 mt-4">Cargando items pendientes...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8 text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-red-900 mb-2">Error al cargar items</h3>
                    <p className="text-red-700">No se pudieron cargar los items pendientes. Por favor, intenta de nuevo.</p>
                </div>
            ) : items && items.items.length === 0 ? (
                <div className="bg-slate-700/30 border-2 border-dashed border-slate-600 rounded-lg p-12 text-center">
                    <Package className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-white mb-2">No hay items pendientes</h3>
                    <p className="text-slate-400">
                        {statusFilter !== 'all' || overdueFilter
                            ? 'No se encontraron items con los filtros seleccionados'
                            : '¡Todas tus compras han llegado completas!'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {items?.items.map((item: PendingItem) => (
                        <PendingItemCard
                            key={item._id}
                            item={item}
                            onEdit={handleEdit}
                            onLinkToPurchase={handleLinkToPurchase}
                            onMarkRefunded={handleMarkRefunded}
                            onCancel={handleCancel}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showLinkModal && selectedItem && (
                <LinkToPurchaseModal
                    pendingItem={selectedItem}
                    onConfirm={handleConfirmLink}
                    onClose={() => {
                        setShowLinkModal(false)
                        setSelectedItem(null)
                    }}
                />
            )}

            {showRefundModal && selectedItem && (
                <MarkRefundedModal
                    pendingItem={selectedItem}
                    onConfirm={handleConfirmRefund}
                    onClose={() => {
                        setShowRefundModal(false)
                        setSelectedItem(null)
                    }}
                />
            )}
        </div>
    )
}
