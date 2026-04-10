import Button from '@/components/common/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationMeta {
    totalPages: number
    totalItems: number
}

interface InventoryPaginationControlsProps {
    pagination: PaginationMeta | null | undefined
    currentPage: number
    itemsPerPage: number
    isDark: boolean
    onPageChange: (page: number) => void
}

export default function InventoryPaginationControls({
    pagination,
    currentPage,
    itemsPerPage,
    isDark,
    onPageChange,
}: InventoryPaginationControlsProps) {
    if (!pagination || pagination.totalPages <= 1) return null

    const startItem = ((currentPage - 1) * itemsPerPage) + 1
    const endItem = Math.min(currentPage * itemsPerPage, pagination.totalItems)

    const pageTokens: Array<number | 'left-gap' | 'right-gap'> = []
    const candidatePages = new Set<number>([
        1,
        pagination.totalPages,
        currentPage - 1,
        currentPage,
        currentPage + 1,
    ])

    const validPages = [...candidatePages]
        .filter((page) => page >= 1 && page <= pagination.totalPages)
        .sort((a, b) => a - b)

    validPages.forEach((page, index) => {
        const previousPage = validPages[index - 1]

        if (index > 0 && previousPage !== undefined && page - previousPage > 1) {
            pageTokens.push(index === 1 ? 'left-gap' : 'right-gap')
        }

        pageTokens.push(page)
    })

    const gapDotClass = isDark
        ? 'inline-flex items-center justify-center min-w-[30px] sm:min-w-[34px] px-2 py-1 rounded-md text-sm font-semibold text-slate-300/90 bg-slate-800/72 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.16)]'
        : 'inline-flex items-center justify-center min-w-[30px] sm:min-w-[34px] px-2 py-1 rounded-md text-sm font-semibold text-slate-600 bg-slate-100/92 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'

    return (
        <div
            className={`w-full rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 backdrop-blur-xl ${isDark
                ? 'border border-slate-700/70 bg-slate-900/90 !shadow-[14px_14px_26px_rgba(2,6,23,0.56),-10px_-10px_18px_rgba(148,163,184,0.1)]'
                : 'bg-white/94 !shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'
                }`}
        >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full flex-wrap">
                <span
                    className={`hidden md:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${isDark
                        ? 'border-slate-500/60 bg-slate-800/70 text-slate-300'
                        : 'border-slate-300 bg-slate-100/85 text-slate-600'
                        }`}
                >
                    {startItem}-{endItem} de {pagination.totalItems}
                </span>

                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 h-8 rounded-lg ${isDark
                        ? '!bg-slate-800/62 !text-white !font-bold disabled:!text-slate-400 disabled:!bg-slate-800/50 disabled:!opacity-100 !backdrop-blur-xl !shadow-[10px_10px_16px_rgba(2,6,23,0.5),-7px_-7px_12px_rgba(148,163,184,0.2)] hover:!bg-slate-700/72'
                        : '!bg-slate-200/78 !text-slate-800 !font-bold disabled:!text-slate-400 disabled:!bg-slate-200/60 disabled:!opacity-100 !backdrop-blur-xl !shadow-[10px_10px_16px_rgba(148,163,184,0.26),-7px_-7px_12px_rgba(255,255,255,0.98)] hover:!bg-slate-200/88'
                        }`}
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Anterior</span>
                </Button>

                <div
                    className={`flex items-center gap-1 rounded-xl px-1.5 py-1 ${isDark
                        ? 'bg-slate-800/92 !shadow-[8px_8px_14px_rgba(2,6,23,0.5),-6px_-6px_10px_rgba(148,163,184,0.12)]'
                        : 'bg-slate-100/86 !shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)]'
                        }`}
                >
                    {pageTokens.map((token, idx) => {
                        if (typeof token !== 'number') {
                            return (
                                <span
                                    key={`${token}-${idx}`}
                                    className={gapDotClass}
                                    aria-hidden="true"
                                >
                                    ...
                                </span>
                            )
                        }

                        const isActive = currentPage === token

                        return (
                            <button
                                key={token}
                                onClick={() => onPageChange(token)}
                                className={`min-w-[30px] sm:min-w-[34px] px-2 py-1 rounded-md text-xs sm:text-sm font-bold transition-all ${isActive
                                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/40'
                                    : isDark
                                        ? 'text-white hover:bg-slate-700/70 hover:text-white'
                                        : 'text-slate-800 hover:bg-white hover:text-slate-900'
                                    }`}
                            >
                                {token}
                            </button>
                        )
                    })}
                </div>

                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 h-8 rounded-lg ${isDark
                        ? '!bg-slate-800/62 !text-white !font-bold disabled:!text-slate-400 disabled:!bg-slate-800/50 disabled:!opacity-100 !backdrop-blur-xl !shadow-[10px_10px_16px_rgba(2,6,23,0.5),-7px_-7px_12px_rgba(148,163,184,0.2)] hover:!bg-slate-700/72'
                        : '!bg-slate-200/78 !text-slate-800 !font-bold disabled:!text-slate-400 disabled:!bg-slate-200/60 disabled:!opacity-100 !backdrop-blur-xl !shadow-[10px_10px_16px_rgba(148,163,184,0.26),-7px_-7px_12px_rgba(255,255,255,0.98)] hover:!bg-slate-200/88'
                        }`}
                    aria-label="Página siguiente"
                >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight size={16} />
                </Button>

                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${isDark
                        ? 'border-blue-300/30 bg-blue-500/10 text-blue-100'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                >
                    {currentPage}/{pagination.totalPages}
                </span>
            </div>
        </div>
    )
}
