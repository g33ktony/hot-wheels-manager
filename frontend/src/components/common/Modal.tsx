import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

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
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    useEffect(() => {
        if (!isOpen) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEscape)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

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
        <div
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] p-0 sm:p-4 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div
                className={`w-full ${maxWidthClasses[maxWidth]} flex flex-col max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'} backdrop-blur`}>
                    <h2 className={`text-base sm:text-lg font-semibold pr-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                aria-label="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className={`overflow-y-auto flex-1 px-4 py-3 sm:px-5 sm:py-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    {children}
                </div>

                {footer && (
                    <div className={`sticky bottom-0 z-10 border-t px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'} backdrop-blur`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
