import React from 'react'
import { X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
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
    const { colors } = useTheme()

    if (!isOpen || !sale) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${colors.bg.modal} ${colors.border.primary} border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
                <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary} sticky top-0 ${colors.bg.modal} z-10`}>
                    <h2 className={`text-xl font-semibold ${colors.text.primary}`}>Detalles de Venta</h2>
                    <button
                        onClick={onClose}
                        className={`${colors.text.tertiary} hover:${colors.text.secondary}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <SaleDetailContent sale={sale} onOpenImageModal={!readonly ? onOpenImageModal : undefined} />
                </div>
            </div>
        </div>
    )
}
