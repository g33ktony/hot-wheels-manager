import Button from '@/components/common/Button'
import PageHeader from '@/components/common/PageHeader'
import { useNavigate } from 'react-router-dom'
import {
    CheckSquare,
    Edit,
    Facebook,
    FileText,
    Grid,
    Image,
    LayoutGrid,
    Plus,
    ShoppingCart,
    Trash2,
    Truck,
} from 'lucide-react'

interface InventoryHeaderProps {
    isDark: boolean
    isSelectionMode: boolean
    selectedItemsCount: number
    filteredItemsCount: number
    canCreate: boolean
    canDelete: boolean
    viewMode: 'full' | 'compact'
    onToggleViewMode: () => void
    onToggleSelectionMode: () => void
    onDeselectAllItems: () => void
    onAddToCart: () => void
    onCreateDeliveryFromInventory: () => void
    onShowQuoteModal: () => void
    onShowCollageModal: () => void
    onShowBulkEditModal: () => void
    onShowFacebookModal: () => void
    onBulkDelete: () => void
    onSelectAllItems: () => void
    onShowAddModal: () => void
}

export default function InventoryHeader({
    isDark,
    isSelectionMode,
    selectedItemsCount,
    filteredItemsCount,
    canCreate,
    canDelete,
    viewMode,
    onToggleViewMode,
    onToggleSelectionMode,
    onDeselectAllItems,
    onAddToCart,
    onCreateDeliveryFromInventory,
    onShowQuoteModal,
    onShowCollageModal,
    onShowBulkEditModal,
    onShowFacebookModal,
    onBulkDelete,
    onSelectAllItems,
    onShowAddModal,
}: InventoryHeaderProps) {
    const navigate = useNavigate()
    const neutralButtonClass = isDark
        ? '!bg-slate-800/48 !text-slate-500 !font-semibold !border !border-slate-500/35 !backdrop-blur-xl !shadow-[6,23,0.6),163,184,0.12)] hover:!bg-slate-800/58 hover:!text-slate-400'
        : '!bg-slate-200/60 !text-slate-500 !font-semibold !border !border-slate-400/70 !backdrop-blur-xl !shadow-[163,184,0.24),255,255,0.88)] hover:!bg-slate-200/72 hover:!text-slate-700'
    const primaryButtonClass = isDark
        ? '!bg-blue-600/58 !text-blue-50 !backdrop-blur-xl !shadow-[58,138,0.45),255,255,0.12)] hover:!bg-blue-600/70'
        : '!bg-blue-500/58 !text-white !backdrop-blur-xl !shadow-[130,246,0.26),255,255,0.52)] hover:!bg-blue-500/68'
    const dangerButtonClass = isDark
        ? '!bg-red-700/52 !text-red-50 !border !border-red-300/26 !backdrop-blur-xl !shadow-[29,29,0.5),255,255,0.1)] hover:!bg-red-700/66'
        : '!bg-red-500/58 !text-white !border !border-red-300/35 !backdrop-blur-xl !shadow-[68,68,0.24),255,255,0.5)] hover:!bg-red-500/68'

    return (
        <PageHeader
            title="Inventario"
            subtitle="Gestiona tus piezas de autos a escala"
            actions={
                <div className="flex flex-wrap gap-2">
                    {isSelectionMode ? (
                        <>
                            <Button variant="secondary" onClick={onToggleSelectionMode} size="sm" className={neutralButtonClass}>
                                Salir del Modo Selección
                            </Button>
                            {selectedItemsCount > 0 && (
                                <>
                                    <Button variant="secondary" onClick={onDeselectAllItems} size="sm" className={neutralButtonClass}>
                                        Deseleccionar ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<ShoppingCart size={18} />}
                                        onClick={onAddToCart}
                                        size="sm"
                                        className={primaryButtonClass}
                                    >
                                        Agregar al Carrito ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<Truck size={18} />}
                                        onClick={onCreateDeliveryFromInventory}
                                        size="sm"
                                        className={primaryButtonClass}
                                    >
                                        Crear Entrega ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<FileText size={18} />}
                                        onClick={onShowQuoteModal}
                                        size="sm"
                                        className={primaryButtonClass}
                                    >
                                        Generar Cotización ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<Image size={18} />}
                                        onClick={onShowCollageModal}
                                        size="sm"
                                        className={primaryButtonClass}
                                    >
                                        Collages para FB
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Edit size={18} />}
                                        onClick={onShowBulkEditModal}
                                        size="sm"
                                        className={neutralButtonClass}
                                    >
                                        Editar ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Facebook size={18} />}
                                        onClick={onShowFacebookModal}
                                        size="sm"
                                        className={neutralButtonClass}
                                    >
                                        Publicar en Facebook
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="danger"
                                            icon={<Trash2 size={18} />}
                                            onClick={onBulkDelete}
                                            size="sm"
                                            className={dangerButtonClass}
                                        >
                                            Eliminar ({selectedItemsCount})
                                        </Button>
                                    )}
                                </>
                            )}
                            {selectedItemsCount === 0 && filteredItemsCount > 0 && (
                                <Button variant="secondary" onClick={onSelectAllItems} size="sm" className={neutralButtonClass}>
                                    Seleccionar Todo
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onToggleViewMode}
                                className={`p-2 rounded-lg transition-colors ${isDark
                                    ? 'bg-slate-900/34 text-slate-200 hover:bg-slate-900/46 backdrop-blur-xl shadow-[6,23,0.6),255,255,0.1)]'
                                    : 'bg-white/72 text-slate-700 hover:text-slate-800 hover:bg-white/86 backdrop-blur-xl shadow-[163,184,0.24),255,255,0.98)]'
                                    }`}
                                title={viewMode === 'full' ? 'Vista compacta' : 'Vista completa'}
                            >
                                {viewMode === 'full' ? <Grid size={18} /> : <LayoutGrid size={18} />}
                            </button>
                            {filteredItemsCount > 0 && (
                                <Button
                                    variant="secondary"
                                    icon={<CheckSquare size={18} />}
                                    onClick={onToggleSelectionMode}
                                    size="sm"
                                    className={neutralButtonClass}
                                >
                                    Seleccionar
                                </Button>
                            )}
                            <Button
                                icon={<ShoppingCart size={18} />}
                                onClick={() => navigate('/pos')}
                                size="sm"
                                className={isDark
                                    ? '!bg-emerald-600/58 !text-emerald-50 !backdrop-blur-xl !shadow-[6px_6px_12px_rgba(5,150,105,0.4)] hover:!bg-emerald-600/70'
                                    : '!bg-emerald-500/58 !text-white !backdrop-blur-xl !shadow-[6px_6px_12px_rgba(16,185,129,0.3)] hover:!bg-emerald-500/70'}
                            >
                                Nueva Venta
                            </Button>
                            {canCreate ? (
                                <Button icon={<Plus size={18} />} onClick={onShowAddModal} size="sm" className={primaryButtonClass}>
                                    Agregar Pieza
                                </Button>
                            ) : (
                                <div className={`text-xs px-3 py-2 rounded-lg border backdrop-blur-xl ${isDark
                                    ? 'text-orange-300 bg-orange-900/30 border-orange-700/45 shadow-[45,18,0.4),255,255,0.08)]'
                                    : 'text-orange-700 bg-orange-50/85 border-orange-200/90 shadow-[146,60,0.2),255,255,0.98)]'
                                    }`}>
                                    📖 Solo lectura - Seleccionaste otra tienda
                                </div>
                            )}
                        </>
                    )}
                </div>
            }
        />
    )
}
