import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { LazyImage } from '@/components/LazyImage'
import type { InventoryItem } from '@shared/types'
import {
    Edit,
    MapPin,
    Maximize2,
    Package,
    ShoppingCart,
    Trash2,
    Truck,
} from 'lucide-react'

interface InventoryGridSectionProps {
    isPrefetchingNext: boolean
    isLoading: boolean
    hasInventoryData: boolean
    inventoryItemsCount: number
    filteredItems: InventoryItem[]
    searchTerm: string
    filterCondition: string
    filterBrand: string
    filterPieceType: string
    filterTreasureHunt: 'all' | 'th' | 'sth'
    filterChase: boolean
    canCreate: boolean
    isSelectionMode: boolean
    selectedItems: Set<string>
    isDark: boolean
    canEdit: boolean
    canDelete: boolean
    formatPieceType: (pieceType: string | undefined) => string
    getPlaceholderLogo: (series?: string) => string
    onShowAddModal: () => void
    onToggleItemSelection: (id: string) => void
    onImageClick: (photos: string[], index?: number) => void
    onNavigateToDetail: (id: string) => void
    onAddToDelivery: (item: InventoryItem) => void
    onAddToPos: (item: InventoryItem) => void
    onEditItem: (item: InventoryItem) => void
    onDeleteItem: (id: string) => void
}

export default function InventoryGridSection({
    isPrefetchingNext,
    isLoading,
    hasInventoryData,
    inventoryItemsCount,
    filteredItems,
    searchTerm,
    filterCondition,
    filterBrand,
    filterPieceType,
    filterTreasureHunt,
    filterChase,
    canCreate,
    isSelectionMode,
    selectedItems,
    isDark,
    canEdit,
    canDelete,
    formatPieceType,
    getPlaceholderLogo,
    onShowAddModal,
    onToggleItemSelection,
    onImageClick,
    onNavigateToDetail,
    onAddToDelivery,
    onAddToPos,
    onEditItem,
    onDeleteItem,
}: InventoryGridSectionProps) {
    return (
        <div className="relative">
            {isPrefetchingNext && !isLoading && (
                <div className="absolute top-4 right-4 z-20 bg-blue-50 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border border-blue-200">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    <p className="text-xs text-blue-600 font-medium">Preparando siguiente página...</p>
                </div>
            )}

            {isLoading && hasInventoryData && (
                <div className="absolute top-4 right-4 z-20 bg-slate-800 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border border-slate-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                    <p className="text-xs text-slate-400 font-medium">Cargando...</p>
                </div>
            )}

            {isLoading && inventoryItemsCount === 0 ? (
                <Loading text="Cargando inventario..." />
            ) : filteredItems.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Package size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No hay piezas en el inventario</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || filterCondition || filterBrand || filterPieceType || filterTreasureHunt !== 'all' || filterChase
                                ? 'No se encontraron piezas con los filtros aplicados'
                                : 'Comienza agregando tu primera pieza al inventario'}
                        </p>
                        {!searchTerm && !filterCondition && !filterBrand && !filterPieceType && filterTreasureHunt === 'all' && !filterChase && canCreate && (
                            <Button icon={<Package size={20} />} onClick={onShowAddModal}>
                                Agregar Primera Pieza
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full">
                    {filteredItems.map((item: InventoryItem) => {
                        const isAvailable = item.quantity > (item.reservedQuantity || 0)

                        return (
                            <Card
                                key={item._id}
                                hover={!isSelectionMode && isAvailable}
                                className={`relative overflow-hidden p-0 border-0 ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''} ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div
                                    className={`h-full ${isSelectionMode && isAvailable ? 'cursor-pointer' : isSelectionMode ? 'cursor-not-allowed' : ''}`}
                                    onClick={() => isSelectionMode && isAvailable && item._id && onToggleItemSelection(item._id)}
                                >
                                    {isSelectionMode && (
                                        <div className="absolute top-3 left-3 z-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item._id!)}
                                                onChange={() => item._id && isAvailable && onToggleItemSelection(item._id)}
                                                disabled={!isAvailable}
                                                className={`w-6 h-6 rounded border-slate-600 text-primary-600 focus:ring-primary-500 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}

                                    {!isAvailable && isSelectionMode && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 rounded-lg z-5">
                                            <div className="text-white text-center">
                                                <div className="text-2xl mb-1">🔒</div>
                                                <div className="text-xs font-semibold">No disponible</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-0 h-full flex flex-col">
                                        <div
                                            className="bg-slate-700 h-60 sm:h-72 relative group cursor-pointer touch-manipulation overflow-hidden"
                                            onClick={() => !isSelectionMode && item.photos && item.photos.length > 0 && onImageClick(item.photos, item.primaryPhotoIndex || 0)}
                                        >
                                            {item.photos && item.photos.length > 0 ? (
                                                <>
                                                    <LazyImage
                                                        src={item.photos[item.primaryPhotoIndex || 0].includes('weserv') ? item.photos[item.primaryPhotoIndex || 0] : `https://images.weserv.nl/?url=${encodeURIComponent(item.photos[item.primaryPhotoIndex || 0])}&w=1200&h=1600&fit=cover`}
                                                        alt="Auto a Escala"
                                                        className={`w-full h-full object-cover transition-all ${isSelectionMode && selectedItems.has(item._id!) ? 'opacity-75' : 'group-hover:opacity-90'}`}
                                                        onError={(e) => {
                                                            ; (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series)
                                                        }}
                                                        onClick={() => !isSelectionMode && item.photos && item.photos.length > 0 && onImageClick(item.photos, item.primaryPhotoIndex || 0)}
                                                    />
                                                    {!isSelectionMode && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20">
                                                            <Maximize2 size={32} className="text-white drop-shadow-lg" />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <Package size={48} className="text-slate-400" />
                                            )}

                                            {item.brand && (
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900 bg-opacity-80 text-white text-xs font-semibold rounded shadow-lg backdrop-blur-sm">
                                                    {item.brand}
                                                </div>
                                            )}

                                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                                {item.pieceType && (
                                                    <span className={`px-2.5 py-1.5 text-xs font-bold rounded-md shadow-md backdrop-blur-md ${item.pieceType === 'basic'
                                                        ? isDark ? 'bg-blue-500/30 text-white' : 'bg-blue-400/30 text-white'
                                                        : item.pieceType === 'premium'
                                                            ? isDark ? 'bg-purple-500/30 text-white' : 'bg-purple-400/30 text-white'
                                                            : item.pieceType === 'rlc'
                                                                ? isDark ? 'bg-orange-500/30 text-white' : 'bg-orange-400/30 text-white'
                                                                : item.pieceType === 'silver_series'
                                                                    ? isDark ? 'bg-slate-400/30 text-white' : 'bg-slate-300/30 text-white'
                                                                    : item.pieceType === 'elite_64'
                                                                        ? isDark ? 'bg-red-500/30 text-white' : 'bg-red-400/30 text-white'
                                                                        : isDark ? 'bg-slate-500/30 text-white' : 'bg-slate-400/30 text-white'}`}>
                                                        {formatPieceType(item.pieceType).toUpperCase()}
                                                    </span>
                                                )}

                                                {item.isSuperTreasureHunt && (
                                                    <span className={`px-2.5 py-1.5 text-xs font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-gradient-to-r from-yellow-500/40 to-yellow-700/40 text-white' : 'bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 text-white'}`}>
                                                        $TH
                                                    </span>
                                                )}
                                                {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                    <span className={`px-2.5 py-1.5 text-xs font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-green-500/40 text-white' : 'bg-green-400/40 text-white'}`}>
                                                        TH
                                                    </span>
                                                )}

                                                {item.isChase && (
                                                    <span className={`px-2.5 py-1.5 text-xs font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-gradient-to-r from-red-500/40 to-pink-700/40 text-white' : 'bg-gradient-to-r from-red-400/40 to-pink-500/40 text-white'}`}>
                                                        CHASE
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1 px-3 sm:px-4 pt-3 sm:pt-4">
                                            <h3
                                                className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'} ${!isSelectionMode && item._id ? 'cursor-pointer hover:text-primary-400 transition-colors' : ''}`}
                                                onClick={() => {
                                                    if (!isSelectionMode && item._id) {
                                                        onNavigateToDetail(item._id)
                                                    }
                                                }}
                                            >
                                                {item.hotWheelsCar?.model || item.carId || 'Nombre no disponible'}
                                            </h3>
                                            <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {item.hotWheelsCar?.series} {item.hotWheelsCar?.year ? `(${item.hotWheelsCar.year})` : ''}
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {item.hotWheelsCar?.toy_num || item.carId}
                                            </p>

                                            {item.seriesId && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                                    🎁 {item.seriesName} ({item.seriesPosition}/{item.seriesSize})
                                                </div>
                                            )}

                                            {item.isBox && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                                    📦 {item.boxName} - {item.registeredPieces || 0}/{item.boxSize} piezas
                                                    {item.boxStatus === 'sealed' && ' 🔒'}
                                                    {item.boxStatus === 'unpacking' && ' ⏳'}
                                                </div>
                                            )}

                                            {item.sourceBox && !item.isBox && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 text-xs font-medium rounded-full">
                                                    📦 De: {item.sourceBox}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-2 gap-2">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${item.condition === 'mint'
                                                        ? 'bg-slate-700 text-emerald-400'
                                                        : item.condition === 'good'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : item.condition === 'fair'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'}`}
                                                >
                                                    {item.condition === 'mint' ? 'Mint' : item.condition === 'good' ? 'Bueno' : item.condition === 'fair' ? 'Regular' : 'Malo'}
                                                </span>
                                                <span className={`text-xs font-medium text-right flex-shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {item.quantity - (item.reservedQuantity || 0)}/{item.quantity}
                                                    {(item.reservedQuantity || 0) > 0 && (
                                                        <span className="text-orange-600 block text-xs">({item.reservedQuantity} res.)</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`mx-3 sm:mx-4 rounded-lg p-2 ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Costo</p>
                                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>${item.purchasePrice.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sugerido</p>
                                                    <p className="font-semibold text-emerald-400">${item.suggestedPrice.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Ganancia</p>
                                                    <p className="font-semibold text-primary-600">
                                                        ${(item.suggestedPrice - item.purchasePrice).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right mt-1">
                                                <span className="text-xs text-primary-600 font-medium">
                                                    +{(((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            {item.location && (
                                                <div className={`flex items-center gap-1 text-xs pt-1 border-t ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    <MapPin size={12} />
                                                    <span className="truncate">{item.location}</span>
                                                </div>
                                            )}
                                        </div>

                                        {!isSelectionMode && (
                                            <div className="space-y-2 p-3 sm:p-4 pb-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => onAddToDelivery(item)}
                                                        disabled={!isAvailable || !canCreate}
                                                        title="Agregar a entrega"
                                                    >
                                                        <Truck size={16} className="mr-1" />
                                                        Entrega
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => onAddToPos(item)}
                                                        disabled={!isAvailable || !canCreate}
                                                        title="Agregar a POS"
                                                    >
                                                        <ShoppingCart size={16} className="mr-1" />
                                                        POS
                                                    </Button>
                                                </div>

                                                {(canEdit || canDelete) && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {canEdit && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => onEditItem(item)}
                                                            >
                                                                <Edit size={16} className="mr-1" />
                                                                Editar
                                                            </Button>
                                                        )}
                                                        {canDelete && (
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => item._id && onDeleteItem(item._id)}
                                                            >
                                                                <Trash2 size={16} className="mr-1" />
                                                                Eliminar
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
