import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

interface NewPaymentState {
  amount: number
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other'
  notes: string
}

interface DeliveryPaymentModalProps {
  isOpen: boolean
  selectedDelivery: any
  newPayment: NewPaymentState
  isLoading: boolean
  onClose: () => void
  onSubmit: () => void
  onPaymentChange: (next: NewPaymentState) => void
}

export default function DeliveryPaymentModal({
  isOpen,
  selectedDelivery,
  newPayment,
  isLoading,
  onClose,
  onSubmit,
  onPaymentChange,
}: DeliveryPaymentModalProps) {
  return (
    <Modal
      isOpen={isOpen && selectedDelivery !== null}
      onClose={onClose}
      title="Registrar Pago"
      maxWidth="md"
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSubmit}
            disabled={isLoading || newPayment.amount <= 0}
          >
            {isLoading ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      }
    >
      {selectedDelivery && (
        <div className="space-y-4">
          <div className="bg-slate-700/30 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total:</span>
              <span className="font-medium">${selectedDelivery.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pagado:</span>
              <span className="text-green-600 font-medium">${(selectedDelivery.paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-white font-medium">Pendiente:</span>
              <span className="text-orange-600 font-bold">${(selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto a Pagar *
            </label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={newPayment.amount || ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  onPaymentChange({ ...newPayment, amount: 0 })
                } else {
                  const num = parseFloat(val)
                  onPaymentChange({ ...newPayment, amount: isNaN(num) ? 0 : num })
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  onPaymentChange({ ...newPayment, amount: 0 })
                }
              }}
              step="0.01"
              min="0"
              max={selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)}
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago *
            </label>
            <select
              className="w-full px-4 py-3 text-base border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] touch-manipulation"
              value={newPayment.paymentMethod}
              onChange={(e) => onPaymentChange({ ...newPayment, paymentMethod: e.target.value as any })}
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              className="w-full px-4 py-3 text-base border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px] touch-manipulation"
              placeholder="Detalles adicionales del pago..."
              value={newPayment.notes}
              onChange={(e) => onPaymentChange({ ...newPayment, notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
