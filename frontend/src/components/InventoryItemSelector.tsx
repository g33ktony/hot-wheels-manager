import { useState, useEffect, useRef } from 'react'
import { useInventory, useInventoryItem } from '@/hooks/useInventory'

interface InventoryItemSelectorProps {
    value: string // inventoryItemId
    onChange: (itemId: string) => void
    onSelect?: (item: any) => void // Callback cuando se selecciona un item completo
    excludeIds?: string[] // IDs de items ya seleccionados en otros campos
    placeholder?: string
    required?: boolean
}

export default function InventoryItemSelector({
    value,
    onChange,
    onSelect,
    excludeIds = [],
    placeholder,
    required
}: InventoryItemSelectorProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Fetch inventory items for suggestions
    const { data: inventoryData } = useInventory({
        search: searchTerm,
        limit: 20
    })

    // Fetch specific item by ID when editing (more efficient than loading all items)
    const { data: initialItem } = useInventoryItem(value)

    // Filter to show only items with available stock
    const availableItems = (inventoryData?.items || []).filter(item => {
        const available = item.quantity - (item.reservedQuantity || 0)
        // Exclude already selected items in other rows
        return available > 0 && item._id && !excludeIds.includes(item._id)
    })

    // Initialize with the selected item from parent value
    useEffect(() => {
        // If we have a value and the initialItem is loaded
        if (value && initialItem) {
            // Only update if we don't have a selected item or if the value changed
            if (!selectedItem || selectedItem._id !== value) {
                setSelectedItem(initialItem)
                setSearchTerm(initialItem.hotWheelsCar?.model || initialItem.carId)
            }
        } else if (!value) {
            // Parent cleared the value
            if (selectedItem || searchTerm) {
                setSelectedItem(null)
                setSearchTerm('')
            }
        }
    }, [value, initialItem])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                inputRef.current &&
                suggestionsRef.current &&
                !inputRef.current.contains(event.target as Node) &&
                !suggestionsRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setSearchTerm(newValue)
        setShowSuggestions(true) // Siempre mostrar sugerencias cuando escribe

        // Si el usuario borra el texto completamente, limpiar la selección
        if (newValue.length === 0) {
            setSelectedItem(null)
            onChange('')
            setShowSuggestions(false)
        }
    }

    const handleSelectSuggestion = (item: any) => {
        // Cerrar el dropdown
        setShowSuggestions(false)

        // Actualizar valores
        setSelectedItem(item)
        setSearchTerm(item.hotWheelsCar?.model || item.carId)
        onChange(item._id)

        // Llamar al callback onSelect si está definido
        if (onSelect) {
            setTimeout(() => {
                onSelect(item)
            }, 0)
        }

        // Blur del input
        setTimeout(() => {
            inputRef.current?.blur()
        }, 100)
    }

    const handleClearSelection = () => {
        setSelectedItem(null)
        setSearchTerm('')
        onChange('')
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!selectedItem) {
                            setShowSuggestions(true)
                        }
                    }}
                    placeholder={placeholder || 'Buscar pieza en inventario...'}
                    required={required}
                    disabled={!!selectedItem}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] touch-manipulation ${selectedItem ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                    style={{
                        fontSize: '16px',
                        WebkitAppearance: 'none',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                />

                {selectedItem && (
                    <button
                        type="button"
                        onClick={handleClearSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {showSuggestions && availableItems.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {availableItems.map((item) => {
                        const available = item.quantity - (item.reservedQuantity || 0)
                        const carName = item.hotWheelsCar?.model || item.carId
                        const series = item.hotWheelsCar?.series || item.seriesName
                        const year = item.hotWheelsCar?.year

                        return (
                            <button
                                key={item._id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelectSuggestion(item)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-primary-50 focus:bg-primary-50 focus:outline-none border-b border-gray-100 last:border-0 min-h-[70px] touch-manipulation active:bg-primary-100"
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    WebkitTouchCallout: 'none',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {item.photos && item.photos.length > 0 && (
                                        <img
                                            src={item.photos[0]}
                                            alt={carName}
                                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                                            style={{
                                                WebkitUserSelect: 'none',
                                                userSelect: 'none',
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate" style={{ fontSize: '16px' }}>
                                            {carName}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                                {available} disponible{available !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-primary-600 font-medium">
                                                ${item.suggestedPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        {(series || year) && (
                                            <div className="text-xs text-gray-400 mt-1 truncate">
                                                {series && <span>{series}</span>}
                                                {series && year && <span> • </span>}
                                                {year && <span>{year}</span>}
                                            </div>
                                        )}
                                        {(item.isSuperTreasureHunt || item.isTreasureHunt || item.isChase) && (
                                            <div className="flex gap-1 mt-1">
                                                {item.isSuperTreasureHunt && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        $TH
                                                    </span>
                                                )}
                                                {item.isTreasureHunt && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        TH
                                                    </span>
                                                )}
                                                {item.isChase && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                        CHASE
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {showSuggestions && searchTerm.length > 0 && availableItems.length === 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <div className="text-sm text-gray-500 text-center select-none">
                        {inventoryData?.items?.length === 0
                            ? `No se encontraron piezas con "${searchTerm}"`
                            : 'No hay piezas disponibles con stock'
                        }
                    </div>
                </div>
            )}
        </div>
    )
}
