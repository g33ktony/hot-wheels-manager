import React from 'react'
import { X } from 'lucide-react'
import { SaleDetailContent } from './SaleDetailContent'

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
                    <SaleDetailContent sale={sale} theme="light" onOpenImageModal={onOpenImageModal} />
                </div>
            </div>
        </div>
    )
}
