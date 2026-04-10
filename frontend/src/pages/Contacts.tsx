import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/contexts/StoreContext'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import { useTheme } from '@/contexts/ThemeContext'
import { Users, Building2 } from 'lucide-react'

type Tab = 'customers' | 'suppliers'

export default function Contacts() {
    const navigate = useNavigate()
    const { selectedStore } = useStore()
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

    const [activeTab, setActiveTab] = useState<Tab>('customers')

    // Customer state
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [customerForm, setCustomerForm] = useState({
        name: '', email: '', phone: '',
        contactMethod: 'email' as 'email' | 'phone' | 'whatsapp',
        address: '', notes: ''
    })

    // Supplier state
    const [supplierSearch, setSupplierSearch] = useState('')
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<any>(null)
    const [supplierForm, setSupplierForm] = useState({
        name: '', email: '', phone: '', website: '',
        contactMethod: 'email' as 'email' | 'phone' | 'whatsapp',
        address: '', notes: ''
    })

    // Queries
    const { data: customers, isLoading: customersLoading } = useCustomers(selectedStore || undefined)
    const createCustomer = useCreateCustomer()
    const updateCustomer = useUpdateCustomer()
    const deleteCustomer = useDeleteCustomer()

    const { data: suppliers, isLoading: suppliersLoading } = useSuppliers()
    const createSupplier = useCreateSupplier()
    const updateSupplier = useUpdateSupplier()
    const deleteSupplier = useDeleteSupplier()

    // Filtered lists
    const filteredCustomers = customers?.filter(c =>
        !customerSearch ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
    ) || []

    const filteredSuppliers = suppliers?.filter(s =>
        !supplierSearch ||
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.phone?.toLowerCase().includes(supplierSearch.toLowerCase())
    ) || []

    // Customer handlers
    const handleCustomerSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingCustomer) {
                await updateCustomer.mutateAsync({ id: editingCustomer._id, data: customerForm })
            } else {
                await createCustomer.mutateAsync(customerForm)
            }
            closeCustomerModal()
        } catch (error) {
            console.error('Error saving customer:', error)
        }
    }

    const handleEditCustomer = (customer: any) => {
        setEditingCustomer(customer)
        setCustomerForm({
            name: customer.name, email: customer.email || '', phone: customer.phone || '',
            contactMethod: customer.contactMethod || 'email',
            address: customer.address || '', notes: customer.notes || ''
        })
        setShowCustomerModal(true)
    }

    const handleDeleteCustomer = async (id: string) => {
        if (window.confirm('¿Eliminar este cliente?')) {
            await deleteCustomer.mutateAsync(id)
        }
    }

    const closeCustomerModal = () => {
        setShowCustomerModal(false)
        setEditingCustomer(null)
        setCustomerForm({ name: '', email: '', phone: '', contactMethod: 'email', address: '', notes: '' })
    }

    // Supplier handlers
    const handleSupplierSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingSupplier) {
                await updateSupplier.mutateAsync({ id: editingSupplier._id, data: supplierForm })
            } else {
                await createSupplier.mutateAsync(supplierForm)
            }
            closeSupplierModal()
        } catch (error) {
            console.error('Error saving supplier:', error)
        }
    }

    const handleEditSupplier = (supplier: any) => {
        setEditingSupplier(supplier)
        setSupplierForm({
            name: supplier.name, email: supplier.email || '', phone: supplier.phone || '',
            website: supplier.website || '', contactMethod: supplier.contactMethod || 'email',
            address: supplier.address || '', notes: supplier.notes || ''
        })
        setShowSupplierModal(true)
    }

    const handleDeleteSupplier = async (id: string) => {
        if (window.confirm('¿Eliminar este proveedor?')) {
            await deleteSupplier.mutateAsync(id)
        }
    }

    const closeSupplierModal = () => {
        setShowSupplierModal(false)
        setEditingSupplier(null)
        setSupplierForm({ name: '', email: '', phone: '', website: '', contactMethod: 'email', address: '', notes: '' })
    }

    const tabActiveClass = isDark
        ? 'text-sky-400 border-b-2 border-sky-400'
        : 'text-sky-600 border-b-2 border-sky-600'
    const tabInactiveClass = isDark ? 'text-slate-400' : 'text-slate-500'

    return (
        <div className={`space-y-6 ${pageBackdropClass}`}>
            {/* Header */}
            <div className={`${titleSurfaceClass} flex justify-between items-center`}>
                <div>
                    <h1 className={`text-2xl font-bold ${headerTextClass}`}>Contactos</h1>
                    <p className={mutedTextClass}>Clientes y proveedores de tu tienda</p>
                </div>
                {activeTab === 'customers' ? (
                    <Button onClick={() => setShowCustomerModal(true)}>Nuevo Cliente</Button>
                ) : (
                    <Button onClick={() => setShowSupplierModal(true)}>Nuevo Proveedor</Button>
                )}
            </div>

            {/* Tabs */}
            <div className={`flex gap-0 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`flex items-center gap-2 px-5 py-3 font-medium transition ${activeTab === 'customers' ? tabActiveClass : tabInactiveClass}`}
                >
                    <Users size={16} />
                    Clientes
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {customers?.length ?? 0}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-5 py-3 font-medium transition ${activeTab === 'suppliers' ? tabActiveClass : tabInactiveClass}`}
                >
                    <Building2 size={16} />
                    Proveedores
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {suppliers?.length ?? 0}
                    </span>
                </button>
            </div>

            {/* Customers tab */}
            {activeTab === 'customers' && (
                <>
                    {customersLoading ? (
                        <Loading text="Cargando clientes..." />
                    ) : (
                        <>
                            <Card>
                                <Input
                                    placeholder="Buscar clientes..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </Card>

                            {filteredCustomers.length === 0 ? (
                                <Card>
                                    <div className="text-center py-12">
                                        <h3 className={`text-lg font-medium mb-2 ${headerTextClass}`}>No hay clientes</h3>
                                        <p className={`mb-4 ${mutedTextClass}`}>Comienza agregando tu primer cliente</p>
                                        <Button onClick={() => setShowCustomerModal(true)}>Agregar Cliente</Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCustomers.map((customer) => (
                                        <Card key={customer._id} className="hover:brightness-105 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className={`font-semibold ${headerTextClass}`}>{customer.name}</h3>
                                                    <p className={`text-sm capitalize ${mutedTextClass}`}>{customer.contactMethod}</p>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button size="sm" onClick={() => navigate(`/customers/${customer._id}`)}>Ver</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => handleEditCustomer(customer)}>Editar</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteCustomer(customer._id!)}>Eliminar</Button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {customer.email && <p className={`text-sm ${mutedTextClass}`}>📧 {customer.email}</p>}
                                                {customer.phone && <p className={`text-sm ${mutedTextClass}`}>📞 {customer.phone}</p>}
                                                {customer.address && <p className={`text-sm ${mutedTextClass}`}>📍 {customer.address}</p>}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Suppliers tab */}
            {activeTab === 'suppliers' && (
                <>
                    {suppliersLoading ? (
                        <Loading text="Cargando proveedores..." />
                    ) : (
                        <>
                            <Card>
                                <Input
                                    placeholder="Buscar proveedores..."
                                    value={supplierSearch}
                                    onChange={(e) => setSupplierSearch(e.target.value)}
                                />
                            </Card>

                            {filteredSuppliers.length === 0 ? (
                                <Card>
                                    <div className="text-center py-12">
                                        <h3 className={`text-lg font-medium mb-2 ${headerTextClass}`}>No hay proveedores</h3>
                                        <p className={`mb-4 ${mutedTextClass}`}>Comienza agregando tu primer proveedor</p>
                                        <Button onClick={() => setShowSupplierModal(true)}>Agregar Proveedor</Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredSuppliers.map((supplier) => (
                                        <Card key={supplier._id} className="hover:brightness-105 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className={`font-semibold ${headerTextClass}`}>{supplier.name}</h3>
                                                    <p className={`text-sm capitalize ${mutedTextClass}`}>{supplier.contactMethod}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => handleEditSupplier(supplier)}>Editar</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteSupplier(supplier._id!)}>Eliminar</Button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {supplier.email && <p className={`text-sm ${mutedTextClass}`}>📧 {supplier.email}</p>}
                                                {supplier.phone && <p className={`text-sm ${mutedTextClass}`}>📞 {supplier.phone}</p>}
                                                {supplier.website && <p className={`text-sm ${mutedTextClass}`}>🌐 {supplier.website}</p>}
                                                {supplier.address && <p className={`text-sm ${mutedTextClass}`}>📍 {supplier.address}</p>}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Customer Modal */}
            {showCustomerModal && (
                <Modal
                    isOpen={showCustomerModal}
                    onClose={closeCustomerModal}
                    title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                    maxWidth="md"
                    footer={
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button type="button" onClick={closeCustomerModal} variant="secondary" className="w-full sm:flex-1 h-10">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleCustomerSubmit}
                                disabled={createCustomer.isLoading || updateCustomer.isLoading}
                                className="w-full sm:flex-1 h-10"
                            >
                                {createCustomer.isLoading || updateCustomer.isLoading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleCustomerSubmit} className="space-y-4">
                        <Input label="Nombre *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                        <Input label="Email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                        <Input label="Teléfono" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Método de Contacto</label>
                            <select
                                value={customerForm.contactMethod}
                                onChange={(e) => setCustomerForm({ ...customerForm, contactMethod: e.target.value as any })}
                                className={`w-full px-3 py-2 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`}
                            >
                                <option value="email">Email</option>
                                <option value="phone">Teléfono</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>
                        <Input label="Dirección" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                    </form>
                </Modal>
            )}

            {/* Supplier Modal */}
            {showSupplierModal && (
                <Modal
                    isOpen={showSupplierModal}
                    onClose={closeSupplierModal}
                    title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    maxWidth="md"
                    footer={
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button type="button" onClick={closeSupplierModal} variant="secondary" className="w-full sm:flex-1 h-10">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleSupplierSubmit}
                                disabled={createSupplier.isLoading || updateSupplier.isLoading}
                                className="w-full sm:flex-1 h-10"
                            >
                                {createSupplier.isLoading || updateSupplier.isLoading ? 'Guardando...' : editingSupplier ? 'Actualizar' : 'Crear'}
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleSupplierSubmit} className="space-y-4">
                        <Input label="Nombre *" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                        <Input label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                        <Input label="Teléfono" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                        <Input label="Sitio Web" value={supplierForm.website} onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })} />
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Método de Contacto</label>
                            <select
                                value={supplierForm.contactMethod}
                                onChange={(e) => setSupplierForm({ ...supplierForm, contactMethod: e.target.value as any })}
                                className={`w-full px-3 py-2 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`}
                            >
                                <option value="email">Email</option>
                                <option value="phone">Teléfono</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>
                        <Input label="Dirección" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
                    </form>
                </Modal>
            )}
        </div>
    )
}
