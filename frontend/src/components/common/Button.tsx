import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    icon?: ReactNode
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    // Neumorphic raised base with iOS-safe touch behavior
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-100 disabled:pointer-events-none shadow-[14px_14px_28px_rgba(2,6,23,0.42),-10px_-10px_22px_rgba(255,255,255,0.12)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] touch-manipulation select-none'

    const variantClasses = {
        primary: 'bg-[linear-gradient(145deg,#3b82f6,#1d4ed8)] text-white shadow-[255,255,0.24)] hover:brightness-110 focus:ring-primary-500',
        secondary: 'bg-[linear-gradient(145deg,#f8fafc,#e2e8f0)] text-slate-800 shadow-[12px_12px_22px_rgba(148,163,184,0.32),-10px_-10px_18px_rgba(255,255,255,0.98),255,255,0.95)] hover:brightness-95 focus:ring-slate-400',
        success: 'bg-[linear-gradient(145deg,#34d399,#059669)] text-white shadow-[255,255,0.22)] hover:brightness-110 focus:ring-success-500',
        warning: 'bg-[linear-gradient(145deg,#fbbf24,#d97706)] text-white shadow-[255,255,0.22)] hover:brightness-110 focus:ring-warning-500',
        danger: 'bg-[linear-gradient(145deg,#f87171,#dc2626)] text-white shadow-[255,255,0.22)] hover:brightness-110 focus:ring-danger-500',
    }

    // iOS Human Interface Guidelines: minimum 44x44pt touch targets
    const sizeClasses = {
        sm: 'px-3 py-2.5 text-sm min-h-[44px]',
        md: 'px-4 py-3 text-sm min-h-[44px]',
        lg: 'px-6 py-4 text-base min-h-[52px]',
    }

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || loading}
            style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
            }}
            {...props}
        >
            {loading && (
                <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            )}
            {icon && !loading && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    )
}
