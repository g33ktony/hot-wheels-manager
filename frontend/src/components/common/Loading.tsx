import { useTheme } from '@/contexts/ThemeContext'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    }

    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    )
}

interface LoadingProps {
    text?: string
    fullScreen?: boolean
}

export function Loading({ text = 'Cargando...', fullScreen = false }: LoadingProps) {
    const { mode } = useTheme()

    const containerClasses = fullScreen
        ? `fixed inset-0 flex items-center justify-center z-50 transition-colors ${mode === 'dark'
            ? 'bg-slate-950/92'
            : 'bg-white/92'
        }`
        : 'flex items-center justify-center py-12'

    const cardClasses = fullScreen
        ? `px-6 py-5 rounded-2xl shadow-xl border backdrop-blur ${mode === 'dark'
            ? 'bg-slate-900/80 border-slate-700 text-slate-200'
            : 'bg-white/90 border-gray-200 text-gray-800'
        }`
        : 'text-center'

    const textClasses = mode === 'dark' ? 'text-slate-400' : 'text-gray-600'

    return (
        <div className={containerClasses}>
            <div className={cardClasses}>
                <LoadingSpinner size="lg" className="text-primary-600 mx-auto" />
                <p className={`mt-4 text-sm ${textClasses}`}>{text}</p>
            </div>
        </div>
    )
}
