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
    const surfaceClass = isDark
        ? 'rounded-2xl backdrop-blur-xl bg-slate-900/62 p-4 lg:p-5 shadow-[14px_14px_26px_rgba(2,6,23,0.52),-10px_-10px_18px_rgba(148,163,184,0.16)]'
        : 'rounded-2xl backdrop-blur-xl bg-white/94 p-4 lg:p-5 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${surfaceClass}`}>
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
