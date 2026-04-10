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
    const panelClass = isDark
        ? 'rounded-2xl border border-slate-700/70 backdrop-blur-xl bg-slate-900/90 p-4 lg:p-4 shadow-[14px_14px_26px_rgba(2,6,23,0.56),-10px_-10px_18px_rgba(148,163,184,0.1)]'
        : 'rounded-2xl backdrop-blur-xl bg-white/94 p-4 lg:p-4 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'
    const controlClass = isDark
        ? 'bg-slate-800 border-slate-600/40 text-slate-100 placeholder-slate-400 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
        : 'bg-slate-100 border-slate-300/60 text-slate-800 placeholder-slate-500 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'

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
        <div className={panelClass}>
            <div className="space-y-4 w-full">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Resultados:</span>
                        <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 text-xs font-semibold rounded-full border ${isDark
                            ? 'bg-slate-800/62 text-primary-200 border-primary-400/30 shadow-[inset_3px_3px_6px_rgba(2,6,23,0.48),inset_-2px_-2px_5px_rgba(148,163,184,0.1)]'
                            : 'bg-slate-100/86 text-primary-700 border-primary-200/60 shadow-[inset_3px_3px_6px_rgba(148,163,184,0.22),inset_-2px_-2px_5px_rgba(255,255,255,0.94)]'
                            }`}>
                            {filteredItemsCount}
                        </span>
                    </div>
                    {activeFilterChips.length > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={clearAllFilters}
                            className={isDark
                                ? '!bg-slate-800/62 !text-slate-400 !font-semibold !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)] hover:!bg-slate-800/72 hover:!text-slate-300'
                                : '!bg-white/86 !text-slate-500 !font-semibold !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)] hover:!bg-white/92 hover:!text-slate-700'}
                        >
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
                            className={`pl-10 pr-10 rounded-lg ${controlClass}`}
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
                        className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full sm:w-48 ${controlClass} ${!filterBrand ? (isDark ? 'text-slate-300' : 'text-slate-600') : ''}`}
                        style={{
                            color: filterBrand
                                ? (isDark ? '#f1f5f9' : '#334155')
                                : '#64748b',
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
                        className={`flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border-0 text-sm font-medium transition-colors whitespace-nowrap backdrop-blur-xl ${showAdvancedFilters
                            ? isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'
                            : isDark ? 'bg-slate-800/62 text-slate-200 hover:bg-slate-800/72 shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)]' : 'bg-white/86 text-slate-700 hover:bg-white/92 shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)]'
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
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border-0 transition-colors backdrop-blur-xl ${isDark
                                    ? 'bg-slate-800/52 text-slate-200 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]'
                                    : 'bg-white/86 text-slate-700 hover:bg-white/94 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]'
                                    }`}
                            >
                                <span>{chip.label}</span>
                                <X size={12} />
                            </button>
                        ))}
                    </div>
                )}

                {showAdvancedFilters && (
                    <div className={`space-y-3 pt-3 mt-1 border-t ${isDark ? 'border-slate-500/35' : 'border-slate-300/75'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                            <select
                                value={filterCondition}
                                onChange={(e) => onHandleFilterChange('condition', e.target.value)}
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
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
                                    className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
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
                                    className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
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
                                    <label className={`flex items-center gap-2 input cursor-pointer rounded-lg ${isDark
                                        ? 'bg-slate-800/62 border-slate-600/40 hover:bg-slate-800/72 backdrop-blur-xl shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
                                        : 'bg-slate-100/86 border-slate-300/60 hover:bg-slate-100/92 backdrop-blur-xl shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'
                                        }`}>
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
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
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

                            <label className={`flex items-center gap-2 input cursor-pointer rounded-lg ${isDark
                                ? 'bg-slate-800/62 border-slate-600/40 hover:bg-slate-800/72 backdrop-blur-xl shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
                                : 'bg-slate-100/86 border-slate-300/60 hover:bg-slate-100/92 backdrop-blur-xl shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'
                                }`}>
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
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
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
                                className={`input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full ${controlClass}`}
                                style={{
                                    fontSize: '16px',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-0 transition-colors backdrop-blur-xl ${filterFantasyOnly ? (isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]') : (isDark ? 'bg-slate-800/52 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]' : 'bg-white/86 hover:bg-white/92 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]')}`}>
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

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-0 transition-colors backdrop-blur-xl ${filterFantasy ? (isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]') : (isDark ? 'bg-slate-800/52 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]' : 'bg-white/86 hover:bg-white/92 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]')}`}>
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

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-0 transition-colors backdrop-blur-xl ${filterMoto ? (isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]') : (isDark ? 'bg-slate-800/52 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]' : 'bg-white/86 hover:bg-white/92 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]')}`}>
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

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-0 transition-colors backdrop-blur-xl ${filterCamioneta ? (isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]') : (isDark ? 'bg-slate-800/52 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]' : 'bg-white/86 hover:bg-white/92 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]')}`}>
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

                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-0 transition-colors backdrop-blur-xl ${filterFastFurious ? (isDark ? 'bg-primary-500/22 text-primary-200 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]' : 'bg-primary-100/80 text-primary-700 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]') : (isDark ? 'bg-slate-800/52 hover:bg-slate-800/66 shadow-[6px_6px_12px_rgba(2,6,23,0.45),-4px_-4px_8px_rgba(148,163,184,0.08)]' : 'bg-white/86 hover:bg-white/92 shadow-[6px_6px_12px_rgba(148,163,184,0.2),-4px_-4px_8px_rgba(255,255,255,0.96)]')}`}>
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
                                    className={isDark
                                        ? '!bg-slate-800/62 !text-slate-300 !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)] hover:!bg-slate-800/72'
                                        : '!bg-white/86 !text-slate-700 !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)] hover:!bg-white/92'}
                                >
                                    Limpiar filtros avanzados
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {(searchTerm || filterBrand) && !showAdvancedFilters && (
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={clearAllFilters}
                            className={isDark
                                ? '!bg-slate-800/62 !text-slate-300 !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)] hover:!bg-slate-800/72'
                                : '!bg-white/86 !text-slate-700 !border-0 !backdrop-blur-xl !shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)] hover:!bg-white/92'}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
