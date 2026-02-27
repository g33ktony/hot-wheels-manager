import React, { useState, useEffect } from 'react'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useStore } from '@/contexts/StoreContext'
import { Search, AlertCircle } from 'lucide-react'

interface PreSaleItem {
    _id: string
    carId: string
    carModel?: string
    finalPricePerUnit: number
    availableQuantity: number
    photo?: string
    endDate?: string
}

interface PreSaleItemAutocompleteProps {
    value: string
    onChange: (item: PreSaleItem) => void
    placeholder?: string
    onlyActive?: boolean
}

const PreSaleItemAutocomplete: React.FC<PreSaleItemAutocompleteProps> = ({
    value,
    onChange,
    placeholder = 'Search presale items by car ID or model...',
    onlyActive = true
}) => {
    const { selectedStore } = useStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<PreSaleItem | null>(null)
    const { data: preSaleItems = [] } = usePreSaleItems({ status: onlyActive ? 'active' : undefined, storeId: selectedStore || undefined })

    useEffect(() => {
        setSearchTerm(value)
    }, [value])

    const filteredItems = (preSaleItems || []).filter((item: any) => {
        const term = searchTerm.toLowerCase()
        return (
            item.carId.toLowerCase().includes(term) ||
            (item.carModel && item.carModel.toLowerCase().includes(term))
        ) && item.availableQuantity > 0
    })

    const handleSelect = (item: PreSaleItem) => {
        setSelectedItem(item)
        setSearchTerm(item.carId)
        onChange(item)
        setIsOpen(false)
    }

    const isOverdue = selectedItem?.endDate ? new Date(selectedItem.endDate) < new Date() : false
    const isToday = selectedItem?.endDate
        ? new Date(selectedItem.endDate).toDateString() === new Date().toDateString()
        : false

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Selected Item Info */}
            {selectedItem && (
                <div className={`mt-2 p-3 rounded-lg border-2 ${isToday ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
                    <div className="flex items-start gap-3">
                        {selectedItem.photo && (
                            <img
                                src={selectedItem.photo}
                                alt={selectedItem.carModel}
                                className="w-16 h-16 object-cover rounded"
                            />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">
                                    {selectedItem.carModel || selectedItem.carId}
                                </h4>
                                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                                    Pre-Sale
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">{selectedItem.carId}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                                <div>
                                    <span className="text-gray-600">Price:</span>
                                    <p className="font-semibold text-green-600">
                                        ${selectedItem.finalPricePerUnit.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Available:</span>
                                    <p className="font-semibold text-blue-600">
                                        {selectedItem.availableQuantity} units
                                    </p>
                                </div>
                                {selectedItem.endDate && (
                                    <div>
                                        <span className="text-gray-600">Expected:</span>
                                        <p className={`font-semibold ${isToday ? 'text-red-600' : isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                            {isToday && '🔴 TODAY - '}
                                            {new Date(selectedItem.endDate).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isToday && (
                            <div className="text-center">
                                <AlertCircle className="w-6 h-6 text-red-600 mb-1" />
                                <p className="text-xs font-bold text-red-600">TODAY</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Dropdown */}
            {isOpen && filteredItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    {filteredItems.map((item: any) => {
                        const isItemToday = item.endDate
                            ? new Date(item.endDate).toDateString() === new Date().toDateString()
                            : false

                        return (
                            <button
                                key={item._id}
                                onClick={() => handleSelect(item)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition ${isItemToday ? 'bg-red-50' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {item.carModel || item.carId}
                                            {isItemToday && (
                                                <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                                                    TODAY
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-600">{item.carId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-green-600">
                                            ${item.finalPricePerUnit.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {item.availableQuantity} available
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {isOpen && searchTerm && filteredItems.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4 text-center text-gray-600">
                    No presale items found
                </div>
            )}
        </div>
    )
}

export default PreSaleItemAutocomplete
