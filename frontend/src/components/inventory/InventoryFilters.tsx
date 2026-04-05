import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react'

interface InventoryFiltersProps {
    isDark: boolean
    searchTerm: string
    filterBrand: string
    allBrands: string[]
    showAdvancedFilters: boolean
    filteredItemsCount: number
    filterCondition: string
    filterPieceType: string
    filterTreasureHunt: 'all' | 'th' | 'sth'
    filterChase: boolean
    filterLocation: string
    uniqueLocations: string[]
    filterLowStock: boolean
    filterPriceMin: string
    filterPriceMax: string
    filterFantasyOnly: boolean
    filterFantasy: boolean
    filterMoto: boolean
    filterCamioneta: boolean
    filterFastFurious: boolean
    onToggleAdvancedFilters: () => void
    onHandleFilterChange: (filterType: string, value: any) => void
    onSetCurrentPage: (page: number) => void
    onUpdateFilter: (key: any, value: any) => void
    onSetFilterPriceMin: (value: string) => void
    onSetFilterPriceMax: (value: string) => void
    onSetFilterFantasyOnly: (value: boolean) => void
    onHandleFantasyOnlyChange: (value: boolean) => void
    onHandleHideFantasyChange: (value: boolean) => void
}

export default function InventoryFilters({
    isDark,
    searchTerm,
    filterBrand,
    allBrands,
    showAdvancedFilters,
    filteredItemsCount,
    filterCondition,
    filterPieceType,
    filterTreasureHunt,
    filterChase,
    filterLocation,
    uniqueLocations,
    filterLowStock,
    filterPriceMin,
    filterPriceMax,
    filterFantasyOnly,
    filterFantasy,
    filterMoto,
    filterCamioneta,
    filterFastFurious,
    onToggleAdvancedFilters,
    onHandleFilterChange,
    onSetCurrentPage,
    onUpdateFilter,
    onSetFilterPriceMin,
    onSetFilterPriceMax,
    onSetFilterFantasyOnly,
    onHandleFantasyOnlyChange,
    onHandleHideFantasyChange,
}: InventoryFiltersProps) {
    const activeFilterChips: Array<{ key: string; label: string }> = []

    if (searchTerm) activeFilterChips.push({ key: 'search', label: `Busqueda: ${searchTerm}` })
    if (filterBrand) activeFilterChips.push({ key: 'brand', label: `Marca: ${filterBrand}` })
    if (filterCondition) activeFilterChips.push({ key: 'condition', label: `Condicion: ${filterCondition}` })
    if (filterPieceType) activeFilterChips.push({ key: 'pieceType', label: `Tipo: ${filterPieceType}` })
    if (filterTreasureHunt !== 'all') activeFilterChips.push({ key: 'treasureHunt', label: filterTreasureHunt === 'sth' ? 'Solo STH' : 'Solo TH' })
    if (filterChase) activeFilterChips.push({ key: 'chase', label: 'Solo Chase' })
    if (filterLocation) activeFilterChips.push({ key: 'location', label: `Ubicacion: ${filterLocation}` })
    if (filterLowStock) activeFilterChips.push({ key: 'lowStock', label: 'Stock bajo' })
    if (filterFantasyOnly) activeFilterChips.push({ key: 'fantasyOnly', label: 'Solo Fantasias' })
    if (filterFantasy) activeFilterChips.push({ key: 'hideFantasy', label: 'Ocultar Fantasias' })
    if (filterMoto) activeFilterChips.push({ key: 'moto', label: 'Solo Motos' })
    if (filterCamioneta) activeFilterChips.push({ key: 'camioneta', label: 'Solo Camionetas' })
    if (filterFastFurious) activeFilterChips.push({ key: 'fastFurious', label: 'Solo Fast and Furious' })
    if (filterPriceMin) activeFilterChips.push({ key: 'priceMin', label: `Min: ${filterPriceMin}` })
    if (filterPriceMax) activeFilterChips.push({ key: 'priceMax', label: `Max: ${filterPriceMax}` })

    const clearSingleFilter = (key: string) => {
        onSetCurrentPage(1)

        switch (key) {
            case 'search':
                onHandleFilterChange('search', '')
                break
            case 'brand':
                onHandleFilterChange('brand', '')
                onHandleFilterChange('pieceType', '')
                onHandleFilterChange('treasureHunt', 'all')
                onHandleFilterChange('chase', false)
                break
            case 'condition':
                onHandleFilterChange('condition', '')
                break
            case 'pieceType':
                onHandleFilterChange('pieceType', '')
                break
            case 'treasureHunt':
                onHandleFilterChange('treasureHunt', 'all')
                break
            case 'chase':
                onHandleFilterChange('chase', false)
                break
            case 'location':
                onUpdateFilter('filterLocation', '')
                break
            case 'lowStock':
                onUpdateFilter('filterLowStock', false)
                break
            case 'fantasyOnly':
                onSetFilterFantasyOnly(false)
                break
            case 'hideFantasy':
                onHandleHideFantasyChange(false)
                break
            case 'moto':
                onHandleFilterChange('moto', false)
                break
            case 'camioneta':
                onHandleFilterChange('camioneta', false)
                break
            case 'fastFurious':
                onHandleFilterChange('fastFurious', false)
                break
            case 'priceMin':
                onSetFilterPriceMin('')
                break
            case 'priceMax':
                onSetFilterPriceMax('')
                break
        }
    }

    const clearAllFilters = () => {
        onSetCurrentPage(1)
        onHandleFilterChange('search', '')
        onHandleFilterChange('brand', '')
        onHandleFilterChange('condition', '')
        onHandleFilterChange('pieceType', '')
        onHandleFilterChange('treasureHunt', 'all')
        onHandleFilterChange('chase', false)
        onHandleFilterChange('moto', false)
        onHandleFilterChange('camioneta', false)
        onHandleFilterChange('fastFurious', false)
        onHandleHideFantasyChange(false)
        onSetFilterFantasyOnly(false)
        onUpdateFilter('filterLocation', '')
        onUpdateFilter('filterLowStock', false)
        onSetFilterPriceMin('')
        onSetFilterPriceMax('')
    }

    const advancedFiltersCount = [filterCondition, filterPieceType, filterChase, filterFantasy, filterFantasyOnly, filterMoto, filterCamioneta, filterFastFurious, filterLocation, filterLowStock, filterPriceMin, filterPriceMax].filter(Boolean).length
        + (filterTreasureHunt !== 'all' ? 1 : 0)

    return (
        <Card className="p-4 lg:p-4 !border-transparent !shadow-none">
            <div className="space-y-4 w-full">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Resultados:</span>
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
                            {filteredItemsCount}
                        </span>
                    </div>
                    {activeFilterChips.length > 0 && (
                        <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                            Limpiar todo
                        </Button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 w-full">
                    <div className="relative flex-1 min-w-0">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            value={searchTerm}
                            onChange={(e) => onHandleFilterChange('search', e.target.value)}
                            className={`pl-10 pr-10 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-300' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => onHandleFilterChange('search', '')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterBrand}
                        onChange={(e) => {
                            onHandleFilterChange('brand', e.target.value)
                            if (e.target.value === '') {
                                onHandleFilterChange('pieceType', '')
                                onHandleFilterChange('treasureHunt', 'all')
                                onHandleFilterChange('chase', false)
                            }
                        }}
                        className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full sm:w-48 ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                        style={{
                            fontSize: '16px',
                            WebkitAppearance: 'none',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <option value="">Todas las marcas</option>
                        {allBrands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>

                    <button
                        onClick={onToggleAdvancedFilters}
                        className={`flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${showAdvancedFilters
                            ? isDark ? 'bg-primary-600/20 border-primary-500 text-primary-400' : 'bg-primary-50 border-primary-400 text-primary-700'
                            : isDark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <SlidersHorizontal size={16} />
                        <span>Más filtros</span>
                        {advancedFiltersCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary-500 text-white">
                                {advancedFiltersCount}
                            </span>
                        )}
                        {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {activeFilterChips.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {activeFilterChips.map((chip) => (
                            <button
                                key={chip.key}
                                type="button"
                                onClick={() => clearSingleFilter(chip.key)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${isDark
                                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-600'
                                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{chip.label}</span>
                                <X size={12} />
                            </button>
                        ))}
                    </div>
                )}

                {showAdvancedFilters && (
                    <div className="space-y-3 pt-2 border-t border-slate-700/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                            <select
                                value={filterCondition}
                                onChange={(e) => onHandleFilterChange('condition', e.target.value)}
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                style={{
                                    fontSize: '16px',
                                    WebkitAppearance: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <option value="">Todas las condiciones</option>
                                <option value="mint">Mint</option>
                                <option value="good">Bueno</option>
                                <option value="fair">Regular</option>
                                <option value="poor">Malo</option>
                            </select>

                            {filterBrand && (
                                <select
                                    value={filterPieceType}
                                    onChange={(e) => {
                                        onHandleFilterChange('pieceType', e.target.value)
                                        onHandleFilterChange('treasureHunt', 'all')
                                        onHandleFilterChange('chase', false)
                                    }}
                                    className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                    style={{
                                        fontSize: '16px',
                                        WebkitAppearance: 'none',
                                        WebkitTapHighlightColor: 'transparent',
                                    }}
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="basic">Básico</option>
                                    <option value="premium">Premium</option>
                                    <option value="rlc">RLC</option>
                                    <option value="silver_series">Silver Series</option>
                                    <option value="elite_64">Elite 64</option>
                                </select>
                            )}

                            {filterBrand?.toLowerCase() === 'hot wheels' && filterPieceType === 'basic' && (
                                <select
                                    value={filterTreasureHunt}
                                    onChange={(e) => onHandleFilterChange('treasureHunt', e.target.value as 'all' | 'th' | 'sth')}
                                    className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                    style={{
                                        fontSize: '16px',
                                        WebkitAppearance: 'none',
                                        WebkitTapHighlightColor: 'transparent',
                                    }}
                                >
                                    <option value="all">Todos (TH/STH)</option>
                                    <option value="th">Solo TH</option>
                                    <option value="sth">Solo STH</option>
                                </select>
                            )}

                            {((filterBrand && ['mini gt', 'kaido house', 'm2 machines'].includes(filterBrand.toLowerCase())) ||
                                (filterBrand?.toLowerCase() === 'hot wheels' && filterPieceType === 'premium')) && (
                                    <label className={`flex items-center gap-2 input cursor-pointer ${isDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'hover:bg-gray-50'}`}>
                                        <input
                                            type="checkbox"
                                            checked={filterChase}
                                            onChange={(e) => onHandleFilterChange('chase', e.target.checked)}
                                            className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                        />
                                        <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                            Solo Chase 🌟
                                        </span>
                                    </label>
                                )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                            <select
                                value={filterLocation}
                                onChange={(e) => {
                                    onSetCurrentPage(1)
                                    onUpdateFilter('filterLocation', e.target.value)
                                }}
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                style={{
                                    fontSize: '16px',
                                    WebkitAppearance: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <option value="">Todas las ubicaciones</option>
                                {uniqueLocations.map(location => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>

                            <label className={`flex items-center gap-2 input cursor-pointer ${isDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    checked={filterLowStock}
                                    onChange={(e) => {
                                        onSetCurrentPage(1)
                                        onUpdateFilter('filterLowStock', e.target.checked)
                                    }}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Stock bajo (≤3)
                                </span>
                            </label>

                            <input
                                type="number"
                                value={filterPriceMin}
                                onChange={(e) => {
                                    onSetCurrentPage(1)
                                    onSetFilterPriceMin(e.target.value)
                                }}
                                placeholder="Precio mínimo"
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-300' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                style={{
                                    fontSize: '16px',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            />

                            <input
                                type="number"
                                value={filterPriceMax}
                                onChange={(e) => {
                                    onSetCurrentPage(1)
                                    onSetFilterPriceMax(e.target.value)
                                }}
                                placeholder="Precio máximo"
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-300' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                style={{
                                    fontSize: '16px',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${filterFantasyOnly ? (isDark ? 'bg-primary-600/20 border-primary-500' : 'bg-primary-50 border-primary-400') : (isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50' : 'bg-white border-gray-300 hover:bg-gray-50')}`}>
                                <input
                                    type="checkbox"
                                    checked={filterFantasyOnly}
                                    onChange={(e) => onHandleFantasyOnlyChange(e.target.checked)}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Solo Fantasías 🎨
                                </span>
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${filterFantasy ? (isDark ? 'bg-primary-600/20 border-primary-500' : 'bg-primary-50 border-primary-400') : (isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50' : 'bg-white border-gray-300 hover:bg-gray-50')}`}>
                                <input
                                    type="checkbox"
                                    checked={filterFantasy}
                                    onChange={(e) => onHandleHideFantasyChange(e.target.checked)}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Ocultar Fantasías 🎨
                                </span>
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${filterMoto ? (isDark ? 'bg-primary-600/20 border-primary-500' : 'bg-primary-50 border-primary-400') : (isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50' : 'bg-white border-gray-300 hover:bg-gray-50')}`}>
                                <input
                                    type="checkbox"
                                    checked={filterMoto}
                                    onChange={(e) => onHandleFilterChange('moto', e.target.checked)}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Solo Motos 🏍️
                                </span>
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${filterCamioneta ? (isDark ? 'bg-primary-600/20 border-primary-500' : 'bg-primary-50 border-primary-400') : (isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50' : 'bg-white border-gray-300 hover:bg-gray-50')}`}>
                                <input
                                    type="checkbox"
                                    checked={filterCamioneta}
                                    onChange={(e) => onHandleFilterChange('camioneta', e.target.checked)}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Solo Camionetas 🚚
                                </span>
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${filterFastFurious ? (isDark ? 'bg-primary-600/20 border-primary-500' : 'bg-primary-50 border-primary-400') : (isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50' : 'bg-white border-gray-300 hover:bg-gray-50')}`}>
                                <input
                                    type="checkbox"
                                    checked={filterFastFurious}
                                    onChange={(e) => onHandleFilterChange('fastFurious', e.target.checked)}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Solo Fast and Furious 🏎️
                                </span>
                            </label>
                        </div>

                        {(filterCondition || filterPieceType || filterTreasureHunt !== 'all' || filterChase || filterLocation || filterLowStock || filterFantasy || filterFantasyOnly || filterMoto || filterCamioneta || filterFastFurious || filterPriceMin || filterPriceMax) && (
                            <div className="flex justify-end">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={clearAllFilters}
                                >
                                    Limpiar filtros avanzados
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {(searchTerm || filterBrand) && !showAdvancedFilters && (
                    <div className="flex justify-end">
                        <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                            Limpiar filtros
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}
