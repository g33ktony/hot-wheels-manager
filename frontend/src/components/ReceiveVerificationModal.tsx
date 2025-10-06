import { useState } from 'react'
import { X, CheckCircle, AlertTriangle, Package } from 'lucide-react'
import { Purchase } from '@shared/types'
import { useCreatePendingItem } from '../hooks/usePendingItems'

interface ReceiveVerificationModalProps {
  purchase: Purchase
  onConfirm: () => void
  onClose: () => void
}

interface ItemStatus {
  index: number
  received: boolean
  quantity: number
}

export default function ReceiveVerificationModal({
  purchase,
  onConfirm,
  onClose
}: ReceiveVerificationModalProps) {
  // Initialize all items as received with their original quantities
  const [itemsStatus, setItemsStatus] = useState<ItemStatus[]>(
    purchase.items.map((item, index) => ({
      index,
      received: true,
      quantity: item.quantity
    }))
  )

  const createPendingItem = useCreatePendingItem()

  const handleToggleReceived = (index: number) => {
    setItemsStatus(prev =>
      prev.map(item =>
        item.index === index ? { ...item, received: !item.received } : item
      )
    )
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    setItemsStatus(prev =>
      prev.map(item =>
        item.index === index ? { ...item, quantity } : item
      )
    )
  }

  const handleSubmit = async () => {
    // Find items that weren't fully received
    const missingItems = itemsStatus.filter(
      (status, idx) =>
        !status.received || status.quantity < purchase.items[idx].quantity
    )

    try {
      // Step 1: Create pending items for what's missing
      for (const status of missingItems) {
        const originalItem = purchase.items[status.index]
        
        // Calculate missing quantity:
        // - If not received at all: full quantity is missing
        // - If partial: difference between original and received
        const missingQuantity = !status.received 
          ? originalItem.quantity 
          : originalItem.quantity - status.quantity

        // Only create pending item if there's something missing
        if (missingQuantity > 0) {
          await createPendingItem.mutateAsync({
            originalPurchaseId: purchase._id!,
            carId: originalItem.carId,
            quantity: missingQuantity,
            unitPrice: originalItem.unitPrice,
            condition: originalItem.condition,
            brand: originalItem.brand,
            pieceType: originalItem.pieceType,
            isTreasureHunt: originalItem.isTreasureHunt
          })
        }
      }

      // Step 2: Update purchase with received quantities and mark as received
      // This will add only the received items to inventory
      const receivedQuantities = itemsStatus.map((status, index) => ({
        index,
        quantity: status.received ? status.quantity : 0
      }))

      // Call the new endpoint to update quantities and mark as received
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/purchases/${purchase._id}/receive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ receivedQuantities })
      })

      // All done!
      onConfirm()
    } catch (error: any) {
      alert(
        `❌ Error: ${error.response?.data?.message || error.message || 'No se pudo completar la recepción'}`
      )
    }
  }

  const allReceived = itemsStatus.every(
    (status, idx) => status.received && status.quantity === purchase.items[idx].quantity
  )

  const missingCount = itemsStatus.filter(
    (status, idx) =>
      !status.received || status.quantity < purchase.items[idx].quantity
  ).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-orange-500 text-white p-6 rounded-t-lg flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold">📦 Verificar Recepción de Compra</h2>
            <p className="text-orange-100 mt-1">
              Verifica qué items llegaron completos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-orange-600 rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Instrucciones:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Marca cada item como recibido o no recibido</li>
                <li>Si recibiste menos cantidad, ajusta el número</li>
                <li>Los items faltantes se registrarán como "Pendientes"</li>
                <li>Podrás gestionarlos después en la sección de Items Pendientes</li>
              </ul>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Información de la Compra:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Compra ID:</p>
                <p className="font-medium text-gray-900">#{purchase._id?.slice(-6)}</p>
              </div>
              <div>
                <p className="text-gray-600">Proveedor:</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Items totales:</p>
                <p className="font-medium text-gray-900">{purchase.items.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Costo total:</p>
                <p className="font-medium text-gray-900">${purchase.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Items Checklist */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={20} />
              Items de la Compra:
            </h3>

            {purchase.items.map((item, index) => {
              const status = itemsStatus[index]
              return (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    status.received && status.quantity === item.quantity
                      ? 'border-green-300 bg-green-50'
                      : 'border-orange-300 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={status.received}
                      onChange={() => handleToggleReceived(index)}
                      className="mt-1 w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                    />

                    {/* Item Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {item.carId}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">Marca:</span> {item.brand || 'N/A'}
                        </p>
                        <p>
                          <span className="font-medium">Condición:</span>{' '}
                          {item.condition === 'mint' && '⭐ Mint'}
                          {item.condition === 'good' && '👍 Good'}
                          {item.condition === 'fair' && '👌 Fair'}
                          {item.condition === 'poor' && '⚠️ Poor'}
                        </p>
                        <p>
                          <span className="font-medium">Precio unitario:</span> ${item.unitPrice.toFixed(2)}
                        </p>
                        <p>
                          <span className="font-medium">Total:</span> $
                          {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Input */}
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                          Cantidad recibida:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={status.quantity}
                          onChange={e =>
                            handleQuantityChange(index, parseInt(e.target.value) || 0)
                          }
                          disabled={!status.received}
                          className={`w-20 px-3 py-1 border rounded-lg text-center ${
                            !status.received
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 focus:ring-2 focus:ring-orange-500'
                          }`}
                        />
                        <span className="text-sm text-gray-600">de {item.quantity}</span>

                        {status.quantity < item.quantity && status.received && (
                          <span className="text-orange-600 text-sm font-medium ml-2">
                            ⚠️ Cantidad parcial
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {status.received && status.quantity === item.quantity ? (
                        <CheckCircle className="text-green-500" size={24} />
                      ) : (
                        <AlertTriangle className="text-orange-500" size={24} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div
            className={`rounded-lg p-4 mb-6 ${
              allReceived
                ? 'bg-green-50 border border-green-300'
                : 'bg-orange-50 border border-orange-300'
            }`}
          >
            <h4 className="font-semibold mb-2">
              {allReceived ? (
                <span className="text-green-900">✅ Todos los items recibidos</span>
              ) : (
                <span className="text-orange-900">
                  ⚠️ {missingCount} item(s) pendiente(s) o parcial(es)
                </span>
              )}
            </h4>
            {!allReceived && (
              <p className="text-sm text-orange-800">
                Los items faltantes se registrarán automáticamente como "Pendientes" y podrás
                gestionarlos desde la sección de Items Pendientes.
              </p>
            )}
          </div>

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
              onClick={handleSubmit}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
            >
              <CheckCircle size={20} />
              {allReceived ? 'Marcar como Recibida' : 'Confirmar y Registrar Pendientes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
