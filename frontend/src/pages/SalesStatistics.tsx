import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api } from '@/services/api'
import { useStore } from '@/contexts/StoreContext'
import {
    LineChart, Line,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, TrendingUp, DollarSign, Package, ShoppingCart, Search } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

interface StatisticsData {
    summary: {
        totalSalesAmount: number
        totalProfit: number
        totalPieces: number
        totalTransactions: number
        deliveryCount: number
        posCount: number
    }
    chartData: {
        salesByDay: Array<{ date: string; amount: number; profit: number; pieces: number }>
        topBrands: Array<{ brand: string; amount: number; profit: number; pieces: number; count: number }>
        saleTypeDistribution: Array<{ name: string; value: number }>
    }
    transactions: any[]
}

interface OutOfStockItem {
    _id: string
    carId: string
    carName?: string
    brand?: string
    pieceType?: string
    quantity: number
    suggestedPrice: number
    actualPrice?: number
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function SalesStatistics() {
    const navigate = useNavigate()

    // Initialize with current month
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [period, setPeriod] = useState<'day' | 'month' | 'custom'>('month')
    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [saleType, setSaleType] = useState<'all' | 'delivery' | 'pos'>('all')
    const [brand, setBrand] = useState('')
    const [pieceType, setPieceType] = useState('')
    const [activeTab, setActiveTab] = useState<'statistics' | 'inventory'>('statistics')
    const [outOfStockSearch, setOutOfStockSearch] = useState('')
    const [reactivatingId, setReactivatingId] = useState<string | null>(null)
    const [reactivateQuantity, setReactivateQuantity] = useState<{ [key: string]: number }>({})
    const { selectedStore } = useStore()

    // Fetch detailed statistics
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StatisticsData>(
        ['sales-statistics', { period, startDate, endDate, saleType, brand, pieceType, selectedStore }],
        async () => {
            const params = new URLSearchParams({
                period,
                startDate,
                ...(period === 'custom' && { endDate }),
                saleType,
                ...(brand && { brand }),
                ...(pieceType && { pieceType })
            })
            const response = await api.get(`/sales/statistics/detailed?${params}`)
            return response.data.data
        },
        {
            staleTime: 1000 * 60 * 5
        }
    )

    // Fetch out-of-stock items
    const { data: outOfStockData, isLoading: outOfStockLoading, refetch: refetchOutOfStock } = useQuery<OutOfStockItem[]>(
        ['out-of-stock', outOfStockSearch, selectedStore],
        async () => {
            const params = outOfStockSearch ? `?search=${outOfStockSearch}` : ''
            const response = await api.get(`/sales/inventory/out-of-stock${params}`)
            return response.data.data
        },
        {
            enabled: activeTab === 'inventory',
            staleTime: 1000 * 60 * 5
        }
    )

    const handlePeriodChange = useCallback((newPeriod: 'day' | 'month' | 'custom') => {
        setPeriod(newPeriod)
        if (newPeriod === 'day') {
            const today = new Date().toISOString().split('T')[0]
            setStartDate(today)
            setEndDate(today)
        } else if (newPeriod === 'month') {
            const today = new Date()
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            setStartDate(firstDay.toISOString().split('T')[0])
            setEndDate(new Date().toISOString().split('T')[0])
        }
    }, [])

    const handleReactivate = useCallback(async (itemId: string) => {
        const quantity = reactivateQuantity[itemId] || 0
        if (quantity <= 0) {
            toast.error('Ingresa una cantidad mayor a 0')
            return
        }

        try {
            setReactivatingId(itemId)
            await api.post('/sales/inventory/reactivate', {
                itemId,
                quantity
            })
            toast.success(`Item reactivado con ${quantity} unidades`)
            setReactivateQuantity(prev => ({ ...prev, [itemId]: 0 }))
            refetchOutOfStock()
        } catch (error) {
            toast.error('Error al reactivar el item')
        } finally {
            setReactivatingId(null)
        }
    }, [reactivateQuantity, refetchOutOfStock])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
            {/* Loading Overlay */}
            {statsLoading && activeTab === 'statistics' && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 shadow-lg">
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium text-slate-300">Cargando estadísticas...</span>
                </div>
            )}

            {outOfStockLoading && activeTab === 'inventory' && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 shadow-lg">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium text-slate-300">Cargando inventario...</span>
                </div>
            )}
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">📊 Estadísticas de Ventas</h1>
                <p className="text-slate-400">Análisis detallado de ventas y ganancias</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('statistics')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'statistics'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    📈 Estadísticas
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'inventory'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    📦 Piezas Sin Stock
                </button>
            </div>

            {activeTab === 'statistics' ? (
                <>
                    {/* Filters */}
                    <Card className="mb-6 bg-slate-800/50 border-slate-700">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-500" /> Filtros
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {/* Period Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
                                    <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1 border border-slate-600">
                                        <button
                                            onClick={() => handlePeriodChange('day')}
                                            className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${period === 'day' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                                        >
                                            Hoy
                                        </button>
                                        <button
                                            onClick={() => handlePeriodChange('month')}
                                            className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${period === 'month' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                                        >
                                            Mes
                                        </button>
                                        <button
                                            onClick={() => handlePeriodChange('custom')}
                                            className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${period === 'custom' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                                        >
                                            Personalizado
                                        </button>
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Desde</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                {/* End Date */}
                                {period === 'custom' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Hasta</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* Sale Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                                    <select
                                        value={saleType}
                                        onChange={(e) => setSaleType(e.target.value as any)}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="all">Todas</option>
                                        <option value="delivery">Solo Entregas</option>
                                        <option value="pos">Solo POS</option>
                                    </select>
                                </div>

                                {/* Brand */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Marca</label>
                                    <select
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Todas</option>
                                        {stats?.chartData?.topBrands?.map((item) => (
                                            <option key={item.brand} value={item.brand}>
                                                {item.brand}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Piece Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Pieza</label>
                                    <select
                                        value={pieceType}
                                        onChange={(e) => setPieceType(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Todas</option>
                                        <option value="basic">Basic</option>
                                        <option value="premium">Premium</option>
                                        <option value="rlc">RLC</option>
                                        <option value="silver_series">Silver Series</option>
                                        <option value="elite_64">Elite 64</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                onClick={() => refetchStats()}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                            >
                                🔄 Actualizar
                            </Button>
                        </div>
                    </Card>

                    {stats && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <SummaryCard
                                    icon={<DollarSign className="w-6 h-6" />}
                                    title="Ventas Totales"
                                    value={`$${stats.summary.totalSalesAmount.toFixed(2)}`}
                                    subtitle={`${stats.summary.totalTransactions} transacciones`}
                                    color="from-emerald-500 to-emerald-600"
                                />
                                <SummaryCard
                                    icon={<TrendingUp className="w-6 h-6" />}
                                    title="Ganancias Totales"
                                    value={`$${stats.summary.totalProfit.toFixed(2)}`}
                                    subtitle={`${((stats.summary.totalProfit / stats.summary.totalSalesAmount) * 100).toFixed(1)}% margen`}
                                    color="from-blue-500 to-blue-600"
                                />
                                <SummaryCard
                                    icon={<Package className="w-6 h-6" />}
                                    title="Piezas Vendidas"
                                    value={stats.summary.totalPieces.toString()}
                                    subtitle={`${(stats.summary.totalPieces / stats.summary.totalTransactions).toFixed(1)} por transacción`}
                                    color="from-orange-500 to-orange-600"
                                />
                                <SummaryCard
                                    icon={<ShoppingCart className="w-6 h-6" />}
                                    title="Distribución"
                                    value={`${stats.summary.deliveryCount} / ${stats.summary.posCount}`}
                                    subtitle="Entregas / POS"
                                    color="from-purple-500 to-purple-600"
                                />
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Sales by Day */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">📈 Ventas por Día</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={stats.chartData.salesByDay}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#94a3b8"
                                                    tick={{ fontSize: 12 }}
                                                    tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: es })}
                                                />
                                                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                    formatter={(value: any) => `$${value.toFixed(2)}`}
                                                />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="amount"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    name="Ventas"
                                                    dot={{ fill: '#10b981', r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="profit"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    name="Ganancias"
                                                    dot={{ fill: '#3b82f6', r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Top Brands */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Marcas</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.chartData.topBrands}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                                <XAxis dataKey="brand" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                    formatter={(value: any) => `$${value.toFixed(2)}`}
                                                />
                                                <Legend />
                                                <Bar dataKey="amount" fill="#10b981" name="Ventas" />
                                                <Bar dataKey="profit" fill="#3b82f6" name="Ganancias" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Sale Type Distribution */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">🥧 Distribución de Ventas</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={stats.chartData.saleTypeDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {stats.chartData.saleTypeDistribution.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Pieces by Type */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">📦 Piezas por Tipo</h3>
                                        <div className="space-y-3">
                                            {Object.entries(stats.chartData.topBrands).length > 0 ? (
                                                stats.chartData.topBrands.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                                        <div>
                                                            <p className="text-white font-medium">{item.brand}</p>
                                                            <p className="text-sm text-slate-400">{item.count} transacciones</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-emerald-400 font-semibold">{item.pieces} piezas</p>
                                                            <p className="text-sm text-slate-400">${item.profit.toFixed(2)} ganancia</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-slate-400 text-center py-6">Sin datos disponibles</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Transactions Table */}
                            <Card className="bg-slate-800/50 border-slate-700">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">💳 Transacciones Recientes</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Cliente</th>
                                                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Fecha</th>
                                                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Tipo</th>
                                                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Venta</th>
                                                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Ganancia</th>
                                                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">Piezas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.transactions.map((transaction, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                                                        onClick={() => navigate(`/sales?id=${transaction._id}`)}
                                                    >
                                                        <td className="py-3 px-4 text-slate-200">{transaction.customerName}</td>
                                                        <td className="py-3 px-4 text-slate-400">
                                                            {format(parseISO(transaction.saleDate), 'dd MMM HH:mm', { locale: es })}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${transaction.saleType === 'delivery'
                                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                                : 'bg-blue-500/20 text-blue-300'
                                                                }`}>
                                                                {transaction.saleType === 'delivery' ? '📦 Entrega' : '🛒 POS'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold">${transaction.totalAmount.toFixed(2)}</td>
                                                        <td className="py-3 px-4 text-right text-blue-400 font-semibold">${transaction.profit.toFixed(2)}</td>
                                                        <td className="py-3 px-4 text-center text-orange-400 font-semibold">{transaction.pieces}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {stats.transactions.length === 0 && (
                                            <p className="text-center text-slate-400 py-6">No hay transacciones en este período</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Out of Stock Items */}
                    <Card className="bg-slate-800/50 border-slate-700 mb-6">
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, marca..."
                                        value={outOfStockSearch}
                                        onChange={(e) => setOutOfStockSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                                    />
                                </div>
                                <Button onClick={() => refetchOutOfStock()} className="bg-slate-700 hover:bg-slate-600">
                                    🔄
                                </Button>
                            </div>

                            {outOfStockData && outOfStockData.length > 0 ? (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {outOfStockData.map((item) => (
                                        <div
                                            key={item._id}
                                            className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-all"
                                        >
                                            <div className="flex-1">
                                                <h4 className="text-white font-semibold">{item.carId}</h4>
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {item.brand && (
                                                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                                                            {item.brand}
                                                        </span>
                                                    )}
                                                    {item.pieceType && (
                                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                                            {item.pieceType}
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                                                        Sin Stock
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-2">
                                                    Precio: ${item.actualPrice || item.suggestedPrice || 0}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setReactivateQuantity(prev => ({
                                                            ...prev,
                                                            [item._id]: Math.max(1, (prev[item._id] ?? 1) - 1)
                                                        }))}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={reactivateQuantity[item._id] ?? 1}
                                                        onChange={(e) =>
                                                            setReactivateQuantity(prev => ({
                                                                ...prev,
                                                                [item._id]: Math.max(1, parseInt(e.target.value) || 1)
                                                            }))
                                                        }
                                                        placeholder="1"
                                                        className="w-12 px-2 py-1 rounded bg-slate-600 border border-slate-500 text-white text-center focus:outline-none focus:border-emerald-500"
                                                    />
                                                    <button
                                                        onClick={() => setReactivateQuantity(prev => ({
                                                            ...prev,
                                                            [item._id]: (prev[item._id] ?? 1) + 1
                                                        }))}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={() => handleReactivate(item._id)}
                                                    disabled={reactivatingId === item._id}
                                                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1"
                                                >
                                                    {reactivatingId === item._id ? 'Guardando...' : 'Agregar'}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Package className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                                    <p className="text-slate-400">
                                        {outOfStockSearch ? 'No hay items que coincidan' : 'Todos los items tienen stock'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

interface SummaryCardProps {
    icon: React.ReactNode
    title: string
    value: string
    subtitle: string
    color: string
}

function SummaryCard({ icon, title, value, subtitle, color }: SummaryCardProps) {
    return (
        <Card className={`bg-gradient-to-br ${color} border-0`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/80 text-sm font-medium">{title}</h3>
                    <div className="text-white/60">{icon}</div>
                </div>
                <p className="text-3xl font-bold text-white mb-2">{value}</p>
                <p className="text-white/60 text-sm">{subtitle}</p>
            </div>
        </Card>
    )
}
