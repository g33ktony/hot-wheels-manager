import { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    pressEffect?: boolean
}

export default function Card({ children, className = '', hover = false, pressEffect = true }: CardProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const baseClasses = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 p-3 lg:p-6 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_22px_rgba(51,65,85,0.2)] w-full'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] p-3 lg:p-6 shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)] w-full'
    const hoverClasses = hover
        ? `hover:brightness-105 transition-all cursor-pointer ${pressEffect ? 'active:scale-[0.98]' : ''}`.trim()
        : ''

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
