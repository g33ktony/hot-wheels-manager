import React from 'react'
import { useQuery } from 'react-query'
import { dashboardService } from '@/services/dashboard'
import { usePendingItemsStats } from '@/hooks/usePendingItems'
import { useUpdateHotWheelsCatalog, useGetUpdateStatus } from '@/hooks/useHotWheelsUpdate'
import { useNavigate } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import { Loading } from '@/components/common/Loading'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { Package, Truck, TrendingUp, DollarSign, AlertTriangle, Calendar, Clock, MapPin, AlertCircle, ShoppingBag, CalendarCheck, Archive, Percent, RefreshCw } from 'lucide-react'
import PreSaleAlertSection from '@/components/Dashboard/PreSaleAlertSection'

export default function Dashboard() {
    const navigate = useNavigate()
    const [showUpdateModal, setShowUpdateModal] = React.useState(false)
    const { data: metrics, isLoading, error } = useQuery(
        'dashboard-metrics',
        dashboardService.getMetrics,
        {
            refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
        }
    )
    const { data: pendingItemsStats } = usePendingItemsStats()
    const updateCatalogMutation = useUpdateHotWheelsCatalog()
    const { data: updateStatus } = useGetUpdateStatus()

    // Show loading only on initial load, not when refetching with cached data
    if (isLoading && !metrics) {
        return <Loading text="Cargando dashboard..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar el dashboard</p>
            </div>
        )
    }

    if (!metrics) {
        return null
    }

    // Calcular métricas adicionales
    const profitMargin = metrics.monthlyRevenue > 0
        ? ((metrics.monthlyProfit / metrics.monthlyRevenue) * 100).toFixed(1)
        : '0.0';

    const metricCards = [
        {
            title: 'Items en Inventario',
            value: metrics.totalInventoryItems.toString(),
            icon: Package,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        // 2. Total de Compras Pendientes
        {
            title: 'Compras Pendientes',
            value: metrics.pendingPurchases.toString(),
            icon: ShoppingBag,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        // 3. Entregas del Día
        {
            title: 'Entregas del Día',
            value: (metrics.todaysDeliveries?.length || 0).toString(),
            icon: CalendarCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        // 4. Cantidad Total en Stock
        {
            title: 'Total en Stock',
            value: (metrics.totalQuantity || 0).toLocaleString(),
            icon: Archive,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        // 5. Margen de Ganancia del Mes
        {
            title: 'Margen del Mes',
            value: `${profitMargin}%`,
            icon: Percent,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
        },
        {
            title: 'Entregas Pendientes',
            value: metrics.pendingDeliveries.toString(),
            icon: Truck,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
        {
            title: 'Entregas sin Pagar',
            value: metrics.unpaidDeliveries.toString(),
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
        },
        {
            title: 'Items para Preparar',
            value: (metrics.itemsToPrepare || 0).toString(),
            icon: Package,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            title: 'Ganancia del Mes',
            value: `$${metrics.monthlyProfit.toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        }
    ]

    // Add daily sales profit card only if there are actual sales today
    if (metrics.dailySales > 0) {
        metricCards.splice(2, 0, {
            title: 'Ganancia Ventas Hoy',
            value: `$${metrics.dailySales.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
        })
    }

    // Add total sales amount card (what was sold, before deducting costs)
    if (metrics.dailySalesRevenue > 0) {
        const insertIndex = metrics.dailySales > 0 ? 3 : 2;
        metricCards.splice(insertIndex, 0, {
            title: 'Vendido Hoy',
            value: `$${metrics.dailySalesRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        })
    }

    // Add daily total profit card (sales profit + delivery profit)
    if (metrics.dailyRevenue > 0) {
        const insertIndex = metrics.dailySales > 0 && metrics.dailySalesRevenue > 0 ? 4 : (metrics.dailySales > 0 || metrics.dailySalesRevenue > 0 ? 3 : 2);
        metricCards.splice(insertIndex, 0, {
            title: 'Ganancia Total Hoy',
            value: `$${metrics.dailyRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        })
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header with Update Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm lg:text-base text-gray-600">Resumen general de tu negocio de Hot Wheels</p>
                </div>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowUpdateModal(true)}
                    className="flex items-center gap-2 whitespace-nowrap"
                    disabled={updateCatalogMutation.isLoading}
                >
                    <RefreshCw size={16} className={updateCatalogMutation.isLoading ? 'animate-spin' : ''} />
                    {updateCatalogMutation.isLoading ? 'Actualizando...' : 'Actualizar Catálogo'}
                </Button>
            </div>

            {/* Metrics Grid - 2 columns on mobile, 3 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                {metricCards.map((metric) => (
                    <Card key={metric.title} className="hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0">
                            <div className={`p-2 rounded-lg ${metric.bgColor} self-start`}>
                                {React.createElement(metric.icon, { size: 20, className: metric.color })}
                            </div>
                            <div className="lg:ml-4">
                                <p className="text-xs lg:text-sm font-medium text-gray-600">{metric.title}</p>
                                <p className="text-lg lg:text-2xl font-bold text-gray-900 break-words">{metric.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Pre-Sale Alerts */}
            <PreSaleAlertSection />

            {/* Recent Activity and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {metrics.recentActivity.length > 0 ? (
                                metrics.recentActivity.map((activity) => {
                                    const getNavigationPath = () => {
                                        switch (activity.type) {
                                            case 'delivery':
                                                return '/deliveries'
                                            case 'purchase':
                                                return '/purchases'
                                            case 'inventory':
                                                return '/inventory'
                                            case 'sale':
                                                return '/sales'
                                            default:
                                                return null
                                        }
                                    }

                                    const path = getNavigationPath()
                                    const isClickable = path && activity.type !== 'system'

                                    return (
                                        <div
                                            key={activity.id}
                                            onClick={() => isClickable && navigate(path)}
                                            className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${isClickable ? 'cursor-pointer hover:bg-gray-100 hover:shadow-sm transition-all' : ''
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(activity.date).toLocaleDateString('es-ES', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            {activity.amount && (
                                                <span className="text-sm font-semibold text-green-600">
                                                    ${activity.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts and Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <AlertTriangle size={20} className="text-warning-600 mr-2" />
                            Alertas y Notificaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Today's Deliveries */}
                            {metrics.todaysDeliveries && metrics.todaysDeliveries.length > 0 && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Calendar size={16} className="text-blue-600 mr-2" />
                                        <p className="text-sm font-medium text-blue-800">
                                            Entregas programadas para hoy ({metrics.todaysDeliveries.length})
                                        </p>
                                    </div>
                                    <div className="space-y-2 ml-6">
                                        {metrics.todaysDeliveries.map((delivery) => (
                                            <div key={delivery.id} className="text-xs bg-white p-2 rounded border">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{delivery.customerName}</p>
                                                        <div className="flex items-center gap-3 text-gray-600 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {delivery.scheduledTime}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} />
                                                                {delivery.location}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {/* <p className="font-semibold text-green-600">${delivery.totalAmount}</p> */}
                                                        {/* <p className="text-gray-500">{delivery.itemCount} items</p> */}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {metrics.pendingPurchases > 0 && (
                                <div className="flex items-center p-3 bg-warning-50 border border-warning-200 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-warning-800">
                                            Tienes {metrics.pendingPurchases} compras pendientes de recibir
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingSales > 0 && (
                                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-800">
                                            Tienes {metrics.pendingSales} ventas pendientes
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingDeliveries > 0 && !metrics.todaysDeliveries?.length && (
                                <div className="flex items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-purple-800">
                                            Tienes {metrics.pendingDeliveries} entregas programadas
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Pending Items Widget */}
                            {pendingItemsStats && pendingItemsStats.totalCount > 0 && (
                                <div
                                    className="flex items-start p-4 bg-orange-50 border-2 border-orange-300 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                                    onClick={() => navigate('/pending-items')}
                                >
                                    <AlertCircle className="text-orange-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-orange-900 mb-1">
                                            🟠 {pendingItemsStats.totalCount} Item{pendingItemsStats.totalCount > 1 ? 's' : ''} Pendiente{pendingItemsStats.totalCount > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-orange-800">
                                            Valor total: ${pendingItemsStats.totalValue.toFixed(2)}
                                        </p>
                                        {pendingItemsStats.overdueCount > 0 && (
                                            <p className="text-xs text-red-600 font-medium mt-1">
                                                ⚠️ {pendingItemsStats.overdueCount} vencido{pendingItemsStats.overdueCount > 1 ? 's' : ''} (+15 días)
                                            </p>
                                        )}
                                        <p className="text-xs text-orange-700 mt-2">
                                            Click para gestionar →
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingPurchases === 0 && metrics.pendingSales === 0 && metrics.pendingDeliveries === 0 && (!pendingItemsStats || pendingItemsStats.totalCount === 0) && (
                                <p className="text-gray-500 text-center py-4">No hay alertas pendientes</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Update Catalog Modal */}
            <Modal
                isOpen={showUpdateModal}
                onClose={() => {
                    setShowUpdateModal(false)
                    if (updateCatalogMutation.isSuccess) {
                        updateCatalogMutation.reset()
                    }
                }}
                title="Actualizar Catálogo de Hot Wheels"
                maxWidth="md"
                footer={
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowUpdateModal(false)
                                if (updateCatalogMutation.isSuccess) {
                                    updateCatalogMutation.reset()
                                }
                            }}
                            disabled={updateCatalogMutation.isLoading}
                        >
                            {updateCatalogMutation.isSuccess ? 'Cerrar' : 'Cancelar'}
                        </Button>
                        {!updateCatalogMutation.isSuccess && (
                            <Button
                                className="flex-1 flex items-center justify-center gap-2"
                                onClick={() => updateCatalogMutation.mutate()}
                                disabled={updateCatalogMutation.isLoading}
                            >
                                <RefreshCw size={16} className={updateCatalogMutation.isLoading ? 'animate-spin' : ''} />
                                {updateCatalogMutation.isLoading ? 'Descargando...' : 'Actualizar Ahora'}
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    {!updateCatalogMutation.isSuccess && !updateCatalogMutation.isError && (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <span className="font-semibold">📥 Descargar datos actualizados</span>
                                    <br className="mt-2" />
                                    Esto descargará el catálogo completo de Hot Wheels desde la Wiki de Fandom (1995 - {new Date().getFullYear()}) y actualizará la base de datos local.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-amber-800">
                                    <span className="font-semibold">⏱️ Tiempo estimado:</span> 2-5 minutos
                                    <br />
                                    <span className="text-xs text-amber-700 mt-2 block">La aplicación puede estar lenta durante la actualización.</span>
                                </p>
                            </div>

                            {updateStatus && (
                                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                    <p className="font-semibold text-gray-700 mb-2">Última actualización:</p>
                                    <p className="text-gray-600">
                                        {new Date(updateStatus.lastModified).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {updateCatalogMutation.isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center space-y-3">
                                <div className="animate-spin">
                                    <RefreshCw size={32} className="text-blue-600" />
                                </div>
                                <p className="text-gray-700 font-medium">Descargando catálogo...</p>
                                <p className="text-sm text-gray-500">No cierres esta ventana</p>
                            </div>
                        </div>
                    )}

                    {updateCatalogMutation.isSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800">
                                <span className="font-semibold">✅ Actualización completada</span>
                                <br className="mt-2" />
                                El catálogo de Hot Wheels ha sido actualizado exitosamente.
                            </p>
                        </div>
                    )}

                    {updateCatalogMutation.isError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">
                                <span className="font-semibold">❌ Error en la actualización</span>
                                <br className="mt-2" />
                                {updateCatalogMutation.error?.message || 'No se pudo actualizar el catálogo'}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
