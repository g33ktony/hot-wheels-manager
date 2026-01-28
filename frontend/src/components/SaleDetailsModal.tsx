import React from 'react'
import { X } from 'lucide-react'
import { SaleDetailContent } from './SaleDetailContent'

interface SaleDetailsModalProps {
    sale: any | null
    isOpen: boolean
    onClose: () => void
    onOpenImageModal?: (photos: string[]) => void
    readonly?: boolean
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
    sale,
    isOpen,
    onClose,
    onOpenImageModal,
    readonly = false,
}) => {
    if (!isOpen || !sale) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-xl font-semibold text-white">Detalles de Venta</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <SaleDetailContent sale={sale} theme="dark" onOpenImageModal={!readonly ? onOpenImageModal : undefined} />
                </div>
            </div>
        </div>
    )
}
