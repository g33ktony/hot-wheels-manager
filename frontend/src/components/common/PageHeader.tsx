import { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface PageHeaderProps {
    title: string
    subtitle?: string
    icon?: ReactNode
    actions?: ReactNode
}

export default function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {icon && <span className="inline mr-2 align-middle">{icon}</span>}
                    {title}
                </h1>
                {subtitle && (
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions}
        </div>
    )
}
