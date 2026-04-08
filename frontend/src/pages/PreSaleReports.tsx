import { useState } from 'react'
import { TrendingUp, DollarSign, Percent, Package, Calendar } from 'lucide-react'
import { useStore } from '@/contexts/StoreContext'
import { useTheme } from '@/contexts/ThemeContext'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useInventory } from '@/hooks/useInventory'

export default function PreSaleReports() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
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

    const pageBackdropClass = isDark
        ? 'bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0b1220_100%)]'
        : 'bg-[radial-gradient(circle_at_8%_8%,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_88%_6%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#f6f9ff_0%,#eaf0f8_100%)]'
    const neumorphSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_20px_rgba(51,65,85,0.2)]'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'
    const headerTextClass = isDark ? 'text-white' : 'text-slate-900'
    const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600'

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
        <div className={`space-y-6 rounded-3xl p-4 lg:p-6 ${pageBackdropClass}`}>
            {/* Header with filters */}
            <div className={`${neumorphSurfaceClass} p-4 lg:p-6`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-green-600" size={24} />
                        <div>
                            <h2 className={`text-xl font-semibold ${headerTextClass}`}>
                                Reportes de Rentabilidad
                            </h2>
                            <p className={`text-sm ${mutedTextClass}`}>
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
                            className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-[#e2e8f3] border-white text-slate-800'}`}
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
                <div className={`${neumorphSurfaceClass} p-6 border-emerald-400/40 bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(15,23,42,0.02))] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign size={24} />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${isDark ? 'bg-slate-800/30' : 'bg-white/60'}`}>
                            Profit Total
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        ${metrics.totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-sm ${isDark ? 'opacity-90' : 'text-slate-600'}`}>
                        ${averageProfitPerUnit}/unidad promedio
                    </div>
                </div>

                {/* Average Margin */}
                <div className={`${neumorphSurfaceClass} p-6 border-blue-400/40 bg-[linear-gradient(145deg,rgba(59,130,246,0.16),rgba(15,23,42,0.02))] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <Percent size={24} />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${isDark ? 'bg-slate-800/30' : 'bg-white/60'}`}>
                            Margen Promedio
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {averageMargin}%
                    </div>
                    <div className={`text-sm ${isDark ? 'opacity-90' : 'text-slate-600'}`}>
                        De ${metrics.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 0 })} en ventas
                    </div>
                </div>

                {/* Total Units */}
                <div className={`${neumorphSurfaceClass} p-6 border-violet-400/40 bg-[linear-gradient(145deg,rgba(139,92,246,0.16),rgba(15,23,42,0.02))] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <Package size={24} />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${isDark ? 'bg-slate-800/30' : 'bg-white/60'}`}>
                            Unidades
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {metrics.totalUnits}
                    </div>
                    <div className={`text-sm ${isDark ? 'opacity-90' : 'text-slate-600'}`}>
                        {metrics.deliveredItems} entregadas
                    </div>
                </div>

                {/* Active Items */}
                <div className={`${neumorphSurfaceClass} p-6 border-orange-400/40 bg-[linear-gradient(145deg,rgba(249,115,22,0.16),rgba(15,23,42,0.02))] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={24} />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${isDark ? 'bg-slate-800/30' : 'bg-white/60'}`}>
                            Items Activos
                        </span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        {metrics.activeItems}
                    </div>
                    <div className={`text-sm ${isDark ? 'opacity-90' : 'text-slate-600'}`}>
                        En proceso
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className={`${neumorphSurfaceClass} overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-300/70'}`}>
                    <h3 className={`text-lg font-semibold ${headerTextClass}`}>
                        Desglose por Item
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-300/70'}`}>
                        <thead className={isDark ? 'bg-slate-700/30' : 'bg-white/45'}>
                            <tr>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Producto
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Estado
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Cant.
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Costo Total
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Venta Total
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Profit
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>
                                    Margen
                                </th>
                            </tr>
                        </thead>
                        <tbody className={`${isDark ? 'bg-slate-800 divide-slate-700' : 'bg-[#eaf0f8] divide-slate-300/70'} divide-y`}>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`px-6 py-8 text-center ${mutedTextClass}`}>
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
                                        <tr key={item._id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-white/60'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {item.photo ? (
                                                        <img
                                                            src={item.photo}
                                                            alt="Car"
                                                            className="w-10 h-10 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-white/70'}`}>
                                                            <Package size={20} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                                        </div>
                                                    )}
                                                    <div className="text-sm">
                                                        <div className={`font-medium ${headerTextClass}`}>
                                                            {car?.model || item.carId}
                                                        </div>
                                                        <div className={mutedTextClass}>
                                                            {inventoryItem?.brand || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${headerTextClass}`}>
                                                {item.totalQuantity}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${headerTextClass}`}>
                                                ${item.totalCostAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${headerTextClass}`}>
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
