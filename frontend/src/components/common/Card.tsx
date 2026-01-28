import { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
}

export default function Card({ children, className = '', hover = false }: CardProps) {
    const { colors } = useTheme()
    const baseClasses = `rounded-lg border ${colors.border.primary} ${colors.bg.card} p-3 lg:p-6 ${colors.ui.shadowCard} w-full`
    const hoverClasses = hover ? 'hover:shadow-card-hover transition-shadow cursor-pointer active:scale-[0.98]' : ''

    return (
        <div className={`${baseClasses} ${hoverClasses} ${className}`}>
            {children}
        </div>
    )
}

interface CardHeaderProps {
    children: ReactNode
    className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
    return (
        <div className={`mb-4 ${className}`}>
            {children}
        </div>
    )
}

interface CardTitleProps {
    children: ReactNode
    className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
    const { colors } = useTheme()
    return (
        <h3 className={`text-base lg:text-lg font-semibold ${colors.text.primary} ${className}`}>
            {children}
        </h3>
    )
}

interface CardContentProps {
    children: ReactNode
    className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return (
        <div className={className}>
            {children}
        </div>
    )
}
