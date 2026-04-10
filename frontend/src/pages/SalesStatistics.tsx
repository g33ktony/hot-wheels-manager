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
import { Calendar, TrendingUp, DollarSign, Package, ShoppingCart, Search, Crown, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
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
        pieceTypeBreakdown: Array<{
            pieceType: string
            label: string
            amount: number
            profit: number
            pieces: number
            count: number
            margin: number
        }>
        topCustomers: Array<{
            customerId: string | null
            customerName: string
            amount: number
            profit: number
            pieces: number
            count: number
            margin: number
        }>
        topCustomerDetails: {
            customerId: string | null
            customerName: string
            amount: number
            profit: number
            pieces: number
            count: number
            margin: number
            items: Array<{
                carId: string
                carName: string
                brand: string
                quantity: number
                amount: number
                profit: number
            }>
        } | null
        topTransaction: {
            _id: string
            customerId: string | null
            customerName: string
            saleDate: string
            totalAmount: number
            profit: number
            pieces: number
            saleType: 'delivery' | 'pos'
            paymentMethod?: string
            itemsCount: number
            items: Array<{
                carId: string
                carName: string
                brand: string
                quantity: number
                unitPrice: number
                amount: number
                profit: number
            }>
        } | null
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
    const { mode } = useTheme()
    const isDark = mode === 'dark'

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

    const pageBackdropClass = 'bg-transparent'
    const neumorphSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_20px_rgba(51,65,85,0.2)]'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'
    const neumorphInsetClass = isDark
        ? 'rounded-xl border border-slate-700/70 bg-slate-900/70 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.65),inset_-4px_-4px_10px_rgba(51,65,85,0.2)]'
        : 'rounded-xl border border-white/80 bg-[#e2e8f3] shadow-[inset_4px_4px_9px_rgba(148,163,184,0.28),inset_-4px_-4px_8px_rgba(255,255,255,0.92)]'
    const headerTextClass = isDark ? 'text-white' : 'text-slate-900'
    const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600'
    const inputClass = `${neumorphInsetClass} w-full px-4 py-2 ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-700 placeholder-slate-500'} focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-emerald-500/50' : 'focus:ring-emerald-500/40'}`
    const getBrandLabelClass = (brand?: string) => {
        const normalized = (brand || '').toLowerCase().trim()
        const baseClass = isDark
            ? 'rounded-md border shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),4px_4px_10px_rgba(2,6,23,0.38)]'
            : 'rounded-md border shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),4px_4px_10px_rgba(148,163,184,0.24)]'

        if (normalized.includes('hot wheels')) return `${baseClass} ${isDark ? 'bg-orange-500/24 text-orange-200 border-orange-400/35' : 'bg-orange-100/95 text-orange-700 border-orange-300/90'}`
        if (normalized.includes('mini gt')) return `${baseClass} ${isDark ? 'bg-cyan-500/24 text-cyan-200 border-cyan-400/35' : 'bg-cyan-100/95 text-cyan-700 border-cyan-300/90'}`
        if (normalized.includes('pop race')) return `${baseClass} ${isDark ? 'bg-fuchsia-500/24 text-fuchsia-200 border-fuchsia-400/35' : 'bg-fuchsia-100/95 text-fuchsia-700 border-fuchsia-300/90'}`
        if (normalized.includes('kaido')) return `${baseClass} ${isDark ? 'bg-violet-500/24 text-violet-200 border-violet-400/35' : 'bg-violet-100/95 text-violet-700 border-violet-300/90'}`
        if (normalized.includes('tomica')) return `${baseClass} ${isDark ? 'bg-red-500/24 text-red-200 border-red-400/35' : 'bg-red-100/95 text-red-700 border-red-300/90'}`

        return `${baseClass} ${isDark ? 'bg-slate-700/70 text-slate-300 border-slate-600/70' : 'bg-slate-100/95 text-slate-700 border-slate-300/90'}`
    }

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
                ...(pieceType && { pieceType }),
                ...(selectedStore && { storeId: selectedStore })
            })
            const response = await api.get(`/sales/statistics/detailed?${params}`)
            return response.data.data
        },
        {
            staleTime: 1000 * 60 * 5
        }
    )
    const topCustomer = stats?.chartData?.topCustomers?.[0]
    const topCustomerDetails = stats?.chartData?.topCustomerDetails
    const topTransaction = stats?.chartData?.topTransaction

    // Fetch out-of-stock items
    const { data: outOfStockData, isLoading: outOfStockLoading, refetch: refetchOutOfStock } = useQuery<OutOfStockItem[]>(
        ['out-of-stock', outOfStockSearch, selectedStore],
        async () => {
            const searchParams = new URLSearchParams()
            if (outOfStockSearch) searchParams.append('search', outOfStockSearch)
            if (selectedStore) searchParams.append('storeId', selectedStore)
            const params = searchParams.toString() ? `?${searchParams}` : ''
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
        <div className={`space-y-6 ${pageBackdropClass}`}>
            {/* Loading Overlay */}
            {statsLoading && activeTab === 'statistics' && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 ${neumorphSurfaceClass}`}>
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    <span className={`text-sm font-medium ${mutedTextClass}`}>Cargando estadísticas...</span>
                </div>
            )}

            {outOfStockLoading && activeTab === 'inventory' && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 ${neumorphSurfaceClass}`}>
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className={`text-sm font-medium ${mutedTextClass}`}>Cargando inventario...</span>
                </div>
            )}
            {/* Header */}
            <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-2 ${headerTextClass}`}>📊 Estadísticas de Ventas</h1>
                <p className={mutedTextClass}>Análisis detallado de ventas y ganancias</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('statistics')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'statistics'
                        ? isDark
                            ? 'bg-emerald-500 text-white shadow-[6px_6px_14px_rgba(16,185,129,0.35)]'
                            : 'bg-emerald-500 text-white shadow-[6px_6px_14px_rgba(16,185,129,0.28)]'
                        : `${neumorphInsetClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`
                        }`}
                >
                    📈 Estadísticas
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'inventory'
                        ? isDark
                            ? 'bg-blue-500 text-white shadow-[6px_6px_14px_rgba(59,130,246,0.34)]'
                            : 'bg-blue-500 text-white shadow-[6px_6px_14px_rgba(59,130,246,0.28)]'
                        : `${neumorphInsetClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`
                        }`}
                >
                    📦 Piezas Sin Stock
                </button>
            </div>

            {activeTab === 'statistics' ? (
                <>
                    {/* Filters */}
                    <Card className={`mb-6 ${neumorphSurfaceClass}`}>
                        <div className="p-6">
                            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${headerTextClass}`}>
                                <Calendar className="w-5 h-5 text-emerald-500" /> Filtros
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {/* Period Selection */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Período</label>
                                    <div className={`flex items-center gap-2 p-1 ${neumorphInsetClass}`}>
                                        <button
                                            onClick={() => handlePeriodChange('day')}
                                            className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${period === 'day' ? 'bg-emerald-500 text-white' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white/60'}`}
                                        >
                                            Hoy
                                        </button>
                                        <button
                                            onClick={() => handlePeriodChange('month')}
                                            className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${period === 'month' ? 'bg-emerald-500 text-white' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white/60'}`}
                                        >
                                            Mes
                                        </button>
                                        <button
                                            onClick={() => handlePeriodChange('custom')}
                                            className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${period === 'custom' ? 'bg-emerald-500 text-white' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white/60'}`}
                                        >
                                            Personalizado
                                        </button>
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Desde</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>

                                {/* End Date */}
                                {period === 'custom' && (
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Hasta</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                )}

                                {/* Sale Type */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Tipo</label>
                                    <select
                                        value={saleType}
                                        onChange={(e) => setSaleType(e.target.value as any)}
                                        className={inputClass}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="delivery">Solo Entregas</option>
                                        <option value="pos">Solo POS</option>
                                    </select>
                                </div>

                                {/* Brand */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Marca</label>
                                    <select
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        className={inputClass}
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
                                    <label className={`block text-sm font-medium mb-2 ${mutedTextClass}`}>Tipo de Pieza</label>
                                    <select
                                        value={pieceType}
                                        onChange={(e) => setPieceType(e.target.value)}
                                        className={inputClass}
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
                                className={`w-full ${isDark ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-200' : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700'} rounded-xl shadow-none`}
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
                                    color="text-emerald-500"
                                    variant="emerald"
                                />
                                <SummaryCard
                                    icon={<TrendingUp className="w-6 h-6" />}
                                    title="Ganancias Totales"
                                    value={`$${stats.summary.totalProfit.toFixed(2)}`}
                                    subtitle={`${((stats.summary.totalProfit / stats.summary.totalSalesAmount) * 100).toFixed(1)}% margen`}
                                    color="text-blue-500"
                                    variant="blue"
                                />
                                <SummaryCard
                                    icon={<Package className="w-6 h-6" />}
                                    title="Piezas Vendidas"
                                    value={stats.summary.totalPieces.toString()}
                                    subtitle={`${(stats.summary.totalPieces / stats.summary.totalTransactions).toFixed(1)} por transacción`}
                                    color="text-orange-500"
                                    variant="orange"
                                />
                                <SummaryCard
                                    icon={<ShoppingCart className="w-6 h-6" />}
                                    title="Distribución"
                                    value={`${stats.summary.deliveryCount} / ${stats.summary.posCount}`}
                                    subtitle="Entregas / POS"
                                    color="text-violet-500"
                                    variant="violet"
                                />
                            </div>

                            <Card className={`mb-8 ${neumorphSurfaceClass}`}>
                                <div className="p-6">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <h3 className={`text-lg font-semibold flex items-center gap-2 ${headerTextClass}`}>
                                            <Crown className="w-5 h-5 text-amber-500" /> Top Cliente del Período
                                        </h3>
                                        <span className={`text-xs px-3 py-1 rounded-full ${neumorphInsetClass} ${mutedTextClass}`}>
                                            {period === 'month' ? 'Mes actual' : period === 'day' ? 'Hoy' : 'Rango personalizado'}
                                        </span>
                                    </div>

                                    {topCustomer ? (
                                        <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 ${neumorphInsetClass} p-4`}>
                                            <div className="md:col-span-2">
                                                <p className={`text-sm ${mutedTextClass}`}>Cliente</p>
                                                <p className={`text-xl font-bold flex items-center gap-2 ${headerTextClass}`}>
                                                    <User className="w-5 h-5 text-amber-500" />
                                                    {topCustomer.customerName}
                                                </p>
                                            </div>
                                            <div>
                                                <p className={`text-sm ${mutedTextClass}`}>Total Comprado</p>
                                                <p className="text-xl font-semibold text-emerald-500">${topCustomer.amount.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className={`text-sm ${mutedTextClass}`}>Margen</p>
                                                <p className="text-xl font-semibold text-amber-500">{topCustomer.margin.toFixed(1)}%</p>
                                            </div>

                                            {topCustomerDetails && (
                                                <div className="md:col-span-4 mt-2 space-y-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                            {topCustomerDetails.count} transacciones
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                            {topCustomerDetails.pieces} piezas
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                            ${topCustomerDetails.profit.toFixed(2)} ganancia
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <p className={`text-sm font-semibold mb-2 ${headerTextClass}`}>Modelos más comprados</p>
                                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                                            {topCustomerDetails.items.slice(0, 6).map((item, idx) => (
                                                                <div key={`${item.carId}-${idx}`} className={`flex items-center justify-between p-2 ${neumorphInsetClass}`}>
                                                                    <div className="min-w-0">
                                                                        <p className={`text-sm font-medium truncate ${headerTextClass}`}>{item.carName}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${getBrandLabelClass(item.brand)}`}>
                                                                                {item.brand || 'Sin marca'}
                                                                            </span>
                                                                            <p className={`text-xs ${mutedTextClass}`}>x{item.quantity} • {item.carId}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm font-semibold text-emerald-500">${item.amount.toFixed(2)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`text-center py-6 ${mutedTextClass}`}>
                                            No hay datos suficientes para calcular el top cliente en este período.
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <Card className={`mb-8 ${neumorphSurfaceClass}`}>
                                <div className="p-6">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <h3 className={`text-lg font-semibold flex items-center gap-2 ${headerTextClass}`}>
                                            <DollarSign className="w-5 h-5 text-emerald-500" /> Mayor Transacción del Período
                                        </h3>
                                    </div>

                                    {topTransaction ? (
                                        <div className={`space-y-3 ${neumorphInsetClass} p-4`}>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-2">
                                                    <p className={`text-sm ${mutedTextClass}`}>Cliente</p>
                                                    <p className={`text-xl font-bold ${headerTextClass}`}>{topTransaction.customerName}</p>
                                                    <p className={`text-xs ${mutedTextClass}`}>
                                                        {format(parseISO(topTransaction.saleDate), 'dd MMM yyyy HH:mm', { locale: es })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className={`text-sm ${mutedTextClass}`}>Monto</p>
                                                    <p className="text-xl font-semibold text-emerald-500">${topTransaction.totalAmount.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className={`text-sm ${mutedTextClass}`}>Ganancia</p>
                                                    <p className="text-xl font-semibold text-blue-500">${topTransaction.profit.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                    {topTransaction.pieces} piezas
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                    {topTransaction.itemsCount} items
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-lg ${neumorphInsetClass} ${mutedTextClass}`}>
                                                    {topTransaction.saleType === 'delivery' ? 'Entrega' : 'POS'}
                                                </span>
                                            </div>

                                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                                {topTransaction.items.slice(0, 6).map((item, idx) => (
                                                    <div key={`${item.carId}-${idx}`} className={`flex items-center justify-between p-2 ${neumorphInsetClass}`}>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-medium truncate ${headerTextClass}`}>{item.carName}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${getBrandLabelClass(item.brand)}`}>
                                                                    {item.brand || 'Sin marca'}
                                                                </span>
                                                                <p className={`text-xs ${mutedTextClass}`}>x{item.quantity} • ${item.unitPrice.toFixed(2)} c/u</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-semibold text-emerald-500">${item.amount.toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`text-center py-6 ${mutedTextClass}`}>
                                            No hay transacciones registradas para este período.
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Sales by Day */}
                                <Card className={neumorphSurfaceClass}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${headerTextClass}`}>📈 Ventas por Día</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={stats.chartData.salesByDay}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#94a3b8'} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke={isDark ? '#94a3b8' : '#64748b'}
                                                    tick={{ fontSize: 12 }}
                                                    tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: es })}
                                                />
                                                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#eaf0f8', border: 'none', borderRadius: '12px', boxShadow: isDark ? '12px 12px 24px rgba(2,6,23,0.45)' : '10px 10px 20px rgba(148,163,184,0.3)' }}
                                                    labelStyle={{ color: isDark ? '#e2e8f0' : '#334155' }}
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
                                <Card className={neumorphSurfaceClass}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${headerTextClass}`}>🏆 Top Marcas</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.chartData.topBrands}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#94a3b8'} />
                                                <XAxis dataKey="brand" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                                                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#eaf0f8', border: 'none', borderRadius: '12px', boxShadow: isDark ? '12px 12px 24px rgba(2,6,23,0.45)' : '10px 10px 20px rgba(148,163,184,0.3)' }}
                                                    labelStyle={{ color: isDark ? '#e2e8f0' : '#334155' }}
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
                                <Card className={neumorphSurfaceClass}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${headerTextClass}`}>🥧 Distribución de Ventas</h3>
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

                                {/* Piece Type Margin */}
                                <Card className={neumorphSurfaceClass}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${headerTextClass}`}>📦 Margen por Tipo de Pieza</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.chartData.pieceTypeBreakdown || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#94a3b8'} />
                                                <XAxis dataKey="label" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                                                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} unit="%" />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#eaf0f8', border: 'none', borderRadius: '12px', boxShadow: isDark ? '12px 12px 24px rgba(2,6,23,0.45)' : '10px 10px 20px rgba(148,163,184,0.3)' }}
                                                    labelStyle={{ color: isDark ? '#e2e8f0' : '#334155' }}
                                                    formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                                                />
                                                <Bar dataKey="margin" fill="#f59e0b" name="Margen" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>

                                        <div className="space-y-3">
                                            {(stats.chartData.pieceTypeBreakdown || []).length > 0 ? (
                                                stats.chartData.pieceTypeBreakdown.map((item, idx) => (
                                                    <div key={idx} className={`flex items-center justify-between p-3 ${neumorphInsetClass}`}>
                                                        <div>
                                                            <p className={`font-medium ${headerTextClass}`}>{item.label}</p>
                                                            <p className={`text-sm ${mutedTextClass}`}>{item.pieces} piezas • {item.count} movimientos</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-amber-400 font-semibold">{item.margin.toFixed(1)}% margen</p>
                                                            <p className={`text-sm ${mutedTextClass}`}>${item.profit.toFixed(2)} ganancia</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className={`text-center py-6 ${mutedTextClass}`}>Sin datos disponibles</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Transactions Table */}
                            <Card className={neumorphSurfaceClass}>
                                <div className="p-6">
                                    <h3 className={`text-lg font-semibold mb-4 ${headerTextClass}`}>💳 Transacciones Recientes</h3>
                                    <div className={`overflow-x-auto rounded-2xl p-3 ${neumorphInsetClass}`}>
                                        <table className="w-full border-separate [border-spacing:0_8px]">
                                            <thead>
                                                <tr>
                                                    <th className={`text-left py-3 px-4 font-semibold rounded-l-xl border-y border-l ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Cliente</th>
                                                    <th className={`text-left py-3 px-4 font-semibold border-y ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Fecha</th>
                                                    <th className={`text-left py-3 px-4 font-semibold border-y ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Tipo</th>
                                                    <th className={`text-right py-3 px-4 font-semibold border-y ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Venta</th>
                                                    <th className={`text-right py-3 px-4 font-semibold border-y ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Ganancia</th>
                                                    <th className={`text-center py-3 px-4 font-semibold rounded-r-xl border-y border-r ${isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-white/75 border-slate-300/70'} ${mutedTextClass}`}>Piezas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.transactions.map((transaction, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className={`transition-all cursor-pointer ${isDark ? 'hover:brightness-110' : 'hover:brightness-95'}`}
                                                        onClick={() => navigate(`/sales?id=${transaction._id}`)}
                                                    >
                                                        <td className={`py-3 px-4 rounded-l-xl border-y border-l shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75 text-slate-200' : 'bg-[#edf3fa] border-slate-300/65 text-slate-700'}`}>{transaction.customerName}</td>
                                                        <td className={`py-3 px-4 border-y shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75' : 'bg-[#edf3fa] border-slate-300/65'} ${mutedTextClass}`}>
                                                            {format(parseISO(transaction.saleDate), 'dd MMM HH:mm', { locale: es })}
                                                        </td>
                                                        <td className={`py-3 px-4 border-y shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75' : 'bg-[#edf3fa] border-slate-300/65'}`}>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${transaction.saleType === 'delivery'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 shadow-[inset_1px_1px_0_rgba(255,255,255,0.12),3px_3px_8px_rgba(2,6,23,0.3)]'
                                                                : 'bg-blue-500/20 text-blue-300 border border-blue-400/25 shadow-[inset_1px_1px_0_rgba(255,255,255,0.12),3px_3px_8px_rgba(2,6,23,0.3)]'
                                                                }`}>
                                                                {transaction.saleType === 'delivery' ? '📦 Entrega' : '🛒 POS'}
                                                            </span>
                                                        </td>
                                                        <td className={`py-3 px-4 text-right border-y shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75' : 'bg-[#edf3fa] border-slate-300/65'} text-emerald-400 font-semibold`}>${transaction.totalAmount.toFixed(2)}</td>
                                                        <td className={`py-3 px-4 text-right border-y shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75' : 'bg-[#edf3fa] border-slate-300/65'} text-blue-400 font-semibold`}>${transaction.profit.toFixed(2)}</td>
                                                        <td className={`py-3 px-4 text-center rounded-r-xl border-y border-r shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${isDark ? 'bg-slate-900/70 border-slate-700/75' : 'bg-[#edf3fa] border-slate-300/65'} text-orange-400 font-semibold`}>{transaction.pieces}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {stats.transactions.length === 0 && <p className={`text-center py-6 ${mutedTextClass}`}>No hay transacciones en este período</p>}
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Out of Stock Items */}
                    <Card className={`${neumorphSurfaceClass} mb-6`}>
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1 relative">
                                    <Search className={`absolute left-3 top-3 w-5 h-5 ${mutedTextClass}`} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, marca..."
                                        value={outOfStockSearch}
                                        onChange={(e) => setOutOfStockSearch(e.target.value)}
                                        className={`${inputClass} pl-10 pr-4`}
                                    />
                                </div>
                                <Button onClick={() => refetchOutOfStock()} className={`${neumorphInsetClass} ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-900'} px-3`}>
                                    🔄
                                </Button>
                            </div>

                            {outOfStockData && outOfStockData.length > 0 ? (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {outOfStockData.map((item) => (
                                        <div
                                            key={item._id}
                                            className={`flex items-center justify-between p-4 transition-all ${neumorphInsetClass}`}
                                        >
                                            <div className="flex-1">
                                                <h4 className={`font-semibold ${headerTextClass}`}>{item.carId}</h4>
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
                                                <p className={`text-sm mt-2 ${mutedTextClass}`}>
                                                    Precio: ${item.actualPrice || item.suggestedPrice || 0}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center gap-1 p-1 ${neumorphInsetClass}`}>
                                                    <button
                                                        onClick={() => setReactivateQuantity(prev => ({
                                                            ...prev,
                                                            [item._id]: Math.max(1, (prev[item._id] ?? 1) - 1)
                                                        }))}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white' : 'bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900'}`}
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
                                                        className={`w-12 px-2 py-1 rounded-lg border text-center focus:outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white focus:border-emerald-500' : 'bg-white/70 border-white text-slate-800 focus:border-emerald-500'}`}
                                                    />
                                                    <button
                                                        onClick={() => setReactivateQuantity(prev => ({
                                                            ...prev,
                                                            [item._id]: (prev[item._id] ?? 1) + 1
                                                        }))}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white' : 'bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900'}`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={() => handleReactivate(item._id)}
                                                    disabled={reactivatingId === item._id}
                                                    className={`${isDark ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/25' : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 border border-emerald-500/35'} px-3 py-1 rounded-xl`}
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
                                    <p className={mutedTextClass}>
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
    variant: 'emerald' | 'blue' | 'orange' | 'violet'
}

function SummaryCard({ icon, title, value, subtitle, color, variant }: SummaryCardProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const variantStyles = {
        emerald: isDark
            ? 'border-emerald-500/30 bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(15,23,42,0.88))]'
            : 'border-emerald-300/70 bg-[linear-gradient(145deg,rgba(16,185,129,0.14),#eaf0f8)]',
        blue: isDark
            ? 'border-blue-500/30 bg-[linear-gradient(145deg,rgba(59,130,246,0.16),rgba(15,23,42,0.88))]'
            : 'border-blue-300/70 bg-[linear-gradient(145deg,rgba(59,130,246,0.14),#eaf0f8)]',
        orange: isDark
            ? 'border-orange-500/30 bg-[linear-gradient(145deg,rgba(249,115,22,0.16),rgba(15,23,42,0.88))]'
            : 'border-orange-300/70 bg-[linear-gradient(145deg,rgba(249,115,22,0.14),#eaf0f8)]',
        violet: isDark
            ? 'border-violet-500/30 bg-[linear-gradient(145deg,rgba(139,92,246,0.16),rgba(15,23,42,0.88))]'
            : 'border-violet-300/70 bg-[linear-gradient(145deg,rgba(139,92,246,0.14),#eaf0f8)]',
    }[variant]

    return (
        <Card className={`${isDark
            ? 'rounded-2xl border bg-slate-800/85 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_20px_rgba(51,65,85,0.2)]'
            : 'rounded-2xl border bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'} ${variantStyles}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{title}</h3>
                    <div className={color}>{icon}</div>
                </div>
                <p className={`text-3xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{subtitle}</p>
            </div>
        </Card>
    )
}
