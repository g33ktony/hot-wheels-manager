import { useState } from 'react'
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, Package, Edit, Trash2, X, Upload } from 'lucide-react'

export default function Inventory() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCondition, setFilterCondition] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [newItem, setNewItem] = useState({
        carId: '',
        quantity: 1,
        purchasePrice: 0,
        suggestedPrice: 0,
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        notes: '',
        photos: [] as string[],
        // New fields for box support
        isBox: false,
        boxSize: 10 as 5 | 8 | 10,
        pricePerPiece: 0
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
            // Calculate final prices based on whether it's a box or individual piece
            const finalPurchasePrice = newItem.isBox 
                ? newItem.purchasePrice / newItem.boxSize  // Price per piece for boxes
                : newItem.purchasePrice                    // Direct price for individual pieces
            
            const finalSuggestedPrice = newItem.suggestedPrice // This is already per piece

            await createItemMutation.mutateAsync({
                carId: newItem.carId,
                quantity: newItem.quantity,
                purchasePrice: finalPurchasePrice,
                suggestedPrice: finalSuggestedPrice,
                condition: newItem.condition,
                notes: newItem.notes,
                photos: newItem.photos
            })

            // Reset form and close modal
            setNewItem({
                carId: '',
                quantity: 1,
                purchasePrice: 0,
                suggestedPrice: 0,
                condition: 'mint',
                notes: '',
                photos: [],
                isBox: false,
                boxSize: 10,
                pricePerPiece: 0
            })
            setShowAddModal(false)
        } catch (error) {
            console.error('Error adding item:', error)
        }
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
            photos: item.photos || []
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

    // Photo handling functions
    const handleFileUpload = (files: FileList | null, isEditing: boolean = false) => {
        if (!files) return

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
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
        })
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
                <Button
                    icon={<Plus size={20} />}
                    onClick={() => setShowAddModal(true)}
                >
                    Agregar Pieza
                </Button>
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
                        <Card key={item._id} hover>
                            <div className="space-y-4">
                                {/* Car Image Placeholder */}
                                <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                                    {item.photos && item.photos.length > 0 ? (
                                        <img
                                            src={item.photos[0]}
                                            alt="Hot Wheels"
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                    ) : (
                                        <Package size={32} className="text-gray-400" />
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
                                        <span className="font-medium">${item.purchasePrice}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Sugerido:</span>
                                        <span className="font-medium text-green-600">${item.suggestedPrice}</span>
                                    </div>
                                    {item.actualPrice && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Actual:</span>
                                            <span className="font-medium text-blue-600">${item.actualPrice}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
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
                                                        <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Código de Hot Wheels
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="ej: FHY65"
                                    value={newItem.carId}
                                    onChange={(e) => setNewItem({ ...newItem, carId: e.target.value })}
                                />
                            </div>

                            {/* New: Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Compra
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="purchaseType"
                                            checked={!newItem.isBox}
                                            onChange={() => {
                                                setNewItem({ 
                                                    ...newItem, 
                                                    isBox: false, 
                                                    quantity: 1,
                                                    pricePerPiece: 0
                                                })
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Pieza Individual</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="purchaseType"
                                            checked={newItem.isBox}
                                            onChange={() => {
                                                setNewItem({ 
                                                    ...newItem, 
                                                    isBox: true, 
                                                    quantity: newItem.boxSize,
                                                    pricePerPiece: newItem.purchasePrice / newItem.boxSize
                                                })
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Caja Completa</span>
                                    </label>
                                </div>
                            </div>

                            {/* Box Size Selection */}
                            {newItem.isBox && (
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newItem.isBox ? 'Precio Total de la Caja' : 'Precio de Compra'}
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
                                        setNewItem({ 
                                            ...newItem, 
                                            purchasePrice: finalValue,
                                            pricePerPiece: newItem.isBox ? finalValue / newItem.boxSize : finalValue
                                        })
                                    }}
                                />
                                {newItem.isBox && newItem.purchasePrice > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        ${(newItem.purchasePrice / newItem.boxSize).toFixed(2)} por pieza
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newItem.isBox ? 'Precio Sugerido por Pieza' : 'Precio Sugerido'}
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
                                {newItem.isBox && newItem.suggestedPrice > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Ganancia potencial: ${((newItem.suggestedPrice - (newItem.purchasePrice / newItem.boxSize)) * newItem.boxSize).toFixed(2)} por caja completa
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Condición
                                </label>
                                <select
                                    className="input w-full"
                                    value={newItem.condition}
                                    onChange={(e) => setNewItem({ ...newItem, condition: e.target.value as any })}
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
                            {newItem.carId && (newItem.purchasePrice > 0 || newItem.suggestedPrice > 0) && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Resumen</h4>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
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
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleAddItem}
                                disabled={!newItem.carId}
                            >
                                {newItem.isBox ? `Agregar ${newItem.quantity} Piezas` : 'Agregar Pieza'}
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
