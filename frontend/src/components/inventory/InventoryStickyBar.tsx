import { useState, useEffect, useRef } from 'react'
import {
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Grid,
    LayoutGrid,
    Plus,
    Settings,
    X,
} from 'lucide-react'

interface PaginationMeta {
    totalPages: number
    totalItems: number
}

interface InventoryFabProps {
    isHeaderVisible: boolean
    viewMode: 'full' | 'compact'
    onToggleViewMode: () => void
    isSelectionMode: boolean
    selectedItemsCount: number
    filteredItemsCount: number
    onToggleSelectionMode: () => void
    canCreate: boolean
    onShowAddModal: () => void
    pagination: PaginationMeta | null | undefined
    currentPage: number
    onPageChange: (page: number) => void
    isDark: boolean
}

export default function InventoryFab({
    isHeaderVisible,
    viewMode,
    onToggleViewMode,
    isSelectionMode,
    selectedItemsCount,
    filteredItemsCount,
    onToggleSelectionMode,
    canCreate,
    onShowAddModal,
    pagination,
    currentPage,
    onPageChange,
    isDark,
}: InventoryFabProps) {
    const [isOpen, setIsOpen] = useState(false)
    const fabRef = useRef<HTMLDivElement>(null)
    const hasPagination = pagination && pagination.totalPages > 1

    // Close menu when header becomes visible again
    useEffect(() => {
        if (isHeaderVisible) setIsOpen(false)
    }, [isHeaderVisible])

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    // Don't render when header is visible
    if (isHeaderVisible) return null

    return (
        <div ref={fabRef} className="fixed bottom-4 right-4 z-30" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            {/* Expanded menu */}
            {isOpen && (
                <div
                    className={`absolute bottom-14 right-0 w-56 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl ${isDark
                            ? 'bg-slate-800/95 border-slate-600/80 shadow-black/40'
                            : 'bg-white/95 border-slate-200 shadow-slate-400/30'
                        }`}
                >
                    {/* Pagination mini */}
                    {hasPagination && (
                        <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <button
                                type="button"
                                onClick={() => { onPageChange(Math.max(1, currentPage - 1)) }}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                Pág {currentPage} / {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => { onPageChange(Math.min(pagination.totalPages, currentPage + 1)) }}
                                disabled={currentPage === pagination.totalPages}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="p-1.5 space-y-0.5">
                        {/* View mode toggle */}
                        <button
                            type="button"
                            onClick={() => { onToggleViewMode(); setIsOpen(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            {viewMode === 'full' ? <Grid size={16} /> : <LayoutGrid size={16} />}
                            {viewMode === 'full' ? 'Vista compacta' : 'Vista completa'}
                        </button>

                        {/* Selection mode */}
                        {filteredItemsCount > 0 && (
                            <button
                                type="button"
                                onClick={() => { onToggleSelectionMode(); setIsOpen(false) }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isSelectionMode
                                        ? 'text-primary-400 hover:bg-primary-500/10'
                                        : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
                                {isSelectionMode ? `Salir selección (${selectedItemsCount})` : 'Seleccionar'}
                            </button>
                        )}

                        {/* Add piece */}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => { onShowAddModal(); setIsOpen(false) }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-emerald-300 hover:bg-emerald-500/10' : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                            >
                                <Plus size={16} />
                                Agregar pieza
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* FAB button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${isOpen
                        ? 'bg-slate-600 text-white rotate-45 shadow-slate-900/40'
                        : 'bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-blue-900/40 hover:shadow-2xl hover:scale-105'
                    } border border-slate-500/35`}
            >
                {isOpen ? <X size={22} /> : <Settings size={22} />}
            </button>
        </div>
    )
}
