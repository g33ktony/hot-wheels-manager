import { useState } from 'react'
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, Package, Edit, Trash2, X, Upload, MapPin, TrendingUp, CheckSquare } from 'lucide-react'
import imageCompression from 'browser-image-compression'

export default function Inventory() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCondition, setFilterCondition] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    // Bulk delete state
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    // Search suggestions state
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [existingItemToUpdate, setExistingItemToUpdate] = useState<any>(null)
    const [customBrandInput, setCustomBrandInput] = useState('')
    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false)
    const [newItem, setNewItem] = useState({
        carId: '',
        quantity: 1,
        purchasePrice: 0,
        suggestedPrice: 0,
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        notes: '',
        photos: [] as string[],
        location: '', // Ubicación física (caja)
        // Brand and type fields
        brand: '' as string,
        pieceType: '' as 'basic' | 'premium' | 'rlc' | '',
        isTreasureHunt: false,
        isSuperTreasureHunt: false,
        isChase: false,
        // Box/Series support
        isBox: false,
        boxSize: 10 as 5 | 8 | 10,
        pricePerPiece: 0,
        // Multiple cars support for series
        isMultipleCars: false,
        cars: [] as Array<{
            carId: string;
            quantity: number;
        }>,
        // Series fields
        seriesId: '',
        seriesName: '',
        seriesSize: 5,
        seriesPosition: 1,
        seriesPrice: 0,
        seriesDefaultPrice: 0
    })

    const { data: inventoryItems, isLoading, error } = useInventory()
    const createItemMutation = useCreateInventoryItem()
    const deleteItemMutation = useDeleteInventoryItem()
    const updateItemMutation = useUpdateInventoryItem()

    if (isLoading) {
        return <Loading text="Cargando inventario..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar el inventario</p>
            </div>
        )
    }

    const filteredItems = inventoryItems?.filter(item => {
        const matchesSearch = !searchTerm ||
            (item.carId && item.carId.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCondition = !filterCondition || item.condition === filterCondition
        return matchesSearch && matchesCondition
    }) || []

    const handleAddItem = async () => {
        try {
            // If updating an existing item
            if (existingItemToUpdate) {
                // Update existing item
                await updateItemMutation.mutateAsync({
                    id: existingItemToUpdate._id,
                    data: {
                        carId: newItem.carId,
                        quantity: newItem.quantity,
                        purchasePrice: newItem.purchasePrice,
                        suggestedPrice: newItem.suggestedPrice,
                        condition: newItem.condition,
                        notes: newItem.notes,
                        photos: newItem.photos,
                        location: newItem.location
                    }
                })
            } else if (newItem.isMultipleCars && newItem.cars.length > 0) {
                // Handle multiple cars (series/box with different models)
                const totalPieces = newItem.cars.reduce((sum, car) => sum + car.quantity, 0)
                const pricePerPiece = totalPieces > 0 ? newItem.purchasePrice / totalPieces : 0

                // Calculate suggested price based on whether it's a series or not
                const suggestedPricePerPiece = newItem.seriesId && newItem.seriesPrice > 0
                    ? newItem.seriesPrice / totalPieces // For series, divide series price by total pieces
                    : newItem.suggestedPrice // For non-series, use the entered price per piece

                // Create inventory item for each car
                let position = 1
                for (const car of newItem.cars) {
                    await createItemMutation.mutateAsync({
                        carId: car.carId,
                        quantity: car.quantity,
                        purchasePrice: pricePerPiece,
                        suggestedPrice: suggestedPricePerPiece,
                        condition: newItem.condition,
                        notes: newItem.notes,
                        photos: newItem.photos,
                        location: newItem.location,
                        // Include series info if this is a series
                        ...(newItem.seriesId && {
                            seriesId: newItem.seriesId,
                            seriesName: newItem.seriesName,
                            seriesSize: newItem.seriesSize,
                            seriesPosition: position++, // Increment position for each piece
                            seriesPrice: newItem.seriesPrice
                        })
                    })
                }
            } else {
                // Handle single car or box with same model
                const finalPurchasePrice = newItem.isBox
                    ? newItem.purchasePrice / newItem.boxSize
                    : newItem.purchasePrice

                const finalSuggestedPrice = newItem.suggestedPrice

                await createItemMutation.mutateAsync({
                    carId: newItem.carId,
                    quantity: newItem.quantity,
                    purchasePrice: finalPurchasePrice,
                    suggestedPrice: finalSuggestedPrice,
                    condition: newItem.condition,
                    notes: newItem.notes,
                    photos: newItem.photos,
                    location: newItem.location,
                    // Include series info if this is a series
                    ...(newItem.seriesId && {
                        seriesId: newItem.seriesId,
                        seriesName: newItem.seriesName,
                        seriesSize: newItem.seriesSize,
                        seriesPosition: newItem.seriesPosition,
                        seriesPrice: newItem.seriesPrice
                    })
                })
            }

            // Reset form and close modal
            resetForm()
        } catch (error) {
            console.error('Error adding/updating item:', error)
        }
    }

    const resetForm = () => {
        setNewItem({
            carId: '',
            quantity: 1,
            purchasePrice: 0,
            suggestedPrice: 0,
            condition: 'mint',
            notes: '',
            photos: [],
            location: '',
            isBox: false,
            boxSize: 10,
            pricePerPiece: 0,
            isMultipleCars: false,
            cars: [],
            seriesId: '',
            seriesName: '',
            seriesSize: 5,
            seriesPosition: 1,
            seriesPrice: 0,
            seriesDefaultPrice: 0
        })
        setExistingItemToUpdate(null)
        setShowSuggestions(false)
        setShowAddModal(false)
    }

    const handleEditItem = (item: any) => {
        setEditingItem({
            ...item,
            carId: item.carId || '',
            quantity: item.quantity || 1,
            purchasePrice: item.purchasePrice || 0,
            suggestedPrice: item.suggestedPrice || 0,
            condition: item.condition || 'mint',
            notes: item.notes || '',
            photos: item.photos || [],
            seriesId: item.seriesId || '',
            seriesName: item.seriesName || '',
            seriesSize: item.seriesSize || 5,
            seriesPosition: item.seriesPosition || 1,
            seriesPrice: item.seriesPrice || 0,
            seriesDefaultPrice: item.seriesDefaultPrice || 0
        })
        setShowEditModal(true)
    }

    const handleUpdateItem = async () => {
        if (!editingItem) return

        try {
            await updateItemMutation.mutateAsync({
                id: editingItem._id,
                data: {
                    carId: editingItem.carId,
                    quantity: editingItem.quantity,
                    purchasePrice: editingItem.purchasePrice,
                    suggestedPrice: editingItem.suggestedPrice,
                    condition: editingItem.condition,
                    notes: editingItem.notes,
                    photos: editingItem.photos || []
                }
            })

            setShowEditModal(false)
            setEditingItem(null)
        } catch (error) {
            console.error('Error updating item:', error)
        }
    }

    const handleDeleteItem = async (id: string) => {
        if (!id) return

        if (confirm('¿Estás seguro de que quieres eliminar esta pieza?')) {
            try {
                await deleteItemMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting item:', error)
            }
        }
    }

    // Bulk delete functions
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode)
        setSelectedItems(new Set()) // Clear selection when toggling mode
    }

    const toggleItemSelection = (itemId: string) => {
        const newSelection = new Set(selectedItems)
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId)
        } else {
            newSelection.add(itemId)
        }
        setSelectedItems(newSelection)
    }

    const selectAllItems = () => {
        const allIds = new Set(filteredItems.map(item => item._id).filter(Boolean) as string[])
        setSelectedItems(allIds)
    }

    const deselectAllItems = () => {
        setSelectedItems(new Set())
    }

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return

        const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedItems.size} ${selectedItems.size === 1 ? 'pieza' : 'piezas'}?`
        
        if (confirm(confirmMessage)) {
            try {
                // Delete all selected items
                await Promise.all(
                    Array.from(selectedItems).map(id => deleteItemMutation.mutateAsync(id))
                )
                
                // Clear selection and exit selection mode
                setSelectedItems(new Set())
                setIsSelectionMode(false)
            } catch (error) {
                console.error('Error deleting items:', error)
                alert('Error al eliminar algunas piezas. Por favor intenta de nuevo.')
            }
        }
    }

    // Search and select existing item
    const handleCarIdChange = (value: string) => {
        setNewItem({ ...newItem, carId: value })
        
        // Show suggestions if there are matching items
        if (value.length > 0) {
            setShowSuggestions(true)
        } else {
            setShowSuggestions(false)
            setExistingItemToUpdate(null)
        }
    }

    const getMatchingItems = () => {
        if (!newItem.carId || newItem.carId.length === 0) return []
        
        return inventoryItems?.filter(item => 
            item.carId && item.carId.toLowerCase().includes(newItem.carId.toLowerCase())
        ) || []
    }

    const handleSelectExistingItem = (item: any) => {
        setExistingItemToUpdate(item)
        setNewItem({
            carId: item.carId,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            suggestedPrice: item.suggestedPrice,
            condition: item.condition,
            notes: item.notes || '',
            photos: item.photos || [],
            location: item.location || '',
            isBox: false,
            boxSize: 10,
            pricePerPiece: 0,
            isMultipleCars: false,
            cars: [],
            seriesId: item.seriesId || '',
            seriesName: item.seriesName || '',
            seriesSize: item.seriesSize || 5,
            seriesPosition: item.seriesPosition || 1,
            seriesPrice: item.seriesPrice || 0,
            seriesDefaultPrice: item.seriesDefaultPrice || 0
        })
        setShowSuggestions(false)
    }

    const handleCancelUpdate = () => {
        setExistingItemToUpdate(null)
        setNewItem({
            ...newItem,
            quantity: 1,
            purchasePrice: 0,
            suggestedPrice: 0,
            condition: 'mint',
            notes: '',
            photos: [],
            location: ''
        })
    }

    // Calcular margen de ganancia sugerido basado en condición
    const calculateSuggestedMargin = (purchasePrice: number, condition: string): number => {
        if (purchasePrice === 0) return 0

        // Márgenes sugeridos según condición:
        const margins = {
            'mint': 0.50,    // 50% de ganancia
            'good': 0.40,    // 40% de ganancia
            'fair': 0.30,    // 30% de ganancia
            'poor': 0.20     // 20% de ganancia
        }

        const margin = margins[condition as keyof typeof margins] || 0.40
        return purchasePrice * (1 + margin)
    }

    // Auto-calcular precio sugerido cuando cambia precio de compra o condición
    const handlePurchasePriceChange = (value: number) => {
        setNewItem(prev => ({
            ...prev,
            purchasePrice: value,
            suggestedPrice: calculateSuggestedMargin(value, prev.condition)
        }))
    }

    const handleConditionChange = (condition: string) => {
        setNewItem(prev => ({
            ...prev,
            condition: condition as any,
            suggestedPrice: calculateSuggestedMargin(prev.purchasePrice, condition)
        }))
    }

    // Photo handling functions with automatic compression
    const handleFileUpload = async (files: FileList | null, isEditing: boolean = false) => {
        if (!files) return

        const compressionOptions = {
            maxSizeMB: 0.5, // Máximo 500KB por imagen
            maxWidthOrHeight: 1024, // Máximo 1024px de ancho/alto
            useWebWorker: true,
            fileType: 'image/jpeg', // Convertir a JPEG para mejor compresión
        }

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    // Comprimir imagen
                    const compressedFile = await imageCompression(file, compressionOptions)

                    // Convertir a base64
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        if (isEditing && editingItem) {
                            setEditingItem((prev: any) => ({
                                ...prev,
                                photos: [...(prev.photos || []), result]
                            }))
                        } else {
                            setNewItem(prev => ({
                                ...prev,
                                photos: [...prev.photos, result]
                            }))
                        }
                    }
                    reader.readAsDataURL(compressedFile)

                    console.log(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
                } catch (error) {
                    console.error('Error al comprimir imagen:', error)
                    // Si falla la compresión, usar la imagen original
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        if (isEditing && editingItem) {
                            setEditingItem((prev: any) => ({
                                ...prev,
                                photos: [...(prev.photos || []), result]
                            }))
                        } else {
                            setNewItem(prev => ({
                                ...prev,
                                photos: [...prev.photos, result]
                            }))
                        }
                    }
                    reader.readAsDataURL(file)
                }
            }
        }
    }

    const removePhoto = (index: number, isEditing: boolean = false) => {
        if (isEditing && editingItem) {
            setEditingItem((prev: any) => ({
                ...prev,
                photos: prev.photos?.filter((_: any, i: number) => i !== index) || []
            }))
        } else {
            setNewItem(prev => ({
                ...prev,
                photos: prev.photos.filter((_, i) => i !== index)
            }))
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                    <p className="text-gray-600">Gestiona tus piezas de Hot Wheels</p>
                </div>
                <div className="flex gap-2">
                    {isSelectionMode ? (
                        <>
                            <Button
                                variant="secondary"
                                onClick={toggleSelectionMode}
                            >
                                Cancelar
                            </Button>
                            {selectedItems.size > 0 && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={deselectAllItems}
                                    >
                                        Deseleccionar ({selectedItems.size})
                                    </Button>
                                    <Button
                                        variant="danger"
                                        icon={<Trash2 size={20} />}
                                        onClick={handleBulkDelete}
                                    >
                                        Eliminar ({selectedItems.size})
                                    </Button>
                                </>
                            )}
                            {selectedItems.size === 0 && filteredItems.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={selectAllItems}
                                >
                                    Seleccionar Todo
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            {filteredItems.length > 0 && (
                                <Button
                                    variant="secondary"
                                    icon={<CheckSquare size={20} />}
                                    onClick={toggleSelectionMode}
                                >
                                    Seleccionar
                                </Button>
                            )}
                            <Button
                                icon={<Plus size={20} />}
                                onClick={() => setShowAddModal(true)}
                            >
                                Agregar Pieza
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <select
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="input"
                    >
                        <option value="">Todas las condiciones</option>
                        <option value="mint">Mint</option>
                        <option value="good">Bueno</option>
                        <option value="fair">Regular</option>
                        <option value="poor">Malo</option>
                    </select>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            {filteredItems.length} pieza{filteredItems.length !== 1 ? 's' : ''} encontrada{filteredItems.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Inventory Grid */}
            {filteredItems.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Package size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay piezas en el inventario</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || filterCondition
                                ? 'No se encontraron piezas con los filtros aplicados'
                                : 'Comienza agregando tu primera pieza al inventario'
                            }
                        </p>
                        {!searchTerm && !filterCondition && (
                            <Button icon={<Plus size={20} />}>
                                Agregar Primera Pieza
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                        <Card 
                            key={item._id} 
                            hover={!isSelectionMode}
                            className={`relative ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''}`}
                        >
                            <div 
                                className={`${isSelectionMode ? 'cursor-pointer' : ''}`}
                                onClick={() => isSelectionMode && item._id && toggleItemSelection(item._id)}
                            >
                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div className="absolute top-3 left-3 z-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item._id!)}
                                            onChange={() => item._id && toggleItemSelection(item._id)}
                                            className="w-6 h-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    {/* Car Image Placeholder */}
                                    <div className="bg-gray-200 rounded-lg flex items-center justify-center h-32 relative">
                                        {item.photos && item.photos.length > 0 ? (
                                            <img
                                                src={item.photos[0]}
                                                alt="Hot Wheels"
                                                className={`w-full h-full object-cover rounded-lg ${isSelectionMode && selectedItems.has(item._id!) ? 'opacity-75' : ''}`}
                                            />
                                        ) : (
                                            <Package size={48} className="text-gray-400" />
                                        )}
                                    </div>

                                {/* Car Info */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {item.hotWheelsCar?.model || item.carId || 'Nombre no disponible'}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">
                                        {item.hotWheelsCar?.series} {item.hotWheelsCar?.year ? `(${item.hotWheelsCar.year})` : ''}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {item.hotWheelsCar?.toy_num || item.carId}
                                    </p>
                                    
                                    {/* Series Badge */}
                                    {item.seriesId && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                            🎁 {item.seriesName} ({item.seriesPosition}/{item.seriesSize})
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between mt-2">
                                        <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${item.condition === 'mint' ? 'bg-green-100 text-green-800' :
                                                item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                                                    item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                            }
                    `}>
                                            {item.condition === 'mint' ? 'Mint' :
                                                item.condition === 'good' ? 'Bueno' :
                                                    item.condition === 'fair' ? 'Regular' : 'Malo'}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            Disponible: {item.quantity - (item.reservedQuantity || 0)} / {item.quantity}
                                            {(item.reservedQuantity || 0) > 0 && (
                                                <span className="text-orange-600 ml-1">
                                                    ({item.reservedQuantity || 0} reservado{(item.reservedQuantity || 0) !== 1 ? 's' : ''})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Costo:</span>
                                        <span className="font-medium">${item.purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Sugerido:</span>
                                        <span className="font-medium text-green-600">${item.suggestedPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t pt-1">
                                        <span className="text-gray-600">Ganancia:</span>
                                        <span className="font-semibold text-primary-600">
                                            ${(item.suggestedPrice - item.purchasePrice).toFixed(2)}
                                            <span className="text-xs ml-1">
                                                (+{(((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%)
                                            </span>
                                        </span>
                                    </div>
                                    {item.location && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 pt-1 border-t">
                                            <MapPin size={12} />
                                            <span className="truncate">{item.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {!isSelectionMode && (
                                    <div className="flex space-x-2 pt-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => handleEditItem(item)}
                                        >
                                            <Edit size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => item._id && handleDeleteItem(item._id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Agregar Nueva Pieza</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Compra
                                </label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="purchaseType"
                                            checked={!newItem.isBox && !newItem.isMultipleCars}
                                            onChange={() => {
                                                setNewItem({
                                                    ...newItem,
                                                    isBox: false,
                                                    isMultipleCars: false,
                                                    quantity: 1,
                                                    pricePerPiece: 0,
                                                    cars: []
                                                })
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Pieza Individual (1 modelo)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="purchaseType"
                                            checked={newItem.isBox && !newItem.isMultipleCars}
                                            onChange={() => {
                                                setNewItem({
                                                    ...newItem,
                                                    isBox: true,
                                                    isMultipleCars: false,
                                                    quantity: newItem.boxSize,
                                                    pricePerPiece: newItem.purchasePrice / newItem.boxSize,
                                                    cars: []
                                                })
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Caja del mismo modelo (ej: 10 del mismo)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="purchaseType"
                                            checked={newItem.isMultipleCars}
                                            onChange={() => {
                                                setNewItem({
                                                    ...newItem,
                                                    isBox: false,
                                                    isMultipleCars: true,
                                                    carId: '',
                                                    quantity: 0,
                                                    pricePerPiece: 0,
                                                    cars: []
                                                })
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Serie/Caja con múltiples modelos diferentes</span>
                                    </label>
                                </div>
                                {newItem.isMultipleCars && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 Usa esta opción para series como Fast & Furious donde cada caja trae varios modelos diferentes
                                    </p>
                                )}
                            </div>

                            {/* Multiple Cars Section (for series/boxes with different models) */}
                            {newItem.isMultipleCars && (
                                <div className="border-2 border-blue-200 rounded-lg p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium text-gray-900">Modelos en la caja/serie</h4>
                                        <span className="text-sm text-gray-600">
                                            {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas totales
                                        </span>
                                    </div>

                                    {/* Series Checkbox - ONLY shown when adding multiple cars */}
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!newItem.seriesId}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewItem({
                                                            ...newItem,
                                                            seriesId: `SERIES-${Date.now()}`,
                                                            seriesName: '',
                                                            seriesSize: 5,
                                                            seriesPosition: 1,
                                                            seriesPrice: 0,
                                                            seriesDefaultPrice: 0
                                                        })
                                                    } else {
                                                        setNewItem({
                                                            ...newItem,
                                                            seriesId: '',
                                                            seriesName: '',
                                                            seriesSize: 5,
                                                            seriesPosition: 1,
                                                            seriesPrice: 0,
                                                            seriesDefaultPrice: 0
                                                        })
                                                    }
                                                }}
                                            />
                                            <span className="font-medium text-purple-900">
                                                🎁 Estos modelos pertenecen a una serie
                                            </span>
                                        </label>
                                        <p className="text-xs text-purple-700 mt-1 ml-6">
                                            Marca esto si los carros que vas a agregar son parte de una colección/serie vendible completa
                                        </p>
                                    </div>

                                    {/* Series Configuration - ONLY shown when checkbox is marked */}
                                    {newItem.seriesId && (
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    ID de Serie (auto-generado)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input w-full bg-gray-100"
                                                    value={newItem.seriesId}
                                                    readOnly
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nombre de la Serie *
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input w-full"
                                                    placeholder="ej: Marvel Series 2024"
                                                    value={newItem.seriesName}
                                                    onChange={(e) => setNewItem({ ...newItem, seriesName: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Total de Piezas en Serie *
                                                </label>
                                                <input
                                                    type="number"
                                                    className="input w-full"
                                                    min="2"
                                                    max="20"
                                                    value={newItem.seriesSize}
                                                    onChange={(e) => setNewItem({ ...newItem, seriesSize: parseInt(e.target.value) || 5 })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Precio de Serie Completa (Opcional)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="input w-full"
                                                    placeholder="Auto (85% del total)"
                                                    value={newItem.seriesPrice || ''}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value) || 0
                                                        setNewItem({ ...newItem, seriesPrice: value })
                                                    }}
                                                />
                                            </div>

                                            {newItem.suggestedPrice > 0 && newItem.seriesSize > 0 && (
                                                <div className="col-span-2 text-xs bg-white p-2 rounded border border-purple-200">
                                                    💡 Precio sugerido: <strong>${(newItem.suggestedPrice * newItem.seriesSize * 0.85).toFixed(2)}</strong>
                                                    {' '}(85% de ${(newItem.suggestedPrice * newItem.seriesSize).toFixed(2)})
                                                    {newItem.seriesPrice > 0 && (
                                                        <span className="ml-2 text-green-600 font-medium">
                                                            → ${(newItem.seriesPrice / newItem.seriesSize).toFixed(2)}/pieza
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Add car to list */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Código (ej: FHY65)"
                                            className="input flex-1"
                                            value={newItem.carId}
                                            onChange={(e) => setNewItem({ ...newItem, carId: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Cant."
                                            className="input w-24"
                                            value={newItem.quantity === 0 ? '' : newItem.quantity}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                                                setNewItem({ ...newItem, quantity: isNaN(value) ? 1 : Math.max(1, value) })
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (newItem.carId && newItem.quantity > 0) {
                                                    setNewItem({
                                                        ...newItem,
                                                        cars: [...newItem.cars, { carId: newItem.carId, quantity: newItem.quantity }],
                                                        carId: '',
                                                        quantity: 1
                                                    })
                                                }
                                            }}
                                            disabled={!newItem.carId || newItem.quantity === 0}
                                        >
                                            <Plus size={16} />
                                        </Button>
                                    </div>

                                    {/* List of cars */}
                                    {newItem.cars.length > 0 && (
                                        <div className="space-y-2">
                                            {newItem.cars.map((car, index) => (
                                                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                    <span className="text-sm">
                                                        <span className="font-medium">{car.carId}</span>
                                                        <span className="text-gray-600 ml-2">× {car.quantity}</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewItem({
                                                                ...newItem,
                                                                cars: newItem.cars.filter((_, i) => i !== index)
                                                            })
                                                        }}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {newItem.cars.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            Agrega los modelos que vienen en la caja/serie
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Box Size Selection */}
                            {newItem.isBox && !newItem.isMultipleCars && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tamaño de Caja
                                    </label>
                                    <select
                                        className="input w-full"
                                        value={newItem.boxSize}
                                        onChange={(e) => {
                                            const boxSize = parseInt(e.target.value) as 5 | 8 | 10
                                            setNewItem({
                                                ...newItem,
                                                boxSize,
                                                quantity: boxSize,
                                                pricePerPiece: newItem.purchasePrice / boxSize
                                            })
                                        }}
                                    >
                                        <option value={5}>5 piezas</option>
                                        <option value={8}>8 piezas</option>
                                        <option value={10}>10 piezas</option>
                                    </select>
                                </div>
                            )}

                            {/* Single Car ID - Only for individual and box (same model) */}
                            {!newItem.isMultipleCars && (
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Código de Hot Wheels
                                    </label>
                                    {existingItemToUpdate && (
                                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
                                            <span className="text-sm text-yellow-800">
                                                ✏️ Editando pieza existente
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCancelUpdate}
                                                className="text-yellow-600 hover:text-yellow-800 text-sm underline"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="ej: FHY65"
                                        value={newItem.carId}
                                        onChange={(e) => handleCarIdChange(e.target.value)}
                                        onFocus={() => newItem.carId.length > 0 && setShowSuggestions(true)}
                                    />
                                    
                                    {/* Dropdown with suggestions */}
                                    {showSuggestions && !existingItemToUpdate && getMatchingItems().length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            <div className="p-2 bg-gray-50 border-b text-xs text-gray-600">
                                                {getMatchingItems().length} pieza{getMatchingItems().length !== 1 ? 's' : ''} encontrada{getMatchingItems().length !== 1 ? 's' : ''}
                                            </div>
                                            {getMatchingItems().map((item) => (
                                                <button
                                                    key={item._id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                                                    onClick={() => handleSelectExistingItem(item)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium text-sm">{item.carId}</div>
                                                            <div className="text-xs text-gray-600">
                                                                {item.quantity} disponible{item.quantity !== 1 ? 's' : ''} • {item.condition} • ${item.suggestedPrice}
                                                            </div>
                                                        </div>
                                                        <Edit size={14} className="text-blue-500" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quantity - Only for individual and box (same model) */}
                            {!newItem.isMultipleCars && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {newItem.isBox ? 'Total de Piezas (automático)' : 'Cantidad'}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="input w-full"
                                        value={newItem.quantity === 0 ? '' : newItem.quantity}
                                        disabled={newItem.isBox}
                                        onChange={(e) => {
                                            if (!newItem.isBox) {
                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                                                setNewItem({ ...newItem, quantity: isNaN(value) ? 1 : Math.max(1, value) })
                                            }
                                        }}
                                    />
                                    {newItem.isBox && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se agregarán {newItem.quantity} piezas del mismo Hot Wheels
                                        </p>
                                    )}
                                </div>
                            )}                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newItem.isMultipleCars || newItem.isBox ? 'Precio Total de la Caja/Serie' : 'Precio de Compra'}
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="0.00"
                                    value={newItem.purchasePrice === 0 ? '' : newItem.purchasePrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        const finalValue = isNaN(numValue) ? 0 : numValue
                                        
                                        // For multiple cars, don't auto-calculate suggested price
                                        if (newItem.isMultipleCars && newItem.cars.length > 0) {
                                            setNewItem(prev => ({
                                                ...prev,
                                                purchasePrice: finalValue
                                            }))
                                        } else {
                                            handlePurchasePriceChange(finalValue)

                                            if (newItem.isBox) {
                                                setNewItem(prev => ({
                                                    ...prev,
                                                    pricePerPiece: finalValue / newItem.boxSize
                                                }))
                                            }
                                        }
                                    }}
                                />
                                {newItem.isMultipleCars && newItem.cars.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas total = ${newItem.purchasePrice > 0 ? (newItem.purchasePrice / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2) : '0.00'} por pieza
                                    </p>
                                )}
                                {newItem.isBox && newItem.purchasePrice > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        ${(newItem.purchasePrice / newItem.boxSize).toFixed(2)} por pieza
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    {newItem.isMultipleCars && newItem.seriesId 
                                        ? 'Precio Individual por Pieza (si se vende por separado)' 
                                        : newItem.isMultipleCars || newItem.isBox 
                                            ? 'Precio de Venta por Pieza' 
                                            : 'Precio Sugerido'}
                                    {!newItem.isMultipleCars && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                            <TrendingUp size={12} />
                                            {newItem.purchasePrice > 0 && newItem.suggestedPrice > 0 ?
                                                `+${(((newItem.suggestedPrice - newItem.purchasePrice) / newItem.purchasePrice) * 100).toFixed(0)}%`
                                                : 'Auto'}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="0.00"
                                    value={newItem.suggestedPrice === 0 ? '' : newItem.suggestedPrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        setNewItem({ ...newItem, suggestedPrice: isNaN(numValue) ? 0 : numValue })
                                    }}
                                />
                                {newItem.isMultipleCars && newItem.seriesId && newItem.cars.length > 0 && newItem.suggestedPrice > 0 && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                        ⚠️ Este es el precio si vendes cada pieza POR SEPARADO. El precio de serie completa se configura abajo.
                                    </p>
                                )}
                                {newItem.isMultipleCars && !newItem.seriesId && newItem.cars.length > 0 && newItem.suggestedPrice > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        💰 Si vendes todas por separado: ${(newItem.suggestedPrice * newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)} total
                                    </p>
                                )}
                                {!newItem.isMultipleCars && newItem.purchasePrice > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Sugerido: ${calculateSuggestedMargin(newItem.purchasePrice, newItem.condition).toFixed(2)}
                                        {newItem.isBox && ` (Ganancia: $${((newItem.suggestedPrice - (newItem.purchasePrice / newItem.boxSize)) * newItem.boxSize).toFixed(2)} por caja)`}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Condición (afecta margen sugerido)
                                </label>
                                <select
                                    className="input w-full"
                                    value={newItem.condition}
                                    onChange={(e) => handleConditionChange(e.target.value)}
                                >
                                    <option value="mint">Mint (+50% ganancia)</option>
                                    <option value="good">Bueno (+40% ganancia)</option>
                                    <option value="fair">Regular (+30% ganancia)</option>
                                    <option value="poor">Malo (+20% ganancia)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <MapPin size={16} />
                                    Ubicación Física (Opcional)
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="ej: Caja 1, Estante A, Contenedor azul..."
                                    value={newItem.location}
                                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    📦 Indica dónde guardas esta pieza para encontrarla fácilmente
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notas (Opcional)
                                </label>
                                <textarea
                                    className="input w-full h-20 resize-none"
                                    placeholder="Notas adicionales..."
                                    value={newItem.notes}
                                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                                />
                            </div>

                            {/* Photos Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fotos
                                </label>

                                {/* Photo Upload */}
                                <div className="mb-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleFileUpload(e.target.files, false)}
                                        className="hidden"
                                        id="photo-upload"
                                    />
                                    <label
                                        htmlFor="photo-upload"
                                        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                    >
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Subir fotos (múltiples archivos)
                                        </span>
                                    </label>
                                </div>

                                {/* Photo Preview */}
                                {newItem.photos.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {newItem.photos.map((photo, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={photo}
                                                    alt={`Foto ${index + 1}`}
                                                    className="w-full h-20 object-cover rounded border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index, false)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Summary Section */}
                            {((newItem.carId || newItem.cars.length > 0) && (newItem.purchasePrice > 0 || newItem.suggestedPrice > 0)) && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Resumen</h4>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                        {/* Multiple Cars Summary */}
                                        {newItem.isMultipleCars && newItem.cars.length > 0 && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Tipo:</span>
                                                    <span className="font-medium">Serie/Caja con múltiples modelos</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Modelos diferentes:</span>
                                                    <span className="font-medium">{newItem.cars.length}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total de piezas:</span>
                                                    <span className="font-medium">
                                                        {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)}
                                                    </span>
                                                </div>
                                                <div className="border-t pt-1 mt-1 space-y-1">
                                                    {newItem.cars.map((car, idx) => (
                                                        <div key={idx} className="flex justify-between text-xs">
                                                            <span>{car.carId}</span>
                                                            <span>× {car.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between border-t pt-1 mt-1">
                                                    <span>Precio total:</span>
                                                    <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Precio por pieza:</span>
                                                    <span className="font-medium">
                                                        ${(newItem.purchasePrice / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)}
                                                    </span>
                                                </div>
                                                {newItem.suggestedPrice > 0 && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>Precio sugerido (por pieza):</span>
                                                            <span className="font-medium text-green-600">
                                                                ${newItem.suggestedPrice.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between border-t pt-1 mt-1">
                                                            <span>Ganancia potencial total:</span>
                                                            <span className="font-medium text-green-600">
                                                                ${((newItem.suggestedPrice * newItem.cars.reduce((sum, car) => sum + car.quantity, 0)) - newItem.purchasePrice).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {/* Single Car or Box Summary */}
                                        {!newItem.isMultipleCars && newItem.carId && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Hot Wheels:</span>
                                                    <span className="font-medium">{newItem.carId}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Tipo:</span>
                                                    <span className="font-medium">
                                                        {newItem.isBox ? `Caja de ${newItem.boxSize} piezas` : 'Pieza individual'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total de piezas:</span>
                                                    <span className="font-medium">{newItem.quantity}</span>
                                                </div>
                                                {newItem.isBox && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>Precio total caja:</span>
                                                            <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Precio por pieza:</span>
                                                            <span className="font-medium">${(newItem.purchasePrice / newItem.boxSize).toFixed(2)}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {!newItem.isBox && newItem.purchasePrice > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Precio de compra:</span>
                                                        <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {newItem.suggestedPrice > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Precio sugerido{newItem.isBox ? ' (por pieza)' : ''}:</span>
                                                        <span className="font-medium text-green-600">${newItem.suggestedPrice.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {newItem.isBox && newItem.suggestedPrice > 0 && newItem.purchasePrice > 0 && (
                                                    <div className="flex justify-between border-t pt-1 mt-1">
                                                        <span>Ganancia potencial total:</span>
                                                        <span className="font-medium text-green-600">
                                                            ${((newItem.suggestedPrice - (newItem.purchasePrice / newItem.boxSize)) * newItem.boxSize).toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                    resetForm()
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleAddItem}
                                disabled={newItem.isMultipleCars ? newItem.cars.length === 0 : !newItem.carId}
                            >
                                {existingItemToUpdate
                                    ? '✏️ Actualizar Pieza'
                                    : newItem.isMultipleCars
                                        ? `Agregar ${newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} Piezas (${newItem.cars.length} modelos)`
                                        : newItem.isBox
                                            ? `Agregar ${newItem.quantity} Piezas`
                                            : 'Agregar Pieza'
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Editar Pieza</h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false)
                                    setEditingItem(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Código/ID del Hot Wheels
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="ej: FHY65"
                                    value={editingItem.carId}
                                    onChange={(e) => setEditingItem({ ...editingItem, carId: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cantidad
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    className="input w-full"
                                    value={editingItem.quantity === 0 ? '' : editingItem.quantity}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                                        setEditingItem({ ...editingItem, quantity: isNaN(value) ? 1 : Math.max(1, value) })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Precio de Compra
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="0.00"
                                    value={editingItem.purchasePrice === 0 ? '' : editingItem.purchasePrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        setEditingItem({ ...editingItem, purchasePrice: isNaN(numValue) ? 0 : numValue })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Precio Sugerido
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="0.00"
                                    value={editingItem.suggestedPrice === 0 ? '' : editingItem.suggestedPrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        setEditingItem({ ...editingItem, suggestedPrice: isNaN(numValue) ? 0 : numValue })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Condición
                                </label>
                                <select
                                    className="input w-full"
                                    value={editingItem.condition}
                                    onChange={(e) => setEditingItem({ ...editingItem, condition: e.target.value as any })}
                                >
                                    <option value="mint">Mint</option>
                                    <option value="good">Bueno</option>
                                    <option value="fair">Regular</option>
                                    <option value="poor">Malo</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notas (Opcional)
                                </label>
                                <textarea
                                    className="input w-full h-20 resize-none"
                                    placeholder="Notas adicionales..."
                                    value={editingItem.notes}
                                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                                />
                            </div>

                            {/* Photos Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fotos
                                </label>

                                {/* Photo Upload */}
                                <div className="mb-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleFileUpload(e.target.files, true)}
                                        className="hidden"
                                        id="photo-upload-edit"
                                    />
                                    <label
                                        htmlFor="photo-upload-edit"
                                        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                    >
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Subir fotos (múltiples archivos)
                                        </span>
                                    </label>
                                </div>

                                {/* Photo Preview */}
                                {editingItem.photos && editingItem.photos.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {editingItem.photos.map((photo: string, index: number) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={photo}
                                                    alt={`Foto ${index + 1}`}
                                                    className="w-full h-20 object-cover rounded border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index, true)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                    setShowEditModal(false)
                                    setEditingItem(null)
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleUpdateItem}
                                disabled={!editingItem.carId}
                            >
                                Actualizar Pieza
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
