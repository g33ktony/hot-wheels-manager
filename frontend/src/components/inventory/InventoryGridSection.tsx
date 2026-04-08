import { useEffect, useRef, useState } from 'react'
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
    viewMode: 'full' | 'compact'
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
    viewMode,
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
    const parallaxRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const animationFrameRef = useRef<number | null>(null)

    const setParallaxRef = (id?: string) => (el: HTMLDivElement | null) => {
        if (!id) return
        if (el) {
            parallaxRefs.current.set(id, el)
        } else {
            parallaxRefs.current.delete(id)
        }
    }

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const updateParallax = () => {
            const viewportHeight = window.innerHeight
            const maxOffset = 14

            parallaxRefs.current.forEach((el) => {
                if (prefersReducedMotion) {
                    el.style.transform = 'translate3d(0, 0, 0) scale(1.04)'
                    return
                }

                const rect = el.getBoundingClientRect()
                const elementCenter = rect.top + rect.height / 2
                const viewportCenter = viewportHeight / 2
                const distanceRatio = (elementCenter - viewportCenter) / viewportCenter
                const clampedRatio = Math.max(-1, Math.min(1, distanceRatio))
                const translateY = clampedRatio * -maxOffset

                el.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(1.08)`
            })
        }

        const handleScroll = () => {
            if (animationFrameRef.current) return
            animationFrameRef.current = window.requestAnimationFrame(() => {
                updateParallax()
                animationFrameRef.current = null
            })
        }

        updateParallax()
        window.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', handleScroll)

        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleScroll)
            if (animationFrameRef.current) {
                window.cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [filteredItems.length, viewMode])

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
                <div className={viewMode === 'compact'
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 w-full"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full"
                }>
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
                        const gainPercentage = item.purchasePrice > 0
                            ? (((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100)
                            : 0
                        const secondaryLine = `${item.hotWheelsCar?.series || ''} ${item.hotWheelsCar?.year ? `(${item.hotWheelsCar.year})` : ''}`.trim()
                        const shouldShowSecondary = !!secondaryLine && !secondaryLine.toLowerCase().includes(modelName.toLowerCase())
                        const referenceCode = item.hotWheelsCar?.toy_num || (item.carId && item.carId !== modelName ? item.carId : '')
                        const hasMetaBadge = !!(item.seriesId || item.isBox || (item.sourceBox && !item.isBox))
                        const operationalStatus = item.quantity <= 0
                            ? 'Agotado'
                            : availableQty <= 0
                                ? 'Reservado'
                                : 'Disponible'

                        if (viewMode === 'compact') {
                            return (
                                <Card
                                    key={item._id}
                                    hover={!isSelectionMode && isAvailable}
                                    pressEffect={false}
                                    className={`relative overflow-hidden !p-0 !shadow-none ${isDark
                                        ? 'bg-slate-900/30 backdrop-blur-xl border border-slate-500/30 shadow-[0_10px_24px_rgba(2,6,23,0.35),inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-2px_2px_rgba(255,255,255,0.12)]'
                                        : 'bg-white/70 backdrop-blur-xl border border-slate-300/80 shadow-[0_10px_24px_rgba(148,163,184,0.22),inset_0_3px_3px_rgba(148,163,184,0.3),inset_0_-2px_2px_rgba(255,255,255,0.98)]'
                                        } ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''} ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div
                                        className={`relative h-full min-h-[260px] ${isSelectionMode && isAvailable ? 'cursor-pointer' : isSelectionMode ? 'cursor-not-allowed' : ''}`}
                                        onClick={() => isSelectionMode && isAvailable && item._id && onToggleItemSelection(item._id)}
                                    >
                                        {isSelectionMode && (
                                            <div className="absolute top-2 left-2 z-20">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item._id!)}
                                                    onChange={() => item._id && isAvailable && onToggleItemSelection(item._id)}
                                                    disabled={!isAvailable}
                                                    className={`w-5 h-5 rounded border-slate-600 text-primary-600 focus:ring-primary-500 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        )}

                                        {!isAvailable && isSelectionMode && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 rounded-lg z-30">
                                                <div className="text-white text-center">
                                                    <div className="text-xl mb-0.5">🔒</div>
                                                    <div className="text-[10px] font-semibold">No disponible</div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 group overflow-hidden">
                                            <div
                                                ref={setParallaxRef(item._id)}
                                                className="absolute inset-x-0 -inset-y-4 will-change-transform transition-transform duration-300 ease-out"
                                            >
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
                                            </div>
                                        </div>

                                        <div
                                            className="relative z-10 h-full flex flex-col p-2"
                                            onClick={(e) => {
                                                if (isSelectionMode || !hasPhotos) return
                                                const target = e.target as HTMLElement
                                                if (target.closest('[data-card-panel="true"]')) return
                                                onImageClick(item.photos!, item.primaryPhotoIndex || 0)
                                            }}
                                        >
                                            {/* Top badges - compact */}
                                            <div className="flex items-start justify-between gap-1">
                                                {!isSelectionMode && (canEdit || canDelete) && item._id ? (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            className={`p-1 rounded-md backdrop-blur-md transition-colors ${isDark
                                                                ? 'text-slate-100 bg-slate-900/45 hover:bg-slate-800/70'
                                                                : 'text-slate-700 bg-white/78 hover:bg-white/92'} shadow-[inset_0_2px_2px_rgba(15,23,42,0.25),inset_0_-1px_1px_rgba(255,255,255,0.45)]`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenMenuItemId(openMenuItemId === item._id ? null : item._id || null)
                                                            }}
                                                            title="Más acciones"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>

                                                        {openMenuItemId === item._id && (
                                                            <div
                                                                className={`absolute left-0 mt-1 z-20 min-w-[120px] rounded-lg border p-1 ${isDark
                                                                    ? 'bg-slate-900/92 border-slate-600/60'
                                                                    : 'bg-white/95 border-slate-200/85'} backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.28)]`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded ${isDark ? 'text-slate-200 hover:bg-slate-700/80' : 'text-slate-700 hover:bg-slate-100'}`}
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
                                                ) : <div />}

                                                <div className="flex flex-col items-end gap-0.5">
                                                    {item.isSuperTreasureHunt && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded backdrop-blur-md bg-gradient-to-r from-yellow-500/40 to-yellow-700/40 text-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)]">$TH</span>
                                                    )}
                                                    {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded backdrop-blur-md bg-green-500/40 text-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)]">TH</span>
                                                    )}
                                                    {item.isChase && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded backdrop-blur-md bg-gradient-to-r from-red-500/40 to-pink-700/40 text-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)]">CHASE</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom info panel - compact */}
                                            <div
                                                data-card-panel="true"
                                                className={`mt-auto rounded-xl p-2 ${isDark
                                                    ? 'bg-slate-900/36 border border-transparent backdrop-blur-xl shadow-[inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-2px_2px_rgba(255,255,255,0.12)]'
                                                    : 'bg-white/80 border border-transparent backdrop-blur-xl shadow-[inset_0_3px_3px_rgba(148,163,184,0.3),inset_0_-2px_2px_rgba(255,255,255,0.98)]'
                                                    }`}
                                            >
                                                <h3
                                                    className={`text-xs font-semibold truncate leading-tight ${isDark ? 'text-white' : 'text-slate-950'} ${!isSelectionMode && item._id ? 'cursor-pointer hover:text-primary-600 transition-colors' : ''}`}
                                                    onClick={() => { if (!isSelectionMode && item._id) onNavigateToDetail(item._id) }}
                                                    title={modelName}
                                                >
                                                    {modelName}
                                                </h3>
                                                <div className="flex items-start justify-between gap-1 mt-1">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-bold leading-tight ${isDark ? 'text-emerald-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]' : 'text-emerald-700'}`}>
                                                            ${customerPrice.toFixed(2)}
                                                        </span>
                                                        {!hideCostAndProfitInInventory && (
                                                            <div className="flex items-center gap-2 mt-0.5 leading-none">
                                                                <span className={`text-[10px] font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                                                                    ${item.purchasePrice.toFixed(2)}
                                                                </span>
                                                                <span className={`text-[10px] font-semibold ${isDark ? 'text-sky-200/90' : 'text-sky-700'}`}>
                                                                    +{gainPercentage.toFixed(0)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${operationalStatus === 'Disponible'
                                                        ? (isDark ? 'bg-emerald-700/35 text-emerald-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-[inset_0_1px_1px_rgba(16,185,129,0.18),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                        : operationalStatus === 'Reservado'
                                                            ? (isDark ? 'bg-amber-700/35 text-amber-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-amber-100 text-amber-700 border border-amber-200 shadow-[inset_0_1px_1px_rgba(217,119,6,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                            : (isDark ? 'bg-red-700/35 text-red-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-red-100 text-red-700 border border-red-200 shadow-[inset_0_1px_1px_rgba(220,38,38,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                        }`}>
                                                        {availableQty}u
                                                    </span>
                                                </div>

                                                {!isSelectionMode && (
                                                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className={`!min-h-0 h-7 px-1.5 py-0 text-[11px] rounded-lg ${isDark
                                                                ? '!bg-blue-600/65 !text-blue-50 hover:!bg-blue-600/75 !border !border-blue-300/25 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(15,23,42,0.6),inset_0_-1px_1px_rgba(255,255,255,0.16)] hover:!shadow-[inset_0_3px_3px_rgba(15,23,42,0.5),inset_0_-1px_1px_rgba(255,255,255,0.2)]'
                                                                : '!bg-blue-500/55 !text-white hover:!bg-blue-500/65 !border !border-blue-300/40 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(59,130,246,0.25),inset_0_-1px_1px_rgba(255,255,255,0.5)] hover:!shadow-[inset_0_3px_3px_rgba(59,130,246,0.2),inset_0_-1px_1px_rgba(255,255,255,0.6)]'
                                                                }`}
                                                            onClick={() => onAddToPos(item)}
                                                            disabled={!isAvailable || !canCreate}
                                                            title="POS"
                                                        >
                                                            <ShoppingCart size={11} className="mr-0.5" />
                                                            POS
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className={`!min-h-0 h-7 px-1.5 py-0 text-[11px] rounded-lg ${isDark
                                                                ? '!bg-slate-800/44 !text-slate-500 hover:!bg-slate-700/52 hover:!text-slate-400 !border !border-slate-300/30 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(2,6,23,0.65),inset_0_-1px_1px_rgba(255,255,255,0.14)] hover:!shadow-[inset_0_3px_3px_rgba(2,6,23,0.55),inset_0_-1px_1px_rgba(255,255,255,0.18)]'
                                                                : '!bg-white/60 !text-slate-500 hover:!bg-white/72 hover:!text-slate-700 !border !border-slate-300/80 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(148,163,184,0.24),inset_0_-1px_1px_rgba(255,255,255,0.98)] hover:!shadow-[inset_0_3px_3px_rgba(148,163,184,0.18),inset_0_-1px_1px_rgba(255,255,255,0.99)]'
                                                                }`}
                                                            onClick={() => onAddToDelivery(item)}
                                                            disabled={!isAvailable || !canCreate}
                                                            title="Entrega"
                                                        >
                                                            <Truck size={11} className="mr-0.5" />
                                                            Entrega
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        }

                        return (
                            <Card
                                key={item._id}
                                hover={!isSelectionMode && isAvailable}
                                pressEffect={false}
                                className={`relative overflow-hidden !p-0 !shadow-none ${isDark
                                    ? 'bg-slate-900/30 backdrop-blur-xl border border-slate-500/30 shadow-[0_10px_24px_rgba(2,6,23,0.35),inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-2px_2px_rgba(255,255,255,0.12)]'
                                    : 'bg-white/70 backdrop-blur-xl border border-slate-300/80 shadow-[0_10px_24px_rgba(148,163,184,0.22),inset_0_3px_3px_rgba(148,163,184,0.3),inset_0_-2px_2px_rgba(255,255,255,0.98)]'
                                    } ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''} ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                                    <div className="absolute inset-0 group overflow-hidden">
                                        <div
                                            ref={setParallaxRef(item._id)}
                                            className="absolute inset-x-0 -inset-y-5 will-change-transform transition-transform duration-300 ease-out"
                                        >
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
                                        </div>

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
                                                <div className="px-2.5 py-1 bg-slate-200/20 text-white text-xs font-semibold rounded-lg backdrop-blur-md border border-transparent shadow-[inset_0_2px_2px_rgba(0,0,0,0.38),inset_0_-1px_1px_rgba(255,255,255,0.16)]">
                                                    {item.brand}
                                                </div>
                                            ) : <div />}

                                            <div className="flex flex-col items-end gap-1">
                                                {item.pieceType && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md backdrop-blur-md border border-transparent ${item.pieceType === 'basic'
                                                        ? isDark ? 'bg-blue-500/30 text-white' : 'bg-blue-400/30 text-white'
                                                        : item.pieceType === 'premium'
                                                            ? isDark ? 'bg-purple-500/30 text-white' : 'bg-purple-400/30 text-white'
                                                            : item.pieceType === 'rlc'
                                                                ? isDark ? 'bg-orange-500/30 text-white' : 'bg-orange-400/30 text-white'
                                                                : item.pieceType === 'silver_series'
                                                                    ? isDark ? 'bg-slate-400/30 text-white' : 'bg-slate-300/30 text-white'
                                                                    : item.pieceType === 'elite_64'
                                                                        ? isDark ? 'bg-red-500/30 text-white' : 'bg-red-400/30 text-white'
                                                                        : isDark ? 'bg-slate-500/30 text-white' : 'bg-slate-400/30 text-white'} shadow-[inset_0_2px_2px_rgba(0,0,0,0.4),inset_0_-1px_1px_rgba(255,255,255,0.15)]`}>
                                                        {formatPieceType(item.pieceType).toUpperCase()}
                                                    </span>
                                                )}

                                                {item.isSuperTreasureHunt && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)] ${isDark ? 'bg-gradient-to-r from-yellow-500/40 to-yellow-700/40 text-white' : 'bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 text-white'}`}>
                                                        $TH
                                                    </span>
                                                )}
                                                {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)] ${isDark ? 'bg-green-500/40 text-white' : 'bg-green-400/40 text-white'}`}>
                                                        TH
                                                    </span>
                                                )}

                                                {item.isChase && (
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)] ${isDark ? 'bg-gradient-to-r from-red-500/40 to-pink-700/40 text-white' : 'bg-gradient-to-r from-red-400/40 to-pink-500/40 text-white'}`}>
                                                        CHASE
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            data-card-panel="true"
                                            className={`mt-auto rounded-2xl p-3 ${isDark
                                                ? 'bg-slate-900/34 border border-transparent backdrop-blur-xl shadow-[inset_0_3px_3px_rgba(2,6,23,0.62),inset_0_-2px_2px_rgba(255,255,255,0.12)]'
                                                : 'bg-white/82 border border-transparent backdrop-blur-xl shadow-[inset_0_3px_3px_rgba(148,163,184,0.3),inset_0_-2px_2px_rgba(255,255,255,0.98)]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3
                                                        className={`text-[1.05rem] font-semibold truncate ${isDark ? 'text-white' : 'text-slate-950'} ${!isSelectionMode && item._id ? 'cursor-pointer hover:text-primary-600 transition-colors' : ''}`}
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
                                                        className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'} ${shouldShowSecondary ? '' : 'invisible'}`}
                                                        title={shouldShowSecondary ? secondaryLine : ''}
                                                    >
                                                        {shouldShowSecondary ? secondaryLine : 'placeholder'}
                                                    </p>
                                                </div>

                                                {!isSelectionMode && (canEdit || canDelete) && item._id && (
                                                    <div className="relative flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100/90'}`}
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
                                                <p className={`text-xs ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                                                    {referenceCode}
                                                </p>
                                            )}

                                            {hasMetaBadge && (
                                                <div className="mt-2 min-h-[24px] max-h-[24px] overflow-hidden">
                                                    {item.seriesId && (
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full max-w-full ${isDark
                                                            ? 'bg-purple-300/25 text-purple-100 border border-purple-200/20 shadow-[inset_0_1px_1px_rgba(2,6,23,0.4),inset_0_-1px_0_rgba(255,255,255,0.14)]'
                                                            : 'bg-purple-100 text-purple-700 border border-purple-200 shadow-[inset_0_1px_1px_rgba(147,51,234,0.16),inset_0_-1px_0_rgba(255,255,255,0.98)]'
                                                            }`}>
                                                            <span className="truncate">🎁 {item.seriesName} ({item.seriesPosition}/{item.seriesSize})</span>
                                                        </div>
                                                    )}

                                                    {item.isBox && (
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full max-w-full ${isDark
                                                            ? 'bg-purple-300/25 text-purple-100 border border-purple-200/20 shadow-[inset_0_1px_1px_rgba(2,6,23,0.4),inset_0_-1px_0_rgba(255,255,255,0.14)]'
                                                            : 'bg-purple-100 text-purple-700 border border-purple-200 shadow-[inset_0_1px_1px_rgba(147,51,234,0.16),inset_0_-1px_0_rgba(255,255,255,0.98)]'
                                                            }`}>
                                                            <span className="truncate">📦 {item.boxName} - {item.registeredPieces || 0}/{item.boxSize} piezas{item.boxStatus === 'sealed' ? ' 🔒' : item.boxStatus === 'unpacking' ? ' ⏳' : ''}</span>
                                                        </div>
                                                    )}

                                                    {item.sourceBox && !item.isBox && (
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full max-w-full ${isDark
                                                            ? 'bg-slate-900/40 text-white border border-slate-400/35 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-200 shadow-[inset_0_1px_1px_rgba(71,85,105,0.15),inset_0_-1px_0_rgba(255,255,255,0.98)]'
                                                            }`}>
                                                            <span className="truncate">📦 De: {item.sourceBox}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`${hasMetaBadge ? 'mt-2' : 'mt-1'} space-y-1.5`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${item.condition === 'mint'
                                                            ? (isDark ? 'bg-emerald-700/35 text-emerald-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-[inset_0_1px_1px_rgba(16,185,129,0.18),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                            : item.condition === 'good'
                                                                ? (isDark ? 'bg-blue-700/35 text-blue-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-blue-100 text-blue-700 border border-blue-200 shadow-[inset_0_1px_1px_rgba(37,99,235,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                                : item.condition === 'fair'
                                                                    ? (isDark ? 'bg-yellow-700/35 text-yellow-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-amber-100 text-amber-700 border border-amber-200 shadow-[inset_0_1px_1px_rgba(217,119,6,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                                    : (isDark ? 'bg-red-700/35 text-red-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-red-100 text-red-700 border border-red-200 shadow-[inset_0_1px_1px_rgba(220,38,38,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')}`}
                                                    >
                                                        {item.condition === 'mint' ? 'Mint' : item.condition === 'good' ? 'Bueno' : item.condition === 'fair' ? 'Regular' : 'Malo'}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${operationalStatus === 'Disponible'
                                                        ? (isDark ? 'bg-emerald-700/35 text-emerald-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-[inset_0_1px_1px_rgba(16,185,129,0.18),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                        : operationalStatus === 'Reservado'
                                                            ? (isDark ? 'bg-amber-700/35 text-amber-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-amber-100 text-amber-700 border border-amber-200 shadow-[inset_0_1px_1px_rgba(217,119,6,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')
                                                            : (isDark ? 'bg-red-700/35 text-red-100 shadow-[inset_0_1px_1px_rgba(2,6,23,0.45),inset_0_-1px_0_rgba(255,255,255,0.14)]' : 'bg-red-100 text-red-700 border border-red-200 shadow-[inset_0_1px_1px_rgba(220,38,38,0.2),inset_0_-1px_0_rgba(255,255,255,0.98)]')}`}>
                                                        {operationalStatus}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 min-h-[20px]">
                                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        Stock: {availableQty} disponible{availableQty !== 1 ? 's' : ''}
                                                    </span>
                                                    {(item.reservedQuantity || 0) > 0 && (
                                                        <span className={`text-xs font-medium ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                                                            {item.reservedQuantity} reservado{item.reservedQuantity === 1 ? '' : 's'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`mt-2 rounded-xl p-2.5 ${isDark
                                                ? 'bg-slate-900/28 backdrop-blur-md border border-transparent shadow-[inset_0_3px_3px_rgba(0,0,0,0.5),inset_0_-2px_2px_rgba(255,255,255,0.16)]'
                                                : 'bg-white/54 backdrop-blur-md border border-transparent shadow-[inset_0_3px_3px_rgba(148,163,184,0.34),inset_0_-2px_2px_rgba(255,255,255,0.98)]'
                                                }`}>
                                                {hideCostAndProfitInInventory ? (
                                                    <div className="text-xs">
                                                        <p className={isDark ? 'text-white/70' : 'text-slate-700'}>Precio cliente</p>
                                                        <p className={`font-semibold text-lg ${isDark ? 'text-emerald-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]' : 'text-emerald-800'}`}>${customerPrice.toFixed(2)}</p>
                                                    </div>
                                                ) : (
                                                    <div className={`grid grid-cols-3 gap-2 text-xs ${isDark ? 'divide-x divide-slate-600/35' : 'divide-x divide-slate-300/55'}`}>
                                                        <div>
                                                            <p className={isDark ? 'text-white/70' : 'text-slate-700'}>Costo</p>
                                                            <p className={isDark ? 'font-semibold text-white' : 'font-bold text-slate-900'}>${item.purchasePrice.toFixed(2)}</p>
                                                        </div>
                                                        <div className="pl-2">
                                                            <p className={isDark ? 'text-white/70' : 'text-slate-700'}>Sugerido</p>
                                                            <p className={isDark ? 'font-semibold text-emerald-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]' : 'font-bold text-emerald-700'}>${item.suggestedPrice.toFixed(2)}</p>
                                                        </div>
                                                        <div className="pl-2">
                                                            <p className={isDark ? 'text-white/70' : 'text-slate-700'}>Ganancia</p>
                                                            <p className={isDark ? 'font-semibold text-sky-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]' : 'font-bold text-sky-700'}>
                                                                ${(item.suggestedPrice - item.purchasePrice).toFixed(2)}
                                                            </p>
                                                            <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-sky-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]' : 'text-sky-700'}`}>
                                                                +{(((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {item.location && (
                                                    <div className={`flex items-center gap-1 text-xs pt-1 ${isDark ? 'border-t border-slate-500/30 text-white/85' : 'border-t border-slate-200 text-slate-800'}`}>
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
                                                            className={`min-h-[38px] px-2 py-2 text-sm rounded-xl ${isDark
                                                                ? '!bg-blue-600/65 !text-blue-50 hover:!bg-blue-600/75 !border !border-blue-300/25 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(15,23,42,0.6),inset_0_-1px_1px_rgba(255,255,255,0.16)] hover:!shadow-[inset_0_3px_3px_rgba(15,23,42,0.5),inset_0_-1px_1px_rgba(255,255,255,0.2)]'
                                                                : '!bg-blue-500/55 !text-white hover:!bg-blue-500/65 !border !border-blue-300/40 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(59,130,246,0.25),inset_0_-1px_1px_rgba(255,255,255,0.5)] hover:!shadow-[inset_0_3px_3px_rgba(59,130,246,0.2),inset_0_-1px_1px_rgba(255,255,255,0.6)]'
                                                                }`}
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
                                                            className={`min-h-[38px] px-2 py-2 text-sm rounded-xl ${isDark
                                                                ? '!bg-slate-800/44 !text-slate-500 hover:!bg-slate-700/52 hover:!text-slate-400 !border !border-slate-300/30 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(2,6,23,0.65),inset_0_-1px_1px_rgba(255,255,255,0.14)] hover:!shadow-[inset_0_3px_3px_rgba(2,6,23,0.55),inset_0_-1px_1px_rgba(255,255,255,0.18)]'
                                                                : '!bg-white/60 !text-slate-500 hover:!bg-white/72 hover:!text-slate-700 !border !border-slate-300/80 !backdrop-blur-xl !shadow-[inset_0_3px_3px_rgba(148,163,184,0.24),inset_0_-1px_1px_rgba(255,255,255,0.98)] hover:!shadow-[inset_0_3px_3px_rgba(148,163,184,0.18),inset_0_-1px_1px_rgba(255,255,255,0.99)]'
                                                                }`}
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
                                            <div className="absolute bottom-3 left-3 z-20 px-2 py-1 bg-slate-200/20 text-white text-xs font-semibold rounded-md backdrop-blur-md border border-slate-400/45 shadow-[inset_0_1px_1px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)]">
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
