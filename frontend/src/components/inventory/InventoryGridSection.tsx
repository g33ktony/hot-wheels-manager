import { useState } from 'react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { LazyImage } from '@/components/LazyImage'
import type { InventoryItem } from '@shared/types'
import {
    Edit,
    MapPin,
    Maximize2,
    MoreVertical,
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
    hideCostAndProfitInInventory: boolean
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
    hideCostAndProfitInInventory,
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
    const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null)

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
                        const availableQty = Math.max(0, item.quantity - (item.reservedQuantity || 0))
                        const hasPhotos = !!(item.photos && item.photos.length > 0)
                        const primaryPhoto = hasPhotos
                            ? (item.photos![item.primaryPhotoIndex || 0].includes('weserv')
                                ? item.photos![item.primaryPhotoIndex || 0]
                                : `https://images.weserv.nl/?url=${encodeURIComponent(item.photos![item.primaryPhotoIndex || 0])}&w=1200&h=1600&fit=cover`)
                            : getPlaceholderLogo(item.series)
                        const imageObjectPosition = hasPhotos
                            ? (item.pieceType === 'basic'
                                ? '50% 18%'
                                : item.pieceType === 'premium'
                                    ? '50% 22%'
                                    : '50% 20%')
                            : '50% 18%'
                        const modelName = item.hotWheelsCar?.model || item.carId || 'Nombre no disponible'
                        const customerPrice = item.actualPrice || item.suggestedPrice || 0
                        const secondaryLine = `${item.hotWheelsCar?.series || ''} ${item.hotWheelsCar?.year ? `(${item.hotWheelsCar.year})` : ''}`.trim()
                        const shouldShowSecondary = !!secondaryLine && !secondaryLine.toLowerCase().includes(modelName.toLowerCase())
                        const referenceCode = item.hotWheelsCar?.toy_num || (item.carId && item.carId !== modelName ? item.carId : '')
                        const hasMetaBadge = !!(item.seriesId || item.isBox || (item.sourceBox && !item.isBox))
                        const operationalStatus = item.quantity <= 0
                            ? 'Agotado'
                            : availableQty <= 0
                                ? 'Reservado'
                                : 'Disponible'

                        return (
                            <Card
                                key={item._id}
                                hover={!isSelectionMode && isAvailable}
                                pressEffect={false}
                                className={`relative overflow-hidden !p-0 border-0 ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''} ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div
                                    className={`relative h-full min-h-[520px] ${isSelectionMode && isAvailable ? 'cursor-pointer' : isSelectionMode ? 'cursor-not-allowed' : ''}`}
                                    onClick={() => isSelectionMode && isAvailable && item._id && onToggleItemSelection(item._id)}
                                >
                                    {isSelectionMode && (
                                        <div className="absolute top-3 left-3 z-20">
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
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 rounded-lg z-30">
                                            <div className="text-white text-center">
                                                <div className="text-2xl mb-1">🔒</div>
                                                <div className="text-xs font-semibold">No disponible</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 group">
                                        <LazyImage
                                            src={primaryPhoto}
                                            alt="Auto a Escala"
                                            className={`w-full h-full object-cover transition-all duration-500 ${isSelectionMode && selectedItems.has(item._id!) ? 'opacity-70' : 'group-hover:scale-105'}`}
                                            style={{ objectPosition: imageObjectPosition }}
                                            onError={(e) => {
                                                ; (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series)
                                            }}
                                            onClick={() => !isSelectionMode && hasPhotos && onImageClick(item.photos!, item.primaryPhotoIndex || 0)}
                                        />

                                        {!isSelectionMode && hasPhotos && (
                                            <button
                                                type="button"
                                                className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/45 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => onImageClick(item.photos!, item.primaryPhotoIndex || 0)}
                                                title="Ver imagen"
                                            >
                                                <Maximize2 size={18} className="drop-shadow-lg" />
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        className="relative z-10 h-full flex flex-col p-3 sm:p-3.5"
                                        onClick={(e) => {
                                            if (isSelectionMode || !hasPhotos) return

                                            const target = e.target as HTMLElement
                                            // Avoid opening gallery when interacting with controls inside the data panel.
                                            if (target.closest('[data-card-panel="true"]')) return

                                            onImageClick(item.photos!, item.primaryPhotoIndex || 0)
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            {item.brand ? (
                                                <div className="px-2.5 py-1 bg-slate-200/20 text-white text-xs font-semibold rounded-lg backdrop-blur-md border border-white/35 shadow-sm">
                                                    {item.brand}
                                                </div>
                                            ) : <div />}

                                            <div className="flex flex-col items-end gap-1">
                                                {item.pieceType && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md shadow-md backdrop-blur-md ${item.pieceType === 'basic'
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
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-gradient-to-r from-yellow-500/40 to-yellow-700/40 text-white' : 'bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 text-white'}`}>
                                                        $TH
                                                    </span>
                                                )}
                                                {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-green-500/40 text-white' : 'bg-green-400/40 text-white'}`}>
                                                        TH
                                                    </span>
                                                )}

                                                {item.isChase && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md shadow-md backdrop-blur-md ${isDark ? 'bg-gradient-to-r from-red-500/40 to-pink-700/40 text-white' : 'bg-gradient-to-r from-red-400/40 to-pink-500/40 text-white'}`}>
                                                        CHASE
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div data-card-panel="true" className="mt-auto rounded-2xl bg-slate-900/45 backdrop-blur-xl border border-white/30 p-3 shadow-xl shadow-slate-900/35">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3
                                                        className={`text-[1.05rem] font-semibold truncate text-white ${!isSelectionMode && item._id ? 'cursor-pointer hover:text-primary-300 transition-colors' : ''}`}
                                                        onClick={() => {
                                                            if (!isSelectionMode && item._id) {
                                                                onNavigateToDetail(item._id)
                                                            }
                                                        }}
                                                        title={modelName}
                                                    >
                                                        {modelName}
                                                    </h3>
                                                    <p
                                                        className={`text-xs truncate text-slate-300 ${shouldShowSecondary ? '' : 'invisible'}`}
                                                        title={shouldShowSecondary ? secondaryLine : ''}
                                                    >
                                                        {shouldShowSecondary ? secondaryLine : 'placeholder'}
                                                    </p>
                                                </div>

                                                {!isSelectionMode && (canEdit || canDelete) && item._id && (
                                                    <div className="relative flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            className="p-1.5 rounded-md transition-colors text-slate-200 hover:bg-white/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenMenuItemId(openMenuItemId === item._id ? null : item._id || null)
                                                            }}
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>

                                                        {openMenuItemId === item._id && (
                                                            <div
                                                                className={`absolute right-0 mt-1 z-20 min-w-[120px] rounded-lg border shadow-lg p-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                                                                        onClick={() => {
                                                                            onEditItem(item)
                                                                            setOpenMenuItemId(null)
                                                                        }}
                                                                    >
                                                                        <Edit size={14} />
                                                                        Editar
                                                                    </button>
                                                                )}
                                                                {canDelete && (
                                                                    <button
                                                                        type="button"
                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded text-red-500 hover:bg-red-500/10"
                                                                        onClick={() => {
                                                                            if (item._id) onDeleteItem(item._id)
                                                                            setOpenMenuItemId(null)
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        Eliminar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {referenceCode && (
                                                <p className="text-xs text-white/90">
                                                    {referenceCode}
                                                </p>
                                            )}

                                            {hasMetaBadge && (
                                                <div className="mt-2 min-h-[24px] max-h-[24px] overflow-hidden">
                                                    {item.seriesId && (
                                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-300/25 text-purple-100 text-xs font-medium rounded-full max-w-full border border-purple-200/20">
                                                            <span className="truncate">🎁 {item.seriesName} ({item.seriesPosition}/{item.seriesSize})</span>
                                                        </div>
                                                    )}

                                                    {item.isBox && (
                                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-300/25 text-purple-100 text-xs font-medium rounded-full max-w-full border border-purple-200/20">
                                                            <span className="truncate">📦 {item.boxName} - {item.registeredPieces || 0}/{item.boxSize} piezas{item.boxStatus === 'sealed' ? ' 🔒' : item.boxStatus === 'unpacking' ? ' ⏳' : ''}</span>
                                                        </div>
                                                    )}

                                                    {item.sourceBox && !item.isBox && (
                                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900/40 text-white text-xs font-medium rounded-full max-w-full border border-white/25">
                                                            <span className="truncate">📦 De: {item.sourceBox}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`${hasMetaBadge ? 'mt-2' : 'mt-1'} space-y-1.5`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${item.condition === 'mint'
                                                            ? 'bg-emerald-700/35 text-emerald-100'
                                                            : item.condition === 'good'
                                                                ? 'bg-blue-700/35 text-blue-100'
                                                                : item.condition === 'fair'
                                                                    ? 'bg-yellow-700/35 text-yellow-100'
                                                                    : 'bg-red-700/35 text-red-100'}`}
                                                    >
                                                        {item.condition === 'mint' ? 'Mint' : item.condition === 'good' ? 'Bueno' : item.condition === 'fair' ? 'Regular' : 'Malo'}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${operationalStatus === 'Disponible'
                                                        ? 'bg-emerald-700/35 text-emerald-100'
                                                        : operationalStatus === 'Reservado'
                                                            ? 'bg-amber-700/35 text-amber-100'
                                                            : 'bg-red-700/35 text-red-100'}`}>
                                                        {operationalStatus}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 min-h-[20px]">
                                                    <span className="text-xs font-medium text-slate-200">
                                                        Stock: {availableQty} disponible{availableQty !== 1 ? 's' : ''}
                                                    </span>
                                                    {(item.reservedQuantity || 0) > 0 && (
                                                        <span className="text-xs text-amber-200 font-medium">
                                                            {item.reservedQuantity} reservado{item.reservedQuantity === 1 ? '' : 's'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-2 rounded-xl p-2 bg-slate-900/50 border border-white/25 backdrop-blur-lg">
                                                {hideCostAndProfitInInventory ? (
                                                    <div className="text-xs">
                                                        <p className="text-white/70">Precio cliente</p>
                                                        <p className="font-semibold text-emerald-200 text-lg drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">${customerPrice.toFixed(2)}</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                            <p className="text-white/70">Costo</p>
                                                            <p className="font-semibold text-white">${item.purchasePrice.toFixed(2)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-white/70">Sugerido</p>
                                                            <p className="font-semibold text-emerald-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">${item.suggestedPrice.toFixed(2)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-white/70">Ganancia</p>
                                                            <p className="font-semibold text-sky-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                                                                ${(item.suggestedPrice - item.purchasePrice).toFixed(2)}
                                                            </p>
                                                            <p className="text-[11px] text-sky-200 font-medium mt-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                                                                +{(((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {item.location && (
                                                    <div className="flex items-center gap-1 text-xs pt-1 border-t border-white/20 text-white/85">
                                                        <MapPin size={12} />
                                                        <span className="truncate">{item.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {!isSelectionMode && (
                                                <div className="mt-2">
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="min-h-[38px] px-2 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-300/30 shadow-md shadow-blue-900/30"
                                                            onClick={() => onAddToPos(item)}
                                                            disabled={!isAvailable || !canCreate}
                                                            title="Agregar a POS"
                                                        >
                                                            <ShoppingCart size={14} className="mr-1" />
                                                            POS
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="min-h-[38px] px-2 py-2 text-sm rounded-xl bg-white/90 text-slate-900 hover:bg-white border border-white/60 shadow-md"
                                                            onClick={() => onAddToDelivery(item)}
                                                            disabled={!isAvailable || !canCreate}
                                                            title="Agregar a entrega"
                                                        >
                                                            <Truck size={14} className="mr-1" />
                                                            Entrega
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {hasPhotos && (
                                            <div className="absolute bottom-3 left-3 z-20 px-2 py-1 bg-slate-200/20 text-white text-xs font-semibold rounded-md backdrop-blur-md border border-white/30">
                                                {item.photos!.length} foto{item.photos!.length !== 1 ? 's' : ''}
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
