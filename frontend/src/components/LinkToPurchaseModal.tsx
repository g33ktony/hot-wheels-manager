import { useState } from 'react'
import { X, Package, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { PendingItem, Purchase } from '@shared/types'
import { usePurchases } from '../hooks/usePurchases'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LinkToPurchaseModalProps {
    pendingItem: PendingItem
    onConfirm: (purchaseId: string) => void
    onClose: () => void
}

export default function LinkToPurchaseModal({
    pendingItem,
    onConfirm,
    onClose
}: LinkToPurchaseModalProps) {
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('')

    // Fetch purchases that are not received yet (status: 'pending', 'paid', or 'shipped')
    const { data: purchases, isLoading } = usePurchases()

    const eligiblePurchases = purchases?.filter(
        (p: Purchase) => p.status === 'pending' || p.status === 'paid' || p.status === 'shipped'
    ) || []

    const selectedPurchase = eligiblePurchases.find((p: Purchase) => p._id === selectedPurchaseId)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedPurchaseId) {
            onConfirm(selectedPurchaseId)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-purple-500 text-white p-6 rounded-t-lg flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">🔗 Vincular a Compra Futura</h2>
                        <p className="text-purple-100 mt-1">
                            Agrega este item a una compra pendiente para rastrear el reenvío
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-600 rounded-full p-2 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Pending Item Info */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-orange-900 mb-2">Item Pendiente:</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-orange-700">Car ID:</p>
                                <p className="font-semibold text-orange-900">{pendingItem.carId}</p>
                            </div>
                            <div>
                                <p className="text-orange-700">Cantidad:</p>
                                <p className="font-semibold text-orange-900">{pendingItem.quantity}</p>
                            </div>
                            {pendingItem.brand && (
                                <div className="col-span-2">
                                    <p className="text-orange-700">Marca:</p>
                                    <p className="font-semibold text-orange-900">{pendingItem.brand}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-blue-900">
                            <p className="font-semibold mb-1">Importante:</p>
                            <p>Al vincular este item a una compra futura:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>El item se agregará con costo $0 (reenvío gratis)</li>
                                <li>La compra aparecerá como "Tiene items vinculados"</li>
                                <li>Al recibir la compra, el item pendiente se resolverá automáticamente</li>
                            </ul>
                        </div>
                    </div>

                    {/* Select Purchase */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Compra Futura:
                        </label>

                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">
                                Cargando compras...
                            </div>
                        ) : eligiblePurchases.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <Package className="mx-auto text-gray-400 mb-2" size={32} />
                                <p className="text-gray-600 font-medium">No hay compras pendientes</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    Crea una nueva compra para vincular este item
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {eligiblePurchases.map((purchase: Purchase) => (
                                    <label
                                        key={purchase._id}
                                        className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedPurchaseId === purchase._id
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-300 hover:border-purple-300 bg-white'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="purchase"
                                            value={purchase._id}
                                            checked={selectedPurchaseId === purchase._id}
                                            onChange={(e) => setSelectedPurchaseId(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-semibold text-gray-900">
                                                        {purchase._id ? `#${purchase._id.slice(-6)}` : '#N/A'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${purchase.status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : purchase.status === 'paid'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {purchase.status === 'pending' && 'Pendiente'}
                                                        {purchase.status === 'paid' && 'Pagada'}
                                                        {purchase.status === 'shipped' && 'Enviada'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Calendar size={14} />
                                                        {format(new Date(purchase.purchaseDate), "d MMM yyyy", { locale: es })}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Package size={14} />
                                                        {purchase.items.length} items
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-600 col-span-2">
                                                        <DollarSign size={14} />
                                                        Total: ${purchase.totalCost.toFixed(2)}
                                                    </div>
                                                </div>

                                                {purchase.notes && (
                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                                                        📝 {purchase.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {selectedPurchaseId === purchase._id && (
                                                <div className="ml-3 text-purple-500">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {selectedPurchase && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Vista Previa:</h4>
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-700">
                                    <span className="font-medium">Compra:</span> {selectedPurchase._id ? `#${selectedPurchase._id.slice(-6)}` : '#N/A'}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Se agregará:</span> {pendingItem.quantity}x {pendingItem.carId}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Costo del item:</span> <span className="text-green-600 font-semibold">$0.00</span> (reenvío)
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Nuevo total:</span> ${selectedPurchase.totalCost.toFixed(2)} (sin cambio)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedPurchaseId}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedPurchaseId
                                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Vincular Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
