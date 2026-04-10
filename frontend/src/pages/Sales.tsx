import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useStore } from '@/contexts/StoreContext'
import { useCanEditStore } from '@/hooks/useCanEditStore'
import { useSales, useDeleteSale } from '@/hooks/useSales'
import Button from '@/components/common/Button'
import SaleCard from '@/components/SaleCard'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, ShoppingCart, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Sales() {
    const [searchParams] = useSearchParams()
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const { selectedStore } = useStore()
    const { canEdit, canDelete, canCreate } = useCanEditStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const titleSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-[linear-gradient(145deg,rgba(168,85,247,0.22),rgba(15,23,42,0.72))] p-4 lg:p-5 shadow-[12px_12px_24px_rgba(2,6,23,0.56),-10px_-10px_20px_rgba(168,85,247,0.12)]'
        : 'rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(245,243,255,0.98),rgba(196,181,253,0.22))] p-4 lg:p-5 shadow-[12px_12px_24px_rgba(148,163,184,0.3),-12px_-12px_24px_rgba(255,255,255,0.95)]'

    const neumorphSurfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-[14px_14px_26px_rgba(2,6,23,0.56),-10px_-10px_18px_rgba(148,163,184,0.1)]'
        : 'rounded-2xl backdrop-blur-xl bg-white/94 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'

    const neumorphInsetClass = isDark
        ? 'bg-slate-800/95 border border-slate-600/45 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
        : 'bg-slate-100 border border-slate-300/60 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'

    const { data: sales, isLoading, error } = useSales(selectedStore || undefined)
    const deleteSaleMutation = useDeleteSale()

    // Auto-open modal if id parameter is provided in URL
    useEffect(() => {
        const saleId = searchParams.get('id')
        if (saleId && sales && sales.length > 0) {
            const sale = sales.find(s => s._id === saleId)
            if (sale) {
                setSelectedSale(sale)
                setShowDetailsModal(true)
            }
        }
    }, [searchParams, sales])

    if (isLoading) {
        return <Loading text="Cargando ventas..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar las ventas</p>
            </div>
        )
    }

    const filteredSales = sales?.filter(sale => {
        const customerName = sale.customer?.name || ''
        const customerEmail = sale.customer?.email || ''
        const customerPhone = sale.customer?.phone || ''
        const matchesSearch = !searchTerm ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerPhone.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    }) || []

    const handleViewDetails = (sale: any) => {
        setSelectedSale(sale)
        setShowDetailsModal(true)
    }

    const handleDeleteSale = async (id: string) => {
        if (!id) return

        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            try {
                await deleteSaleMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting sale:', error)
            }
        }
    }

    const handleOpenImageModal = (images: string[]) => {
        setAllImagesForModal(images)
        setCurrentImageIndex(0)
        setShowImageModal(true)
    }

    const handleCloseImageModal = () => {
        setShowImageModal(false)
        setAllImagesForModal([])
        setCurrentImageIndex(0)
    }

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? allImagesForModal.length - 1 : prev - 1))
    }

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev === allImagesForModal.length - 1 ? 0 : prev + 1))
    }

    return (
        <div className="space-y-6">
            <div className={titleSurfaceClass}>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ventas</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Todas las ventas se realizan a través del POS</p>
            </div>

            {/* Filters */}
            <div className={`p-4 ${neumorphSurfaceClass}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
                        <input
                            type="text"
                            placeholder="Buscar por comprador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg ${neumorphInsetClass} ${isDark ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sales List */}
            {filteredSales.length === 0 ? (
                <div className={`p-4 ${neumorphSurfaceClass}`}>
                    <div className="text-center py-12">
                        <ShoppingCart size={48} className="mx-auto text-slate-400 mb-4" />
                        <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No hay ventas registradas</h3>
                        <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {searchTerm
                                ? 'No se encontraron ventas con los filtros aplicados'
                                : 'Comienza registrando tu primera venta'
                            }
                        </p>
                        {!searchTerm && canCreate && (
                            <Button
                                icon={<Plus size={20} />}
                                onClick={() => setShowCreateModal(true)}
                            >
                                Registrar Primera Venta
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filteredSales.map((sale) => (
                        <SaleCard
                            key={sale._id}
                            sale={sale}
                            onViewDetails={handleViewDetails}
                            onDelete={handleDeleteSale}
                            isLoadingDelete={deleteSaleMutation.isLoading}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
            )}

            {/* Create Sale Modal - Temporarily disabled for new structure */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-[#eaf0f8] border-white/70'} rounded-2xl border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[12px_12px_24px_rgba(15,23,42,0.35),-10px_-10px_20px_rgba(255,255,255,0.2)]`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Nueva Venta</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className={`${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-center py-8">
                            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>La funcionalidad de crear ventas manuales está temporalmente deshabilitada.</p>
                            <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Las ventas se crean automáticamente cuando se completan las entregas.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sale Details Modal */}
            <SaleDetailsModal
                sale={showDetailsModal ? selectedSale : null}
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false)
                    setSelectedSale(null)
                }}
                onOpenImageModal={handleOpenImageModal}
            />

            {/* Fullscreen Image Modal */}
            {showImageModal && allImagesForModal.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]">
                    <button
                        onClick={handleCloseImageModal}
                        className="absolute top-4 right-4 text-white hover:text-slate-300"
                    >
                        <X size={24} />
                    </button>

                    <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-slate-300"
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <div className="flex flex-col items-center justify-center max-w-4xl max-h-[90vh]">
                        <img
                            src={allImagesForModal[currentImageIndex]}
                            alt={`Imagen ${currentImageIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain"
                        />
                        <div className="mt-4 text-white text-center">
                            <p className="text-sm">
                                Imagen {currentImageIndex + 1} de {allImagesForModal.length}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-slate-300"
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>
            )}
        </div>
    )
}
