import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estado de Pago"
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
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-300">
          Selecciona el estado de pago para esta entrega:
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('pending')}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? '...' : 'Sin Pago'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('partial')}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isLoading ? '...' : 'Parcial'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onConfirm('paid')}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? '...' : 'Pagado'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
