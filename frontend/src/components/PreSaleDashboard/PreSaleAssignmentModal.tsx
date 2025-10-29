import React, { useState } from 'react'
import { useAssignPreSaleUnits } from '@/hooks/usePresale'
import { useDeliveries } from '@/hooks/useDeliveries'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/Loading'
import { AlertCircle } from 'lucide-react'

interface PreSaleAssignmentModalProps {
    isOpen: boolean
    onClose: () => void
    preSaleItemId: string
    availableQuantity: number
    carId: string
    purchaseId: string
}

const PreSaleAssignmentModal: React.FC<PreSaleAssignmentModalProps> = ({
    isOpen,
    onClose,
    preSaleItemId,
    availableQuantity,
    carId,
    purchaseId,
}) => {
    const [quantity, setQuantity] = useState(1)
    const [selectedDeliveryId, setSelectedDeliveryId] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries()
    const assignUnits = useAssignPreSaleUnits()

    const handleAssign = async () => {
        const newErrors: Record<string, string> = {}

        if (!selectedDeliveryId) {
            newErrors.deliveryId = 'Delivery is required'
        }

        if (quantity < 1 || quantity > availableQuantity) {
            newErrors.quantity = `Quantity must be between 1 and ${availableQuantity}`
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            await assignUnits.mutateAsync({
                id: preSaleItemId,
                deliveryId: selectedDeliveryId,
                quantity,
                purchaseId,
            })

            // Reset and close
            setQuantity(1)
            setSelectedDeliveryId('')
            setErrors({})
            onClose()
        } catch (error) {
            // Error is handled by the hook
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Asignar Unidades - ${carId}`}
        >
            <div className="space-y-4">
                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">Disponible para asignar</p>
                        <p className="text-lg font-bold text-blue-600">{availableQuantity} unidades</p>
                    </div>
                </div>

                {/* Delivery Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entrega
                    </label>
                    <select
                        value={selectedDeliveryId}
                        onChange={(e) => {
                            setSelectedDeliveryId(e.target.value)
                            setErrors({ ...errors, deliveryId: '' })
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryId ? 'border-red-500' : 'border-gray-300'
                            }`}
                    >
                        <option value="">Selecciona una entrega...</option>
                        {deliveries.map((delivery: any) => (
                            <option key={delivery._id} value={delivery._id}>
                                {delivery.name} - {delivery.date ? new Date(delivery.date).toLocaleDateString('es-MX') : 'Sin fecha'}
                            </option>
                        ))}
                    </select>
                    {errors.deliveryId && (
                        <p className="text-sm text-red-500 mt-1">{errors.deliveryId}</p>
                    )}
                </div>

                {/* Quantity Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad a Asignar
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            −
                        </button>
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                                const val = Math.max(1, Math.min(availableQuantity, parseInt(e.target.value) || 1))
                                setQuantity(val)
                                setErrors({ ...errors, quantity: '' })
                            }}
                            min="1"
                            max={availableQuantity}
                            className="text-center flex-1"
                        />
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            +
                        </button>
                    </div>
                    {errors.quantity && (
                        <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
                    )}
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-600">Resumen de asignación</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-gray-600">Auto a asignar</p>
                            <p className="font-bold text-gray-900">{carId}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Unidades</p>
                            <p className="font-bold text-gray-900">{quantity}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                        Cancelar
                    </button>
                    <Button
                        onClick={handleAssign}
                        disabled={assignUnits.isLoading || deliveriesLoading}
                        className="flex-1"
                    >
                        {assignUnits.isLoading ? (
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                Asignando...
                            </div>
                        ) : (
                            'Asignar Unidades'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

export default PreSaleAssignmentModal
