import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    footer?: ReactNode
    headerActions?: ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
    showCloseButton?: boolean
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    headerActions,
    maxWidth = '2xl',
    showCloseButton = true
}: ModalProps) {
    if (!isOpen) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl'
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-lg w-full ${maxWidthClasses[maxWidth]} flex flex-col max-h-[90vh]`}>
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-4 lg:p-6 border-b bg-white rounded-t-lg flex-shrink-0">
                    <h2 className="text-lg lg:text-xl font-semibold text-gray-900">{title}</h2>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                                aria-label="Cerrar"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-4 lg:p-6">
                    {children}
                </div>

                {/* Fixed Footer */}
                {footer && (
                    <div className="border-t bg-gray-50 p-4 lg:p-6 rounded-b-lg flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
