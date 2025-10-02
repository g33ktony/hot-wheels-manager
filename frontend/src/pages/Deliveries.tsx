import { useState } from 'react'
import { useQueryClient } from 'react-query'
import { useDeliveries, useCreateDelivery, useUpdateDelivery, useMarkDeliveryAsCompleted, useMarkDeliveryAsPrepared, useDeleteDelivery } from '@/hooks/useDeliveries'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useInventory } from '@/hooks/useInventory'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, Truck, Trash2, X, Calendar, MapPin, Package, CheckCircle, Clock, Eye, UserPlus, Edit } from 'lucide-react'

export default function Deliveries() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
    const [editingDelivery, setEditingDelivery] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    // Función para obtener el inicio de la semana (lunes)
    const getStartOfWeek = () => {
        const today = new Date()
        const dayOfWeek = today.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Si es domingo, restar 6 días para llegar al lunes
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - daysToSubtract)
        return startOfWeek.toISOString().split('T')[0]
    }

    const [selectedDate, setSelectedDate] = useState(getStartOfWeek())
    const [newDelivery, setNewDelivery] = useState({
        customerId: '',
        items: [] as { inventoryItemId?: string; hotWheelsCarId?: string; carId: string; carName: string; quantity: number; unitPrice: number }[],
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        location: '',
        totalAmount: 0,
        notes: ''
    })
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    })

    const { data: deliveries, isLoading, error } = useDeliveries()
    const { data: customers } = useCustomers()
    const { data: inventoryItems } = useInventory()
    const createDeliveryMutation = useCreateDelivery()
    const updateDeliveryMutation = useUpdateDelivery()
    const createCustomerMutation = useCreateCustomer()
    const markCompletedMutation = useMarkDeliveryAsCompleted()
    const markPreparedMutation = useMarkDeliveryAsPrepared()
    const deleteDeliveryMutation = useDeleteDelivery()
    const queryClient = useQueryClient()

    if (isLoading) {
        return <Loading text="Cargando entregas..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar las entregas</p>
            </div>
        )
    }

    const filteredDeliveries = deliveries?.filter(delivery => {
        const customerName = delivery.customer?.name || ''
        const customerEmail = delivery.customer?.email || ''
        const location = delivery.location || ''
        const matchesSearch = !searchTerm ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            location.toLowerCase().includes(searchTerm.toLowerCase())

        const deliveryDate = new Date(delivery.scheduledDate).toISOString().split('T')[0]
        const matchesDate = !selectedDate || deliveryDate >= selectedDate

        return matchesSearch && matchesDate
    }) || []

    const handleCreateDelivery = async () => {
        if (!newDelivery.customerId || newDelivery.items.length === 0 || !newDelivery.location) {
            alert('Cliente, items y ubicación son obligatorios')
            return
        }

        try {
            if (isEditMode && editingDelivery) {
                // Update existing delivery
                await updateDeliveryMutation.mutateAsync({
                    id: editingDelivery._id,
                    data: {
                        customerId: newDelivery.customerId,
                        items: newDelivery.items,
                        scheduledDate: new Date(newDelivery.scheduledDate),
                        scheduledTime: newDelivery.scheduledTime,
                        location: newDelivery.location,
                        totalAmount: newDelivery.totalAmount,
                        notes: newDelivery.notes || undefined
                    }
                })
            } else {
                // Create new delivery
                await createDeliveryMutation.mutateAsync({
                    customerId: newDelivery.customerId,
                    items: newDelivery.items,
                    scheduledDate: new Date(newDelivery.scheduledDate),
                    location: newDelivery.location,
                    totalAmount: newDelivery.totalAmount,
                    notes: newDelivery.notes || undefined
                })
            }

            // Reset form and close modal
            handleCloseModal()
        } catch (error) {
            console.error('Error saving delivery:', error)
            // Refresh inventory data in case items became unavailable
            queryClient.invalidateQueries(['inventory'])
            alert(isEditMode ? 'Error al actualizar la entrega' : 'Error al crear la entrega. Los items seleccionados pueden ya no estar disponibles.')
        }
    }

    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) {
            alert('El nombre del cliente es obligatorio')
            return
        }

        try {
            const createdCustomer = await createCustomerMutation.mutateAsync({
                ...newCustomer,
                contactMethod: 'email' // Default contact method
            })

            // Set the newly created customer as selected
            if (createdCustomer._id) {
                setNewDelivery({ ...newDelivery, customerId: createdCustomer._id })
            }

            // Reset form and close modal
            setNewCustomer({
                name: '',
                email: '',
                phone: '',
                address: ''
            })
            setShowCreateCustomerModal(false)
        } catch (error) {
            console.error('Error creating customer:', error)
            alert('Error al crear el cliente')
        }
    }

    const handleMarkAsCompleted = async (deliveryId: string) => {
        await markCompletedMutation.mutateAsync(deliveryId)
    }

    const handleMarkAsPrepared = async (deliveryId: string) => {
        await markPreparedMutation.mutateAsync(deliveryId)
    }

    const handleViewDetails = (delivery: any) => {
        setSelectedDelivery(delivery)
        setShowDetailsModal(true)
    }

    const handleCloseDetails = () => {
        setShowDetailsModal(false)
        setSelectedDelivery(null)
    }

    const handleDeleteDelivery = async (deliveryId: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
            await deleteDeliveryMutation.mutateAsync(deliveryId)
        }
    }

    const handleEditDelivery = (delivery: any) => {
        // Format the delivery data for editing
        console.log('🔍 Editing delivery:', delivery) // Debug log
        
        // Extract customer ID correctly - handle both populated and non-populated cases
        let customerId = ''
        if (delivery.customerId) {
            // If customerId is an object (populated), extract the _id
            if (typeof delivery.customerId === 'object' && delivery.customerId._id) {
                customerId = String(delivery.customerId._id)
            } else {
                // If it's already a string ID
                customerId = String(delivery.customerId)
            }
        } else if (delivery.customer) {
            // Fallback: check customer field
            if (typeof delivery.customer === 'string') {
                customerId = delivery.customer
            } else if (delivery.customer._id) {
                customerId = String(delivery.customer._id)
            }
        }
        console.log('🔍 Customer ID extracted:', customerId, 'Type:', typeof customerId) // Debug log
        console.log('🔍 Available customers:', customers) // Debug log
        console.log('🔍 Original scheduledDate:', delivery.scheduledDate) // Debug log
        console.log('🔍 Original scheduledTime:', delivery.scheduledTime) // Debug log
        
        const formattedDelivery = {
            customerId: customerId,
            items: delivery.items?.map((item: any) => {
                console.log('🔍 Processing item:', item) // Debug log
                let inventoryItemId = ''
                if (item.inventoryItemId) {
                    if (typeof item.inventoryItemId === 'string') {
                        inventoryItemId = item.inventoryItemId
                    } else if (item.inventoryItemId._id) {
                        inventoryItemId = String(item.inventoryItemId._id)
                    } else {
                        inventoryItemId = String(item.inventoryItemId)
                    }
                }
                return {
                    inventoryItemId: inventoryItemId,
                    hotWheelsCarId: item.hotWheelsCarId,
                    carId: item.carId,
                    carName: item.carName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }
            }) || [],
            scheduledDate: delivery.scheduledDate ? 
                new Date(delivery.scheduledDate).getFullYear() + '-' + 
                String(new Date(delivery.scheduledDate).getMonth() + 1).padStart(2, '0') + '-' + 
                String(new Date(delivery.scheduledDate).getDate()).padStart(2, '0') 
                : new Date().toISOString().split('T')[0],
            scheduledTime: delivery.scheduledTime || '09:00',
            location: delivery.location || '',
            totalAmount: delivery.totalAmount || 0,
            notes: delivery.notes || ''
        }
        
        console.log('🔍 Formatted delivery:', formattedDelivery) // Debug log
        console.log('🔍 Setting newDelivery state with date:', formattedDelivery.scheduledDate, 'and time:', formattedDelivery.scheduledTime) // Debug log
        
        setNewDelivery(formattedDelivery)
        setEditingDelivery(delivery)
        setIsEditMode(true)
        setShowCreateModal(true)
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
        setIsEditMode(false)
        setEditingDelivery(null)
        // Reset form
        setNewDelivery({
            customerId: '',
            items: [],
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '09:00',
            location: '',
            totalAmount: 0,
            notes: ''
        })
    }

    const addDeliveryItem = () => {
        setNewDelivery({
            ...newDelivery,
            items: [...newDelivery.items, {
                inventoryItemId: undefined,
                hotWheelsCarId: undefined,
                carId: '',
                carName: '',
                quantity: 1,
                unitPrice: 0
            }]
        })
    }

    const updateDeliveryItem = (index: number, field: string, value: any) => {
        const updatedItems = [...newDelivery.items]
        updatedItems[index] = { ...updatedItems[index], [field]: value }

        // Auto-fill car details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
            const inventoryItem = inventoryItems?.find(item => item._id === value)
            if (inventoryItem) {
                // Check if this is a catalog item (quantity = 0) or real inventory item
                if (inventoryItem.quantity === 0) {
                    // Catalog item - use hotWheelsCarId
                    updatedItems[index].hotWheelsCarId = value
                    updatedItems[index].inventoryItemId = undefined
                } else {
                    // Real inventory item
                    updatedItems[index].inventoryItemId = value
                    updatedItems[index].hotWheelsCarId = undefined
                }
                updatedItems[index].carId = inventoryItem.carId
                updatedItems[index].carName = inventoryItem.hotWheelsCar?.model || inventoryItem.carId
                updatedItems[index].unitPrice = inventoryItem.suggestedPrice
            }
        }

        setNewDelivery({ ...newDelivery, items: updatedItems })
    }

    const removeDeliveryItem = (index: number) => {
        setNewDelivery({
            ...newDelivery,
            items: newDelivery.items.filter((_, i) => i !== index)
        })
    }

    const calculateTotal = () => {
        return newDelivery.items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0)
    }

    const totalDeliveries = deliveries?.length || 0
    const pendingDeliveries = deliveries?.filter(d => d.status === 'scheduled').length || 0
    const preparedDeliveries = deliveries?.filter(d => d.status === 'prepared').length || 0
    const completedDeliveries = deliveries?.filter(d => d.status === 'completed').length || 0

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
                    <p className="text-gray-600">Calendario y gestión de entregas</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nueva Entrega
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Truck size={24} className="text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Entregas</p>
                            <p className="text-2xl font-bold text-gray-900">{totalDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-yellow-100">
                            <Clock size={24} className="text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-orange-100">
                            <Package size={24} className="text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Preparadas</p>
                            <p className="text-2xl font-bold text-gray-900">{preparedDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-green-100">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completadas</p>
                            <p className="text-2xl font-bold text-gray-900">{completedDeliveries}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por cliente o ubicación..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full md:w-auto"
                        />
                    </div>
                </div>
            </Card>

            {/* Deliveries List */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Lista de Entregas</h2>
                </div>

                {filteredDeliveries && filteredDeliveries.length > 0 ? (
                    <div className="space-y-4">
                        {filteredDeliveries.map((delivery) => (
                            <div key={delivery._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-medium text-gray-900">{delivery.customer?.name}</h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${delivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                delivery.status === 'prepared' ? 'bg-orange-100 text-orange-800' :
                                                    delivery.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                        delivery.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {delivery.status === 'completed' ? 'Completada' :
                                                    delivery.status === 'prepared' ? 'Preparada' :
                                                        delivery.status === 'scheduled' ? 'Programada' :
                                                            delivery.status === 'rescheduled' ? 'Reprogramada' : 'Cancelada'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {delivery.status === 'scheduled' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleMarkAsPrepared(delivery._id!)}
                                                        disabled={markPreparedMutation.isLoading}
                                                        className="text-orange-600 hover:text-orange-800"
                                                        title="Marcar como preparada"
                                                    >
                                                        📦
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleMarkAsCompleted(delivery._id!)}
                                                        disabled={markCompletedMutation.isLoading}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Marcar como completada"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                </>
                                            )}
                                            {delivery.status === 'prepared' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm('¿Estás seguro de que quieres marcar esta entrega como completada? Los items serán eliminados del inventario.')) {
                                                            handleMarkAsCompleted(delivery._id!)
                                                        }
                                                    }}
                                                    disabled={markCompletedMutation.isLoading}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Marcar como completada (eliminará items del inventario)"
                                                >
                                                    <CheckCircle size={16} />
                                                </Button>
                                            )}
                                            {delivery.status === 'completed' && (
                                                <span className="text-xs text-gray-500">No se puede revertir</span>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleViewDetails(delivery)}
                                                title="Ver detalles"
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            {delivery.status !== 'completed' && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleEditDelivery(delivery)}
                                                    title="Editar entrega"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDeleteDelivery(delivery._id!)}
                                                disabled={deleteDeliveryMutation.isLoading || delivery.status === 'completed'}
                                                title={delivery.status === 'completed' ? 'No se puede eliminar entrega completada' : 'Eliminar entrega'}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(delivery.scheduledDate).toLocaleDateString()}{delivery.scheduledTime ? ` ${delivery.scheduledTime}` : ''}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                {delivery.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package size={14} />
                                                {delivery.items.length} items
                                            </span>
                                        </div>
                                        <p>Total: ${delivery.totalAmount.toFixed(2)}</p>
                                        {delivery.notes && <p>Notas: {delivery.notes}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Truck size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entregas</h3>
                        <p className="text-gray-600">No se encontraron entregas para los filtros seleccionados</p>
                    </div>
                )}
            </Card>

            {/* Create Delivery Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {isEditMode ? 'Editar Entrega' : 'Nueva Entrega'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cliente *
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className="input flex-1"
                                            value={newDelivery.customerId}
                                            onChange={(e) => setNewDelivery({ ...newDelivery, customerId: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccionar cliente</option>
                                            {customers?.map((customer) => (
                                                <option key={customer._id} value={customer._id}>
                                                    {customer.name} - {customer.email}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setShowCreateCustomerModal(true)}
                                            className="flex items-center gap-1"
                                        >
                                            <UserPlus size={16} />
                                            Crear
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Programada *
                                    </label>
                                    <Input
                                        type="date"
                                        value={newDelivery.scheduledDate}
                                        onChange={(e) => {
                                            console.log('🔍 Date changed to:', e.target.value) // Debug log
                                            setNewDelivery({ ...newDelivery, scheduledDate: e.target.value })
                                        }}
                                        required
                                    />
                                    <small className="text-gray-500">Debug: {newDelivery.scheduledDate}</small>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hora Programada
                                    </label>
                                    <Input
                                        type="time"
                                        value={newDelivery.scheduledTime}
                                        onChange={(e) => {
                                            console.log('🔍 Time changed to:', e.target.value) // Debug log
                                            setNewDelivery({ ...newDelivery, scheduledTime: e.target.value })
                                        }}
                                    />
                                    <small className="text-gray-500">Debug: {newDelivery.scheduledTime}</small>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ubicación *
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Dirección de entrega"
                                        value={newDelivery.location}
                                        onChange={(e) => setNewDelivery({ ...newDelivery, location: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Delivery Items */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Items de la Entrega</h3>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={addDeliveryItem}
                                    >
                                        <Plus size={16} />
                                        Agregar Item
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {newDelivery.items.map((item, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <div className="flex-1">
                                                <select
                                                    className="input w-full"
                                                    value={item.inventoryItemId}
                                                    onChange={(e) => updateDeliveryItem(index, 'inventoryItemId', e.target.value)}
                                                >
                                                    <option value="">Seleccionar pieza del inventario</option>
                                                    {inventoryItems && (() => {
                                                        // Get available items
                                                        const availableItems = inventoryItems.filter(inv => (inv.quantity - (inv.reservedQuantity || 0)) > 0)
                                                        
                                                        // Get items that are already selected in this delivery (for editing)
                                                        const selectedItemIds = newDelivery.items.map(deliveryItem => deliveryItem.inventoryItemId).filter(Boolean)
                                                        const selectedItems = inventoryItems.filter(inv => selectedItemIds.includes(inv._id))
                                                        
                                                        // Combine available items and selected items (avoid duplicates)
                                                        const allRelevantItems = [
                                                            ...availableItems,
                                                            ...selectedItems.filter(selected => !availableItems.find(available => available._id === selected._id))
                                                        ]
                                                        
                                                        return allRelevantItems.map((inv) => {
                                                            const isAvailable = (inv.quantity - (inv.reservedQuantity || 0)) > 0
                                                            const availableText = isAvailable 
                                                                ? `(Disponible: ${inv.quantity - (inv.reservedQuantity || 0)})` 
                                                                : '(En entrega actual)'
                                                            
                                                            return (
                                                                <option key={inv._id} value={inv._id}>
                                                                    {inv.hotWheelsCar?.model || inv.carId} {availableText} - ${inv.suggestedPrice}
                                                                </option>
                                                            )
                                                        })
                                                    })()}
                                                </select>
                                            </div>
                                            <div className="w-20">
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateDeliveryItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                    min="1"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    placeholder="Precio"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateDeliveryItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={() => removeDeliveryItem(index)}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {newDelivery.items.length > 0 && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <p className="text-lg font-semibold">Total: ${calculateTotal().toFixed(2)}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notas (Opcional)
                                </label>
                                <textarea
                                    className="input w-full h-20 resize-none"
                                    placeholder="Notas adicionales sobre la entrega..."
                                    value={newDelivery.notes}
                                    onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 p-6 border-t bg-gray-50">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={handleCloseModal}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleCreateDelivery}
                                disabled={createDeliveryMutation.isLoading || updateDeliveryMutation.isLoading}
                            >
                                {isEditMode 
                                    ? (updateDeliveryMutation.isLoading ? 'Actualizando...' : 'Actualizar Entrega')
                                    : (createDeliveryMutation.isLoading ? 'Creando...' : 'Crear Entrega')
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Cliente</h2>
                            <button
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded"
                                onClick={() => setShowCreateCustomerModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre *
                                    </label>
                                    <Input
                                        type="text"
                                        value={newCustomer.name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        placeholder="Nombre del cliente"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        placeholder="email@cliente.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <Input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección
                                    </label>
                                    <Input
                                        type="text"
                                        value={newCustomer.address}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        placeholder="Dirección del cliente"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 border-t mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowCreateCustomerModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleCreateCustomer}
                                    disabled={createCustomerMutation.isLoading}
                                >
                                    {createCustomerMutation.isLoading ? 'Creando...' : 'Crear Cliente'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedDelivery && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">Detalles de Entrega</h2>
                            <button
                                onClick={handleCloseDetails}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Delivery Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Información General</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Cliente:</span> {selectedDelivery.customer?.name}</p>
                                        <p><span className="font-medium">Email:</span> {selectedDelivery.customer?.email}</p>
                                        <p><span className="font-medium">Teléfono:</span> {selectedDelivery.customer?.phone}</p>
                                        <p><span className="font-medium">Fecha programada:</span> {new Date(selectedDelivery.scheduledDate).toLocaleDateString()}{selectedDelivery.scheduledTime ? ` a las ${selectedDelivery.scheduledTime}` : ''}</p>
                                        <p><span className="font-medium">Ubicación:</span> {selectedDelivery.location}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${selectedDelivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                selectedDelivery.status === 'prepared' ? 'bg-orange-100 text-orange-800' :
                                                    selectedDelivery.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {selectedDelivery.status === 'completed' ? 'Completada' :
                                                    selectedDelivery.status === 'prepared' ? 'Preparada' :
                                                        selectedDelivery.status === 'scheduled' ? 'Programada' : 'Pendiente'}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Resumen Financiero</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Total venta:</span> ${selectedDelivery.totalAmount?.toFixed(2)}</p>
                                        {(() => {
                                            // Calculate total cost and profit
                                            let totalCost = 0;
                                            let itemsWithCost = 0;
                                            let itemsWithoutCost = 0;
                                            selectedDelivery.items?.forEach((item: any) => {
                                                if (item.inventoryItemId) {
                                                    // item.inventoryItemId could be an ID string or populated object
                                                    let inventoryItem;
                                                    if (typeof item.inventoryItemId === 'string') {
                                                        // Not populated, find in inventoryItems
                                                        inventoryItem = inventoryItems?.find(inv => inv._id === item.inventoryItemId);
                                                    } else {
                                                        // Already populated
                                                        inventoryItem = item.inventoryItemId;
                                                    }
                                                    if (inventoryItem && typeof inventoryItem.purchasePrice === 'number' && inventoryItem.purchasePrice > 0) {
                                                        totalCost += inventoryItem.purchasePrice * item.quantity;
                                                        itemsWithCost++;
                                                    } else {
                                                        itemsWithoutCost++;
                                                        console.warn('Item without valid purchase price:', item, inventoryItem);
                                                    }
                                                } else if (item.hotWheelsCarId) {
                                                    // Catalog item - no cost
                                                    itemsWithoutCost++;
                                                } else {
                                                    itemsWithoutCost++;
                                                    console.warn('Item without inventoryItemId or hotWheelsCarId:', item);
                                                }
                                            });
                                            const profit = selectedDelivery.totalAmount - totalCost;
                                            return (
                                                <>
                                                    <p><span className="font-medium">Costo total:</span> ${totalCost.toFixed(2)} {itemsWithoutCost > 0 && <span className="text-xs text-gray-500">({itemsWithCost} con costo, {itemsWithoutCost} sin costo)</span>}</p>
                                                    <p><span className="font-medium">Ganancia potencial:</span>
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            ${profit.toFixed(2)}
                                                        </span>
                                                    </p>
                                                    <p><span className="font-medium">Margen:</span>
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h3 className="font-medium text-gray-900 mb-4">Piezas en la Entrega</h3>
                                <div className="space-y-3">
                                    {selectedDelivery.items?.map((item: any, index: number) => {
                                        // Find inventory item for cost information
                                        let inventoryItem;
                                        if (typeof item.inventoryItemId === 'string') {
                                            // Not populated, find in inventoryItems
                                            inventoryItem = inventoryItems?.find(inv => inv._id === item.inventoryItemId);
                                        } else {
                                            // Already populated
                                            inventoryItem = item.inventoryItemId;
                                        }
                                        const cost = inventoryItem && typeof inventoryItem.purchasePrice === 'number' && inventoryItem.purchasePrice > 0 ? inventoryItem.purchasePrice : 0;
                                        const profit = item.unitPrice - cost;

                                        return (
                                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900">{item.carName || item.carId}</h4>
                                                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Costo:</span>
                                                            <span className="ml-2 font-medium">${cost.toFixed(2)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Venta:</span>
                                                            <span className="ml-2 font-medium text-green-600">${item.unitPrice.toFixed(2)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Ganancia:</span>
                                                            <span className={`ml-2 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ${profit.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedDelivery.notes && (
                                <div className="mt-6">
                                    <h3 className="font-medium text-gray-900 mb-2">Notas</h3>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedDelivery.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
