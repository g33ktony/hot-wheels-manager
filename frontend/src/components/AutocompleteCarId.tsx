import { useState, useEffect, useRef } from 'react'
import { useInventory } from '@/hooks/useInventory'

interface AutocompleteInputProps {
    value: string
    onChange: (value: string) => void
    onSelect?: (item: any) => void // Callback cuando se selecciona un item completo
    placeholder?: string
    required?: boolean
}

export default function AutocompleteCarId({ value, onChange, onSelect, placeholder, required }: AutocompleteInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchTerm, setSearchTerm] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Fetch inventory items for suggestions (limit to prevent performance issues)
    const { data: inventoryData } = useInventory({ 
        search: searchTerm,
        limit: 10 
    })

    const suggestions = inventoryData?.items || []

    useEffect(() => {
        setSearchTerm(value)
    }, [value])

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
        onChange(newValue)
        setShowSuggestions(newValue.length > 0)
    }

    const handleSelectSuggestion = (item: any) => {
        // Cerrar el dropdown primero
        setShowSuggestions(false)
        
        // Actualizar valores
        onChange(item.carId)
        setSearchTerm(item.carId)
        
        // Llamar al callback onSelect si está definido, pasando el item completo
        if (onSelect) {
            // Usar setTimeout para evitar conflictos de estado
            setTimeout(() => {
                onSelect(item)
            }, 0)
        }
        
        // Focus al input después de seleccionar
        setTimeout(() => {
            inputRef.current?.blur()
        }, 100)
    }

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
                placeholder={placeholder || 'Buscar Hot Wheels...'}
                required={required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((item, index) => (
                        <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault() // Prevenir que el input pierda focus antes de seleccionar
                                handleSelectSuggestion(item)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-0"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{item.carId}</div>
                                    {item.brand && (
                                        <div className="text-xs text-gray-500">
                                            {item.brand}
                                            {item.pieceType && ` • ${item.pieceType}`}
                                            {item.isTreasureHunt && ' • TH'}
                                            {item.isSuperTreasureHunt && ' • $TH'}
                                            {item.isChase && ' • Chase'}
                                        </div>
                                    )}
                                </div>
                                {item.photos && item.photos.length > 0 && (
                                    <img 
                                        src={item.photos[0]} 
                                        alt={item.carId}
                                        className="w-12 h-12 object-cover rounded ml-2"
                                    />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showSuggestions && searchTerm.length > 0 && suggestions.length === 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3"
                >
                    <div className="text-sm text-gray-500 text-center">
                        No se encontraron Hot Wheels con "{searchTerm}"
                    </div>
                </div>
            )}
        </div>
    )
}
