import { useState } from 'react'
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, Package, Edit, Trash2, X } from 'lucide-react'

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
        notes: ''
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
            await createItemMutation.mutateAsync({
                carId: newItem.carId,
                quantity: newItem.quantity,
                purchasePrice: newItem.purchasePrice,
                suggestedPrice: newItem.suggestedPrice,
                condition: newItem.condition,
                notes: newItem.notes,
                photos: []
            })

            // Reset form and close modal
            setNewItem({
                carId: '',
                quantity: 1,
                purchasePrice: 0,
                suggestedPrice: 0,
                condition: 'mint',
                notes: ''
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
            notes: item.notes || ''
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
                                    Código/ID del Hot Wheels
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="ej: FHY65"
                                    value={newItem.carId}
                                    onChange={(e) => setNewItem({ ...newItem, carId: e.target.value })}
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
                                    value={newItem.quantity === 0 ? '' : newItem.quantity}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                                        setNewItem({ ...newItem, quantity: isNaN(value) ? 1 : Math.max(1, value) })
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
                                    value={newItem.purchasePrice === 0 ? '' : newItem.purchasePrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        setNewItem({ ...newItem, purchasePrice: isNaN(numValue) ? 0 : numValue })
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
                                    value={newItem.suggestedPrice === 0 ? '' : newItem.suggestedPrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '')
                                        const numValue = value === '' ? 0 : parseFloat(value)
                                        setNewItem({ ...newItem, suggestedPrice: isNaN(numValue) ? 0 : numValue })
                                    }}
                                />
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
                                Agregar Pieza
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
