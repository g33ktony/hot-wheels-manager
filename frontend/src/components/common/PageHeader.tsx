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
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 p-4 lg:p-5 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_22px_rgba(51,65,85,0.2)]'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] p-4 lg:p-5 shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'

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
