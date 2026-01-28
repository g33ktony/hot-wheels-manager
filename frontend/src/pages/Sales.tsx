import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSales, useDeleteSale } from '@/hooks/useSales'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import SaleCard from '@/components/SaleCard'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import { Loading } from '@/components/common/Loading'
import { Plus, Search, ShoppingCart, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Sales() {
    const [searchParams] = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const { data: sales, isLoading, error } = useSales()
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-gray-600">Todas las ventas se realizan a través del POS</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar por comprador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Sales List */}
            {filteredSales.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ventas registradas</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm
                                ? 'No se encontraron ventas con los filtros aplicados'
                                : 'Comienza registrando tu primera venta'
                            }
                        </p>
                        {!searchTerm && (
                            <Button
                                icon={<Plus size={20} />}
                                onClick={() => setShowCreateModal(true)}
                            >
                                Registrar Primera Venta
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filteredSales.map((sale) => (
                        <SaleCard
                            key={sale._id}
                            sale={sale}
                            onViewDetails={handleViewDetails}
                            onDelete={handleDeleteSale}
                            isLoadingDelete={deleteSaleMutation.isLoading}
                        />
                    ))}
                </div>
            )}

            {/* Create Sale Modal - Temporarily disabled for new structure */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Nueva Venta</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-center py-8">
                            <p className="text-gray-600">La funcionalidad de crear ventas manuales está temporalmente deshabilitada.</p>
                            <p className="text-sm text-gray-500 mt-2">Las ventas se crean automáticamente cuando se completan las entregas.</p>
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
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>

                    <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
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
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>
            )}
        </div>
    )
}
