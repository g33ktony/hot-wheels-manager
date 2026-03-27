import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useTheme } from '@/contexts/ThemeContext'
import type { Delivery } from '@shared/types'

interface NewPaymentState {
  amount: number
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other'
  notes: string
}

interface DeliveryPaymentModalProps {
  isOpen: boolean
  selectedDelivery: Delivery | null
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
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <Modal
      isOpen={isOpen && selectedDelivery !== null}
      onClose={onClose}
      title="Registrar Pago"
      maxWidth="md"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:flex-1 h-10"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="w-full sm:flex-1 h-10"
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
          <div className={`p-4 rounded-xl border space-y-2 text-sm ${isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Total:</span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>${selectedDelivery.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Pagado:</span>
              <span className="text-green-600 font-medium">${(selectedDelivery.paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className={`flex justify-between border-t pt-2 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Pendiente:</span>
              <span className="text-orange-600 font-bold">${(selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Método de Pago *
            </label>
            <select
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] touch-manipulation ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'}`}
              value={newPayment.paymentMethod}
              onChange={(e) =>
                onPaymentChange({
                  ...newPayment,
                  paymentMethod: e.target.value as NewPaymentState['paymentMethod'],
                })
              }
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Notas (opcional)
            </label>
            <textarea
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[90px] touch-manipulation ${isDark ? 'bg-slate-700 text-white border-slate-600 placeholder:text-slate-400' : 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400'}`}
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
