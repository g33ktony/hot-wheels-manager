import React, { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, Edit2, Save } from 'lucide-react'
import { useUpdatePreSaleFinalPrice } from '@/hooks/usePresale'

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

interface PreSaleDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const PreSaleDetailModal: React.FC<PreSaleDetailModalProps> = ({ isOpen, onClose }) => {
    const [item, setItem] = useState<PreSaleItem | null>(null)
    const [isEditingPrice, setIsEditingPrice] = useState(false)
    const [editedFinalPrice, setEditedFinalPrice] = useState<number>(0)
    const updateFinalPrice = useUpdatePreSaleFinalPrice()

    useEffect(() => {
        if (isOpen) {
            const stored = sessionStorage.getItem('selectedPresaleItem')
            if (stored) {
                const parsedItem = JSON.parse(stored)
                setItem(parsedItem)
                setEditedFinalPrice(parsedItem.finalPricePerUnit)
            }
        }
    }, [isOpen])

    const handleSaveFinalPrice = async () => {
        if (!item || editedFinalPrice === item.finalPricePerUnit) {
            setIsEditingPrice(false)
            return
        }

        try {
            await updateFinalPrice.mutateAsync({
                id: item._id,
                finalPrice: editedFinalPrice
            })
            // Update local state
            setItem({
                ...item,
                finalPricePerUnit: editedFinalPrice,
                totalSaleAmount: editedFinalPrice * item.totalQuantity,
                totalProfit: editedFinalPrice * item.totalQuantity - item.totalCostAmount,
                markupPercentage: item.basePricePerUnit === 0 
                    ? 0 
                    : ((editedFinalPrice - item.basePricePerUnit) / item.basePricePerUnit) * 100
            })
            setIsEditingPrice(false)
        } catch (error) {
            console.error('Error updating final price:', error)
        }
    }

    if (!isOpen || !item) {
        return null
    }

    const statusConfig: Record<string, { label: string; color: string }> = {
        active: { label: 'Activo', color: 'text-blue-600' },
        completed: { label: 'Completado', color: 'text-green-600' },
        cancelled: { label: 'Cancelado', color: 'text-red-600' },
        paused: { label: 'En Pausa', color: 'text-yellow-600' },
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 flex items-start justify-between p-6 border-b border-gray-200 bg-white">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{item.carModel || item.carId}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {item.brand || 'Hot Wheels'} • {item.carId}
                        </p>
                        <p className={`text-sm font-semibold mt-2 ${statusConfig[item.status]?.color || 'text-gray-600'}`}>
                            {statusConfig[item.status]?.label || item.status}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Photo */}
                    {item.photo && (
                        <div className="rounded-lg overflow-hidden border border-gray-300">
                            <img
                                src={item.photo}
                                alt={item.carModel || item.carId}
                                className="w-full h-64 object-cover"
                            />
                        </div>
                    )}

                    {/* Quantity Section */}
                    <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{item.totalQuantity}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Asignadas</p>
                            <p className="text-2xl font-bold text-blue-600">{item.assignedQuantity}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Disponibles</p>
                            <p className="text-2xl font-bold text-green-600">{item.availableQuantity}</p>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Pricing Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Base Price / Unit</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    ${item.basePricePerUnit.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Markup</p>
                                <p className="text-xl font-bold text-blue-600 mt-1">
                                    {item.markupPercentage.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Final Price / Unit</p>
                                    {isEditingPrice ? (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                type="number"
                                                value={editedFinalPrice}
                                                onChange={(e) => setEditedFinalPrice(parseFloat(e.target.value) || 0)}
                                                step="0.01"
                                                min="0"
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                            <button
                                                onClick={handleSaveFinalPrice}
                                                disabled={updateFinalPrice.isLoading}
                                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingPrice(false)
                                                    setEditedFinalPrice(item.finalPricePerUnit)
                                                }}
                                                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition text-sm font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-bold text-green-600 mt-1">
                                            ${item.finalPricePerUnit.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                {!isEditingPrice && (
                                    <button
                                        onClick={() => setIsEditingPrice(true)}
                                        className="text-blue-600 hover:text-blue-700 transition"
                                        title="Edit final price"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Financial Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Total Cost</p>
                                <p className="text-xl font-bold text-red-600 mt-1">
                                    ${item.totalCostAmount.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Total Sale</p>
                                <p className="text-xl font-bold text-blue-600 mt-1">
                                    ${item.totalSaleAmount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Total Profit</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">
                                ${item.totalProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Condition & Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Condition</h3>
                            <p className="text-lg font-semibold">
                                <span className="inline-block px-3 py-1 bg-gray-100 rounded">
                                    {item.condition === 'mint'
                                        ? '🔶 Mint'
                                        : item.condition === 'good'
                                            ? '🟡 Good'
                                            : item.condition === 'fair'
                                                ? '🟠 Fair'
                                                : '🔴 Poor'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Timeline
                            </h3>
                            <p className="text-sm text-gray-600">
                                <strong>Start:</strong> {item.startDate ? new Date(item.startDate).toLocaleDateString('es-MX') : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                <strong>End:</strong> {item.endDate ? new Date(item.endDate).toLocaleDateString('es-MX') : 'Not set'}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded">{item.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 border-t border-gray-200 bg-white p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PreSaleDetailModal
