import React, { useState } from 'react'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'

export default function Suppliers() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<any>(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        contactMethod: 'email' as 'email' | 'phone' | 'whatsapp',
        address: '',
        notes: ''
    })

    const { data: suppliers, isLoading, error } = useSuppliers()
    const createSupplierMutation = useCreateSupplier()
    const updateSupplierMutation = useUpdateSupplier()
    const deleteSupplierMutation = useDeleteSupplier()

    if (isLoading) {
        return <Loading text="Cargando proveedores..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error al cargar los proveedores</p>
            </div>
        )
    }

    const filteredSuppliers = suppliers?.filter(supplier => {
        const matchesSearch = !searchTerm ||
            supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    }) || []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (editingSupplier) {
                await updateSupplierMutation.mutateAsync({
                    id: editingSupplier._id,
                    data: formData
                })
            } else {
                await createSupplierMutation.mutateAsync(formData)
            }

            setShowCreateModal(false)
            setEditingSupplier(null)
            resetForm()
        } catch (error) {
            console.error('Error saving supplier:', error)
        }
    }

    const handleEdit = (supplier: any) => {
        setEditingSupplier(supplier)
        setFormData({
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || '',
            website: supplier.website || '',
            contactMethod: supplier.contactMethod || 'email',
            address: supplier.address || '',
            notes: supplier.notes || ''
        })
        setShowCreateModal(true)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
            try {
                await deleteSupplierMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting supplier:', error)
            }
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            website: '',
            contactMethod: 'email',
            address: '',
            notes: ''
        })
    }

    const closeModal = () => {
        setShowCreateModal(false)
        setEditingSupplier(null)
        resetForm()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
                    <p className="text-gray-600">Gestión de proveedores para compras</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    Nuevo Proveedor
                </Button>
            </div>

            {/* Search */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar proveedores..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Suppliers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map((supplier) => (
                    <Card key={supplier._id} className="hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                                <p className="text-sm text-gray-500 capitalize">{supplier.contactMethod}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(supplier)}
                                >
                                    Editar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleDelete(supplier._id!)}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {supplier.email && (
                                <div className="text-sm text-gray-600">
                                    Email: {supplier.email}
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="text-sm text-gray-600">
                                    Teléfono: {supplier.phone}
                                </div>
                            )}
                            {supplier.website && (
                                <div className="text-sm text-gray-600">
                                    Sitio web: {supplier.website}
                                </div>
                            )}
                            {supplier.address && (
                                <div className="text-sm text-gray-600">
                                    Dirección: {supplier.address}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {filteredSuppliers.length === 0 && (
                <Card>
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay proveedores registrados
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Comienza agregando tu primer proveedor
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            Agregar Proveedor
                        </Button>
                    </div>
                </Card>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <Modal
                    isOpen={showCreateModal}
                    onClose={closeModal}
                    title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    maxWidth="md"
                    footer={
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={closeModal}
                                variant="secondary"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
                                className="flex-1"
                            >
                                {createSupplierMutation.isLoading || updateSupplierMutation.isLoading
                                    ? 'Guardando...'
                                    : editingSupplier
                                        ? 'Actualizar'
                                        : 'Crear'
                                }
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Nombre *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />

                            <Input
                                label="Teléfono"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />

                            <Input
                                label="Sitio Web"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Método de Contacto
                                </label>
                                <select
                                    value={formData.contactMethod}
                                    onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="email">Email</option>
                                    <option value="phone">Teléfono</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>

                        <Input
                            label="Dirección"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </form>
                </Modal>
            )}
        </div>
    )
}
