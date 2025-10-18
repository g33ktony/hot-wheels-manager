import React, { useState } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'

export default function Customers() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        contactMethod: 'email' as 'email' | 'phone' | 'whatsapp',
        address: '',
        notes: ''
    })

    const { data: customers, isLoading, error } = useCustomers()
    const createCustomerMutation = useCreateCustomer()
    const updateCustomerMutation = useUpdateCustomer()
    const deleteCustomerMutation = useDeleteCustomer()

    if (isLoading) {
        return <Loading text="Cargando clientes..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error al cargar los clientes</p>
            </div>
        )
    }

    const filteredCustomers = customers?.filter(customer => {
        const matchesSearch = !searchTerm ||
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    }) || []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (editingCustomer) {
                await updateCustomerMutation.mutateAsync({
                    id: editingCustomer._id,
                    data: formData
                })
            } else {
                await createCustomerMutation.mutateAsync(formData)
            }

            setShowCreateModal(false)
            setEditingCustomer(null)
            resetForm()
        } catch (error) {
            console.error('Error saving customer:', error)
        }
    }

    const handleEdit = (customer: any) => {
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            contactMethod: customer.contactMethod || 'email',
            address: customer.address || '',
            notes: customer.notes || ''
        })
        setShowCreateModal(true)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
            try {
                await deleteCustomerMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting customer:', error)
            }
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            contactMethod: 'email',
            address: '',
            notes: ''
        })
    }

    const closeModal = () => {
        setShowCreateModal(false)
        setEditingCustomer(null)
        resetForm()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-gray-600">Gestión de clientes para entregas y ventas</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    Nuevo Cliente
                </Button>
            </div>

            {/* Search */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar clientes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Customers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                    <Card key={customer._id} className="hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                                <p className="text-sm text-gray-500 capitalize">{customer.contactMethod}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(customer)}
                                >
                                    Editar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleDelete(customer._id!)}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {customer.email && (
                                <div className="text-sm text-gray-600">
                                    Email: {customer.email}
                                </div>
                            )}
                            {customer.phone && (
                                <div className="text-sm text-gray-600">
                                    Teléfono: {customer.phone}
                                </div>
                            )}
                            {customer.address && (
                                <div className="text-sm text-gray-600">
                                    Dirección: {customer.address}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {filteredCustomers.length === 0 && (
                <Card>
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay clientes registrados
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Comienza agregando tu primer cliente
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            Agregar Cliente
                        </Button>
                    </div>
                </Card>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <Modal
                    isOpen={showCreateModal}
                    onClose={closeModal}
                    title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                                disabled={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                                className="flex-1"
                            >
                                {createCustomerMutation.isLoading || updateCustomerMutation.isLoading
                                    ? 'Guardando...'
                                    : editingCustomer
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