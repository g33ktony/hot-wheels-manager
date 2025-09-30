import { useState } from 'react'
import { useSales, useCreateSale, useDeleteSale } from '@/hooks/useSales'
import { useInventory } from '@/hooks/useInventory'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, ShoppingCart, Eye, Edit, Trash2, X } from 'lucide-react'

export default function Sales() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newSale, setNewSale] = useState({
        inventoryItemId: '',
        customerId: '',
        salePrice: 0,
        paymentMethod: 'cash' as const,
        notes: ''
    })

    const { data: sales, isLoading, error } = useSales()
    const { data: inventoryItems } = useInventory()
    const createSaleMutation = useCreateSale()
    const deleteSaleMutation = useDeleteSale()

    if (isLoading) {
        return <Loading text="Cargando ventas..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar las ventas</p>
            </div>
        )
    }

    const filteredSales = sales?.filter(sale => {
        const customerName = sale.customer?.name || ''
        const customerEmail = sale.customer?.email || ''
        const customerPhone = sale.customer?.phone || ''
        const matchesSearch = !searchTerm ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerPhone.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    }) || []

    const handleCreateSale = async () => {
        try {
            await createSaleMutation.mutateAsync({
                inventoryItemId: newSale.inventoryItemId,
                customerId: newSale.customerId,
                salePrice: newSale.salePrice,
                paymentMethod: newSale.paymentMethod,
                notes: newSale.notes
            })

            // Reset form and close modal
            setNewSale({
                inventoryItemId: '',
                customerId: '',
                salePrice: 0,
                paymentMethod: 'cash' as const,
                notes: ''
            })
            setShowCreateModal(false)
        } catch (error) {
            console.error('Error creating sale:', error)
        }
    }

    const handleDeleteSale = async (id: string) => {
        if (!id) return

        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            try {
                await deleteSaleMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting sale:', error)
            }
        }
    }
    console.error('Error deleting sale:', error)
}
        }
    }

return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                <p className="text-gray-600">Gestiona tus ventas de Hot Wheels</p>
            </div>
            <Button
                icon={<Plus size={20} />}
                onClick={() => setShowCreateModal(true)}
            >
                Nueva Venta
            </Button>
        </div>

        {/* Filters */}
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Buscar por comprador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </Card>

        {/* Sales List */}
        {filteredSales.length === 0 ? (
            <Card>
                <div className="text-center py-12">
                    <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ventas registradas</h3>
                    <p className="text-gray-500 mb-4">
                        {searchTerm
                            ? 'No se encontraron ventas con los filtros aplicados'
                            : 'Comienza registrando tu primera venta'
                        }
                    </p>
                    {!searchTerm && (
                        <Button
                            icon={<Plus size={20} />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Registrar Primera Venta
                        </Button>
                    )}
                </div>
            </Card>
        ) : (
            <div className="grid gap-4">
                {filteredSales.map((sale) => (
                    <Card key={sale._id} hover>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            Venta #{sale._id?.slice(-8)}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(sale.saleDate).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-green-600">
                                            ${sale.salePrice}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm text-gray-600">
                                    {sale.buyerInfo?.name && (
                                        <p><span className="font-medium">Comprador:</span> {sale.buyerInfo.name}</p>
                                    )}
                                    {sale.buyerInfo?.email && (
                                        <p><span className="font-medium">Email:</span> {sale.buyerInfo.email}</p>
                                    )}
                                    {sale.buyerInfo?.phone && (
                                        <p><span className="font-medium">Teléfono:</span> {sale.buyerInfo.phone}</p>
                                    )}
                                    {sale.notes && (
                                        <p><span className="font-medium">Notas:</span> {sale.notes}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex space-x-2 ml-4">
                                <Button size="sm" variant="secondary">
                                    <Eye size={16} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => sale._id && handleDeleteSale(sale._id)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )}

        {/* Create Sale Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Nueva Venta</h3>
                        <button
                            onClick={() => {
                                setShowCreateModal(false)
                                setNewSale({
                                    inventoryItemId: '',
                                    salePrice: 0,
                                    buyerInfo: { name: '', email: '', phone: '', address: '' },
                                    notes: ''
                                })
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pieza del Inventario
                            </label>
                            <select
                                className="input w-full"
                                value={newSale.inventoryItemId}
                                onChange={(e) => setNewSale({ ...newSale, inventoryItemId: e.target.value })}
                            >
                                <option value="">Selecciona una pieza...</option>
                                {inventoryItems?.filter(item => item.quantity > 0).map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item.hotWheelsCar?.model || item.carId} (Qty: {item.quantity}) - Sugerido: ${item.suggestedPrice}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio de Venta
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="0.00"
                                value={newSale.salePrice === 0 ? '' : newSale.salePrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const numValue = value === '' ? 0 : parseFloat(value)
                                    setNewSale({ ...newSale, salePrice: isNaN(numValue) ? 0 : numValue })
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Comprador
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Nombre del comprador"
                                value={newSale.buyerInfo.name}
                                onChange={(e) => setNewSale({
                                    ...newSale,
                                    buyerInfo: { ...newSale.buyerInfo, name: e.target.value }
                                })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email (Opcional)
                            </label>
                            <input
                                type="email"
                                className="input w-full"
                                placeholder="email@ejemplo.com"
                                value={newSale.buyerInfo.email}
                                onChange={(e) => setNewSale({
                                    ...newSale,
                                    buyerInfo: { ...newSale.buyerInfo, email: e.target.value }
                                })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teléfono (Opcional)
                            </label>
                            <input
                                type="tel"
                                className="input w-full"
                                placeholder="+52 555 123 4567"
                                value={newSale.buyerInfo.phone}
                                onChange={(e) => setNewSale({
                                    ...newSale,
                                    buyerInfo: { ...newSale.buyerInfo, phone: e.target.value }
                                })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas (Opcional)
                            </label>
                            <textarea
                                className="input w-full h-20 resize-none"
                                placeholder="Notas adicionales sobre la venta..."
                                value={newSale.notes}
                                onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowCreateModal(false)
                                setNewSale({
                                    inventoryItemId: '',
                                    salePrice: 0,
                                    buyerInfo: { name: '', email: '', phone: '', address: '' },
                                    notes: ''
                                })
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleCreateSale}
                            disabled={!newSale.inventoryItemId || newSale.salePrice <= 0}
                        >
                            Registrar Venta
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
)
}
