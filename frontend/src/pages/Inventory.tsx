import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/contexts/SearchContext'
import { useStore } from '@/contexts/StoreContext'
import { useCanEditStore } from '@/hooks/useCanEditStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useInventory, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import { useCustomBrands } from '@/hooks/useCustomBrands'
import { useAppSelector, useAppDispatch } from '@/hooks/redux'
import { addMultipleToCart } from '@/store/slices/cartSlice'
import { addMultipleToDeliveryCart } from '@/store/slices/deliveryCartSlice'
import { setSelectionMode, clearSelection } from '@/store/slices/selectionSlice'
import { useInventorySyncInBackground } from '@/hooks/useInventoryCache'
import { useInventoryPreloadAndPrefetch } from '@/hooks/useInventoryPreloadAndPrefetch'
import { useInventoryFiltersUI } from '@/hooks/useInventoryFiltersUI'
import { useInventoryEditItem } from '@/hooks/useInventoryEditItem'
import { useInventoryBulkActions } from '@/hooks/useInventoryBulkActions'
import { useInventoryViewActions } from '@/hooks/useInventoryViewActions'
import { getPlaceholderLogo } from '@/utils/placeholderLogo'
import { useInventorySelectionActions } from '@/hooks/useInventorySelectionActions'
import InventoryHeader from '@/components/inventory/InventoryHeader'
import InventoryFilters from '@/components/inventory/InventoryFilters'
import InventoryGridSection from '@/components/inventory/InventoryGridSection'
import InventoryPaginationControls from '@/components/inventory/InventoryPaginationControls'
import InventoryAddModal from '@/components/inventory/InventoryAddModal'
import InventoryEditModal from '@/components/inventory/InventoryEditModal'
import InventoryCreateDeliveryModal from '@/components/inventory/InventoryCreateDeliveryModal'
import InventorySecondaryModals from '@/components/inventory/InventorySecondaryModals'
import ImageViewerModal from '@/components/common/ImageViewerModal'
import toast from 'react-hot-toast'
import { formatPieceType } from '@/utils/searchUtils'
import { useInventoryFiltering } from '@/hooks/useInventoryFiltering'

// Predefined brands
const PREDEFINED_BRANDS = [
    'Hot Wheels',
    'Kaido House',
    'Mini GT',
    'M2 Machines',
    'Tomica',
    'Matchbox',
    'Johnny Lightning',
    'Greenlight'
]

export default function Inventory() {
    // Sync inventory in background (keeps Redux cache fresh for other pages)
    useInventorySyncInBackground()

    // Get theme and store
    const { mode } = useTheme()
    const { selectedStore } = useStore()
    const { canEdit, canDelete, canCreate } = useCanEditStore()
    const isDark = mode === 'dark'

    // Get Redux cache as fallback when React Query is loading
    const reduxInventory = useAppSelector(state => state.inventory)
    const reduxSelection = useAppSelector(state => state.selection)
    const itemsCache = useAppSelector(state => state.itemsCache)
    const dispatch = useAppDispatch()

    // Use global search context
    const { filters, updateFilter } = useSearch()
    const {
        searchTerm,
        filterCondition,
        filterBrand,
        filterPieceType,
        filterTreasureHunt,
        filterChase,
        filterLocation,
        filterLowStock,
        filterFantasy,
        filterMoto,
        filterCamioneta,
        filterFastFurious
    } = filters

    const {
        filterFantasyOnly,
        setFilterFantasyOnly,
        handleFantasyOnlyChange,
        handleHideFantasyChange,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        debouncedSearchTerm,
        filterPriceMin,
        setFilterPriceMin,
        filterPriceMax,
        setFilterPriceMax,
        showAdvancedFilters,
        setShowAdvancedFilters,
        handleFilterChange,
    } = useInventoryFiltersUI({
        searchTerm,
        updateFilter,
    })

    const [showAddModal, setShowAddModal] = useState(false)
    // Facebook publish modal
    const [showFacebookModal, setShowFacebookModal] = useState(false)
    // Quote report modal
    const [showQuoteModal, setShowQuoteModal] = useState(false)
    // Collage generator modal
    const [showCollageModal, setShowCollageModal] = useState(false)
    // Bulk edit modal
    const [showBulkEditModal, setShowBulkEditModal] = useState(false)
    // Delivery creation modal from inventory
    const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false)

    // Ref para scroll automático
    const topRef = useRef<HTMLDivElement>(null)

    const { data: inventoryData, isLoading, error } = useInventory({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm, // Use debounced value for API calls
        condition: filterCondition,
        brand: filterBrand,
        pieceType: filterPieceType,
        treasureHunt: filterTreasureHunt,
        chase: filterChase,
        fantasy: filterFantasy,
        fantasyOnly: filterFantasyOnly,
        moto: filterMoto,
        camioneta: filterCamioneta,
        fastFurious: filterFastFurious,
        selectedStore: selectedStore || undefined
    })
    const { data: customBrands } = useCustomBrands()
    const deleteItemMutation = useDeleteInventoryItem()
    const updateItemMutation = useUpdateInventoryItem()

    const {
        imageViewer,
        handleDeleteItem,
        handleImageClick,
        closeImageViewer,
    } = useInventoryViewActions({
        deleteItem: deleteItemMutation.mutateAsync,
    })

    const {
        showEditModal,
        editingItem,
        setEditingItem,
        handleEditItem,
        handleUpdateItem,
        closeEditModal,
    } = useInventoryEditItem({
        updateItem: updateItemMutation.mutateAsync,
    })

    // Navigation hook for item detail page
    const navigate = useNavigate()

    // Extract items and pagination from response
    // Use React Query data if available, fallback to Redux cache while loading
    const inventoryItems = useMemo(() => {
        // Priority 1: React Query data is always preferred when available
        if (inventoryData?.items) {
            console.log('📊 Inventory: Using React Query data -', inventoryData.items.length, 'items')
            return inventoryData.items
        }
        // Priority 2: If loading and Redux has data, use Redux as temporary cache
        if (isLoading && reduxInventory.items && reduxInventory.items.length > 0) {
            console.log('📦 Inventory: Using Redux cache while loading -', reduxInventory.items.length, 'items')
            return reduxInventory.items as any
        }
        // Default: empty array
        console.log('📭 Inventory: No data available')
        return []
    }, [inventoryData?.items, isLoading, reduxInventory.items])

    const pagination = useMemo(() => {
        if (inventoryData?.pagination) {
            return inventoryData.pagination
        }
        if (isLoading && reduxInventory.totalItems > 0) {
            return {
                currentPage: currentPage,
                totalPages: reduxInventory.totalPages,
                totalItems: reduxInventory.totalItems,
                itemsPerPage: itemsPerPage
            }
        }
        return undefined
    }, [inventoryData?.pagination, isLoading, reduxInventory, currentPage, itemsPerPage])

    const { isPrefetchingNext } = useInventoryPreloadAndPrefetch({
        reduxInventory,
        inventoryDataItems: inventoryData?.items,
        pagination,
        currentPage,
        itemsPerPage,
        debouncedSearchTerm,
        filterCondition,
        filterBrand,
        filterPieceType,
        filterTreasureHunt,
        filterChase,
        filterFantasy,
        filterMoto,
        filterCamioneta,
        dispatch,
    })

    // Log component render state (only when critical values change)
    useEffect(() => {
        console.log('📊 Inventory component state:', {
            isLoading,
            error: error?.message,
            itemsFromQuery: inventoryData?.items?.length || 0,
            itemsFromRedux: reduxInventory.items.length,
            finalItems: inventoryItems.length
        })
    }, [isLoading, error, inventoryData?.items?.length, reduxInventory.items.length, inventoryItems.length])

    // Combine predefined and custom brands
    const allBrands = [
        ...PREDEFINED_BRANDS,
        ...(customBrands?.map(b => b.name) || [])
    ].sort()

    // Extraer ubicaciones únicas para el filtro
    const uniqueLocations = useMemo(() => {
        const locations = new Set<string>();
        inventoryItems.forEach((item: any) => {
            if (item.location) locations.add(item.location);
        });
        return Array.from(locations).sort();
    }, [inventoryItems]);

    // Función para cambiar de página con scroll automático
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        // Always scroll to top when changing pages
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    if (isLoading && inventoryItems.length === 0) {
        console.log('🔄 Inventory: Loading from API...')
    }

    if (error && inventoryItems.length === 0) {
        console.error('❌ Inventory: Error loading -', error)
    }

    // Filtrado local con búsqueda inteligente
    const filteredItems = useInventoryFiltering({
        inventoryItems,
        searchTerm,
        filterLocation: filterLocation || '',
        filterLowStock: filterLowStock || false,
        filterPriceMin,
        filterPriceMax
    })
    const {
        isSelectionMode,
        selectedItems,
        getSelectedItems,
        handleToggleSelectionMode,
        handleToggleItemSelection,
        handleSelectAllItems,
        handleDeselectAllItems,
        handleAddToCart,
        handleCreateDeliveryFromInventory,
    } = useInventorySelectionActions({
        reduxSelection,
        filteredItems,
        itemsById: itemsCache.itemsById,
        dispatch,
    })

    const selectedInventoryItems = getSelectedItems()

    const { handleBulkEditSave, handleBulkDelete } = useInventoryBulkActions({
        selectedItems,
        getSelectedItems,
        updateItem: updateItemMutation.mutateAsync,
        deleteItem: deleteItemMutation.mutateAsync,
        dispatch,
        onBulkEditSuccess: () => setShowBulkEditModal(false),
    })

    return (
        <div className="space-y-6 w-full">
            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="font-bold text-red-700 mb-2">Error al cargar inventario:</h3>
                    <p className="text-red-600 text-sm">{error.message || String(error)}</p>
                </div>
            )}

            {/* Ref para scroll automático */}
            <div ref={topRef} />

            {/* Header */}
            <InventoryHeader
                isSelectionMode={isSelectionMode}
                selectedItemsCount={selectedItems.size}
                filteredItemsCount={filteredItems.length}
                canCreate={canCreate}
                canDelete={canDelete}
                onToggleSelectionMode={handleToggleSelectionMode}
                onDeselectAllItems={handleDeselectAllItems}
                onAddToCart={handleAddToCart}
                onCreateDeliveryFromInventory={handleCreateDeliveryFromInventory}
                onShowQuoteModal={() => setShowQuoteModal(true)}
                onShowCollageModal={() => setShowCollageModal(true)}
                onShowBulkEditModal={() => setShowBulkEditModal(true)}
                onShowFacebookModal={() => setShowFacebookModal(true)}
                onBulkDelete={handleBulkDelete}
                onSelectAllItems={handleSelectAllItems}
                onShowAddModal={() => setShowAddModal(true)}
            />

            {/* Filters */}
            <InventoryFilters
                isDark={isDark}
                searchTerm={searchTerm}
                filterBrand={filterBrand}
                allBrands={allBrands}
                showAdvancedFilters={showAdvancedFilters}
                filteredItemsCount={filteredItems.length}
                filterCondition={filterCondition}
                filterPieceType={filterPieceType}
                filterTreasureHunt={filterTreasureHunt}
                filterChase={filterChase}
                filterLocation={filterLocation}
                uniqueLocations={uniqueLocations}
                filterLowStock={filterLowStock}
                filterPriceMin={filterPriceMin}
                filterPriceMax={filterPriceMax}
                filterFantasyOnly={filterFantasyOnly}
                filterFantasy={filterFantasy}
                filterMoto={filterMoto}
                filterCamioneta={filterCamioneta}
                filterFastFurious={filterFastFurious}
                onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
                onHandleFilterChange={handleFilterChange}
                onSetCurrentPage={setCurrentPage}
                onUpdateFilter={updateFilter}
                onSetFilterPriceMin={setFilterPriceMin}
                onSetFilterPriceMax={setFilterPriceMax}
                onSetFilterFantasyOnly={setFilterFantasyOnly}
                onHandleFantasyOnlyChange={handleFantasyOnlyChange}
                onHandleHideFantasyChange={handleHideFantasyChange}
            />

            {/* Pagination Controls - Top */}
            <InventoryPaginationControls
                pagination={pagination}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                isDark={isDark}
                onPageChange={handlePageChange}
            />

            {/* Inventory Grid with loading indicator */}
            <InventoryGridSection
                isPrefetchingNext={isPrefetchingNext}
                isLoading={isLoading}
                hasInventoryData={!!inventoryData}
                inventoryItemsCount={inventoryItems.length}
                filteredItems={filteredItems}
                searchTerm={searchTerm}
                filterCondition={filterCondition}
                filterBrand={filterBrand}
                filterPieceType={filterPieceType}
                filterTreasureHunt={filterTreasureHunt}
                filterChase={filterChase}
                canCreate={canCreate}
                isSelectionMode={isSelectionMode}
                selectedItems={selectedItems}
                isDark={isDark}
                canEdit={canEdit}
                canDelete={canDelete}
                formatPieceType={formatPieceType}
                getPlaceholderLogo={getPlaceholderLogo}
                onShowAddModal={() => setShowAddModal(true)}
                onToggleItemSelection={handleToggleItemSelection}
                onImageClick={handleImageClick}
                onNavigateToDetail={(id) => navigate(`/inventory/${id}`)}
                onAddToDelivery={(item) => {
                    const isAvailable = item.quantity > (item.reservedQuantity || 0)
                    if (item._id && isAvailable) {
                        dispatch(addMultipleToDeliveryCart([{
                            inventoryItemId: item._id,
                            carId: item.carId,
                            carName: item.carName || `${item.brand} - ${item.color || 'Unknown'}`,
                            quantity: 1,
                            unitPrice: item.actualPrice || item.suggestedPrice || 0,
                            photos: item.photos,
                            primaryPhotoIndex: item.primaryPhotoIndex,
                            maxAvailable: item.quantity - (item.reservedQuantity || 0),
                            brand: item.brand,
                            color: item.color
                        }]))
                        toast.success('Agregado al carrito de entrega')
                    }
                }}
                onAddToPos={(item) => {
                    const isAvailable = item.quantity > (item.reservedQuantity || 0)
                    if (item._id && isAvailable) {
                        dispatch(addMultipleToCart([item]))
                        toast.success('Agregado al carrito POS')
                    }
                }}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
            />

            {/* Pagination Controls - Bottom */}
            <InventoryPaginationControls
                pagination={pagination}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                isDark={isDark}
                onPageChange={handlePageChange}
            />

            {/* Add Item Modal */}
            <InventoryAddModal
                isOpen={showAddModal}
                isDark={isDark}
                allBrands={allBrands}
                selectedStore={selectedStore}
                inventoryItems={inventoryItems}
                onClose={() => setShowAddModal(false)}
            />

            {/* Edit Item Modal */}
            <InventoryEditModal
                isOpen={showEditModal}
                editingItem={editingItem}
                isSaving={updateItemMutation.isLoading}
                isDark={isDark}
                allBrands={allBrands}
                onItemChange={setEditingItem}
                onClose={closeEditModal}
                onSave={handleUpdateItem}
            />

            {/* Image Viewer Modal */}
            <ImageViewerModal
                isOpen={!!imageViewer}
                images={imageViewer?.images ?? []}
                initialIndex={imageViewer?.index ?? 0}
                onClose={closeImageViewer}
            />

            <InventorySecondaryModals
                showFacebookModal={showFacebookModal}
                showQuoteModal={showQuoteModal}
                showCollageModal={showCollageModal}
                showBulkEditModal={showBulkEditModal}
                selectedItems={selectedInventoryItems}
                onCloseFacebookModal={() => setShowFacebookModal(false)}
                onFacebookSuccess={() => {
                    dispatch(setSelectionMode(false))
                    dispatch(clearSelection())
                }}
                onCloseQuoteModal={() => setShowQuoteModal(false)}
                onCloseCollageModal={() => setShowCollageModal(false)}
                onCloseBulkEditModal={() => setShowBulkEditModal(false)}
                onBulkEditSave={handleBulkEditSave}
            />

            {/* Create Delivery Modal */}
            <InventoryCreateDeliveryModal
                isOpen={showCreateDeliveryModal}
                onClose={() => setShowCreateDeliveryModal(false)}
            />
        </div>
    )
}
