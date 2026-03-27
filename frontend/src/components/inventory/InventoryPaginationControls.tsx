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

    return (
        <div className={`border rounded-lg p-3 w-full ${isDark ? 'bg-slate-800' : 'bg-white border-gray-200'}`}>
            <div className={`hidden sm:flex items-center justify-center text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>
                    Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> -{' '}
                    <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, pagination.totalItems)}
                    </span> de{' '}
                    <span className="font-medium">{pagination.totalItems}</span> items
                </span>
            </div>

            <div className={`sm:hidden text-xs text-center mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.totalItems)} de {pagination.totalItems} items
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-2 sm:px-3"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Anterior</span>
                </Button>

                <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages)].map((_, idx) => {
                        const pageNum = idx + 1
                        if (
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`px-2 sm:px-3 py-1 rounded text-sm font-medium transition-colors min-w-[32px] ${currentPage === pageNum
                                        ? 'bg-primary-500 text-white'
                                        : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            )
                        } else if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                        ) {
                            return <span key={pageNum} className={`px-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>...</span>
                        }
                        return null
                    })}
                </div>

                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="flex items-center gap-1 px-2 sm:px-3"
                >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    )
}
