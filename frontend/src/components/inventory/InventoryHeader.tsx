import Button from '@/components/common/Button'
import PageHeader from '@/components/common/PageHeader'
import {
    CheckSquare,
    Edit,
    Facebook,
    FileText,
    Image,
    Plus,
    ShoppingCart,
    Trash2,
    Truck,
} from 'lucide-react'

interface InventoryHeaderProps {
    isSelectionMode: boolean
    selectedItemsCount: number
    filteredItemsCount: number
    canCreate: boolean
    canDelete: boolean
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
    isSelectionMode,
    selectedItemsCount,
    filteredItemsCount,
    canCreate,
    canDelete,
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
    return (
        <PageHeader
            title="Inventario"
            subtitle="Gestiona tus piezas de autos a escala"
            actions={
                <div className="flex flex-wrap gap-2">
                    {isSelectionMode ? (
                        <>
                            <Button variant="secondary" onClick={onToggleSelectionMode} size="sm">
                                Salir del Modo Selección
                            </Button>
                            {selectedItemsCount > 0 && (
                                <>
                                    <Button variant="secondary" onClick={onDeselectAllItems} size="sm">
                                        Deseleccionar ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<ShoppingCart size={18} />}
                                        onClick={onAddToCart}
                                        size="sm"
                                    >
                                        Agregar al Carrito ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<Truck size={18} />}
                                        onClick={onCreateDeliveryFromInventory}
                                        size="sm"
                                    >
                                        Crear Entrega ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<FileText size={18} />}
                                        onClick={onShowQuoteModal}
                                        size="sm"
                                    >
                                        Generar Cotización ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<Image size={18} />}
                                        onClick={onShowCollageModal}
                                        size="sm"
                                    >
                                        Collages para FB
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Edit size={18} />}
                                        onClick={onShowBulkEditModal}
                                        size="sm"
                                    >
                                        Editar ({selectedItemsCount})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Facebook size={18} />}
                                        onClick={onShowFacebookModal}
                                        size="sm"
                                    >
                                        Publicar en Facebook
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="danger"
                                            icon={<Trash2 size={18} />}
                                            onClick={onBulkDelete}
                                            size="sm"
                                        >
                                            Eliminar ({selectedItemsCount})
                                        </Button>
                                    )}
                                </>
                            )}
                            {selectedItemsCount === 0 && filteredItemsCount > 0 && (
                                <Button variant="secondary" onClick={onSelectAllItems} size="sm">
                                    Seleccionar Todo
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            {filteredItemsCount > 0 && (
                                <Button
                                    variant="secondary"
                                    icon={<CheckSquare size={18} />}
                                    onClick={onToggleSelectionMode}
                                    size="sm"
                                >
                                    Seleccionar
                                </Button>
                            )}
                            {canCreate ? (
                                <Button icon={<Plus size={18} />} onClick={onShowAddModal} size="sm">
                                    Agregar Pieza
                                </Button>
                            ) : (
                                <div className="text-xs text-orange-400 px-3 py-2 bg-orange-900/30 rounded-lg border border-orange-700/50">
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
