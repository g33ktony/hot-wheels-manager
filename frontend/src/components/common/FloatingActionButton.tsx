import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface FloatingActionButtonProps {
    icon: React.ReactNode
    badge?: number
    onClick: () => void
    variant: 'delivery' | 'pos'
    ariaLabel: string
    className?: string // Optional override for positioning
}

export default function FloatingActionButton({
    icon,
    badge = 0,
    onClick,
    variant,
    ariaLabel,
    className
}: FloatingActionButtonProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    // No mostrar si no hay badge
    if (!badge || badge <= 0) return null

    // Colores según variante
    const variantStyles = {
        delivery: {
            bg: isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
            badge: isDark ? 'bg-red-500' : 'bg-red-600'
        },
        pos: {
            bg: isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600',
            badge: isDark ? 'bg-orange-500' : 'bg-orange-600'
        }
    }

    const styles = variantStyles[variant]

    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            className={`
                ${className || 'fixed bottom-6 right-6 z-50'}
                w-14 h-14 rounded-full
                ${styles.bg}
                text-white
                shadow-lg hover:shadow-xl
                transition-all duration-200
                flex items-center justify-center
                animate-in fade-in zoom-in duration-300
                active:scale-95
                focus:outline-none focus:ring-4 focus:ring-offset-2
                ${variant === 'delivery' ? 'focus:ring-blue-400' : 'focus:ring-green-400'}
            `}
        >
            {/* Icono principal */}
            <div className="relative">
                {icon}

                {/* Badge con cantidad */}
                {badge > 0 && (
                    <span
                        className={`
                            absolute -top-2 -right-2
                            ${styles.badge}
                            text-white text-xs font-bold
                            rounded-full
                            min-w-[20px] h-5
                            flex items-center justify-center
                            px-1.5
                            shadow-md
                            animate-in zoom-in duration-200
                        `}
                    >
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>

            {/* Ripple effect en hover */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-0 hover:opacity-20 transition-opacity" />
        </button>
    )
}
