import React, { useState, useEffect } from 'react'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useTheme } from '@/contexts/ThemeContext'
import PreSaleItemCard from './PreSaleItemCard'
import PreSaleFilters from './PreSaleFilters'
import PreSaleStats from './PreSaleStats'
import PreSaleDetailModal from './PreSaleDetailModal'
import { Filter, RefreshCw, Archive, Clock } from 'lucide-react'

// Updated: 2025-10-28 - Photo feature and route fixes deployed
type FilterType = 'all' | 'pending' | 'in-progress' | 'completed'
type ViewType = 'active' | 'archived'

interface Filters {
    status: FilterType
    carId: string
    supplierId: string
    searchTerm: string
}

const PreSaleDashboard: React.FC = () => {
    const { data: preSalesData, isLoading, error, refetch } = usePreSaleItems()
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [activeView, setActiveView] = useState<ViewType>('active')
    const [filters, setFilters] = useState<Filters>({
        status: 'all',
        carId: '',
        supplierId: '',
        searchTerm: '',
    })
    const [showFilters, setShowFilters] = useState(false)

    // Listen for detail modal trigger
    useEffect(() => {
        const handleShowDetail = () => {
            setShowDetailModal(true)
        }
        window.addEventListener('showPresaleDetail', handleShowDetail)
        return () => window.removeEventListener('showPresaleDetail', handleShowDetail)
    }, [])

    const preSales = preSalesData || []

    // Separate active and archived items
    const activeItems = preSales.filter((item: any) => item.status !== 'completed')
    const archivedItems = preSales.filter((item: any) => item.status === 'completed')
    const itemsToDisplay = activeView === 'active' ? activeItems : archivedItems

    // Apply filters
    const filteredPreSales = itemsToDisplay.filter((item: any) => {
        // Status filter (only use for active view)
        if (activeView === 'active' && filters.status !== 'all' && item.status !== filters.status) {
            return false
        }

        // Car ID filter
        if (filters.carId && item.carId !== filters.carId) {
            return false
        }

        // Supplier filter
        if (filters.supplierId && item.supplierId !== filters.supplierId) {
            return false
        }

        // Search term filter (search in car ID or notes)
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase()
            return (
                item.carId.toLowerCase().includes(term) ||
                (item.notes && item.notes.toLowerCase().includes(term))
            )
        }

        return true
    })

    const handleFilterChange = (newFilters: Partial<Filters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }))
    }

    const handleRefresh = () => {
        refetch()
    }

    const handleReset = () => {
        setFilters({
            status: 'all',
            carId: '',
            supplierId: '',
            searchTerm: '',
        })
    }

    if (error) {
        return (
            <div className={`min-h-screen p-4 md:p-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className={`border rounded-lg p-6 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                        <h3 className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-800'}`}>Error loading pre-sales</h3>
                        <p className={isDark ? 'text-red-200' : 'text-red-700'}>{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
                        <button
                            onClick={handleRefresh}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen p-4 md:p-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Panel de Pre-Ventas</h1>
                            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Gestiona y monitorea tus compras pre-venta de autos a escala</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={`p-2 rounded-lg transition disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Tabs: Activos / Archivados */}
                <div className="mb-8">
                    <div className="flex gap-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
                        <button
                            onClick={() => setActiveView('active')}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${activeView === 'active'
                                    ? `border-blue-600 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                                    : `border-transparent ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                                }`}
                        >
                            <Clock className="w-5 h-5" />
                            Activos
                            {activeItems.length > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white">{activeItems.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveView('archived')}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${activeView === 'archived'
                                    ? `border-blue-600 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                                    : `border-transparent ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                                }`}
                        >
                            <Archive className="w-5 h-5" />
                            Archivados
                            {archivedItems.length > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-600 text-white">{archivedItems.length}</span>}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <PreSaleStats items={itemsToDisplay} />

                {/* Filters Section */}
                <div className={`rounded-lg shadow-md p-6 mb-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Filtros</h2>
                        </div>
                        <div className="flex gap-2">
                            {(filters.status !== 'all' ||
                                filters.carId ||
                                filters.supplierId ||
                                filters.searchTerm) && (
                                    <button
                                        onClick={handleReset}
                                        className={`px-3 py-1 text-sm rounded hover:opacity-80 transition ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-200 text-gray-700'}`}
                                    >
                                        Limpiar Filtros
                                    </button>
                                )}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <PreSaleFilters filters={filters} onFilterChange={handleFilterChange} />
                    )}
                </div>

                {/* Items Grid */}
                <div>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Cargando pre-ventas...</p>
                            </div>
                        </div>
                    ) : filteredPreSales.length === 0 ? (
                        <div className={`rounded-lg shadow-md p-12 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                            <div className={`mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No hay pre-ventas</h3>
                            <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                                {filters.status !== 'all' ||
                                    filters.carId ||
                                    filters.supplierId ||
                                    filters.searchTerm
                                    ? 'No se encontraron pre-ventas que coincidan con los filtros aplicados.'
                                    : 'Comienza a registrar pre-ventas de autos a escala.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPreSales.map((item: any) => (
                                <PreSaleItemCard key={item._id} item={item} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Results count */}
                {!isLoading && filteredPreSales.length > 0 && (
                    <div className={`mt-6 text-center ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        Mostrando <span className="font-semibold">{filteredPreSales.length}</span> de{' '}
                        <span className="font-semibold">{preSales.length}</span> pre-ventas
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <PreSaleDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
            />
        </div>
    )
}

export default PreSaleDashboard
