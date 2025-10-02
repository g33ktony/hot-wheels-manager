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
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm hover:shadow-md'

    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-0.5 focus:ring-primary-500 active:translate-y-0',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:-translate-y-0.5 focus:ring-gray-500 active:translate-y-0',
        success: 'bg-success-600 text-white hover:bg-success-700 hover:-translate-y-0.5 focus:ring-success-500 active:translate-y-0',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 hover:-translate-y-0.5 focus:ring-warning-500 active:translate-y-0',
        danger: 'bg-danger-600 text-white hover:bg-danger-700 hover:-translate-y-0.5 focus:ring-danger-500 active:translate-y-0',
    }

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    }

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || loading}
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
