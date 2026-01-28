import React from 'react'
import { X } from 'lucide-react'

interface SaleDetailsModalProps {
    sale: any | null
    isOpen: boolean
    onClose: () => void
    onOpenImageModal?: (photos: string[]) => void
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
    sale,
    isOpen,
    onClose,
    onOpenImageModal,
}) => {
    if (!isOpen || !sale) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-900">Detalles de Venta</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Sale Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">Información General</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Cliente:</span> {sale.customer?.name}</p>
                                <p><span className="font-medium">Email:</span> {sale.customer?.email}</p>
                                <p><span className="font-medium">Teléfono:</span> {sale.customer?.phone}</p>
                                <p><span className="font-medium">Fecha de venta:</span> {new Date(sale.saleDate || '').toLocaleDateString('es-ES')}</p>
                                <p><span className="font-medium">Método de pago:</span> {sale.paymentMethod}</p>
                                <p><span className="font-medium">Estado:</span>
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        sale.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {sale.status === 'completed' && '✓ Completada'}
                                        {sale.status === 'pending' && 'Pendiente'}
                                        {sale.status === 'cancelled' && 'Cancelada'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">Resumen Financiero</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Total:</span> ${(sale.totalAmount || 0).toFixed(2)}</p>
                                <p><span className="font-medium">Estado de pago:</span>
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        sale.status === 'pending' ? 'bg-red-100 text-red-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {sale.status === 'completed' && '✓ Pagado'}
                                        {sale.status === 'pending' && 'Sin pagar'}
                                        {sale.status === 'cancelled' && 'Cancelada'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-4">Piezas Vendidas ({sale.items?.length || 0})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sale.items?.map((item: any, idx: number) => {
                                const inventoryItem = item.inventoryItemId ? (typeof item.inventoryItemId === 'object' ? item.inventoryItemId : null) : null
                                const photos = item.photos || inventoryItem?.photos || []
                                return (
                                    <div key={idx} className="border rounded-lg overflow-hidden">
                                        {/* Item Photos */}
                                        {photos.length > 0 && (
                                            <div className="bg-gray-100 p-3 border-b">
                                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                    {photos.slice(0, 6).map((photo: string, photoIdx: number) => (
                                                        <div
                                                            key={photoIdx}
                                                            className="aspect-square rounded overflow-hidden bg-gray-200 border border-gray-300 hover:shadow-md transition-shadow cursor-pointer"
                                                            onClick={() => onOpenImageModal && onOpenImageModal(photos)}
                                                        >
                                                            <img
                                                                src={photo}
                                                                alt={`${item.carName} - Foto ${photoIdx + 1}`}
                                                                className="w-full h-full object-cover hover:scale-110 transition-transform"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                {photos.length > 6 && (
                                                    <p className="text-xs text-gray-600 mt-2">+{photos.length - 6} fotos más</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Item Info */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">MODELO</p>
                                                    <p className="font-semibold text-gray-900">{item.carName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">CANTIDAD</p>
                                                    <p className="font-semibold text-gray-900">{item.quantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">PRECIO UNITARIO</p>
                                                    <p className="font-semibold text-gray-900">${item.unitPrice?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">COSTO UNITARIO</p>
                                                    <p className="font-semibold text-gray-900">${(item.costPrice !== undefined && item.costPrice !== null) ? item.costPrice.toFixed(2) : '0.00'}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm"><span className="font-medium">Subtotal:</span> <span className="font-semibold text-green-600">${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-sm"><span className="font-medium">Costo Total:</span> <span className="font-semibold text-orange-600">${((item.costPrice || 0) * item.quantity).toFixed(2)}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-sm"><span className="font-medium">Ganancia:</span> <span className="font-semibold text-blue-600">${((item.profit !== undefined && item.profit !== null) ? item.profit : (item.quantity * (item.unitPrice || 0) - (item.costPrice || 0) * item.quantity)).toFixed(2)}</span></p>
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
                        <div className="mb-6">
                            <h3 className="font-medium text-gray-900 mb-2">Notas</h3>
                            <p className="text-sm text-gray-700">{sale.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
