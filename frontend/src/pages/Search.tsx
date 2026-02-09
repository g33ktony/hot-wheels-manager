import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import {
    Search as SearchIcon, ShoppingCart, Package, Truck, User, AlertCircle, ChevronRight, ChevronDown,
    Plus, TrendingUp, MapPin, Phone, Mail, X, Edit, Save, Trash2
} from 'lucide-react'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'
import { useAppDispatch } from '@/hooks/redux'
import { addToCart } from '@/store/slices/cartSlice'
import { addToDeliveryCart } from '@/store/slices/deliveryCartSlice'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import CustomerEditForm from '@/components/CustomerEditForm'
import CatalogItemModal from '@/components/CatalogItemModal'
import { customersService } from '@/services/customers'
import { searchService } from '@/services/search'

interface SearchResultItem {
    _id: string
    type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa' | 'catalog'
    title: string
    subtitle?: string
    description?: string
    inStock?: boolean
    metadata?: any
    date?: string
}

interface ModalState {
    isOpen: boolean
    type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa' | 'catalog' | null
    id: string | null
    sale?: any
    delivery?: any
}

export default function Search() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [searchParams] = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const dispatch = useAppDispatch()

    const [query, setQuery] = useState(initialQuery)
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, id: null })
    const [addToCartQuantity, setAddToCartQuantity] = useState<{ [key: string]: number }>({})
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null)
    const [catalogItemMode, setCatalogItemMode] = useState<'detail' | 'add'>('detail')

    // Predictive search state
    const [predictions, setPredictions] = useState<any[]>([])
    const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)
    const [showPredictions, setShowPredictions] = useState(false)
    const debounceTimer = useRef<NodeJS.Timeout>()
    const searchRef = useRef<HTMLDivElement>(null)

    // Collapsed sections state
    const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
        inventory: false,
        sale: false,
        delivery: false,
        customer: false,
        preventa: false,
        catalog: false
    })

    // Pagination per section
    const [sectionPagination, setSectionPagination] = useState<{ [key: string]: number }>({
        inventory: 10,
        sale: 10,
        delivery: 10,
        customer: 10,
        preventa: 10,
        catalog: 20
    })

    // Filtros de tipos de resultado
    const [filters, setFilters] = useState({
        inventory: true,
        deliveries: true,
        catalog: true,
        sales: false,
        customers: false,
        preventas: false,
        inventoryStock: 'all' // 'all', 'inStock', 'outOfStock'
    })

    // Filter por año en catálogo
    const [catalogYearFilter, setCatalogYearFilter] = useState<number | null>(null)

    // Sincronizar query con Header Search
    useEffect(() => {
        // Escuchar cambios en localStorage de la búsqueda del header
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'globalSearchQuery' && e.newValue) {
                setQuery(e.newValue)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    // Guardar query actual en localStorage para que el header pueda sincronizar
    useEffect(() => {
        if (query && query.length > 0) {
            localStorage.setItem('globalSearchQuery', query)
        }
    }, [query])

    const { data: results = [], isLoading } = useQuery(
        ['global-search', query],
        async () => {
            if (query.length < 2) return []
            const response = await api.get(`/search?query=${encodeURIComponent(query)}`)
            return response.data.data
        },
        {
            staleTime: 1000 * 30, // 30 segundos
            enabled: query.length >= 2
        }
    )

    // Agrupar y filtrar resultados por tipo
    const groupedResults = useMemo(() => {
        const groups: { [key: string]: SearchResultItem[] } = {
            inventory: [],
            sale: [],
            delivery: [],
            customer: [],
            preventa: [],
            catalog: []
        }

        results.forEach((result: SearchResultItem) => {
            // Aplicar filtro de tipo
            if (result.type === 'sale' && !filters.sales) return
            if (result.type === 'inventory' && !filters.inventory) return
            if (result.type === 'delivery' && !filters.deliveries) return
            if (result.type === 'customer' && !filters.customers) return
            if (result.type === 'preventa' && !filters.preventas) return
            if (result.type === 'catalog' && !filters.catalog) return

            // Filtro especial para inventory stock
            if (result.type === 'inventory' && filters.inventoryStock !== 'all') {
                if (filters.inventoryStock === 'inStock' && !result.inStock) return
                if (filters.inventoryStock === 'outOfStock' && result.inStock) return
            }

            // Filtro de año para catálogo
            if (result.type === 'catalog' && catalogYearFilter !== null) {
                const itemYear = result.metadata?.year
                if (!itemYear || itemYear !== catalogYearFilter) return
            }

            if (groups[result.type]) {
                groups[result.type].push(result)
            }
        })
        return groups
    }, [results, filters, catalogYearFilter])

    // Función para obtener años únicos en resultados de catálogo (sin filtro de año)
    const getCatalogYears = useMemo(() => {
        const unfiltered = results.filter((r: SearchResultItem) => r.type === 'catalog' && filters.catalog)
        const years = new Set<number>()
        unfiltered.forEach((item: SearchResultItem) => {
            const year = item.metadata?.year
            if (year) years.add(year)
        })
        return Array.from(years).sort((a, b) => a - b)
    }, [results, filters.catalog])

    const handleAddToCart = useCallback(async (itemId: string, quantity: number = 1) => {
        if (quantity <= 0) {
            toast.error('Cantidad debe ser mayor a 0')
            return
        }
        try {
            // Obtener detalles del item
            const response = await api.get(`/inventory/${itemId}`)
            const item = response.data.data

            // Agregar al carrito usando Redux
            dispatch(addToCart({ item, quantity }))
            toast.success(`✅ ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${item.carName} agregadas al carrito`)
            setAddToCartQuantity(prev => ({ ...prev, [itemId]: 1 }))
        } catch (error) {
            toast.error('Error al agregar al carrito')
            console.error(error)
        }
    }, [dispatch])

    const handleAddToDeliveryCart = useCallback(async (itemId: string, quantity: number = 1) => {
        if (quantity <= 0) {
            toast.error('Cantidad debe ser mayor a 0')
            return
        }
        try {
            // Obtener detalles del item
            const response = await api.get(`/inventory/${itemId}`)
            const item = response.data.data

            // Agregar al carrito de entrega usando Redux
            dispatch(addToDeliveryCart({
                inventoryItemId: item._id,
                carId: item.carId,
                carName: item.carName || `${item.brand} - ${item.color || 'Unknown'}`,
                quantity,
                unitPrice: item.actualPrice || item.suggestedPrice || 0,
                photos: item.photos,
                primaryPhotoIndex: item.primaryPhotoIndex,
                maxAvailable: item.quantity - (item.reservedQuantity || 0),
                brand: item.brand,
                color: item.color
            }))
            toast.success(`✅ ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${item.carName} agregadas al carrito de entrega`)
        } catch (error) {
            toast.error('Error al agregar al carrito de entrega')
            console.error(error)
        }
    }, [dispatch])

    const handleAddToInventory = useCallback(async (itemId: string) => {
        try {
            // Para artículos sin stock, abrimos modal para agregar cantidad
            const response = await api.get(`/inventory/${itemId}`)
            const item = response.data.data

            if (item.stock === 0 || item.stock === undefined) {
                // Reutilizar endpoint de reactivación
                const newStock = prompt('¿Cuántas unidades agregar al stock?', '1')
                if (!newStock) return // Usuario canceló

                const qty = parseInt(newStock.trim())
                if (isNaN(qty) || qty < 1) {
                    toast.error('Cantidad inválida. Debe ser al menos 1.')
                    return
                }

                await api.put(`/inventory/${itemId}`, {
                    stock: qty
                })

                toast.success(`Stock actualizado: +${qty} unidades`)
            } else {
                toast.success(`Este artículo ya tiene ${item.stock} unidades en stock`)
            }
        } catch (error) {
            toast.error('Error al agregar stock')
            console.error(error)
        }
    }, [])

    const handlePermanentDelete = useCallback(async (itemId: string, itemName: string) => {
        // Show confirmation dialog
        const confirmed = window.confirm(
            `⚠️ ADVERTENCIA: Eliminación Permanente\n\n` +
            `Esta acción eliminará completamente este item de la base de datos.\n\n` +
            `Nombre: ${itemName}\n` +
            `Cantidad actual: 0\n\n` +
            `Si tienes ventas históricas con este item, perderán la referencia.\n\n` +
            `¿Estás completamente seguro?`
        )

        if (!confirmed) return

        try {
            await api.delete(`/inventory/${itemId}/permanent`)
            toast.success('Item eliminado permanentemente')

            // Trigger a refetch by updating the query
            setQuery(query + ' ') // Force re-search
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Error al eliminar item'
            toast.error(errorMessage)
            console.error(error)
        }
    }, [query])

    const handleResultClick = async (result: SearchResultItem) => {
        // Para catálogo, abrir modal del catálogo en modo detalle
        if (result.type === 'catalog') {
            setSelectedCatalogItem(result)
            setCatalogItemMode('detail')
            return
        }

        const newModalState: ModalState = {
            isOpen: true,
            type: result.type,
            id: result._id
        }

        // Precargar datos para modales reutilizables
        if (result.type === 'sale') {
            try {
                const response = await api.get(`/sales/${result._id}`)
                newModalState.sale = response.data.data
            } catch (error) {
                console.error('Error loading sale:', error)
            }
        } else if (result.type === 'delivery') {
            try {
                const response = await api.get(`/deliveries/${result._id}`)
                newModalState.delivery = response.data.data
            } catch (error) {
                console.error('Error loading delivery:', error)
            }
        }

        setModal(newModalState)
    }

    // Callback para refrescar datos después de editar entregas
    const handleDeliveryUpdated = async (updatedDelivery: any) => {
        setModal(prev => ({
            ...prev,
            delivery: updatedDelivery
        }))
        toast.success('Entrega actualizada correctamente')
    }

    // Cierra el modal y limpia
    const closeModal = () => {
        setModal({ isOpen: false, type: null, id: null })
    }

    // Handle predictive search input
    const handlePredictiveInputChange = useCallback((value: string) => {
        setQuery(value)

        // Clear previous timer
        if (debounceTimer.current) clearTimeout(debounceTimer.current)

        if (value.length < 3) {
            setPredictions([])
            setShowPredictions(false)
            return
        }

        setIsLoadingPredictions(true)
        debounceTimer.current = setTimeout(async () => {
            try {
                const results = await searchService.predictive(value)
                setPredictions(results.slice(0, 10))
                setShowPredictions(true)
            } catch (error) {
                console.error('Error fetching predictions:', error)
                setPredictions([])
            } finally {
                setIsLoadingPredictions(false)
            }
        }, 300) // 300ms debounce
    }, [])

    // Handle selecting a prediction
    const handleSelectPrediction = (prediction: any) => {
        setQuery(prediction.name)
        setPredictions([])
        setShowPredictions(false)
    }

    // Close predictions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowPredictions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`min-h-screen p-4 md:p-6 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'}`}>
            {/* Header */}
            <div className="mb-8">
                <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>🔍 Búsqueda Global</h1>
                <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Encuentra ventas, entregas, items, clientes y preventas</p>
            </div>

            {/* Predictive Search Input */}
            <div className={`mb-6 rounded-lg sticky top-6 z-40 ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`} ref={searchRef}>
                <div className="p-2 md:p-6">
                    <div className="relative">
                        <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            placeholder="Busca..."
                            value={query}
                            onChange={(e) => handlePredictiveInputChange(e.target.value)}
                            onFocus={() => query.length >= 3 && predictions.length > 0 && setShowPredictions(true)}
                            autoFocus
                            className={`w-full pl-9 md:pl-12 pr-3 md:pr-4 py-1.5 md:py-3 rounded-lg border text-sm md:text-base focus:border-emerald-500 focus:outline-none ${isDark
                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                                }`}
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('')
                                    setPredictions([])
                                    setShowPredictions(false)
                                }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        {/* Predictions Dropdown */}
                        {showPredictions && predictions.length > 0 && (
                            <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} shadow-lg max-h-96 overflow-y-auto z-50`}>
                                {predictions.map((prediction, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectPrediction(prediction)}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b last:border-b-0 transition-colors ${isDark ? 'hover:bg-slate-600 border-slate-600' : 'hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        {prediction.photoUrl && (
                                            <img src={prediction.photoUrl} alt={prediction.name} className="w-10 h-10 rounded object-cover" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{prediction.name}</p>
                                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{prediction.extra}</p>
                                        </div>
                                        {prediction.price && (
                                            <p className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>${prediction.price}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoadingPredictions && query.length >= 3 && (
                            <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} shadow-lg p-4 text-center`}>
                                <div className="inline-flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Buscando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filtros */}
                    <div className={`mt-3 md:mt-4 pt-3 md:pt-4 ${isDark ? 'border-t border-slate-700' : 'border-t border-slate-200'}`}>
                        <p className={`text-xs font-semibold mb-2 md:mb-3 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Filtrar:</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                            {/* Seleccionados por default */}
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.inventory}
                                    onChange={(e) => setFilters({ ...filters, inventory: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>📦 Items</span>
                            </label>
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.deliveries}
                                    onChange={(e) => setFilters({ ...filters, deliveries: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>🚚 Entregas</span>
                            </label>
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.catalog}
                                    onChange={(e) => setFilters({ ...filters, catalog: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>📚 Catálogo</span>
                            </label>

                            {/* Deseleccionados por default */}
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.sales}
                                    onChange={(e) => setFilters({ ...filters, sales: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>💳 Ventas</span>
                            </label>
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.customers}
                                    onChange={(e) => setFilters({ ...filters, customers: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>👤 Clientes</span>
                            </label>
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={filters.preventas}
                                    onChange={(e) => setFilters({ ...filters, preventas: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>⏳ Preventas</span>
                            </label>
                        </div>

                        {/* Filtro de stock para items */}
                        {filters.inventory && (
                            <div>
                                <p className={`text-xs font-semibold mb-2 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Stock de items:</p>
                                <div className="flex gap-2">
                                    <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="stock-filter"
                                            value="all"
                                            checked={filters.inventoryStock === 'all'}
                                            onChange={(e) => setFilters({ ...filters, inventoryStock: e.target.value as any })}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-slate-300">Todo</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="stock-filter"
                                            value="inStock"
                                            checked={filters.inventoryStock === 'inStock'}
                                            onChange={(e) => setFilters({ ...filters, inventoryStock: e.target.value as any })}
                                            className="rounded"
                                        />
                                        <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>✅ Con stock</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="stock-filter"
                                            value="outOfStock"
                                            checked={filters.inventoryStock === 'outOfStock'}
                                            onChange={(e) => setFilters({ ...filters, inventoryStock: e.target.value as any })}
                                            className="rounded"
                                        />
                                        <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>❌ Sin stock</span>
                                    </label>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && query.length >= 2 && (
                <div className="text-center py-12">
                    <div className="inline-flex items-center gap-2">
                        <div className="animate-spin h-6 w-6 border-3 border-emerald-500 border-t-transparent rounded-full"></div>
                        <span className="text-slate-300">Buscando...</span>
                    </div>
                </div>
            )}

            {/* No Query State */}
            {query.length < 2 && (
                <div className="text-center py-16">
                    <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Escribe al menos 2 caracteres para buscar</p>
                </div>
            )}

            {/* No Results */}
            {query.length >= 2 && !isLoading && results.length === 0 && (
                <div className="text-center py-16">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <p className={isDark ? 'text-slate-400 text-lg' : 'text-slate-600 text-lg'}>No se encontraron resultados para "{query}"</p>
                </div>
            )}

            {/* Results */}
            {query.length >= 2 && !isLoading && results.length > 0 && (
                <div className="space-y-8">
                    {/* INVENTORY RESULTS */}
                    {groupedResults.inventory.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, inventory: !collapsedSections.inventory })}
                            >
                                <Package className="w-5 h-5 text-blue-500" />
                                Items ({groupedResults.inventory.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.inventory ? '-rotate-90' : ''}`} />
                            </div>
                            {!collapsedSections.inventory && (
                                <div className="grid gap-3">
                                    {groupedResults.inventory.slice(0, sectionPagination.inventory).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex items-center justify-between rounded-lg hover:border-blue-500 transition-all cursor-pointer ${isDark
                                                ? 'bg-slate-800/50 border border-slate-700'
                                                : 'bg-slate-100 border border-slate-300'
                                                }`}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            {/* Imagen del item */}
                                            {result.metadata?.photos && result.metadata.photos.length > 0 && (
                                                <img
                                                    src={result.metadata.photos[result.metadata.primaryPhotoIndex || 0]}
                                                    alt={result.title}
                                                    className="w-16 h-16 object-cover rounded mr-4 flex-shrink-0"
                                                    crossOrigin="anonymous"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{result.subtitle}</p>
                                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'} mt-1`}>{result.description}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {!result.inStock && (
                                                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                                                        ❌ Sin Stock
                                                    </span>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAddToCart(
                                                                result._id,
                                                                addToCartQuantity[result._id] || 1
                                                            )
                                                        }}
                                                        disabled={!result.inStock}
                                                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1 flex items-center gap-1"
                                                    >
                                                        <ShoppingCart className="w-4 h-4" /> POS
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAddToDeliveryCart(
                                                                result._id,
                                                                addToCartQuantity[result._id] || 1
                                                            )
                                                        }}
                                                        disabled={!result.inStock}
                                                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1 flex items-center gap-1"
                                                    >
                                                        <Truck className="w-4 h-4" /> Entrega
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAddToInventory(result._id)
                                                        }}
                                                        disabled={result.inStock}
                                                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-4 h-4" /> Stock
                                                    </Button>
                                                    {!result.inStock && (
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handlePermanentDelete(result._id, result.title)
                                                            }}
                                                            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!collapsedSections.inventory && sectionPagination.inventory < groupedResults.inventory.length && (
                                <button
                                    onClick={() => setSectionPagination({ ...sectionPagination, inventory: sectionPagination.inventory + 10 })}
                                    className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                        ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30'
                                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}
                                >
                                    <span>Mostrar más ({sectionPagination.inventory} de {groupedResults.inventory.length})</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* SALES RESULTS */}
                    {groupedResults.sale.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, sale: !collapsedSections.sale })}
                            >
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                Ventas ({groupedResults.sale.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.sale ? '-rotate-90' : ''}`} />
                            </div>
                            {!collapsedSections.sale && (
                                <div className="grid gap-3">
                                    {groupedResults.sale.slice(0, sectionPagination.sale).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex items-center justify-between rounded-lg hover:border-emerald-500 transition-all cursor-pointer ${isDark
                                                ? 'bg-slate-800/50 border border-slate-700'
                                                : 'bg-slate-100 border border-slate-300'
                                                }`}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{result.subtitle}</p>
                                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'} mt-1`}>{result.description}</p>
                                                {result.metadata?.saleType && (
                                                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${result.metadata.saleType === 'delivery'
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : 'bg-blue-500/20 text-blue-300'
                                                        }`}>
                                                        {result.metadata.saleType === 'delivery' ? '📦 Entrega' : '🛒 POS'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {result.metadata?.profit !== undefined && (
                                                    <p className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        💰 ${result.metadata.profit.toFixed(2)}
                                                    </p>
                                                )}
                                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'} mt-2`}>
                                                    {result.date && typeof result.date === 'string'
                                                        ? new Date(result.date).toLocaleDateString('es-ES')
                                                        : 'Sin fecha'}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500 ml-4" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!collapsedSections.sale && sectionPagination.sale < groupedResults.sale.length && (
                                <button
                                    onClick={() => setSectionPagination({ ...sectionPagination, sale: sectionPagination.sale + 10 })}
                                    className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                        ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        }`}
                                >
                                    <span>Mostrar más ({sectionPagination.sale} de {groupedResults.sale.length})</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* DELIVERY RESULTS */}
                    {groupedResults.delivery.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, delivery: !collapsedSections.delivery })}
                            >
                                <Truck className="w-5 h-5 text-orange-500" />
                                Entregas ({groupedResults.delivery.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.delivery ? '-rotate-90' : ''}`} />
                            </div>
                            {!collapsedSections.delivery && (
                                <div className="grid gap-3">
                                    {groupedResults.delivery.slice(0, sectionPagination.delivery).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex items-center justify-between rounded-lg hover:border-orange-500 transition-all cursor-pointer ${isDark
                                                ? 'bg-slate-800/50 border border-slate-700'
                                                : 'bg-slate-100 border border-slate-300'
                                                }`}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{result.subtitle}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${result.metadata?.status === 'completed'
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : result.metadata?.status === 'prepared'
                                                            ? 'bg-blue-500/20 text-blue-300'
                                                            : 'bg-yellow-500/20 text-yellow-300'
                                                        }`}>
                                                        {result.metadata?.status === 'completed' ? '✓ Entregada'
                                                            : result.metadata?.status === 'prepared' ? '📦 Preparada'
                                                                : '⏳ Pendiente'}
                                                    </span>
                                                    {result.metadata?.location && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MapPin className="w-3 h-3" /> {result.metadata.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!collapsedSections.delivery && sectionPagination.delivery < groupedResults.delivery.length && (
                                <button
                                    onClick={() => setSectionPagination({ ...sectionPagination, delivery: sectionPagination.delivery + 10 })}
                                    className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                        ? 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-600/30'
                                        : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                                        }`}
                                >
                                    <span>Mostrar más ({sectionPagination.delivery} de {groupedResults.delivery.length})</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* CUSTOMER RESULTS */}
                    {groupedResults.customer.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, customer: !collapsedSections.customer })}
                            >
                                <User className="w-5 h-5 text-purple-500" />
                                Clientes ({groupedResults.customer.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.customer ? '-rotate-90' : ''}`} />
                            </div>
                            {!collapsedSections.customer && (
                                <div className="grid gap-3">
                                    {groupedResults.customer.slice(0, sectionPagination.customer).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex items-center justify-between rounded-lg hover:border-purple-500 transition-all cursor-pointer ${isDark
                                                ? 'bg-slate-800/50 border border-slate-700'
                                                : 'bg-slate-100 border border-slate-300'
                                                }`}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <div className={`flex gap-3 mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {result.metadata?.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-4 h-4" /> {result.metadata.email}
                                                        </span>
                                                    )}
                                                    {result.metadata?.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-4 h-4" /> {result.metadata.phone}
                                                        </span>
                                                    )}
                                                </div>
                                                {result.metadata?.totalSpent > 0 && (
                                                    <p className="text-sm text-emerald-400 mt-2">
                                                        Total gastado: ${result.metadata.totalSpent.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!collapsedSections.customer && sectionPagination.customer < groupedResults.customer.length && (
                                <button
                                    onClick={() => setSectionPagination({ ...sectionPagination, customer: sectionPagination.customer + 10 })}
                                    className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                        ? 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-600/30'
                                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                                        }`}
                                >
                                    <span>Mostrar más ({sectionPagination.customer} de {groupedResults.customer.length})</span>
                                </button>
                            )}
                        </div>
                    )}
                    {/* PREVENTA RESULTS */}
                    {groupedResults.preventa.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, preventa: !collapsedSections.preventa })}
                            >
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                Preventas ({groupedResults.preventa.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.preventa ? '-rotate-90' : ''}`} />
                            </div>
                            {!collapsedSections.preventa && (
                                <div className="grid gap-3">
                                    {groupedResults.preventa.slice(0, sectionPagination.preventa).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex items-center justify-between rounded-lg hover:border-yellow-500 transition-all cursor-pointer ${isDark
                                                ? 'bg-slate-800/50 border border-slate-700'
                                                : 'bg-slate-100 border border-slate-300'
                                                }`}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{result.subtitle}</p>
                                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'} mt-1`}>{result.description}</p>
                                                <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                                                    ⏳ Pendiente de compra
                                                </span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!collapsedSections.preventa && sectionPagination.preventa < groupedResults.preventa.length && (
                        <button
                            onClick={() => setSectionPagination({ ...sectionPagination, preventa: sectionPagination.preventa + 10 })}
                            className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                ? 'bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-600/30'
                                : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
                                }`}
                        >
                            <span>Mostrar más ({sectionPagination.preventa} de {groupedResults.preventa.length})</span>
                        </button>
                    )}

                    {/* CATALOG RESULTS */}
                    {groupedResults.catalog.length > 0 && (
                        <div>
                            <div
                                className={`text-xl font-semibold mb-4 flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${isDark ? 'text-white hover:bg-slate-700/30' : 'text-slate-900 hover:bg-slate-100'}`}
                                onClick={() => setCollapsedSections({ ...collapsedSections, catalog: !collapsedSections.catalog })}
                            >
                                <span className="text-2xl">📚</span>
                                Catálogo ({groupedResults.catalog.length})
                                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${collapsedSections.catalog ? '-rotate-90' : ''}`} />
                            </div>

                            {/* Catalog Year Filter Buttons */}
                            {!collapsedSections.catalog && getCatalogYears.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2 items-center">
                                    <button
                                        onClick={() => setCatalogYearFilter(null)}
                                        className={`px-3 py-1 text-sm rounded-full transition-colors ${catalogYearFilter === null
                                                ? `${isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'}`
                                                : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    {getCatalogYears.map((year) => (
                                        <button
                                            key={year}
                                            onClick={() => setCatalogYearFilter(year)}
                                            className={`px-3 py-1 text-sm rounded-full transition-colors font-medium ${catalogYearFilter === year
                                                    ? `${isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'}`
                                                    : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
                                                }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!collapsedSections.catalog && (
                                <div className="grid gap-3">
                                    {groupedResults.catalog.slice(0, sectionPagination.catalog).map((result) => (
                                        <div
                                            key={result._id}
                                            className={`p-4 flex flex-col md:flex-row md:items-center md:justify-between rounded-lg hover:border-emerald-500 transition-all gap-3 ${isDark
                                                ? 'bg-emerald-900/30 border border-emerald-600/50'
                                                : 'bg-emerald-50 border border-emerald-200'
                                                }`}
                                        >
                                            {/* Imagen del catálogo */}
                                            <div className="w-16 h-16 rounded flex-shrink-0 bg-emerald-800 flex items-center justify-center overflow-hidden relative">
                                                {result.metadata?.photoUrl ? (
                                                    <img
                                                        src={`https://images.weserv.nl/?url=${encodeURIComponent(result.metadata.photoUrl)}&w=300&h=300&fit=contain`}
                                                        alt={result.title}
                                                        className="w-full h-full object-contain bg-slate-700"
                                                        crossOrigin="anonymous"
                                                        onLoad={() => console.log('✅ Imagen catálogo cargada:', result.title)}
                                                        onError={(e) => {
                                                            console.warn('❌ Error cargando imagen del proxy:', result.title, result.metadata?.photoUrl);
                                                            // Fallback a emoji
                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                            const parent = (e.currentTarget as HTMLImageElement).parentElement;
                                                            if (parent && !parent.querySelector('[data-fallback]')) {
                                                                const fallback = document.createElement('div');
                                                                fallback.setAttribute('data-fallback', 'true');
                                                                fallback.className = 'absolute inset-0 flex items-center justify-center text-2xl';
                                                                fallback.textContent = '🚗';
                                                                parent.appendChild(fallback);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="text-2xl">🚗</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.title}</h3>
                                                <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{result.subtitle}</p>
                                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-1`}>{result.description}</p>
                                                <div className="flex gap-2 mt-2">
                                                    {result.metadata?.year && (
                                                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${isDark
                                                            ? 'bg-blue-500/20 text-blue-300'
                                                            : 'bg-blue-200 text-blue-800'
                                                            }`}>
                                                            📅 {result.metadata.year}
                                                        </span>
                                                    )}
                                                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${isDark
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : 'bg-emerald-200 text-emerald-800'
                                                        }`}>
                                                        ✨ No en stock
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedCatalogItem(result)
                                                    setCatalogItemMode('add')
                                                }}
                                                className="md:ml-4 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center md:justify-start"
                                            >
                                                Ver mas
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!collapsedSections.catalog && sectionPagination.catalog < groupedResults.catalog.length && (
                                <button
                                    onClick={() => setSectionPagination({ ...sectionPagination, catalog: sectionPagination.catalog + 20 })}
                                    className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDark
                                        ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        }`}
                                >
                                    <span>Mostrar más ({sectionPagination.catalog} de {groupedResults.catalog.length})</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modales de Detalle - Reutilizables */}
            {modal.type === 'sale' && modal.id && (
                <SaleDetailsModal
                    sale={modal.sale}
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                />
            )}

            {modal.type === 'delivery' && modal.id && (
                <DeliveryDetailsModal
                    delivery={modal.delivery}
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    onEdit={handleDeliveryUpdated}
                    inventoryItems={[]}
                    preSaleItems={[]}
                />
            )}

            {/* Modal Genérico para Inventory y Customer */}
            {modal.isOpen && (modal.type === 'inventory' || modal.type === 'customer') && modal.id && (
                <GenericDetailModal
                    type={modal.type as 'inventory' | 'customer'}
                    id={modal.id}
                    onClose={closeModal}
                />
            )}

            {/* Catalog Item Modal */}
            <CatalogItemModal
                isOpen={!!selectedCatalogItem}
                item={selectedCatalogItem}
                onClose={() => {
                    setSelectedCatalogItem(null)
                    setCatalogItemMode('detail')
                }}
                initialMode={catalogItemMode}
            />
        </div>
    )
}

// Componente para modales genéricos (Inventory, Customer, Preventa)
function GenericDetailModal({
    type,
    id,
    onClose
}: {
    type: 'inventory' | 'customer'
    id: string
    onClose: () => void
}) {
    const [isEditingCustomer, setIsEditingCustomer] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [isEditingInventory, setIsEditingInventory] = useState(false)
    const [editingInventory, setEditingInventory] = useState<any>(null)

    const { data: inventoryData } = useQuery(
        ['inventory-detail', id],
        async () => {
            if (type !== 'inventory') return null
            const response = await api.get(`/inventory/${id}`)
            return response.data.data
        },
        { enabled: type === 'inventory' }
    )

    const { data: customerData, refetch: refetchCustomer } = useQuery(
        ['customer-detail', id],
        async () => {
            if (type !== 'customer') return null
            const response = await api.get(`/customers/${id}`)
            return response.data.data
        },
        { enabled: type === 'customer' }
    )

    const handleSaveCustomer = async (updated: any) => {
        try {
            if (!customerData?._id) {
                throw new Error('Customer ID not found')
            }
            await customersService.update(customerData._id, updated)
            setIsEditingCustomer(false)
            refetchCustomer()
            toast.success('Cliente actualizado correctamente')
        } catch (error) {
            toast.error('Error al actualizar cliente')
            console.error(error)
        }
    }

    const handleSaveInventory = async (updated: any) => {
        try {
            if (!inventoryData?._id) {
                throw new Error('Inventory ID not found')
            }
            await api.put(`/inventory/${inventoryData._id}`, updated)
            setIsEditingInventory(false)
            // TODO: Refetch inventory data to update view
            toast.success('Item actualizado correctamente')
        } catch (error) {
            toast.error('Error al actualizar item')
            console.error(error)
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
            onClick={onClose}
        >
            <div
                className="w-full md:w-2/3 lg:w-1/2 max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">
                            {type === 'inventory' && '📦 Detalle del Item'}
                            {type === 'customer' && '👤 Detalle del Cliente'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* INVENTORY DETAIL */}
                    {type === 'inventory' && inventoryData && (
                        <>
                            {!isEditingInventory ? (
                                <div className="space-y-4 text-slate-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-white text-lg">{inventoryData.carName || inventoryData.carId}</h3>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                setEditingInventory({
                                                    quantity: inventoryData.quantity,
                                                    actualPrice: inventoryData.actualPrice,
                                                    purchasePrice: inventoryData.purchasePrice,
                                                    location: inventoryData.location,
                                                    notes: inventoryData.notes
                                                })
                                                setIsEditingInventory(true)
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Edit size={16} />
                                            Editar
                                        </Button>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-slate-400">Marca:</span> <span className="text-white">{inventoryData.brand}</span></p>
                                            <p><span className="text-slate-400">Tipo:</span> <span className="text-white">{inventoryData.pieceType}</span></p>
                                            <p><span className="text-slate-400">Stock:</span> <span className={inventoryData.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}>{inventoryData.quantity}</span></p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Precio Sugerido</p>
                                            <p className="font-semibold text-emerald-400">${inventoryData.suggestedPrice}</p>
                                        </div>
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Precio Actual</p>
                                            <p className="font-semibold text-blue-400">${inventoryData.actualPrice || inventoryData.suggestedPrice}</p>
                                        </div>
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Costo</p>
                                            <p className="font-semibold text-slate-300">${inventoryData.purchasePrice || 'N/A'}</p>
                                        </div>
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Ganancia Est.</p>
                                            <p className="font-semibold text-yellow-400">${((inventoryData.actualPrice || inventoryData.suggestedPrice) - (inventoryData.purchasePrice || 0)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    {inventoryData.photos && inventoryData.photos.length > 0 && (
                                        <div className="bg-slate-700/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-2">Fotos ({inventoryData.photos.length})</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {inventoryData.photos.slice(0, 3).map((photo: any, idx: number) => (
                                                    <img key={idx} src={photo} alt={`Foto ${idx}`} className="w-full h-20 object-cover rounded-lg" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-white text-lg">Editar Item</h3>
                                        <button
                                            onClick={() => {
                                                setIsEditingInventory(false)
                                                setEditingInventory(null)
                                            }}
                                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Stock</label>
                                            <input
                                                type="number"
                                                value={editingInventory?.quantity || 0}
                                                onChange={(e) => setEditingInventory({ ...editingInventory, quantity: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Precio Actual</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingInventory?.actualPrice || 0}
                                                onChange={(e) => setEditingInventory({ ...editingInventory, actualPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Costo</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingInventory?.purchasePrice || 0}
                                                onChange={(e) => setEditingInventory({ ...editingInventory, purchasePrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Ubicación (Caja)</label>
                                            <input
                                                type="text"
                                                value={editingInventory?.location || ''}
                                                onChange={(e) => setEditingInventory({ ...editingInventory, location: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ej: Caja 1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Notas</label>
                                            <textarea
                                                value={editingInventory?.notes || ''}
                                                onChange={(e) => setEditingInventory({ ...editingInventory, notes: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                                placeholder="Notas sobre el item"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            className="flex-1"
                                            onClick={() => handleSaveInventory(editingInventory)}
                                        >
                                            <Save size={16} />
                                            Guardar
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setIsEditingInventory(false)
                                                setEditingInventory(null)
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* CUSTOMER DETAIL */}
                    {type === 'customer' && customerData && (
                        <>
                            {!isEditingCustomer ? (
                                <div className="space-y-4 text-slate-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-white text-lg">{customerData.name}</h3>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                setEditingCustomer(customerData)
                                                setIsEditingCustomer(true)
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Edit size={16} />
                                            Editar
                                        </Button>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="space-y-2 text-sm">
                                            {customerData.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    <p><span className="text-slate-400">Email:</span> <span className="text-white">{customerData.email}</span></p>
                                                </div>
                                            )}
                                            {customerData.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                    <p><span className="text-slate-400">Teléfono:</span> <span className="text-white">{customerData.phone}</span></p>
                                                </div>
                                            )}
                                            {customerData.address && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <p><span className="text-slate-400">Dirección:</span> <span className="text-white">{customerData.address}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Total Gastado</p>
                                            <p className="font-semibold text-emerald-400">${(customerData.totalSpent || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Total Órdenes</p>
                                            <p className="font-semibold text-blue-400">{customerData.totalOrders || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <CustomerEditForm
                                    customer={editingCustomer}
                                    onCancel={() => {
                                        setIsEditingCustomer(false)
                                        setEditingCustomer(null)
                                    }}
                                    onSave={handleSaveCustomer}
                                    onChange={setEditingCustomer}
                                />
                            )}
                        </>
                    )}

                    {/* Loading state */}
                    {((type === 'inventory' && !inventoryData) || (type === 'customer' && !customerData)) && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center gap-2">
                                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                <span className="text-slate-300">Cargando...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
