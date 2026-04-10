import React, { useState } from 'react'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import { useTheme } from '@/contexts/ThemeContext'

export default function Suppliers() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const pageBackdropClass = 'bg-transparent'
    const headerTextClass = isDark ? 'text-white' : 'text-slate-900'
    const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600'
    const titleSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/82 shadow-[12px_12px_24px_rgba(2,6,23,0.52),-10px_-10px_20px_rgba(51,65,85,0.16)] p-4 lg:p-5'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.3),-12px_-12px_24px_rgba(255,255,255,0.94)] p-4 lg:p-5'
    const neumorphInsetClass = isDark
        ? 'rounded-xl border border-slate-700/70 bg-slate-900/70 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.65),inset_-4px_-4px_10px_rgba(51,65,85,0.2)]'
        : 'rounded-xl border border-white/80 bg-[#e2e8f3] shadow-[inset_4px_4px_9px_rgba(148,163,184,0.28),inset_-4px_-4px_8px_rgba(255,255,255,0.92)]'
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
        <div className={`space-y-6 ${pageBackdropClass}`}>
            <div className={`${titleSurfaceClass} flex justify-between items-center`}>
                <div>
                    <h1 className={`text-2xl font-bold ${headerTextClass}`}>Proveedores</h1>
                    <p className={mutedTextClass}>Gestión de proveedores para compras</p>
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
                    <Card key={supplier._id} className="hover:brightness-105 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className={`font-semibold ${headerTextClass}`}>{supplier.name}</h3>
                                <p className={`text-sm capitalize ${mutedTextClass}`}>{supplier.contactMethod}</p>
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
                                <div className={`text-sm ${mutedTextClass}`}>
                                    Email: {supplier.email}
                                </div>
                            )}
                            {supplier.phone && (
                                <div className={`text-sm ${mutedTextClass}`}>
                                    Teléfono: {supplier.phone}
                                </div>
                            )}
                            {supplier.website && (
                                <div className={`text-sm ${mutedTextClass}`}>
                                    Sitio web: {supplier.website}
                                </div>
                            )}
                            {supplier.address && (
                                <div className={`text-sm ${mutedTextClass}`}>
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
                        <h3 className={`text-lg font-medium mb-2 ${headerTextClass}`}>
                            No hay proveedores registrados
                        </h3>
                        <p className={`mb-4 ${mutedTextClass}`}>
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
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button
                                type="button"
                                onClick={closeModal}
                                variant="secondary"
                                className="w-full sm:flex-1 h-10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
                                className="w-full sm:flex-1 h-10"
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
                            <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>
                                Método de Contacto
                            </label>
                            <select
                                value={formData.contactMethod}
                                onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value as any })}
                                className={`w-full px-3 py-2 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`}
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
