import React from 'react'
import { useQuery } from 'react-query'
import { dashboardService } from '@/services/dashboard'
import { usePendingItemsStats } from '@/hooks/usePendingItems'
import { useUpdateHotWheelsCatalog, useGetUpdateStatus } from '@/hooks/useHotWheelsUpdate'
import { useSearchHotWheels } from '@/hooks/useSearchHotWheels'
import { useDownloadHotWheelsDatabase } from '@/hooks/useDownloadHotWheels'
import { useNavigate } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import { Loading } from '@/components/common/Loading'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import { Package, Truck, TrendingUp, DollarSign, AlertTriangle, Calendar, Clock, MapPin, AlertCircle, ShoppingBag, CalendarCheck, Archive, Percent, RefreshCw, Search, X, Download } from 'lucide-react'
import PreSaleAlertSection from '@/components/Dashboard/PreSaleAlertSection'
import toast from 'react-hot-toast'

export default function Dashboard() {
    const navigate = useNavigate()
    const [showUpdateModal, setShowUpdateModal] = React.useState(false)
    const [showSearchModal, setShowSearchModal] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [isDownloading, setIsDownloading] = React.useState(false)
    const [selectedUnpaidDelivery, setSelectedUnpaidDelivery] = React.useState<any>(null)
    const { data: metrics, isLoading, error } = useQuery(
        'dashboard-metrics',
        dashboardService.getMetrics,
        {
            refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
        }
    )
    const { data: unpaidDeliveries = [] } = useQuery(
        'unpaid-deliveries',
        dashboardService.getUnpaidDeliveries,
        {
            refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
        }
    )
    const { data: pendingItemsStats } = usePendingItemsStats()
    const updateCatalogMutation = useUpdateHotWheelsCatalog()
    const { data: updateStatus } = useGetUpdateStatus()
    const { results: searchResults, isLoading: isSearching, searchByName, loadAll } = useSearchHotWheels()
    const { download: downloadDatabase } = useDownloadHotWheelsDatabase()

    // Cargar todos los items cuando se abre el modal de búsqueda
    React.useEffect(() => {
        if (showSearchModal && searchResults.length === 0 && !isSearching) {
            loadAll()
        }
    }, [showSearchModal, searchResults.length, isSearching, loadAll])

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            await downloadDatabase()
            toast.success('Base de datos descargada correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al descargar')
        } finally {
            setIsDownloading(false)
        }
    }

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
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        // 2. Total de Compras Pendientes
        {
            title: 'Compras Pendientes',
            value: metrics.pendingPurchases.toString(),
            icon: ShoppingBag,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        // 3. Entregas del Día
        {
            title: 'Entregas del Día',
            value: (metrics.todaysDeliveries?.length || 0).toString(),
            icon: CalendarCheck,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        // 4. Cantidad Total en Stock
        {
            title: 'Total en Stock',
            value: (metrics.totalQuantity || 0).toLocaleString(),
            icon: Archive,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        // 5. Margen de Ganancia del Mes
        {
            title: 'Margen del Mes',
            value: `${profitMargin}%`,
            icon: Percent,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        {
            title: 'Entregas Pendientes',
            value: metrics.pendingDeliveries.toString(),
            icon: Truck,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        {
            title: 'Entregas sin Pagar',
            value: metrics.unpaidDeliveries.toString(),
            icon: AlertTriangle,
            color: 'text-red-500',
            bgColor: 'bg-slate-700',
        },
        {
            title: 'Items para Preparar',
            value: (metrics.itemsToPrepare || 0).toString(),
            icon: Package,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        },
        {
            title: 'Ganancia del Mes',
            value: `$${metrics.monthlyProfit.toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        }
    ]

    // Add daily sales profit card only if there are actual sales today
    if (metrics.dailySales > 0) {
        metricCards.splice(2, 0, {
            title: 'Ganancia Ventas Hoy',
            value: `$${metrics.dailySales.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        })
    }

    // Add total sales amount card (what was sold, before deducting costs)
    if (metrics.dailySalesRevenue > 0) {
        const insertIndex = metrics.dailySales > 0 ? 3 : 2;
        metricCards.splice(insertIndex, 0, {
            title: 'Vendido Hoy',
            value: `$${metrics.dailySalesRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        })
    }

    // Add daily total profit card (sales profit + delivery profit)
    if (metrics.dailyRevenue > 0) {
        const insertIndex = metrics.dailySales > 0 && metrics.dailySalesRevenue > 0 ? 4 : (metrics.dailySales > 0 || metrics.dailySalesRevenue > 0 ? 3 : 2);
        metricCards.splice(insertIndex, 0, {
            title: 'Ganancia Total Hoy',
            value: `$${metrics.dailyRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-400',
            bgColor: 'bg-slate-700',
        })
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header with Update Button */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm lg:text-base text-slate-400">Resumen general de tu negocio de Hot Wheels</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleDownload}
                        className="flex items-center gap-2 whitespace-nowrap"
                        disabled={isDownloading}
                    >
                        <Download size={16} />
                        {isDownloading ? 'Descargando...' : 'Descargar JSON'}
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowSearchModal(true)}
                        className="flex items-center gap-2 whitespace-nowrap"
                    >
                        <Search size={16} />
                        Buscar
                    </Button>
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
            </div>

            {/* Metrics Grid - 2 columns on mobile, 3 on desktop */}
            <div className="hidden grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                {metricCards.map((metric) => (
                    <Card key={metric.title} className="hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0">
                            <div className={`p-2 rounded-lg ${metric.bgColor} self-start`}>
                                {React.createElement(metric.icon, { size: 20, className: metric.color })}
                            </div>
                            <div className="lg:ml-4">
                                <p className="text-xs lg:text-sm font-medium text-slate-400">{metric.title}</p>
                                <p className="text-lg lg:text-2xl font-bold text-white break-words">{metric.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Statistics Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                    className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-105 rounded-lg"
                    onClick={() => navigate('/sales-statistics')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Ver Análisis</p>
                            <h3 className="text-white text-2xl font-bold mt-1">📊 Estadísticas de Ventas</h3>
                            <p className="text-emerald-100 text-sm mt-3">Análisis detallado de ventas, ganancias y tendencias</p>
                        </div>
                        {React.createElement(TrendingUp, { size: 32, className: 'text-white/30' })}
                    </div>
                </div>

                <div
                    className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-105 rounded-lg"
                    onClick={() => navigate('/search?stockFilter=without')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Ver Inventario</p>
                            <h3 className="text-white text-2xl font-bold mt-1">📦 Piezas Sin Stock</h3>
                            <p className="text-blue-100 text-sm mt-3">Gestiona y reactiva items agotados</p>
                        </div>
                        {React.createElement(Package, { size: 32, className: 'text-white/30' })}
                    </div>
                </div>
            </div>

            {/* Pre-Sale Alerts */}
            <PreSaleAlertSection />

            {/* Recent Activity and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-white">Actividad Reciente</CardTitle>
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
                                            className={`flex items-center justify-between p-3 bg-slate-700/30 rounded-lg ${isClickable ? 'cursor-pointer hover:bg-slate-700 hover:shadow-sm transition-all' : ''
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">{activity.description}</p>
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
                                <p className="text-slate-400 text-center py-4">No hay actividad reciente</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts and Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-white">
                            <AlertTriangle size={20} className="text-red-500 mr-2" />
                            Alertas y Notificaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Today's Deliveries */}
                            {metrics.todaysDeliveries && metrics.todaysDeliveries.length > 0 && (
                                <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Calendar size={16} className="text-emerald-400 mr-2" />
                                        <p className="text-sm font-medium text-white">
                                            Entregas programadas para hoy ({metrics.todaysDeliveries.length})
                                        </p>
                                    </div>
                                    <div className="space-y-2 ml-6">
                                        {metrics.todaysDeliveries.map((delivery) => (
                                            <div key={delivery.id} className="text-xs bg-slate-800 p-2 rounded border">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-white">{delivery.customerName}</p>
                                                        <div className="flex items-center gap-3 text-slate-400 mt-1">
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
                                <div className="flex items-center p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                            Tienes {metrics.pendingPurchases} compras pendientes de recibir
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingSales > 0 && (
                                <div className="flex items-center p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                            Tienes {metrics.pendingSales} ventas pendientes
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingDeliveries > 0 && !metrics.todaysDeliveries?.length && (
                                <div className="flex items-center p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                            Tienes {metrics.pendingDeliveries} entregas programadas
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Unpaid Deliveries Alert */}
                            {unpaidDeliveries && unpaidDeliveries.length > 0 && (
                                <div
                                    className="flex items-start p-4 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-600 rounded-lg cursor-pointer hover:from-yellow-900/70 hover:to-orange-900/70 transition-colors"
                                    onClick={() => setSelectedUnpaidDelivery(unpaidDeliveries[0])}
                                >
                                    <AlertCircle className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white mb-1">
                                            💳 {unpaidDeliveries.length} Entrega{unpaidDeliveries.length > 1 ? 's' : ''} Sin Cobrar
                                        </p>
                                        <p className="text-xs text-yellow-200">
                                            Pendiente de pago total: ${unpaidDeliveries.reduce((sum: number, d: any) => sum + (d.totalAmount - d.paidAmount), 0).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-slate-300 mt-2">
                                            Click para gestionar pago →
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Pending Items Widget */}
                            {pendingItemsStats && pendingItemsStats.totalCount > 0 && (
                                <div
                                    className="flex items-start p-4 bg-slate-700/50 border-2 border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                                    onClick={() => navigate('/pending-items')}
                                >
                                    <AlertCircle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white mb-1">
                                            🟠 {pendingItemsStats.totalCount} Item{pendingItemsStats.totalCount > 1 ? 's' : ''} Pendiente{pendingItemsStats.totalCount > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-slate-300">
                                            Valor total: ${pendingItemsStats.totalValue.toFixed(2)}
                                        </p>
                                        {pendingItemsStats.overdueCount > 0 && (
                                            <p className="text-xs text-red-500 font-medium mt-1">
                                                ⚠️ {pendingItemsStats.overdueCount} vencido{pendingItemsStats.overdueCount > 1 ? 's' : ''} (+15 días)
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-300 mt-2">
                                            Click para gestionar →
                                        </p>
                                    </div>
                                </div>
                            )}

                            {metrics.pendingPurchases === 0 && metrics.pendingSales === 0 && metrics.pendingDeliveries === 0 && (!pendingItemsStats || pendingItemsStats.totalCount === 0) && (!unpaidDeliveries || unpaidDeliveries.length === 0) && (
                                <p className="text-slate-400 text-center py-4">No hay alertas pendientes</p>
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
                            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                                <p className="text-sm text-white">
                                    <span className="font-semibold">📥 Descargar datos actualizados</span>
                                    <br className="mt-2" />
                                    Esto descargará el catálogo completo de Hot Wheels desde la Wiki de Fandom (1995 - {new Date().getFullYear()}) y actualizará la base de datos local.
                                </p>
                            </div>

                            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                                <p className="text-sm text-white">
                                    <span className="font-semibold">⏱️ Tiempo estimado:</span> 2-5 minutos
                                    <br />
                                    <span className="text-xs text-amber-700 mt-2 block">La aplicación puede estar lenta durante la actualización.</span>
                                </p>
                            </div>

                            {updateStatus && (
                                <div className="bg-slate-700/30 rounded-lg p-4 text-sm">
                                    <p className="font-semibold text-white mb-2">Última actualización:</p>
                                    <p className="text-slate-400">
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
                                    <RefreshCw size={32} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-medium">Descargando catálogo...</p>
                                <p className="text-sm text-slate-400">No cierres esta ventana</p>
                            </div>
                        </div>
                    )}

                    {updateCatalogMutation.isSuccess && (
                        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                            <p className="text-white">
                                <span className="font-semibold">✅ Actualización completada</span>
                                <br className="mt-2" />
                                El catálogo de Hot Wheels ha sido actualizado exitosamente.
                            </p>
                        </div>
                    )}

                    {updateCatalogMutation.isError && (
                        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                            <p className="text-white">
                                <span className="font-semibold">❌ Error en la actualización</span>
                                <br className="mt-2" />
                                {updateCatalogMutation.error?.message || 'No se pudo actualizar el catálogo'}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Search Modal */}
            <Modal
                isOpen={showSearchModal}
                onClose={() => {
                    setShowSearchModal(false)
                    setSearchQuery('')
                }}
                title="Buscar en Hot Wheels"
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowSearchModal(false)
                                setSearchQuery('')
                            }}
                        >
                            Cerrar
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Info sobre búsqueda mejorada */}
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                        <p className="text-xs text-emerald-300">
                            💡 <span className="font-semibold">Búsqueda inteligente:</span> Busca en todos los campos (modelo, serie, año, códigos).
                            Encuentra resultados similares aunque no coincidan exactamente.
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por modelo, serie, año, Toy #, etc..."
                            className="flex-1 px-3 py-2 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    searchByName(searchQuery)
                                }
                            }}
                        />
                        <Button
                            onClick={() => searchByName(searchQuery)}
                            disabled={isSearching}
                        >
                            {isSearching ? 'Buscando...' : 'Buscar'}
                        </Button>
                        {searchQuery && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSearchQuery('')
                                    searchByName('')
                                }}
                                className="px-2"
                            >
                                <X size={16} />
                            </Button>
                        )}
                    </div>

                    {/* Results Count */}
                    {searchResults.length > 0 && (
                        <p className="text-sm font-semibold text-white">
                            {searchQuery ? `Se encontraron ${searchResults.length} resultados` : `Total: ${searchResults.length} modelos`}
                        </p>
                    )}

                    {/* Results Grid */}
                    {searchResults.length > 0 && (
                        <div className="max-h-[600px] overflow-y-auto border border-slate-700 rounded-lg p-4 bg-slate-700/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.map((item, idx) => (
                                    <div key={idx} className="bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-slate-700 flex flex-col">
                                        {/* Imagen */}
                                        <div className="h-40 bg-slate-700 overflow-hidden flex items-center justify-center relative">
                                            {item.photo_url ? (
                                                <img
                                                    src={`https://images.weserv.nl/?url=${encodeURIComponent(item.photo_url)}&w=600&h=600&fit=contain`}
                                                    alt={item.model}
                                                    className="w-full h-full object-contain bg-slate-800"
                                                    crossOrigin="anonymous"
                                                    onLoad={() => {
                                                        console.log('✅ Imagen cargada:', item.model, item.photo_url)
                                                    }}
                                                    onError={(e) => {
                                                        console.warn('❌ Error cargando imagen:', {
                                                            model: item.model,
                                                            url: item.photo_url
                                                        });
                                                        // Fallback a emoji
                                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                        const parent = (e.currentTarget as HTMLImageElement).parentElement;
                                                        if (parent && !parent.querySelector('[data-fallback]')) {
                                                            const fallback = document.createElement('div');
                                                            fallback.setAttribute('data-fallback', 'true');
                                                            fallback.className = 'flex items-center justify-center text-6xl';
                                                            fallback.textContent = '🚗';
                                                            parent.appendChild(fallback);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center text-6xl">🚗</div>
                                            )}
                                        </div>
                                        {/* Datos */}
                                        <div className="p-3 space-y-1 flex-grow">
                                            <h3 className="font-semibold text-white text-sm line-clamp-2">{item.model}</h3>
                                            <div className="space-y-0.5 text-xs text-slate-400">
                                                <p><span className="font-medium">Serie:</span> <span className="text-slate-300">{item.series}</span></p>
                                                <p><span className="font-medium">Año:</span> <span className="text-slate-300">{item.year}</span></p>
                                                <p><span className="font-medium">Toy #:</span> <span className="font-mono text-xs text-slate-300">{item.toy_num}</span></p>
                                                <p><span className="font-medium">Col #:</span> <span className="font-mono text-xs text-slate-300">{item.col_num}</span></p>
                                                <p><span className="font-medium">Serie #:</span> <span className="text-slate-300">{item.series_num}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isSearching && searchResults.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-2">
                                <div className="animate-spin inline-block">
                                    <RefreshCw size={24} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-medium">Cargando...</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isSearching && searchResults.length === 0 && !searchQuery && (
                        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
                            <p className="text-white text-sm">
                                Cargando listado de modelos...
                            </p>
                        </div>
                    )}

                    {/* No Results State */}
                    {!isSearching && searchResults.length === 0 && searchQuery && (
                        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
                            <p className="text-white text-sm">
                                No se encontraron resultados para "{searchQuery}"
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Unpaid Delivery Details Modal */}
            <DeliveryDetailsModal
                delivery={selectedUnpaidDelivery}
                isOpen={!!selectedUnpaidDelivery}
                onClose={() => setSelectedUnpaidDelivery(null)}
                onMarkAsCompleted={() => { }} // Already completed, so no marking needed
                onRegisterPayment={() => { }} // Payment registration handled elsewhere
                readonly={false}
            />
        </div>
    )
}

