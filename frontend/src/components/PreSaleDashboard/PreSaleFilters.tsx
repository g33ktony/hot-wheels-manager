import React from 'react'
import { Search } from 'lucide-react'

interface FiltersProps {
    status: 'all' | 'pending' | 'in-progress' | 'completed' | 'purchased' | 'shipped' | 'received' | 'delivered' | 'cancelled'
    carId: string
    supplierId: string
    searchTerm: string
}

interface PreSaleFiltersProps {
    filters: FiltersProps
    onFilterChange: (filters: Partial<FiltersProps>) => void
}

const PreSaleFilters: React.FC<PreSaleFiltersProps> = ({ filters, onFilterChange }) => {
    return (
        <div className="space-y-4">
            {/* Status Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        { value: 'all', label: 'Todos' },
                        { value: 'pending', label: 'Pendiente' },
                        { value: 'in-progress', label: 'En Progreso' },
                        { value: 'completed', label: 'Completado' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() =>
                                onFilterChange({
                                    status: option.value as 'all' | 'pending' | 'in-progress' | 'completed',
                                })
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filters.status === option.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por ID de auto o notas..."
                        value={filters.searchTerm}
                        onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Additional Filters Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Car ID Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auto (ID)</label>
                    <input
                        type="text"
                        placeholder="Ej: #001-HW"
                        value={filters.carId}
                        onChange={(e) => onFilterChange({ carId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Supplier Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor (ID)</label>
                    <input
                        type="text"
                        placeholder="ID del proveedor"
                        value={filters.supplierId}
                        onChange={(e) => onFilterChange({ supplierId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-500">💡 Tip: Los filtros se aplican en tiempo real mientras escribes</p>
        </div>
    )
}

export default PreSaleFilters
