import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { customersService } from '@/services/customers'
import { deliveriesService } from '@/services/deliveries'
import { salesService } from '@/services/sales'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import {
    ArrowLeft, Mail, Phone, MapPin, MessageCircle, DollarSign, Package, CheckCircle,
    AlertCircle, User, Calendar, ShoppingCart, Truck
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Delivery } from '../../../shared/types'

export default function CustomerProfile() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

    // Fetch customer details
    const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery(
        ['customer', customerId],
        () => customerId ? customersService.getById(customerId) : Promise.reject('No customer ID'),
        { enabled: !!customerId }
    )

    // Fetch all deliveries for this customer
    const { data: deliveries = [], isLoading: isLoadingDeliveries } = useQuery(
        ['deliveries', customerId],
        async () => {
            const allDeliveries = await deliveriesService.getAll()
            return customerId ? allDeliveries.filter((d: any) => {
                const dCustomerId = typeof d.customerId === 'object' ? d.customerId._id?.toString() : d.customerId?.toString()
                const cId = customerId?.toString()
                return dCustomerId === cId && d.status === 'completed'
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
                const sCustomerId = typeof s.customerId === 'object' ? s.customerId._id?.toString() : s.customerId?.toString()
                const cId = customerId?.toString()
                return sCustomerId === cId && s.status === 'completed'
            }) : []
        },
        { enabled: !!customerId }
    )

    const isLoading = isLoadingCustomer || isLoadingDeliveries || isLoadingSales
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

        // Entregas completadas = pagadas (porque estamos filtrando solo completed)
        deliveries.forEach((d: Delivery) => {
            stats.totalAmount += d.totalAmount || 0
            // Si está en status 'completed', ya está pagada
            stats.paidAmount += d.totalAmount || 0
            stats.paidCount += 1
        })

        // Ventas completadas = pagadas (todas las ventas completadas están pagadas)
        sales.forEach((s: any) => {
            stats.totalAmount += s.totalAmount || 0
            stats.paidAmount += s.totalAmount || 0
            stats.paidCount += 1
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
                return 'bg-green-100 text-green-800'
            case 'partial':
                return 'bg-orange-100 text-orange-800'
            case 'pending':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getDeliveryStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'prepared':
                return 'bg-orange-100 text-orange-800'
            case 'scheduled':
                return 'bg-blue-100 text-blue-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
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

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="secondary"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => navigate(-1)}
                >
                    Volver
                </Button>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Perfil del Cliente</h1>
                <div className="w-[100px]"></div>
            </div>

            {/* Customer Info Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Left: Basic Info */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-blue-200 rounded-lg flex-shrink-0">
                                    <User size={24} className="text-blue-700" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Nombre</p>
                                    <p className="text-lg font-bold text-gray-900">{customer.name}</p>
                                </div>
                            </div>

                            {customer.email && (
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-blue-200 rounded-lg flex-shrink-0">
                                        <Mail size={24} className="text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Email</p>
                                        <p className="text-lg font-bold text-gray-900 break-all">{customer.email}</p>
                                    </div>
                                </div>
                            )}

                            {customer.phone && (
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-blue-200 rounded-lg flex-shrink-0">
                                        <Phone size={24} className="text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Teléfono</p>
                                        <p className="text-lg font-bold text-gray-900">{customer.phone}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Contact & Address */}
                        <div className="space-y-4">
                            {customer.address && (
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-blue-200 rounded-lg flex-shrink-0">
                                        <MapPin size={24} className="text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Dirección</p>
                                        <p className="text-lg font-bold text-gray-900">{customer.address}</p>
                                    </div>
                                </div>
                            )}

                            {customer.contactMethod && (
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-blue-200 rounded-lg flex-shrink-0">
                                        {getContactIcon(customer.contactMethod)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Método de contacto preferido</p>
                                        <p className="text-lg font-bold text-gray-900 capitalize">{customer.contactMethod}</p>
                                    </div>
                                </div>
                            )}

                            {customer.notes && (
                                <div className="p-3 bg-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700 font-medium">📝 Notas: {customer.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Compras</p>
                                <p className="text-2xl font-bold text-gray-900">${paymentStats.totalAmount.toFixed(2)}</p>
                            </div>
                            <DollarSign size={32} className="text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pagado</p>
                                <p className="text-2xl font-bold text-green-600">${paymentStats.paidAmount.toFixed(2)}</p>
                            </div>
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pendiente</p>
                                <p className="text-2xl font-bold text-red-600">${paymentStats.pendingAmount.toFixed(2)}</p>
                            </div>
                            <AlertCircle size={32} className="text-red-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Entregas</p>
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
                    <CardTitle>Estado de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-gray-600">Pagadas Completamente</p>
                            <p className="text-3xl font-bold text-green-600">{paymentStats.paidCount}</p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-gray-600">Pagadas Parcialmente</p>
                            <p className="text-3xl font-bold text-orange-600">{paymentStats.partialPaymentCount}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-gray-600">Pendientes de Pago</p>
                            <p className="text-3xl font-bold text-red-600">{paymentStats.pendingCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Deliveries and Sales History */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Entregas y Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    {deliveries.length > 0 || sales.length > 0 ? (
                        <div className="space-y-3">
                            {/* Deliveries */}
                            {deliveries.length > 0 && (
                                <>
                                    <div className="mb-4 pb-4 border-b">
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <Truck size={16} className="text-blue-600" />
                                            Entregas ({deliveries.length})
                                        </h3>
                                    </div>
                                    {deliveries.map((delivery: Delivery) => (
                                        <div
                                            key={`delivery-${delivery._id}`}
                                            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-blue-50 cursor-pointer"
                                            onClick={() => setSelectedDeliveryId(delivery._id)}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                                {/* Date and Status */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">FECHA</p>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className="text-gray-400" />
                                                        <p className="font-semibold text-gray-900">
                                                            {new Date(delivery.scheduledDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                    {delivery.scheduledTime && (
                                                        <p className="text-sm text-gray-600 mt-1">a las {delivery.scheduledTime}</p>
                                                    )}
                                                </div>

                                                {/* Items and Location */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">UBICACIÓN</p>
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="font-semibold text-gray-900">{delivery.location}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{delivery.items.length} items</p>
                                                </div>

                                                {/* Amount and Payment Status */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">MONTO</p>
                                                    <p className="text-lg font-bold text-gray-900">${delivery.totalAmount.toFixed(2)}</p>
                                                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(delivery.paymentStatus || 'pending')}`}>
                                                        {delivery.paymentStatus === 'paid' && '✓ Pagado'}
                                                        {delivery.paymentStatus === 'partial' && `Parcial: $${(delivery.paidAmount || 0).toFixed(2)}`}
                                                        {delivery.paymentStatus === 'pending' && 'Sin pagar'}
                                                    </span>
                                                </div>

                                                {/* Delivery Status */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">ESTADO</p>
                                                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getDeliveryStatusColor(delivery.status)}`}>
                                                        {delivery.status === 'completed' && '✓ Completada'}
                                                        {delivery.status === 'prepared' && 'Preparada'}
                                                        {delivery.status === 'scheduled' && 'Programada'}
                                                        {delivery.status === 'cancelled' && 'Cancelada'}
                                                    </span>
                                                    {delivery.completedDate && (
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            {new Date(delivery.completedDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Third-party delivery info */}
                                            {delivery.isThirdPartyDelivery && delivery.thirdPartyRecipient && (
                                                <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
                                                    <p className="text-xs text-purple-700 font-medium">
                                                        👤 Entregado a: {delivery.thirdPartyRecipient}
                                                        {delivery.thirdPartyPhone && ` • 📱 ${delivery.thirdPartyPhone}`}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {delivery.notes && (
                                                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                                    <p className="text-xs text-blue-700">
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
                                    <div className="mb-4 pb-4 border-b">
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <ShoppingCart size={16} className="text-green-600" />
                                            Ventas Completadas ({sales.length})
                                        </h3>
                                    </div>
                                    {sales.map((sale: any) => (
                                        <div
                                            key={`sale-${sale._id}`}
                                            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-green-50 cursor-pointer"
                                            onClick={() => setSelectedSaleId(sale._id)}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                                {/* Date */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">FECHA DE VENTA</p>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className="text-gray-400" />
                                                        <p className="font-semibold text-gray-900">
                                                            {new Date(sale.saleDate).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">ITEMS</p>
                                                    <div className="flex items-start gap-2">
                                                        <Package size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="font-semibold text-gray-900">{sale.items?.length || 0} items</p>
                                                    </div>
                                                </div>

                                                {/* Amount - Sales are treated as fully paid once completed */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">MONTO</p>
                                                    <p className="text-lg font-bold text-gray-900">${sale.totalAmount.toFixed(2)}</p>
                                                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                        ✓ Pagado
                                                    </span>
                                                </div>

                                                {/* Status */}
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">ESTADO</p>
                                                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                        ✓ Completada
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {sale.notes && (
                                                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                                                    <p className="text-xs text-green-700">
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
                            <p className="text-gray-600">No hay entregas ni ventas para este cliente</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delivery Details Modal */}
            {selectedDeliveryId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Detalles de Entrega</h2>
                            <button
                                onClick={() => setSelectedDeliveryId(null)}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ✕
                            </button>
                        </div>
                        {deliveries.find(d => d._id === selectedDeliveryId) && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Información de la entrega</p>
                                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                                        {JSON.stringify(deliveries.find(d => d._id === selectedDeliveryId), null, 2)}
                                    </pre>
                                </div>
                                <Button
                                    onClick={() => {
                                        setSelectedDeliveryId(null)
                                        navigate('/deliveries')
                                    }}
                                    className="w-full"
                                >
                                    Ver en Entregas
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sale Details Modal */}
            {selectedSaleId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Detalles de Venta</h2>
                            <button
                                onClick={() => setSelectedSaleId(null)}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ✕
                            </button>
                        </div>
                        {sales.find(s => s._id === selectedSaleId) && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Información de la venta</p>
                                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                                        {JSON.stringify(sales.find(s => s._id === selectedSaleId), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
