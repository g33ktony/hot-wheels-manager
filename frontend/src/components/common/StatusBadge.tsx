import { ReactNode } from 'react'

interface StatusBadgeProps {
    label: string
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
    icon?: ReactNode
    className?: string
}

const TONE_STYLES: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function StatusBadge({
    label,
    tone = 'neutral',
    icon,
    className = '',
}: StatusBadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TONE_STYLES[tone]} ${className}`}>
            {icon}
            {label}
        </span>
    )
}
