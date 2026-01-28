import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api } from '@/services/api'
import {
    Search as SearchIcon, ShoppingCart, Package, Truck, User, AlertCircle, ChevronRight,
    Plus, TrendingUp, MapPin, Phone, Mail, X
} from 'lucide-react'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

interface SearchResultItem {
    _id: string
    type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa'
    title: string
    subtitle?: string
    description?: string
    inStock?: boolean
    metadata?: any
    date?: string
}

interface ModalState {
    isOpen: boolean
    type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa' | null
    id: string | null
}

export default function Search() {
    const [searchParams] = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, id: null })
    const [addToCartQuantity, setAddToCartQuantity] = useState<{ [key: string]: number }>({})

    // Búsqueda global
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

    // Agrupar resultados por tipo
    const groupedResults = useMemo(() => {
        const groups: { [key: string]: SearchResultItem[] } = {
            inventory: [],
            sale: [],
            delivery: [],
            customer: [],
            preventa: []
        }
        results.forEach((result: SearchResultItem) => {
            if (groups[result.type]) {
                groups[result.type].push(result)
            }
        })
        return groups
    }, [results])

    const handleAddToCart = useCallback((itemId: string, quantity: number = 1) => {
        if (quantity <= 0) {
            toast.error('Cantidad debe ser mayor a 0')
            return
        }
        // Aquí integrarías con tu carrito
        toast.success(`Agregado al carrito: ${quantity} unidades`)
        setAddToCartQuantity(prev => ({ ...prev, [itemId]: 1 }))
    }, [])

    const handleAddToInventory = useCallback((itemId: string) => {
        setModal({ isOpen: true, type: 'inventory', id: itemId })
    }, [])

    const handleResultClick = (result: SearchResultItem) => {
        setModal({ isOpen: true, type: result.type, id: result._id })
    }

    // Cierra el modal y limpia
    const closeModal = () => {
        setModal({ isOpen: false, type: null, id: null })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">🔍 Búsqueda Global</h1>
                <p className="text-slate-400">Encuentra ventas, entregas, items, clientes y preventas</p>
            </div>

            {/* Search Input */}
            <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-lg sticky top-6 z-40">
                <div className="p-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Busca por: marca (Lambo), cliente, item, número..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-lg"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
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
                    <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Escribe al menos 2 caracteres para buscar</p>
                </div>
            )}

            {/* No Results */}
            {query.length >= 2 && !isLoading && results.length === 0 && (
                <div className="text-center py-16">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">No se encontraron resultados para "{query}"</p>
                </div>
            )}

            {/* Results */}
            {query.length >= 2 && !isLoading && results.length > 0 && (
                <div className="space-y-8">
                    {/* INVENTORY RESULTS */}
                    {groupedResults.inventory.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-500" /> Items ({groupedResults.inventory.length})
                            </h2>
                            <div className="grid gap-3">
                                {groupedResults.inventory.map((result) => (
                                    <div
                                        key={result._id}
                                        className="p-4 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500 transition-all cursor-pointer"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{result.title}</h3>
                                            <p className="text-sm text-slate-400">{result.subtitle}</p>
                                            <p className="text-sm text-slate-500 mt-1">{result.description}</p>
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
                                                    <ShoppingCart className="w-4 h-4" /> Carrito
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
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SALES RESULTS */}
                    {groupedResults.sale.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Ventas ({groupedResults.sale.length})
                            </h2>
                            <div className="grid gap-3">
                                {groupedResults.sale.map((result) => (
                                    <div
                                        key={result._id}
                                        className="p-4 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg hover:border-emerald-500 transition-all cursor-pointer"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{result.title}</h3>
                                            <p className="text-sm text-slate-400">{result.subtitle}</p>
                                            <p className="text-sm text-slate-500 mt-1">{result.description}</p>
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
                                                <p className="text-lg font-semibold text-blue-400">
                                                    💰 ${result.metadata.profit.toFixed(2)}
                                                </p>
                                            )}
                                            <p className="text-sm text-slate-500 mt-2">
                                                {result.date && typeof result.date === 'string'
                                                    ? new Date(result.date).toLocaleDateString('es-ES')
                                                    : 'Sin fecha'}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-500 ml-4" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DELIVERY RESULTS */}
                    {groupedResults.delivery.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-orange-500" /> Entregas ({groupedResults.delivery.length})
                            </h2>
                            <div className="grid gap-3">
                                {groupedResults.delivery.map((result) => (
                                    <div
                                        key={result._id}
                                        className="p-4 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg hover:border-orange-500 transition-all cursor-pointer"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{result.title}</h3>
                                            <p className="text-sm text-slate-400">{result.subtitle}</p>
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
                        </div>
                    )}

                    {/* CUSTOMER RESULTS */}
                    {groupedResults.customer.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-purple-500" /> Clientes ({groupedResults.customer.length})
                            </h2>
                            <div className="grid gap-3">
                                {groupedResults.customer.map((result) => (
                                    <div
                                        key={result._id}
                                        className="p-4 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500 transition-all cursor-pointer"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{result.title}</h3>
                                            <div className="flex gap-3 mt-2 text-sm text-slate-400">
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
                        </div>
                    )}

                    {/* PREVENTA RESULTS */}
                    {groupedResults.preventa.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-500" /> Preventas ({groupedResults.preventa.length})
                            </h2>
                            <div className="grid gap-3">
                                {groupedResults.preventa.map((result) => (
                                    <div
                                        key={result._id}
                                        className="p-4 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg hover:border-yellow-500 transition-all cursor-pointer"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{result.title}</h3>
                                            <p className="text-sm text-slate-400">{result.subtitle}</p>
                                            <p className="text-sm text-slate-500 mt-1">{result.description}</p>
                                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                                                ⏳ Pendiente de compra
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Detalle */}
            {modal.isOpen && modal.type && (
                <DetailModal
                    type={modal.type}
                    id={modal.id}
                    onClose={closeModal}
                />
            )}
        </div>
    )
}

// Componente para el modal de detalles
function DetailModal({
    type,
    id,
    onClose
}: {
    type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa'
    id: string | null
    onClose: () => void
}) {
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">
                            {type === 'sale' && '💳 Detalle de Venta'}
                            {type === 'delivery' && '📦 Detalle de Entrega'}
                            {type === 'inventory' && '📦 Detalle del Item'}
                            {type === 'customer' && '👤 Detalle del Cliente'}
                            {type === 'preventa' && '⏳ Detalle de Preventa'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Contenido del modal */}
                    <div className="text-slate-300">
                        <p>ID: {id}</p>
                        <p className="mt-4">El modal completo se cargará aquí con los detalles completos...</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
