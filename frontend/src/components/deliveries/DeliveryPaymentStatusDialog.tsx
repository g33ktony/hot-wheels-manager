import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { useTheme } from '@/contexts/ThemeContext'

interface DeliveryPaymentStatusDialogProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onConfirm: (paymentStatus: 'pending' | 'partial' | 'paid') => void
}

export default function DeliveryPaymentStatusDialog({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}: DeliveryPaymentStatusDialogProps) {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estado de Pago"
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
        </div>
      }
    >
      <div className="space-y-4">
        <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
          Selecciona el estado de pago para esta entrega:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('pending')}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white h-10"
          >
            {isLoading ? '...' : 'Sin Pago'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('partial')}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700 text-white h-10"
          >
            {isLoading ? '...' : 'Parcial'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('paid')}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white h-10"
          >
            {isLoading ? '...' : 'Pagado'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
