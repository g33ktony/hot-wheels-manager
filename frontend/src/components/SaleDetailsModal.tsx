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
    const { colors, mode } = useTheme()

    if (!isOpen || !sale) return null

    return (
        <div className="fixed inset-0 bg-slate-950/56 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${colors.bg.modal} rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[22px_22px_46px_rgba(15,23,42,0.35),-14px_-14px_30px_rgba(255,255,255,0.08)]`}>
                <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary} sticky top-0 ${colors.bg.modal} z-10 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.2)]`}>
                    <h2 className={`text-xl font-semibold ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Detalles de Venta</h2>
                    <button
                        onClick={onClose}
                        className={`rounded-lg p-2 transition-colors ${mode === 'dark'
                            ? 'text-slate-100 hover:text-white bg-slate-900/55 shadow-[8px_8px_16px_rgba(2,6,23,0.55),-6px_-6px_12px_rgba(148,163,184,0.14)]'
                            : 'text-slate-700 hover:text-slate-900 bg-white/92 shadow-[8px_8px_16px_rgba(148,163,184,0.22),-6px_-6px_12px_rgba(255,255,255,0.82)]'}`}
                        aria-label="Cerrar modal de venta"
                    >
                        <X size={20} className={mode === 'dark' ? 'text-slate-100' : 'text-slate-800'} />
                    </button>
                </div>

                <div className="p-6">
                    <SaleDetailContent sale={sale} theme={mode} onOpenImageModal={!readonly ? onOpenImageModal : undefined} />
                </div>
            </div>
        </div>
    )
}
