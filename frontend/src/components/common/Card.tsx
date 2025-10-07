import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
}

export default function Card({ children, className = '', hover = false }: CardProps) {
    const baseClasses = 'rounded-lg border border-gray-200 bg-white p-4 lg:p-6 shadow-card w-full max-w-full overflow-x-hidden'
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
    return (
        <h3 className={`text-base lg:text-lg font-semibold text-gray-900 ${className}`}>
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
