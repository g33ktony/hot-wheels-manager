import { useState } from 'react'
import { useSales, useDeleteSale } from '@/hooks/useSales'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, ShoppingCart, Eye, Trash2, X } from 'lucide-react'

export default function Sales() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)

    const { data: sales, isLoading, error } = useSales()
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

    const handleViewDetails = (sale: any) => {
        setSelectedSale(sale)
        setShowDetailsModal(true)
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
                                                ${sale.totalAmount}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {sale.items?.length || 0} pieza{sale.items?.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-600">
                                        {sale.customer?.name && (
                                            <p><span className="font-medium">Cliente:</span> {sale.customer.name}</p>
                                        )}
                                        {sale.customer?.email && (
                                            <p><span className="font-medium">Email:</span> {sale.customer.email}</p>
                                        )}
                                        {sale.customer?.phone && (
                                            <p><span className="font-medium">Teléfono:</span> {sale.customer.phone}</p>
                                        )}
                                        {sale.delivery && (
                                            <p><span className="font-medium">Entrega:</span> {sale.delivery.location} - {new Date(sale.delivery.scheduledDate).toLocaleDateString()}</p>
                                        )}
                                        <p><span className="font-medium">Método de Pago:</span> {sale.paymentMethod}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-1 px-2 py-1 text-xs rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {sale.status === 'completed' ? 'Completada' :
                                                    sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                                            </span>
                                        </p>
                                        {sale.notes && (
                                            <p><span className="font-medium">Notas:</span> {sale.notes}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex space-x-2 ml-4">
                                    <Button size="sm" variant="secondary" onClick={() => handleViewDetails(sale)}>
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

            {/* Create Sale Modal - Temporarily disabled for new structure */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Nueva Venta</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-center py-8">
                            <p className="text-gray-600">La funcionalidad de crear ventas manuales está temporalmente deshabilitada.</p>
                            <p className="text-sm text-gray-500 mt-2">Las ventas se crean automáticamente cuando se completan las entregas.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sale Details Modal */}
            {showDetailsModal && selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-medium text-gray-900">
                                Detalles de Venta #{selectedSale._id?.slice(-8)}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false)
                                    setSelectedSale(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sale Info */}
                            <div className="space-y-4">
                                <Card>
                                    <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Fecha:</span> {new Date(selectedSale.saleDate).toLocaleDateString('es-ES')}</p>
                                        <p><span className="font-medium">Total:</span> <span className="text-green-600 font-semibold">${selectedSale.totalAmount}</span></p>
                                        <p><span className="font-medium">Método de Pago:</span> {selectedSale.paymentMethod}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-1 px-2 py-1 text-xs rounded-full ${selectedSale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                selectedSale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {selectedSale.status === 'completed' ? 'Completada' :
                                                    selectedSale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                                            </span>
                                        </p>
                                        {selectedSale.notes && (
                                            <p><span className="font-medium">Notas:</span> {selectedSale.notes}</p>
                                        )}
                                    </div>
                                </Card>

                                {/* Customer Info */}
                                {selectedSale.customer && (
                                    <Card>
                                        <h4 className="font-medium text-gray-900 mb-3">Cliente</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Nombre:</span> {selectedSale.customer.name}</p>
                                            {selectedSale.customer.email && <p><span className="font-medium">Email:</span> {selectedSale.customer.email}</p>}
                                            {selectedSale.customer.phone && <p><span className="font-medium">Teléfono:</span> {selectedSale.customer.phone}</p>}
                                            {selectedSale.customer.address && <p><span className="font-medium">Dirección:</span> {selectedSale.customer.address}</p>}
                                        </div>
                                    </Card>
                                )}

                                {/* Delivery Info */}
                                {selectedSale.delivery && (
                                    <Card>
                                        <h4 className="font-medium text-gray-900 mb-3">Entrega Asociada</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Ubicación:</span> {selectedSale.delivery.location}</p>
                                            <p><span className="font-medium">Fecha Programada:</span> {new Date(selectedSale.delivery.scheduledDate).toLocaleDateString('es-ES')}</p>
                                            <p><span className="font-medium">Estado:</span> {selectedSale.delivery.status}</p>
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* Items */}
                            <div>
                                <Card>
                                    <h4 className="font-medium text-gray-900 mb-3">Piezas Vendidas</h4>
                                    <div className="space-y-3">
                                        {selectedSale.items?.map((item: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-medium text-gray-900">{item.carName}</h5>
                                                        <p className="text-sm text-gray-600">ID: {item.carId}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-green-600">${item.unitPrice}</p>
                                                        <p className="text-sm text-gray-500">Cant: {item.quantity}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <p>Subtotal: ${(item.unitPrice * item.quantity).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
