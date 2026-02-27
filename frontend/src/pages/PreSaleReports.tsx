import { useState } from 'react'
import { TrendingUp, DollarSign, Percent, Package, Calendar } from 'lucide-react'
import { useStore } from '@/contexts/StoreContext'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useInventory } from '@/hooks/useInventory'

export default function PreSaleReports() {
    const { selectedStore } = useStore()
    const [dateFilter, setDateFilter] = useState<'all' | '30days' | '90days' | 'year'>('all')
    const { data: preSaleItems = [] } = usePreSaleItems({ storeId: selectedStore || undefined })
    const { data: inventoryData } = useInventory({ limit: 1000, selectedStore: selectedStore || undefined })
    const inventory = inventoryData?.items || []

    // Filter items based on date range
    const getFilteredItems = () => {
        if (dateFilter === 'all') return preSaleItems

        const now = new Date()
        const cutoffDate = new Date()

        switch (dateFilter) {
            case '30days':
                cutoffDate.setDate(now.getDate() - 30)
                break
            case '90days':
                cutoffDate.setDate(now.getDate() - 90)
                break
            case 'year':
                cutoffDate.setFullYear(now.getFullYear() - 1)
                break
        }

        return preSaleItems.filter(item => {
            const itemDate = new Date(item.startDate)
            return itemDate >= cutoffDate
        })
    }

    const filteredItems = getFilteredItems()

    // Calculate metrics
    const metrics = {
        totalSales: filteredItems.reduce((sum, item) => sum + (item.totalSaleAmount || 0), 0),
        totalCosts: filteredItems.reduce((sum, item) => sum + (item.totalCostAmount || 0), 0),
        totalProfit: filteredItems.reduce((sum, item) => sum + (item.totalProfit || 0), 0),
        totalUnits: filteredItems.reduce((sum, item) => sum + item.totalQuantity, 0),
        deliveredItems: filteredItems.filter(item => item.status === 'delivered').length,
        activeItems: filteredItems.filter(item =>
            ['purchased', 'shipped', 'received', 'reserved', 'payment-plan', 'payment-pending', 'ready'].includes(item.status)
        ).length,
    }

    const averageMargin = metrics.totalSales > 0
        ? ((metrics.totalProfit / metrics.totalSales) * 100).toFixed(1)
        : '0.0'

    const averageProfitPerUnit = metrics.totalUnits > 0
        ? (metrics.totalProfit / metrics.totalUnits).toFixed(2)
        : '0.00'

    // Get car details for each item
    const getCarDetails = (carId: string) => {
        return inventory.find((item: any) => item._id === carId)
    }

    // Status badge helper
    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            purchased: { label: 'Comprado', color: 'bg-blue-100 text-blue-800' },
            shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
            received: { label: 'Recibido', color: 'bg-cyan-100 text-cyan-800' },
            reserved: { label: 'Apartado', color: 'bg-yellow-100 text-yellow-800' },
            'payment-plan': { label: 'Plan de Pagos', color: 'bg-indigo-100 text-indigo-800' },
            'payment-pending': { label: 'Pago Pendiente', color: 'bg-orange-100 text-orange-800' },
            ready: { label: 'Listo', color: 'bg-teal-100 text-teal-800' },
            delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
            cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
        }

        const config = statusConfig[status] || { label: status, color: 'bg-slate-700 text-gray-800' }

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                {config.label}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-green-600" size={24} />
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                Reportes de Rentabilidad
                            </h2>
                            <p className="text-sm text-slate-400">
                                Análisis de profit y márgenes por pre-venta
                            </p>
                        </div>
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-gray-500" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="px-3 py-2 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">Todo el tiempo</option>
                            <option value="30days">Últimos 30 días</option>
                            <option value="90days">Últimos 90 días</option>
                            <option value="year">Último año</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Profit */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign size={24} />
                        <span className="text-xs font-medium bg-slate-800 bg-opacity-20 px-2 py-1 rounded">
                            Profit Total
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        ${metrics.totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm opacity-90">
                        ${averageProfitPerUnit}/unidad promedio
                    </div>
                </div>

                {/* Average Margin */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Percent size={24} />
                        <span className="text-xs font-medium bg-slate-800 bg-opacity-20 px-2 py-1 rounded">
                            Margen Promedio
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {averageMargin}%
                    </div>
                    <div className="text-sm opacity-90">
                        De ${metrics.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 0 })} en ventas
                    </div>
                </div>

                {/* Total Units */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Package size={24} />
                        <span className="text-xs font-medium bg-slate-800 bg-opacity-20 px-2 py-1 rounded">
                            Unidades
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {metrics.totalUnits}
                    </div>
                    <div className="text-sm opacity-90">
                        {metrics.deliveredItems} entregadas
                    </div>
                </div>

                {/* Active Items */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={24} />
                        <span className="text-xs font-medium bg-slate-800 bg-opacity-20 px-2 py-1 rounded">
                            Items Activos
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {metrics.activeItems}
                    </div>
                    <div className="text-sm opacity-90">
                        En proceso
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">
                        Desglose por Item
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-700/30">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Producto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cant.
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Costo Total
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Venta Total
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Profit
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Margen
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-gray-200">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No hay items en el rango seleccionado
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const inventoryItem = getCarDetails(item.carId)
                                    const car = inventoryItem?.hotWheelsCar
                                    const margin = item.totalSaleAmount > 0
                                        ? ((item.totalProfit / item.totalSaleAmount) * 100).toFixed(1)
                                        : '0.0'

                                    return (
                                        <tr key={item._id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {item.photo ? (
                                                        <img
                                                            src={item.photo}
                                                            alt="Car"
                                                            className="w-10 h-10 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                            <Package size={20} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div className="text-sm">
                                                        <div className="font-medium text-white">
                                                            {car?.model || item.carId}
                                                        </div>
                                                        <div className="text-gray-500">
                                                            {inventoryItem?.brand || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                                {item.totalQuantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                                ${item.totalCostAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                                ${item.totalSaleAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                                ${item.totalProfit?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className={`font-medium ${parseFloat(margin) >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {margin}%
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
