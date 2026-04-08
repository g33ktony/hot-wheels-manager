import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { customersService } from '@/services/customers'
import { deliveriesService } from '@/services/deliveries'
import { salesService } from '@/services/sales'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import ImageModal from '@/components/ImageModal'
import CustomerEditForm from '@/components/CustomerEditForm'
import { useTheme } from '@/contexts/ThemeContext'
import {
    ArrowLeft, Mail, Phone, MapPin, MessageCircle, DollarSign, Package, CheckCircle,
    AlertCircle, User, Calendar, ShoppingCart, Truck, Edit
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Delivery } from '../../../shared/types'

export default function CustomerProfile() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isEditingCustomer, setIsEditingCustomer] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)

    // Fetch customer details
    const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery(
        ['customer', customerId],
        () => customerId ? customersService.getById(customerId) : Promise.reject('No customer ID'),
        { enabled: !!customerId }
    )

    // Fetch all deliveries for this customer (including completed ones)
    const { data: deliveries = [], isLoading: isLoadingDeliveries } = useQuery(
        ['deliveries', customerId],
        async () => {
            // Pass includeCompleted=true to get all deliveries including completed ones
            const allDeliveries = await deliveriesService.getAll(undefined, undefined, true)
            return customerId ? allDeliveries.filter((d: any) => {
                const dCustomerId = typeof d.customerId === 'object' ? d.customerId._id?.toString() : d.customerId?.toString()
                const cId = customerId?.toString()
                return dCustomerId === cId
            }) : []
        },
        { enabled: !!customerId }
    )

    // Fetch all completed sales for this customer
    const { data: sales = [], isLoading: isLoadingSales } = useQuery(
        ['sales', customerId],
        async () => {
            const allSales = await salesService.getAll()
            return customerId ? allSales.filter((s: any) => {
                // customerId is now always a string from backend
                const sCustomerId = s.customerId?.toString() || '';
                const cId = customerId.toString();
                return sCustomerId === cId;
            }) : []
        },
        { enabled: !!customerId }
    )

    const isLoading = isLoadingCustomer || isLoadingDeliveries || isLoadingSales
    const pageBackdropClass = isDark
        ? 'bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0b1220_100%)]'
        : 'bg-[radial-gradient(circle_at_8%_8%,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_88%_6%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#f6f9ff_0%,#eaf0f8_100%)]'
    const headerTextClass = isDark ? 'text-white' : 'text-slate-900'
    const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600'
    const neumorphInsetClass = isDark
        ? 'rounded-xl border border-slate-700/70 bg-slate-900/70 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.65),inset_-4px_-4px_10px_rgba(51,65,85,0.2)]'
        : 'rounded-xl border border-white/80 bg-[#e2e8f3] shadow-[inset_4px_4px_9px_rgba(148,163,184,0.28),inset_-4px_-4px_8px_rgba(255,255,255,0.92)]'
    // Calculate payment statistics - MUST be before any return statements
    const paymentStats = useMemo(() => {
        const stats = {
            totalDeliveries: deliveries.length,
            completedDeliveries: deliveries.filter(d => d.status === 'completed').length,
            totalSales: sales.length,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            partialPaymentCount: 0,
            paidCount: 0,
            pendingCount: 0
        }

        // Use deliveries as source of truth for debt/payment balance.
        // Sales can be generated from deliveries and may cause double counting if included here.
        deliveries.forEach((d: Delivery) => {
            if (d.status === 'cancelled') {
                return
            }

            const totalAmount = d.totalAmount || 0
            stats.totalAmount += totalAmount

            // Backward compatibility: old records may have completed deliveries without paymentStatus.
            const normalizedPaymentStatus = d.paymentStatus || (d.status === 'completed' ? 'paid' : 'pending')

            if (normalizedPaymentStatus === 'paid') {
                stats.paidAmount += totalAmount
                stats.paidCount += 1
                return
            }

            if (normalizedPaymentStatus === 'partial') {
                const paidAmount = Math.max(0, Math.min(d.paidAmount || 0, totalAmount))
                stats.paidAmount += paidAmount
                stats.pendingAmount += totalAmount - paidAmount
                stats.partialPaymentCount += 1
                return
            }

            stats.pendingAmount += totalAmount
            stats.pendingCount += 1
        })

        return stats
    }, [deliveries, sales])

    if (isLoading) {
        return <Loading text="Cargando perfil del cliente..." />
    }

    if (customerError || !customer) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                    <p className="text-red-600 mb-6">Error al cargar el cliente</p>
                    <Button onClick={() => navigate('/deliveries')} variant="secondary">
                        Volver a Entregas
                    </Button>
                </div>
            </div>
        )
    }

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800'
            case 'partial':
                return isDark ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-800'
            case 'pending':
                return isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800'
            default:
                return isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
        }
    }

    const getDeliveryStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800'
            case 'prepared':
                return isDark ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-800'
            case 'scheduled':
                return isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
            case 'cancelled':
                return isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800'
            default:
                return isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
        }
    }

    const getContactIcon = (method: string) => {
        switch (method) {
            case 'phone':
                return <Phone size={16} />
            case 'email':
                return <Mail size={16} />
            case 'whatsapp':
                return <MessageCircle size={16} />
            case 'facebook':
                return <MessageCircle size={16} />
            default:
                return <User size={16} />
        }
    }

    const handleOpenImageModal = (images: string[]) => {
        setAllImagesForModal(images)
        setCurrentImageIndex(0)
        setShowImageModal(true)
    }

    return (
        <div className={`max-w-6xl mx-auto px-4 py-6 space-y-6 rounded-3xl ${pageBackdropClass}`}>
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="secondary"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => navigate(-1)}
                >
                    Volver
                </Button>
                <h1 className={`text-2xl lg:text-3xl font-bold ${headerTextClass}`}>Perfil del Cliente</h1>
                <div className="w-[100px]"></div>
            </div>

            {/* Customer Info Card */}
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <CardTitle className={headerTextClass}>Información del Cliente</CardTitle>
                    {!isEditingCustomer && (
                        <Button
                            size="sm"
                            variant="secondary"
                            icon={<Edit size={16} />}
                            onClick={() => {
                                setEditingCustomer(customer)
                                setIsEditingCustomer(true)
                            }}
                        >
                            Editar
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isEditingCustomer ? (
                        <CustomerEditForm
                            customer={editingCustomer}
                            onCancel={() => {
                                setIsEditingCustomer(false)
                                setEditingCustomer(null)
                            }}
                            onSave={async (updated) => {
                                try {
                                    if (!customer._id) {
                                        throw new Error('Customer ID not found')
                                    }
                                    await customersService.update(customer._id, updated)
                                    setIsEditingCustomer(false)
                                    // Refetch customer data
                                    window.location.reload()
                                } catch (error) {
                                    alert('Error al actualizar cliente')
                                }
                            }}
                            onChange={setEditingCustomer}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Left: Basic Info */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className={`p-3 rounded-lg flex-shrink-0 ${neumorphInsetClass}`}>
                                        <User size={24} className={isDark ? 'text-blue-300' : 'text-blue-700'} />
                                    </div>
                                    <div>
                                        <p className={`text-sm ${mutedTextClass}`}>Nombre</p>
                                        <p className={`text-lg font-bold ${headerTextClass}`}>{customer.name}</p>
                                    </div>
                                </div>

                                {customer.email && (
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-lg flex-shrink-0 ${neumorphInsetClass}`}>
                                            <Mail size={24} className={isDark ? 'text-blue-300' : 'text-blue-700'} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${mutedTextClass}`}>Email</p>
                                            <p className={`text-lg font-bold break-all ${headerTextClass}`}>{customer.email}</p>
                                        </div>
                                    </div>
                                )}

                                {customer.phone && (
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-lg flex-shrink-0 ${neumorphInsetClass}`}>
                                            <Phone size={24} className={isDark ? 'text-blue-300' : 'text-blue-700'} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${mutedTextClass}`}>Teléfono</p>
                                            <p className={`text-lg font-bold ${headerTextClass}`}>{customer.phone}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Contact & Address */}
                            <div className="space-y-4">
                                {customer.address && (
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-lg flex-shrink-0 ${neumorphInsetClass}`}>
                                            <MapPin size={24} className={isDark ? 'text-blue-300' : 'text-blue-700'} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${mutedTextClass}`}>Dirección</p>
                                            <p className={`text-lg font-bold ${headerTextClass}`}>{customer.address}</p>
                                        </div>
                                    </div>
                                )}

                                {customer.contactMethod && (
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-lg flex-shrink-0 ${neumorphInsetClass}`}>
                                            {getContactIcon(customer.contactMethod)}
                                        </div>
                                        <div>
                                            <p className={`text-sm ${mutedTextClass}`}>Método de contacto preferido</p>
                                            <p className={`text-lg font-bold capitalize ${headerTextClass}`}>{customer.contactMethod}</p>
                                        </div>
                                    </div>
                                )}

                                {customer.notes && (
                                    <div className={`p-3 rounded-lg ${neumorphInsetClass}`}>
                                        <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>📝 Notas: {customer.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`${isDark ? 'border-emerald-500/30 bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(15,23,42,0.88))]' : 'border-emerald-300/70 bg-[linear-gradient(145deg,rgba(16,185,129,0.14),#eaf0f8)]'}`}>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm ${mutedTextClass}`}>Total Compras</p>
                                <p className={`text-2xl font-bold ${headerTextClass}`}>${paymentStats.totalAmount.toFixed(2)}</p>
                            </div>
                            <DollarSign size={32} className="text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isDark ? 'border-green-500/30 bg-[linear-gradient(145deg,rgba(34,197,94,0.16),rgba(15,23,42,0.88))]' : 'border-green-300/70 bg-[linear-gradient(145deg,rgba(34,197,94,0.14),#eaf0f8)]'}`}>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm ${mutedTextClass}`}>Pagado</p>
                                <p className="text-2xl font-bold text-green-600">${paymentStats.paidAmount.toFixed(2)}</p>
                            </div>
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isDark ? 'border-red-500/30 bg-[linear-gradient(145deg,rgba(239,68,68,0.16),rgba(15,23,42,0.88))]' : 'border-red-300/70 bg-[linear-gradient(145deg,rgba(239,68,68,0.14),#eaf0f8)]'}`}>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm ${mutedTextClass}`}>Pendiente</p>
                                <p className="text-2xl font-bold text-red-600">${paymentStats.pendingAmount.toFixed(2)}</p>
                            </div>
                            <AlertCircle size={32} className="text-red-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isDark ? 'border-blue-500/30 bg-[linear-gradient(145deg,rgba(59,130,246,0.16),rgba(15,23,42,0.88))]' : 'border-blue-300/70 bg-[linear-gradient(145deg,rgba(59,130,246,0.14),#eaf0f8)]'}`}>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm ${mutedTextClass}`}>Entregas</p>
                                <p className="text-2xl font-bold text-blue-600">{paymentStats.completedDeliveries}/{paymentStats.totalDeliveries}</p>
                            </div>
                            <Package size={32} className="text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Status Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className={headerTextClass}>Estado de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg border ${neumorphInsetClass} ${isDark ? 'border-green-700/50' : 'border-green-200/80'}`}>
                            <p className={`text-sm ${mutedTextClass}`}>Pagadas Completamente</p>
                            <p className="text-3xl font-bold text-green-600">{paymentStats.paidCount}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${neumorphInsetClass} ${isDark ? 'border-orange-700/50' : 'border-orange-200/80'}`}>
                            <p className={`text-sm ${mutedTextClass}`}>Pagadas Parcialmente</p>
                            <p className="text-3xl font-bold text-orange-600">{paymentStats.partialPaymentCount}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${neumorphInsetClass} ${isDark ? 'border-red-700/50' : 'border-red-200/80'}`}>
                            <p className={`text-sm ${mutedTextClass}`}>Pendientes de Pago</p>
                            <p className="text-3xl font-bold text-red-600">{paymentStats.pendingCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Deliveries and Sales History */}
            <Card>
                <CardHeader>
                    <CardTitle className={headerTextClass}>Historial de Entregas y Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    {deliveries.length > 0 || sales.length > 0 ? (
                        <div className="space-y-3">
                            {/* Deliveries */}
                            {deliveries.length > 0 && (
                                <>
                                    <div className={`mb-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-300/70'}`}>
                                        <h3 className={`text-sm font-semibold flex items-center gap-2 ${headerTextClass}`}>
                                            <Truck size={16} className="text-blue-600" />
                                            Entregas ({deliveries.length})
                                        </h3>
                                    </div>
                                    {deliveries.map((delivery: Delivery) => (
                                        <div
                                            key={`delivery-${delivery._id}`}
                                            className={`p-4 border rounded-lg hover:brightness-105 transition-all cursor-pointer ${neumorphInsetClass}`}
                                            onClick={() => delivery._id && setSelectedDeliveryId(delivery._id)}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                                {/* Date and Status */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>FECHA</p>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className={mutedTextClass} />
                                                        <p className={`font-semibold ${headerTextClass}`}>
                                                            {new Date(delivery.scheduledDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                    {delivery.scheduledTime && (
                                                        <p className={`text-sm mt-1 ${mutedTextClass}`}>a las {delivery.scheduledTime}</p>
                                                    )}
                                                </div>

                                                {/* Items and Location */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>UBICACIÓN</p>
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={16} className={`${mutedTextClass} mt-0.5 flex-shrink-0`} />
                                                        <p className={`font-semibold ${headerTextClass}`}>{delivery.location}</p>
                                                    </div>
                                                    <p className={`text-sm mt-1 ${mutedTextClass}`}>{delivery.items.length} items</p>
                                                </div>

                                                {/* Amount and Payment Status */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>MONTO</p>
                                                    <p className={`text-lg font-bold ${headerTextClass}`}>${delivery.totalAmount.toFixed(2)}</p>
                                                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(delivery.paymentStatus || 'pending')}`}>
                                                        {delivery.paymentStatus === 'paid' && '✓ Pagado'}
                                                        {delivery.paymentStatus === 'partial' && `Parcial: $${(delivery.paidAmount || 0).toFixed(2)}`}
                                                        {delivery.paymentStatus === 'pending' && 'Sin pagar'}
                                                    </span>
                                                </div>

                                                {/* Delivery Status */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>ESTADO</p>
                                                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getDeliveryStatusColor(delivery.status)}`}>
                                                        {delivery.status === 'completed' && '✓ Entregada'}
                                                        {delivery.status === 'prepared' && 'Preparada'}
                                                        {delivery.status === 'scheduled' && 'Programada'}
                                                        {delivery.status === 'cancelled' && 'Cancelada'}
                                                    </span>
                                                    {delivery.completedDate && (
                                                        <p className={`text-xs mt-1 ${mutedTextClass}`}>
                                                            {new Date(delivery.completedDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Third-party delivery info */}
                                            {delivery.isThirdPartyDelivery && delivery.thirdPartyRecipient && (
                                                <div className={`mt-3 p-2 rounded border ${isDark ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-50 border-purple-200'}`}>
                                                    <p className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                                                        👤 Entregado a: {delivery.thirdPartyRecipient}
                                                        {delivery.thirdPartyPhone && ` • 📱 ${delivery.thirdPartyPhone}`}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {delivery.notes && (
                                                <div className={`mt-3 p-2 rounded border ${isDark ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200'}`}>
                                                    <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                                        📝 {delivery.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Sales */}
                            {sales.length > 0 && (
                                <>
                                    <div className={`mb-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-300/70'}`}>
                                        <h3 className={`text-sm font-semibold flex items-center gap-2 ${headerTextClass}`}>
                                            <ShoppingCart size={16} className="text-green-600" />
                                            Ventas Completadas ({sales.length})
                                        </h3>
                                    </div>
                                    {sales.map((sale: any) => (
                                        <div
                                            key={`sale-${sale._id}`}
                                            className={`p-4 border rounded-lg hover:brightness-105 transition-all cursor-pointer ${neumorphInsetClass}`}
                                            onClick={() => sale._id && setSelectedSaleId(sale._id)}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                                {/* Date */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>FECHA DE VENTA</p>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className={mutedTextClass} />
                                                        <p className={`font-semibold ${headerTextClass}`}>
                                                            {new Date(sale.saleDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>ITEMS</p>
                                                    <div className="flex items-start gap-2">
                                                        <Package size={16} className={`${mutedTextClass} mt-0.5 flex-shrink-0`} />
                                                        <p className={`font-semibold ${headerTextClass}`}>{sale.items?.length || 0} items</p>
                                                    </div>
                                                </div>

                                                {/* Amount - Sales are treated as fully paid once completed */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>MONTO</p>
                                                    <p className={`text-lg font-bold ${headerTextClass}`}>${sale.totalAmount.toFixed(2)}</p>
                                                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                        ✓ Pagado
                                                    </span>
                                                </div>

                                                {/* Status */}
                                                <div>
                                                    <p className={`text-xs mb-1 ${mutedTextClass}`}>ESTADO</p>
                                                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                        ✓ Entregada
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {sale.notes && (
                                                <div className={`mt-3 p-2 rounded border ${isDark ? 'bg-green-900/30 border-green-700/50' : 'bg-green-50 border-green-200'}`}>
                                                    <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                                                        📝 {sale.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className={mutedTextClass}>No hay entregas ni ventas para este cliente</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delivery Details Modal */}
            <DeliveryDetailsModal
                delivery={deliveries.find(d => d._id === selectedDeliveryId) || null}
                isOpen={!!selectedDeliveryId}
                onClose={() => setSelectedDeliveryId(null)}
                onOpenImageModal={handleOpenImageModal}
            />

            {/* Sale Details Modal */}
            <SaleDetailsModal
                sale={sales.find(s => s._id === selectedSaleId) || null}
                isOpen={!!selectedSaleId}
                onClose={() => setSelectedSaleId(null)}
                onOpenImageModal={handleOpenImageModal}
            />

            {/* Image Viewer Modal */}
            <ImageModal
                isOpen={showImageModal}
                images={allImagesForModal}
                initialIndex={currentImageIndex}
                onClose={() => setShowImageModal(false)}
                title="Galería de Imágenes"
            />
        </div>
    )
}
