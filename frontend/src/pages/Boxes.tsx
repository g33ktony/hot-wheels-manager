import { useState } from 'react'
import { Package, ChevronRight, Filter, Search } from 'lucide-react'
import { useBoxes } from '../hooks/useBoxes'
import BoxUnpackModal from '../components/BoxUnpackModal'
import { InventoryItem } from '../../../shared/types'

export default function Boxes() {
    const { data: boxes, isLoading, error } = useBoxes()
    const [selectedBox, setSelectedBox] = useState<InventoryItem | null>(null)
    const [showUnpackModal, setShowUnpackModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterBrand, setFilterBrand] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<string>('all')

    const handleOpenUnpack = (box: InventoryItem) => {
        setSelectedBox(box)
        setShowUnpackModal(true)
    }

    const handleCloseUnpack = () => {
        setSelectedBox(null)
        setShowUnpackModal(false)
    }

    // Get unique brands from boxes
    const uniqueBrands = boxes
        ? Array.from(new Set(boxes.map((box: any) => box.brand).filter(Boolean)))
        : []

    // Filter boxes
    const filteredBoxes = boxes?.filter((box: any) => {
        const matchesSearch = box.boxName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            box.carId?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBrand = filterBrand === 'all' || box.brand === filterBrand
        const matchesStatus = filterStatus === 'all' || box.boxStatus === filterStatus
        return matchesSearch && matchesBrand && matchesStatus
    }) || []

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error al cargar las cajas</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-purple-600" size={32} />
                    Cajas Pendientes
                </h1>
                <p className="text-gray-600 mt-2">
                    Gestiona y desempaca tus cajas selladas
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Brand Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <select
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                        >
                            <option value="all">Todas las marcas</option>
                            {uniqueBrands.map((brand: any) => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="sealed">Selladas</option>
                            <option value="unpacking">En proceso</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Boxes Grid */}
            {filteredBoxes.length === 0 ? (
                <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                    <Package className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay cajas pendientes
                    </h3>
                    <p className="text-gray-600">
                        Las cajas aparecerán aquí cuando recibas compras con cajas selladas
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBoxes.map((box: any) => (
                        <BoxCard
                            key={box._id}
                            box={box}
                            onOpenUnpack={() => handleOpenUnpack(box)}
                        />
                    ))}
                </div>
            )}

            {/* Unpack Modal */}
            {selectedBox && (
                <BoxUnpackModal
                    isOpen={showUnpackModal}
                    onClose={handleCloseUnpack}
                    box={selectedBox}
                />
            )}
        </div>
    )
}

// Box Card Component
interface BoxCardProps {
    box: any
    onOpenUnpack: () => void
}

function BoxCard({ box, onOpenUnpack }: BoxCardProps) {
    const progress = ((box.registeredPieces || 0) / (box.boxSize || 1)) * 100
    const remaining = (box.boxSize || 0) - (box.registeredPieces || 0)

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Package className="text-purple-600" size={20} />
                            {box.boxName || 'Caja sin nombre'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{box.carId}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        box.boxStatus === 'sealed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {box.boxStatus === 'sealed' ? '🔒 Sellada' : '📦 En proceso'}
                    </div>
                </div>

                {/* Brand & Type */}
                <div className="flex gap-2 mb-4">
                    {box.brand && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                            {box.brand}
                        </span>
                    )}
                    {box.pieceType && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-md font-medium capitalize">
                            {box.pieceType}
                        </span>
                    )}
                </div>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            {box.registeredPieces || 0} / {box.boxSize || 0} piezas
                        </span>
                        <span className="text-sm text-gray-500">
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {remaining} pieza{remaining !== 1 ? 's' : ''} pendiente{remaining !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4 text-sm">
                    {box.boxPrice && (
                        <div className="flex justify-between text-gray-600">
                            <span>Precio total:</span>
                            <span className="font-medium">${box.boxPrice.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span>Costo por pieza:</span>
                        <span className="font-medium">
                            ${((box.boxPrice || 0) / (box.boxSize || 1)).toFixed(2)}
                        </span>
                    </div>
                    {box.location && (
                        <div className="flex justify-between text-gray-600">
                            <span>Ubicación:</span>
                            <span className="font-medium">{box.location}</span>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={onOpenUnpack}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {box.boxStatus === 'sealed' ? '🔓 Desempacar' : '▶️ Continuar Registro'}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}
