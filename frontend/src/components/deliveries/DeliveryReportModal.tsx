import { X } from 'lucide-react'
import DeliveryReport from '@/components/DeliveryReport'

interface DeliveryReportModalProps {
  isOpen: boolean
  selectedDelivery: any
  onClose: () => void
}

export default function DeliveryReportModal({
  isOpen,
  selectedDelivery,
  onClose,
}: DeliveryReportModalProps) {
  if (!isOpen || !selectedDelivery) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-white">Reporte de Entrega</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <DeliveryReport delivery={selectedDelivery} onClose={onClose} inline />
        </div>
      </div>
    </div>
  )
}
