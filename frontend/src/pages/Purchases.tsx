import { useState } from 'react'
import { usePurchases, useCreatePurchase, useUpdatePurchase, useUpdatePurchaseStatus, useDeletePurchase } from '@/hooks/usePurchases'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, ShoppingBag, Calendar, DollarSign, X, UserPlus, Trash2, Edit } from 'lucide-react'

export default function Purchases() {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
    const [editingPurchase, setEditingPurchase] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    })
    const [newPurchase, setNewPurchase] = useState({
        supplierId: '',
        totalCost: 0,
        shippingCost: 0,
        trackingNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        estimatedDelivery: '',
        notes: '',
        items: [] as Array<{
            carId: string;
            quantity: number;
            unitPrice: number;
            condition: 'mint' | 'good' | 'fair' | 'poor';
        }>
    })

    const { data: purchases, isLoading, error } = usePurchases()
    const { data: suppliers } = useSuppliers()
    const createPurchaseMutation = useCreatePurchase()
    const updatePurchaseMutation = useUpdatePurchase()
    const createSupplierMutation = useCreateSupplier()
    const updateStatusMutation = useUpdatePurchaseStatus()
    const deletePurchaseMutation = useDeletePurchase()

    if (isLoading) {
        return <Loading text="Cargando compras..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar las compras</p>
            </div>
        )
    }

    const handleAddItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, {
                carId: '',
                quantity: 1,
                unitPrice: 0,
                condition: 'mint'
            }]
        })
    }

    const handleRemoveItem = (index: number) => {
        setNewPurchase({
            ...newPurchase,
            items: newPurchase.items.filter((_, i) => i !== index)
        })
    }

    const handleItemChange = (index: number, field: string, value: any) => {
        const updatedItems = [...newPurchase.items]
        updatedItems[index] = { ...updatedItems[index], [field]: value }
        setNewPurchase({ ...newPurchase, items: updatedItems })
    }

    const handleCreateSupplier = async () => {
        if (!newSupplier.name.trim()) {
            alert('El nombre del proveedor es obligatorio')
            return
        }

        try {
            const createdSupplier = await createSupplierMutation.mutateAsync({
                ...newSupplier,
                contactMethod: 'email' // Default contact method
            })

            // Set the newly created supplier as selected
            if (createdSupplier._id) {
                setNewPurchase({ ...newPurchase, supplierId: createdSupplier._id })
            }

            // Reset supplier form and close modal
            setNewSupplier({
                name: '',
                email: '',
                phone: '',
                address: ''
            })
            setShowCreateSupplierModal(false)
        } catch (error) {
            console.error('Error creating supplier:', error)
        }
    }

    const handleAddPurchase = async () => {
        if (!newPurchase.supplierId || newPurchase.items.length === 0) {
            alert('Proveedor e items son obligatorios')
            return
        }

        try {
            if (isEditMode && editingPurchase) {
                // Update existing purchase
                await updatePurchaseMutation.mutateAsync({
                    id: editingPurchase._id,
                    data: {
                        supplierId: newPurchase.supplierId,
                        items: newPurchase.items,
                        totalCost: newPurchase.totalCost,
                        shippingCost: newPurchase.shippingCost,
                        trackingNumber: newPurchase.trackingNumber || undefined,
                        purchaseDate: new Date(newPurchase.purchaseDate),
                        estimatedDelivery: newPurchase.estimatedDelivery ? new Date(newPurchase.estimatedDelivery) : undefined,
                        notes: newPurchase.notes || undefined
                    }
                })
            } else {
                // Create new purchase
                await createPurchaseMutation.mutateAsync({
                    supplierId: newPurchase.supplierId,
                    items: newPurchase.items,
                    totalCost: newPurchase.totalCost,
                    shippingCost: newPurchase.shippingCost,
                    trackingNumber: newPurchase.trackingNumber || undefined,
                    purchaseDate: new Date(newPurchase.purchaseDate),
                    estimatedDelivery: newPurchase.estimatedDelivery ? new Date(newPurchase.estimatedDelivery) : undefined,
                    notes: newPurchase.notes || undefined
                })
            }

            // Reset form and close modal
            handleCloseModal()
        } catch (error) {
            console.error('Error saving purchase:', error)
        }
    }

    const handleEditPurchase = (purchase: any) => {
        // Format the purchase data for editing
        
        // Extract supplier ID correctly - handle both populated and non-populated cases
        let supplierId = ''
        if (purchase.supplierId) {
            // If supplierId is an object (populated), extract the _id
            if (typeof purchase.supplierId === 'object' && purchase.supplierId._id) {
                supplierId = String(purchase.supplierId._id)
            } else {
                // If it's already a string ID
                supplierId = String(purchase.supplierId)
            }
        } else if (purchase.supplier) {
            // Fallback: check supplier field
            if (typeof purchase.supplier === 'string') {
                supplierId = purchase.supplier
            } else if (purchase.supplier._id) {
                supplierId = String(purchase.supplier._id)
            }
        }
        
        const formattedPurchase = {
            supplierId: supplierId,
            items: purchase.items || [],
            totalCost: purchase.totalCost || 0,
            shippingCost: purchase.shippingCost || 0,
            trackingNumber: purchase.trackingNumber || '',
            purchaseDate: purchase.purchaseDate ? 
                purchase.purchaseDate.toString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            estimatedDelivery: purchase.estimatedDelivery ? 
                purchase.estimatedDelivery.toString().split('T')[0]
                : '',
            notes: purchase.notes || ''
        }
        
        setNewPurchase(formattedPurchase)
        setEditingPurchase(purchase)
        setIsEditMode(true)
        setShowAddModal(true)
    }

    const handleCloseModal = () => {
        setShowAddModal(false)
        setIsEditMode(false)
        setEditingPurchase(null)
        // Reset form
        setNewPurchase({
            supplierId: '',
            totalCost: 0,
            shippingCost: 0,
            trackingNumber: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            estimatedDelivery: '',
            notes: '',
            items: []
        })
    }

    const handleStatusChange = async (purchaseId: string, newStatus: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled') => {
        try {
            await updateStatusMutation.mutateAsync({ id: purchaseId, status: newStatus })
        } catch (error) {
            console.error('Error updating purchase status:', error)
        }
    }

    const handleViewDetails = (purchase: any) => {
        setSelectedPurchase(purchase)
        setShowDetailsModal(true)
    }

    const handleDeletePurchase = async (purchaseId: string) => {
        const confirmDelete = window.confirm(
            '¿Estás seguro de que quieres eliminar esta compra?\n\nEsta acción no se puede deshacer y afectará las estadísticas de ventas.'
        )

        if (confirmDelete) {
            try {
                await deletePurchaseMutation.mutateAsync(purchaseId)
            } catch (error) {
                console.error('Error deleting purchase:', error)
            }
        }
    }

    const totalItems = purchases?.length || 0
    const totalValue = purchases?.reduce((sum, purchase) => sum + purchase.totalCost, 0) || 0
    const pendingPurchases = purchases?.filter(p => p.status !== 'received').length || 0

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
                    <p className="text-sm text-gray-600">Gestiona tus compras de Hot Wheels</p>
                </div>
                <Button
                    icon={<Plus size={20} />}
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto min-h-[44px]"
                >
                    Nueva Compra
                </Button>
            </div>

            {/* Stats Cards - 2 columns on mobile, 3 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                <Card>
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 self-start">
                                <ShoppingBag size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Compras</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalItems}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 self-start">
                                <DollarSign size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Valor Total</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 lg:col-span-1">
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 self-start">
                                <Calendar size={20} className="text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Pendientes</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">{pendingPurchases}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Purchases List */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                    {purchases && purchases.length > 0 ? (
                        <div className="space-y-3 lg:space-y-4">
                            {purchases.map((purchase) => (
                                <div key={purchase._id} className="flex flex-col gap-3 p-3 lg:p-4 border rounded-lg touch-manipulation">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-medium text-gray-900 text-sm lg:text-base flex-1 min-w-0">
                                            {typeof purchase.supplierId === 'object' ? purchase.supplierId.name : suppliers?.find(s => s._id === purchase.supplierId)?.name || 'Proveedor desconocido'}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                                            purchase.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                purchase.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                    purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                            }`}>
                                            {purchase.status === 'received' ? 'Recibido' :
                                                purchase.status === 'shipped' ? 'Enviado' :
                                                    purchase.status === 'paid' ? 'Pagado' :
                                                        purchase.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                        </span>
                                    </div>

                                    {/* Info section */}
                                    <div className="text-xs lg:text-sm text-gray-600 space-y-1">
                                        <p>Fecha: {(() => {
                                            const dateStr = purchase.purchaseDate.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>
                                        <p>Items: {purchase.items.length} | Total: ${purchase.totalCost.toFixed(2)}</p>
                                        {purchase.trackingNumber && <p>Tracking: {purchase.trackingNumber}</p>}
                                    </div>

                                    {/* Action buttons - responsive layout */}
                                    <div className="flex flex-wrap gap-2">
                                        {purchase.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'paid')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                            >
                                                Marcar Pagado
                                            </Button>
                                        )}
                                        {purchase.status === 'paid' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'shipped')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                            >
                                                Marcar Enviado
                                            </Button>
                                        )}
                                        {purchase.status === 'shipped' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'received')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                            >
                                                Marcar Recibido
                                            </Button>
                                        )}
                                        {purchase.status !== 'cancelled' && purchase.status !== 'received' && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleStatusChange(purchase._id!, 'cancelled')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm"
                                            >
                                                Cancelar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleViewDetails(purchase)}
                                            className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                        >
                                            Ver Detalles
                                        </Button>
                                        {purchase.status !== 'received' && purchase.status !== 'cancelled' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleEditPurchase(purchase)}
                                                title="Editar compra"
                                                className="min-h-[44px] text-xs lg:text-sm"
                                            >
                                                <Edit size={16} className="mr-1" />
                                                Editar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDeletePurchase(purchase._id!)}
                                            disabled={deletePurchaseMutation.isLoading}
                                            className="min-h-[44px] text-xs lg:text-sm"
                                        >
                                            <Trash2 size={16} className="mr-1" />
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay compras registradas</h3>
                            <p className="text-gray-600">Registra tu primera compra para comenzar</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Purchase Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {isEditMode ? 'Editar Compra' : 'Nueva Compra'}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Purchase Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Proveedor *
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={newPurchase.supplierId}
                                                onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Seleccionar proveedor</option>
                                                {suppliers?.map((supplier) => (
                                                    <option key={supplier._id} value={supplier._id}>
                                                        {supplier.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setShowCreateSupplierModal(true)}
                                                title="Crear nuevo proveedor"
                                            >
                                                <UserPlus size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha de Compra *
                                        </label>
                                        <Input
                                            type="date"
                                            value={newPurchase.purchaseDate}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Costo de Envío
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={newPurchase.shippingCost || ''}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, shippingCost: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Número de Tracking
                                        </label>
                                        <Input
                                            type="text"
                                            value={newPurchase.trackingNumber}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, trackingNumber: e.target.value })}
                                            placeholder="Número de seguimiento"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Entrega Estimada
                                        </label>
                                        <Input
                                            type="date"
                                            value={newPurchase.estimatedDelivery}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, estimatedDelivery: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notas
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        value={newPurchase.notes}
                                        onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                                        placeholder="Notas adicionales..."
                                    />
                                </div>

                                {/* Items Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-md font-medium text-gray-900">Items de la Compra</h4>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleAddItem}
                                        >
                                            Agregar Item
                                        </Button>
                                    </div>

                                    {newPurchase.items.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-600">No hay items agregados</p>
                                            <p className="text-sm text-gray-500">Haz clic en "Agregar Item" para comenzar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {newPurchase.items.map((item, index) => (
                                                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="font-medium text-gray-900">Item {index + 1}</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                ID del Auto *
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                value={item.carId}
                                                                onChange={(e) => handleItemChange(index, 'carId', e.target.value)}
                                                                placeholder="ID del Hot Wheels"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Cantidad *
                                                            </label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Precio Unitario *
                                                            </label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unitPrice || ''}
                                                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                placeholder="0.00"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Condición
                                                            </label>
                                                            <select
                                                                value={item.condition}
                                                                onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="mint">Mint</option>
                                                                <option value="good">Good</option>
                                                                <option value="fair">Fair</option>
                                                                <option value="poor">Poor</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 text-sm text-gray-600">
                                                        Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {newPurchase.items.length > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-900">Total de Items:</span>
                                                <span className="font-bold text-lg text-gray-900">
                                                    ${newPurchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                                </span>
                                            </div>
                                            {newPurchase.shippingCost > 0 && (
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-sm text-gray-600">Costo de Envío:</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        ${newPurchase.shippingCost.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                                                <span className="font-bold text-gray-900">Total General:</span>
                                                <span className="font-bold text-xl text-blue-600">
                                                    ${(newPurchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) + newPurchase.shippingCost).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-3 pt-6 border-t">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={handleCloseModal}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        className="flex-1"
                                        onClick={handleAddPurchase}
                                        disabled={createPurchaseMutation.isLoading || updatePurchaseMutation.isLoading}
                                    >
                                        {isEditMode 
                                            ? (updatePurchaseMutation.isLoading ? 'Actualizando...' : 'Actualizar Compra')
                                            : (createPurchaseMutation.isLoading ? 'Guardando...' : 'Guardar Compra')
                                        }
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Supplier Modal */}
            {showCreateSupplierModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Proveedor</h2>
                            <button
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded"
                                onClick={() => setShowCreateSupplierModal(false)}
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
                                        value={newSupplier.name}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                        placeholder="Nombre del proveedor"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={newSupplier.email}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                        placeholder="email@proveedor.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <Input
                                        type="tel"
                                        value={newSupplier.phone}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección
                                    </label>
                                    <Input
                                        type="text"
                                        value={newSupplier.address}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                        placeholder="Dirección del proveedor"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 border-t mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowCreateSupplierModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleCreateSupplier}
                                    disabled={createSupplierMutation.isLoading}
                                >
                                    {createSupplierMutation.isLoading ? 'Creando...' : 'Crear Proveedor'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Details Modal */}
            {showDetailsModal && selectedPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Detalles de Compra</h2>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Información General</h3>
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Proveedor:</span> {typeof selectedPurchase.supplierId === 'object' ? selectedPurchase.supplierId.name : suppliers?.find(s => s._id === selectedPurchase.supplierId)?.name || 'Proveedor desconocido'}</p>
                                        <p><span className="font-medium">Fecha de Compra:</span> {(() => {
                                            const dateStr = selectedPurchase.purchaseDate.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${selectedPurchase.status === 'received' ? 'bg-green-100 text-green-800' :
                                                selectedPurchase.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    selectedPurchase.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                        selectedPurchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {selectedPurchase.status === 'received' ? 'Recibido' :
                                                    selectedPurchase.status === 'shipped' ? 'Enviado' :
                                                        selectedPurchase.status === 'paid' ? 'Pagado' :
                                                            selectedPurchase.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                            </span>
                                        </p>
                                        {selectedPurchase.trackingNumber && <p><span className="font-medium">Número de Tracking:</span> {selectedPurchase.trackingNumber}</p>}
                                        {selectedPurchase.estimatedDelivery && <p><span className="font-medium">Entrega Estimada:</span> {(() => {
                                            const dateStr = selectedPurchase.estimatedDelivery.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>}
                                        {selectedPurchase.notes && <p><span className="font-medium">Notas:</span> {selectedPurchase.notes}</p>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Resumen Financiero</h3>
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Costo de Productos:</span> ${(selectedPurchase.totalCost - (selectedPurchase.shippingCost || 0)).toFixed(2)}</p>
                                        <p><span className="font-medium">Costo de Envío:</span> ${selectedPurchase.shippingCost?.toFixed(2) || '0.00'}</p>
                                        <p className="text-lg font-bold"><span className="font-medium">Total:</span> ${selectedPurchase.totalCost.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Artículos Comprados</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condición</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedPurchase.items.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.carId}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.condition}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
