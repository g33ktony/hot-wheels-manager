import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/contexts/SearchContext'
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import { useCustomBrands, useCreateCustomBrand } from '@/hooks/useCustomBrands'
import { inventoryService } from '@/services/inventory'
import { useAppSelector, useAppDispatch } from '@/hooks/redux'
import { setInventoryItems } from '@/store/slices/inventorySlice'
import { addMultipleToCart } from '@/store/slices/cartSlice'
import { setSelectionMode, toggleItemSelection, selectAllItems, clearSelection } from '@/store/slices/selectionSlice'
import { cacheItems, updateCachedItem } from '@/store/slices/itemsCacheSlice'
import { useInventorySyncInBackground } from '@/hooks/useInventoryCache'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import { LazyImage } from '@/components/LazyImage'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Stepper from '@/components/common/Stepper'
import Modal from '@/components/common/Modal'
import FacebookPublishModal from '@/components/FacebookPublishModal'
import InventoryQuoteReport from '@/components/InventoryQuoteReport'
import CollageGenerator from '@/components/CollageGenerator'
import BulkEditModal from '@/components/BulkEditModal'
import { Plus, Search, Package, Edit, Trash2, X, Upload, MapPin, TrendingUp, CheckSquare, ChevronLeft, ChevronRight, Maximize2, Facebook, Info, FileText, Image, ShoppingCart } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import toast from 'react-hot-toast'
import debounce from 'lodash.debounce'
import OCRScanner from '@/components/OCRScanner'
import type { InventoryItem } from '../../../shared/types'

// Helper para formatear el tipo de pieza
const formatPieceType = (pieceType: string | undefined): string => {
    if (!pieceType) return '';
    const typeMap: Record<string, string> = {
        'basic': 'Básico',
        'premium': 'Premium',
        'rlc': 'RLC',
        'silver_series': 'Silver Series',
        'elite_64': 'Elite 64'
    };
    return typeMap[pieceType] || pieceType;
};

// Utility function: Calculate Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
    const track = new Array(str2.length + 1)
        .fill(null)
        .map(() => new Array(str1.length + 1).fill(0))

    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j
    }

    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            )
        }
    }

    return track[str2.length][str1.length]
}

// Utility function: Calculate similarity percentage (0-100)
const calculateSimilarity = (str1: string, str2: string): number => {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 100
    return ((maxLength - distance) / maxLength) * 100
}

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

/**
 * Convert base64 string to File object
 * Useful for converting OCR/camera captures to uploadable files
 */
function base64ToFile(base64: string, fileName: string): File {
    // Handle data URL format (data:image/jpeg;base64,...)
    const base64String = base64.includes(';base64,')
        ? base64.split(';base64,')[1]
        : base64

    // Convert base64 to binary
    const binaryString = atob(base64String)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    // Create blob and file
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    return new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() })
}

export default function Inventory() {
    // Sync inventory in background (keeps Redux cache fresh for other pages)
    useInventorySyncInBackground()

    // Cloudinary upload
    const { uploadImage } = useCloudinaryUpload()

    // Get Redux cache as fallback when React Query is loading
    const reduxInventory = useAppSelector(state => state.inventory)
    const reduxSelection = useAppSelector(state => state.selection)
    const itemsCache = useAppSelector(state => state.itemsCache)
    const dispatch = useAppDispatch()

    // Preload inventory in background (same strategy as POS)
    useEffect(() => {
        const preloadInventory = async () => {
            // Only preload if Redux is empty
            if (reduxInventory.items && reduxInventory.items.length > 0) {
                console.log('✅ Inventory: Using cached inventory -', reduxInventory.items.length, 'items')
                return
            }

            try {
                console.log('🔄 Inventory: Preloading all inventory in background...')

                // Load first batch
                const firstBatch = await inventoryService.getAll(1, 100, {})
                if (!firstBatch || !firstBatch.items) {
                    throw new Error('Invalid response from server')
                }

                const allItems = [...firstBatch.items]
                const totalItems = firstBatch.pagination?.totalItems || firstBatch.items.length
                const totalPages = Math.ceil(totalItems / 100)

                console.log('✅ Inventory: First batch loaded -', firstBatch.items.length, 'items of', totalItems)

                // Update Redux immediately with first batch
                dispatch(setInventoryItems({
                    items: firstBatch.items,
                    totalItems: totalItems,
                    currentPage: 1,
                    totalPages: totalPages,
                    itemsPerPage: 100
                }))

                // Load remaining pages in background
                if (totalPages > 1) {
                    console.log('🔄 Inventory: Loading remaining pages (' + (totalPages - 1) + ' more)...')

                    for (let page = 2; page <= totalPages; page++) {
                        try {
                            const batch = await inventoryService.getAll(page, 100, {})
                            allItems.push(...(batch.items || []))
                            console.log('✅ Inventory: Page', page, '/', totalPages, 'loaded')
                        } catch (pageError) {
                            console.warn('⚠️ Inventory: Error loading page', page, '-', pageError)
                        }
                    }

                    console.log('✅ Inventory: All pages loaded -', allItems.length, 'total items')

                    // Update Redux with all items
                    dispatch(setInventoryItems({
                        items: allItems,
                        totalItems: totalItems,
                        currentPage: 1,
                        totalPages: totalPages,
                        itemsPerPage: 100
                    }))
                }
            } catch (error: any) {
                console.error('❌ Inventory: Error preloading -', error)
            }
        }

        preloadInventory()
    }, [])

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

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(30) // Increased from 15 to load more with lazy loading
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // For debounced API calls
    const [filterPriceMin, setFilterPriceMin] = useState('')
    const [filterPriceMax, setFilterPriceMax] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [editingItemSnapshot, setEditingItemSnapshot] = useState<any>(null)
    // Image viewer modal
    const [showImageModal, setShowImageModal] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string>('')
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
    // Facebook publish modal
    const [showFacebookModal, setShowFacebookModal] = useState(false)
    // Quote report modal
    const [showQuoteModal, setShowQuoteModal] = useState(false)
    // Collage generator modal
    const [showCollageModal, setShowCollageModal] = useState(false)
    // Bulk edit modal
    const [showBulkEditModal, setShowBulkEditModal] = useState(false)
    // Search suggestions state
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [existingItemToUpdate, setExistingItemToUpdate] = useState<any>(null)
    const [customBrandInput, setCustomBrandInput] = useState('')
    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false)
    // Add item modal loading state
    const [isAddingItem, setIsAddingItem] = useState(false)
    // Photo upload state
    const [uploadingPhotos, setUploadingPhotos] = useState(0)

    // Ref para scroll automático
    const topRef = useRef<HTMLDivElement>(null)

    // Debounced search - actualiza después de 200ms sin escribir (optimizado para rapidez)
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setDebouncedSearchTerm(value)
            setCurrentPage(1) // Reset to page 1 on search
        }, 200),
        []
    )

    // Actualizar debounced search cuando cambia searchTerm
    useEffect(() => {
        debouncedSearch(searchTerm)
        // Cleanup
        return () => {
            debouncedSearch.cancel()
        }
    }, [searchTerm, debouncedSearch])

    const [newItem, setNewItem] = useState({
        carId: '',
        quantity: 1,
        purchasePrice: 28,
        suggestedPrice: 35,
        actualPrice: undefined as number | undefined,
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        notes: '',
        photos: [] as string[],
        location: '', // Ubicación física (caja)
        // Brand and type fields
        brand: 'Hot Wheels' as string,
        pieceType: 'basic' as 'basic' | 'premium' | 'rlc' | '',
        isTreasureHunt: false,
        isSuperTreasureHunt: false,
        isChase: false,
        isFantasy: false,
        isMoto: false,
        isCamioneta: false,
        isFastFurious: false,
        // Box/Series support
        isBox: false,
        boxSize: 10 as 5 | 8 | 10,
        pricePerPiece: 0,
        // Multiple cars support for series
        isMultipleCars: false,
        cars: [] as Array<{
            carId: string;
            quantity: number;
        }>,
        // Series fields
        seriesId: '',
        seriesName: '',
        seriesSize: 5,
        seriesPosition: 1,
        seriesPrice: 0,
        seriesDefaultPrice: 0
    })

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
        moto: filterMoto,
        camioneta: filterCamioneta,
        fastFurious: filterFastFurious
    })
    const { data: customBrands } = useCustomBrands()
    const createItemMutation = useCreateInventoryItem()
    const deleteItemMutation = useDeleteInventoryItem()
    const updateItemMutation = useUpdateInventoryItem()
    const createCustomBrandMutation = useCreateCustomBrand()

    // Query client for prefetching
    const queryClient = useQueryClient()

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

    // Cache items from current page in Redux so they're available for bulk operations
    useEffect(() => {
        if (inventoryData?.items && inventoryData.items.length > 0) {
            dispatch(cacheItems(inventoryData.items))
        }
    }, [inventoryData?.items, dispatch])

    const prefetchedPagesRef = useRef<Set<number>>(new Set())
    const [isPrefetchingNext, setIsPrefetchingNext] = useState(false)

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

    useEffect(() => {
        if (!pagination) return

        const nextPage = currentPage + 1
        if (nextPage > pagination.totalPages) return

        if (prefetchedPagesRef.current.has(nextPage)) return

        setIsPrefetchingNext(true)
        queryClient.prefetchQuery(
            ['inventory', nextPage, itemsPerPage, debouncedSearchTerm, filterCondition, filterBrand, filterPieceType, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta],
            () => inventoryService.getAll(nextPage, itemsPerPage, {
                search: debouncedSearchTerm,
                condition: filterCondition,
                brand: filterBrand,
                pieceType: filterPieceType,
                treasureHunt: filterTreasureHunt,
                chase: filterChase,
                fantasy: filterFantasy,
                moto: filterMoto,
                camioneta: filterCamioneta
            })
        ).then(() => {
            prefetchedPagesRef.current.add(nextPage)
        }).catch(() => {
            // Allow retry on failure by not marking the page as prefetched
        }).finally(() => setIsPrefetchingNext(false))
    }, [currentPage, pagination, itemsPerPage, debouncedSearchTerm, filterCondition, filterBrand, filterPieceType, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta, queryClient])

    useEffect(() => {
        prefetchedPagesRef.current.clear()
    }, [debouncedSearchTerm, filterCondition, filterBrand, filterPieceType, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta])

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

    // Resetear página a 1 cuando cambian los filtros
    const handleFilterChange = (filterType: string, value: any) => {
        setCurrentPage(1) // Reset to page 1 when filters change

        switch (filterType) {
            case 'search':
                updateFilter('searchTerm', value)
                break
            case 'condition':
                updateFilter('filterCondition', value)
                break
            case 'brand':
                updateFilter('filterBrand', value)
                break
            case 'pieceType':
                updateFilter('filterPieceType', value)
                break
            case 'treasureHunt':
                updateFilter('filterTreasureHunt', value)
                break
            case 'chase':
                updateFilter('filterChase', value)
                break
            case 'fantasy':
                updateFilter('filterFantasy', value)
                break
            case 'moto':
                updateFilter('filterMoto', value)
                break
            case 'camioneta':
                updateFilter('filterCamioneta', value)
                break
            case 'fastFurious':
                updateFilter('filterFastFurious', value)
                break
        }
    }

    // Función para cambiar de página con scroll automático
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        // Always scroll to top when changing pages
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    // Componente de paginación reutilizable
    const PaginationControls = () => {
        if (!pagination || pagination.totalPages <= 1) return null

        return (
            <div className="bg-slate-800 border rounded-lg p-3 w-full">
                {/* Info text - hidden on mobile to save space */}
                <div className="hidden sm:flex items-center justify-center text-sm text-gray-700 mb-3">
                    <span>
                        Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> -{' '}
                        <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, pagination.totalItems)}
                        </span> de{' '}
                        <span className="font-medium">{pagination.totalItems}</span> items
                    </span>
                </div>

                {/* Mobile compact info */}
                <div className="sm:hidden text-xs text-slate-400 text-center mb-2">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.totalItems)} de {pagination.totalItems} items
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2 sm:px-3"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Anterior</span>
                    </Button>

                    <div className="flex items-center gap-1">
                        {[...Array(pagination.totalPages)].map((_, idx) => {
                            const pageNum = idx + 1
                            // Show first, last, current, and pages around current
                            if (
                                pageNum === 1 ||
                                pageNum === pagination.totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-2 sm:px-3 py-1 rounded text-sm font-medium transition-colors min-w-[32px] ${currentPage === pageNum
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-slate-700 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                            ) {
                                return <span key={pageNum} className="px-1 text-gray-400">...</span>
                            }
                            return null
                        })}
                    </div>

                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePageChange(Math.min(pagination.totalPages, currentPage + 1))}
                        disabled={currentPage === pagination.totalPages}
                        className="flex items-center gap-1 px-2 sm:px-3"
                    >
                        <span className="hidden sm:inline">Siguiente</span>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        )
    }

    if (isLoading && inventoryItems.length === 0) {
        console.log('🔄 Inventory: Loading from API...')
    }

    if (error && inventoryItems.length === 0) {
        console.error('❌ Inventory: Error loading -', error)
    }

    // Filtrado local con búsqueda inteligente
    const filteredItems = useMemo(() => {
        let items = inventoryItems.filter((item: any) => {
            const quantity = item.quantity || 0;
            const reserved = item.reservedQuantity || 0;
            // Mostrar items con stock disponible O con reservas (pero al menos algo de stock)
            // Ocultar solo los items completamente vacíos (0/0)
            return !(quantity === 0 && reserved === 0);
        });

        // Aplicar filtros adicionales localmente
        items = items.filter((item: any) => {
            const quantity = item.quantity || 0;
            const reserved = item.reservedQuantity || 0;
            const available = quantity - reserved;

            // Filtro de ubicación
            if (filterLocation) {
                const itemLocation = (item.location || '').toLowerCase();
                if (!itemLocation.includes(filterLocation.toLowerCase())) return false;
            }

            // Filtro de stock bajo (≤3 disponibles - solo cuenta stock disponible no reservado)
            if (filterLowStock && available > 3) return false;

            // Filtro de rango de precio (actualPrice o suggestedPrice)
            const price = item.actualPrice || item.suggestedPrice || 0;
            if (filterPriceMin && price < parseFloat(filterPriceMin)) return false;
            if (filterPriceMax && price > parseFloat(filterPriceMax)) return false;

            return true;
        });

        // Si hay búsqueda con término, aplicar scoring inteligente
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase().trim();
            const queryWords = query.split(/\\s+/);

            const scoredItems = items
                .map((item: any) => {
                    const carData = typeof item.carId === 'object' ? item.carId : null;
                    const carName = (carData?.name || '').toLowerCase();
                    const carIdStr = (typeof item.carId === 'string' ? item.carId : carData?._id || '').toLowerCase();
                    const brand = (item.brand || '').toLowerCase();
                    const pieceType = (item.pieceType || '').toLowerCase();
                    const location = (item.location || '').toLowerCase();
                    const condition = (item.condition || '').toLowerCase();
                    const notes = (item.notes || '').toLowerCase();

                    let score = 0;

                    // 1. Coincidencia exacta completa
                    if (carName === query) score += 1000;
                    if (brand === query) score += 900;
                    if (pieceType === query) score += 800;

                    // 2. Contiene la frase completa
                    if (carName.includes(query)) score += 500;
                    if (brand.includes(query)) score += 400;
                    if (pieceType.includes(query)) score += 300;
                    if (location.includes(query)) score += 200;
                    if (condition.includes(query)) score += 150;
                    if (notes.includes(query)) score += 100;
                    if (carIdStr.includes(query)) score += 50;

                    // 3. Empieza con la búsqueda
                    if (carName.startsWith(query)) score += 400;
                    if (brand.startsWith(query)) score += 350;
                    if (pieceType.startsWith(query)) score += 250;

                    // 4. Búsqueda por palabras individuales
                    queryWords.forEach(word => {
                        if (word.length < 2) return;

                        const carNameWords = carName.split(/\\s+/);
                        const brandWords = brand.split(/\\s+/);

                        if (carNameWords.some((w: string) => w === word)) score += 200;
                        if (brandWords.some((w: string) => w === word)) score += 180;
                        if (carNameWords.some((w: string) => w.startsWith(word))) score += 150;
                        if (brandWords.some((w: string) => w.startsWith(word))) score += 130;

                        if (carName.includes(word)) score += 80;
                        if (brand.includes(word)) score += 70;
                        if (pieceType.includes(word)) score += 60;
                        if (location.includes(word)) score += 40;
                        if (notes.includes(word)) score += 30;
                    });

                    // 5. Similitud fuzzy (umbral bajo)
                    const FUZZY_THRESHOLD = 60;

                    const carNameSimilarity = calculateSimilarity(query, carName);
                    const brandSimilarity = calculateSimilarity(query, brand);
                    const pieceTypeSimilarity = calculateSimilarity(query, pieceType);

                    if (carNameSimilarity >= FUZZY_THRESHOLD) score += carNameSimilarity * 2;
                    if (brandSimilarity >= FUZZY_THRESHOLD) score += brandSimilarity * 1.5;
                    if (pieceTypeSimilarity >= FUZZY_THRESHOLD) score += pieceTypeSimilarity;

                    // 6. Bonus por palabras individuales con fuzzy
                    queryWords.forEach(word => {
                        if (word.length >= 3) {
                            const wordCarSimilarity = calculateSimilarity(word, carName);
                            const wordBrandSimilarity = calculateSimilarity(word, brand);

                            if (wordCarSimilarity >= 70) score += 100;
                            if (wordBrandSimilarity >= 70) score += 80;
                        }
                    });

                    return score > 0 ? { item, score } : null;
                })
                .filter((result: any): result is { item: any; score: number } => result !== null)
                .sort((a: any, b: any) => b.score - a.score)
                .map((result: any) => result.item);

            console.log('🔍 Inventory Smart Search:', {
                query,
                queryWords,
                includesReservedItems: true, // Inventory muestra items con reservas también
                resultsFound: scoredItems.length,
                topResults: scoredItems.slice(0, 3).map((i: any) => ({
                    name: typeof i.carId === 'object' ? i.carId?.name : i.carId,
                    brand: i.brand,
                    total: i.quantity || 0,
                    reserved: i.reservedQuantity || 0,
                    available: (i.quantity || 0) - (i.reservedQuantity || 0)
                }))
            });

            return scoredItems;
        }

        return items;
    }, [inventoryItems, searchTerm, filterLocation, filterLowStock, filterPriceMin, filterPriceMax]);

    const handleAddItem = async () => {
        try {
            setIsAddingItem(true)

            // If updating an existing item
            if (existingItemToUpdate) {
                // Update existing item
                await updateItemMutation.mutateAsync({
                    id: existingItemToUpdate._id,
                    data: {
                        carId: newItem.carId,
                        quantity: newItem.quantity,
                        purchasePrice: newItem.purchasePrice,
                        suggestedPrice: newItem.suggestedPrice,
                        condition: newItem.condition,
                        notes: newItem.notes,
                        photos: newItem.photos,
                        location: newItem.location,
                        brand: newItem.brand,
                        pieceType: newItem.pieceType || undefined,
                        isTreasureHunt: newItem.isTreasureHunt,
                        isSuperTreasureHunt: newItem.isSuperTreasureHunt,
                        isChase: newItem.isChase,
                        isFantasy: newItem.isFantasy,
                        isMoto: newItem.isMoto,
                        isCamioneta: newItem.isCamioneta,
                        isFastFurious: newItem.isFastFurious
                    }
                })
            } else if (newItem.isMultipleCars && newItem.cars.length > 0) {
                // Handle multiple cars (series/box with different models)
                const totalPieces = newItem.cars.reduce((sum, car) => sum + car.quantity, 0)
                const pricePerPiece = totalPieces > 0 ? newItem.purchasePrice / totalPieces : 0

                // Calculate suggested price based on whether it's a series or not
                const suggestedPricePerPiece = newItem.seriesId && newItem.seriesPrice > 0
                    ? newItem.seriesPrice / totalPieces // For series, divide series price by total pieces
                    : newItem.suggestedPrice // For non-series, use the entered price per piece

                // Create inventory item for each car
                let position = 1
                for (const car of newItem.cars) {
                    await createItemMutation.mutateAsync({
                        carId: car.carId,
                        quantity: car.quantity,
                        purchasePrice: pricePerPiece,
                        suggestedPrice: suggestedPricePerPiece,
                        actualPrice: newItem.actualPrice,
                        condition: newItem.condition,
                        notes: newItem.notes,
                        photos: newItem.photos,
                        location: newItem.location,
                        brand: newItem.brand,
                        pieceType: newItem.pieceType || undefined,
                        isTreasureHunt: newItem.isTreasureHunt,
                        isSuperTreasureHunt: newItem.isSuperTreasureHunt,
                        isChase: newItem.isChase,
                        isFantasy: newItem.isFantasy,
                        isMoto: newItem.isMoto,
                        isCamioneta: newItem.isCamioneta,
                        isFastFurious: newItem.isFastFurious,
                        // Include series info if this is a series
                        ...(newItem.seriesId && {
                            seriesId: newItem.seriesId,
                            seriesName: newItem.seriesName,
                            seriesSize: newItem.seriesSize,
                            seriesPosition: position++, // Increment position for each piece
                            seriesPrice: newItem.seriesPrice
                        })
                    })
                }
            } else {
                // Handle single car or box with same model
                const finalPurchasePrice = newItem.isBox
                    ? newItem.purchasePrice / newItem.boxSize
                    : newItem.purchasePrice

                const finalSuggestedPrice = newItem.suggestedPrice

                await createItemMutation.mutateAsync({
                    carId: newItem.carId,
                    quantity: newItem.quantity,
                    purchasePrice: finalPurchasePrice,
                    suggestedPrice: finalSuggestedPrice,
                    actualPrice: newItem.actualPrice,
                    condition: newItem.condition,
                    notes: newItem.notes,
                    photos: newItem.photos,
                    location: newItem.location,
                    brand: newItem.brand,
                    pieceType: newItem.pieceType || undefined,
                    isTreasureHunt: newItem.isTreasureHunt,
                    isSuperTreasureHunt: newItem.isSuperTreasureHunt,
                    isChase: newItem.isChase,
                    isFantasy: newItem.isFantasy,
                    isMoto: newItem.isMoto,
                    isCamioneta: newItem.isCamioneta,
                    isFastFurious: newItem.isFastFurious,
                    // Include series info if this is a series
                    ...(newItem.seriesId && {
                        seriesId: newItem.seriesId,
                        seriesName: newItem.seriesName,
                        seriesSize: newItem.seriesSize,
                        seriesPosition: newItem.seriesPosition,
                        seriesPrice: newItem.seriesPrice
                    })
                })
            }

            // Reset form and close modal
            resetForm()
            setIsAddingItem(false)
        } catch (error) {
            console.error('Error adding/updating item:', error)
            setIsAddingItem(false)
        }
    }

    const resetForm = () => {
        setNewItem({
            carId: '',
            quantity: 1,
            purchasePrice: 28,
            suggestedPrice: 35,
            actualPrice: undefined,
            condition: 'mint',
            notes: '',
            photos: [],
            location: '',
            brand: 'Hot Wheels',
            pieceType: 'basic',
            isTreasureHunt: false,
            isSuperTreasureHunt: false,
            isChase: false,
            isFantasy: false,
            isMoto: false,
            isCamioneta: false,
            isFastFurious: false,
            isBox: false,
            boxSize: 10,
            pricePerPiece: 0,
            isMultipleCars: false,
            cars: [],
            seriesId: '',
            seriesName: '',
            seriesSize: 5,
            seriesPosition: 1,
            seriesPrice: 0,
            seriesDefaultPrice: 0
        })
        setExistingItemToUpdate(null)
        setShowSuggestions(false)
        setShowCustomBrandInput(false)
        setCustomBrandInput('')
        setShowAddModal(false)
    }

    const handleEditItem = (item: any) => {
        setEditingItem({
            ...item,
            carId: item.carId || '',
            quantity: item.quantity || 1,
            purchasePrice: item.purchasePrice || 0,
            suggestedPrice: item.suggestedPrice || 0,
            actualPrice: item.actualPrice,
            condition: item.condition || 'mint',
            notes: item.notes || '',
            photos: item.photos || [],
            location: item.location || '',
            brand: item.brand || '',
            pieceType: item.pieceType || '',
            isTreasureHunt: item.isTreasureHunt || false,
            isSuperTreasureHunt: item.isSuperTreasureHunt || false,
            isChase: item.isChase || false,
            isFantasy: item.isFantasy || false,
            isMoto: item.isMoto || false,
            isCamioneta: item.isCamioneta || false,
            seriesId: item.seriesId || '',
            seriesName: item.seriesName || '',
            seriesSize: item.seriesSize,
            seriesPosition: item.seriesPosition,
            seriesPrice: item.seriesPrice,
            seriesDefaultPrice: item.seriesDefaultPrice || 0
        })
        setEditingItemSnapshot(JSON.parse(JSON.stringify(item)))
        setShowEditModal(true)
    }

    const editableFields = [
        'carId',
        'quantity',
        'purchasePrice',
        'suggestedPrice',
        'actualPrice',
        'condition',
        'notes',
        'photos',
        'location',
        'brand',
        'pieceType',
        'isTreasureHunt',
        'isSuperTreasureHunt',
        'isChase',
        'isFantasy',
        'isMoto',
        'isCamioneta',
        'isFastFurious',
        'seriesId',
        'seriesName',
        'seriesSize',
        'seriesPosition',
        'seriesPrice'
    ]

    const areValuesEqual = (a: any, b: any) => {
        if (Array.isArray(a) || Array.isArray(b)) {
            if (!Array.isArray(a) || !Array.isArray(b)) return false
            if (a.length !== b.length) return false
            return a.every((value, index) => value === b[index])
        }
        return a === b
    }

    const buildEditPatch = (original: any, updated: any): Record<string, any> => {
        if (!original || !updated) return {}
        const patch: Record<string, any> = {}
        editableFields.forEach((field) => {
            const originalValue = original[field]
            const updatedValue = updated[field]
            if (!areValuesEqual(originalValue, updatedValue)) {
                patch[field] = updatedValue
            }
        })
        return patch
    }

    const handleUpdateItem = async () => {
        if (!editingItem) return

        try {
            const diff = buildEditPatch(editingItemSnapshot, editingItem)

            if (Object.keys(diff).length === 0) {
                toast('Sin cambios nuevos para guardar')
                return
            }

            await updateItemMutation.mutateAsync({
                id: editingItem._id,
                data: diff
            })

            setShowEditModal(false)
            setEditingItem(null)
            setEditingItemSnapshot(null)
        } catch (error) {
            console.error('Error updating item:', error)
        }
    }

    const handleDeleteItem = async (id: string) => {
        if (!id) return

        if (confirm('¿Estás seguro de que quieres eliminar esta pieza?')) {
            try {
                await deleteItemMutation.mutateAsync(id)
            } catch (error) {
                console.error('Error deleting item:', error)
            }
        }
    }

    // Bulk selection functions - now using Redux
    const isSelectionMode = reduxSelection.isSelectionMode
    const selectedItemIds = reduxSelection.selectedItemIds
    const selectedItems = new Set(selectedItemIds)

    const handleToggleSelectionMode = () => {
        dispatch(setSelectionMode(!isSelectionMode))
    }

    const handleToggleItemSelection = (itemId: string) => {
        dispatch(toggleItemSelection(itemId))
    }

    const handleSelectAllItems = () => {
        const allIds = filteredItems.map((item: InventoryItem) => item._id).filter(Boolean) as string[]
        dispatch(selectAllItems(allIds))
    }

    const handleDeselectAllItems = () => {
        dispatch(clearSelection())
    }

    // Get all selected items from Redux store (includes items from all pages)
    const getSelectedItems = useCallback((): InventoryItem[] => {
        if (selectedItems.size === 0) return []

        // Use itemsCache which contains ALL items from all pages visited
        // This is the single source of truth for selected items
        const selectedItemsList = Array.from(selectedItems)
            .map(id => itemsCache.itemsById[id])
            .filter(Boolean) as InventoryItem[]

        return selectedItemsList
    }, [selectedItems, itemsCache.itemsById])

    const handleAddToCart = () => {
        if (selectedItems.size === 0) return

        const itemsToAdd = getSelectedItems()

        // Convert to ReduxInventoryItem format and add to cart
        dispatch(addMultipleToCart(itemsToAdd as any))

        toast.success(`${itemsToAdd.length} ${itemsToAdd.length === 1 ? 'item agregado' : 'items agregados'} al carrito`)

        // Clear selection and exit selection mode
        dispatch(clearSelection())
        dispatch(setSelectionMode(false))
    }

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return

        const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedItems.size} ${selectedItems.size === 1 ? 'pieza' : 'piezas'}?`

        if (confirm(confirmMessage)) {
            try {
                // Delete all selected items
                await Promise.all(
                    Array.from(selectedItems).map(id => deleteItemMutation.mutateAsync(id))
                )

                // Clear selection and exit selection mode
                dispatch(clearSelection())
                dispatch(setSelectionMode(false))
                toast.success('Piezas eliminadas correctamente')
            } catch (error) {
                console.error('Error deleting items:', error)
                alert('Error al eliminar algunas piezas. Por favor intenta de nuevo.')
            }
        }
    }

    // Search and select existing item
    const handleCarIdChange = (value: string) => {
        setNewItem({ ...newItem, carId: value })

        // Show suggestions if there are matching items
        if (value.length > 0) {
            setShowSuggestions(true)
        } else {
            setShowSuggestions(false)
            setExistingItemToUpdate(null)
        }
    }

    const getMatchingItems = useMemo(() => {
        if (!newItem.carId || newItem.carId.length === 0) return []

        const SIMILARITY_THRESHOLD = 75 // 75% similarity

        return (inventoryItems?.filter((item: InventoryItem) => {
            if (!item.carId) return false

            // Exact match or contains (still prioritize these)
            if (item.carId.toLowerCase().includes(newItem.carId.toLowerCase())) {
                return true
            }

            // Fuzzy match with 75% similarity threshold
            const similarity = calculateSimilarity(newItem.carId, item.carId)
            return similarity >= SIMILARITY_THRESHOLD
        }) || [])
            .sort((a: InventoryItem, b: InventoryItem) => {
                if (!a.carId || !b.carId) return 0

                // Prioritize exact matches
                const aExact = a.carId.toLowerCase().includes(newItem.carId.toLowerCase())
                const bExact = b.carId.toLowerCase().includes(newItem.carId.toLowerCase())

                if (aExact && !bExact) return -1
                if (!aExact && bExact) return 1

                // Then sort by similarity score (highest first)
                const aSimilarity = calculateSimilarity(newItem.carId, a.carId)
                const bSimilarity = calculateSimilarity(newItem.carId, b.carId)

                return bSimilarity - aSimilarity
            })
    }, [newItem.carId, inventoryItems])

    const handleSelectExistingItem = (item: any) => {
        setExistingItemToUpdate(item)
        setNewItem({
            carId: item.carId,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            suggestedPrice: item.suggestedPrice,
            actualPrice: item.actualPrice,
            condition: item.condition,
            notes: item.notes || '',
            photos: item.photos || [],
            location: item.location || '',
            brand: item.brand || '',
            pieceType: item.pieceType || '',
            isTreasureHunt: item.isTreasureHunt || false,
            isSuperTreasureHunt: item.isSuperTreasureHunt || false,
            isChase: item.isChase || false,
            isFastFurious: item.isFastFurious || false,
            isFantasy: item.isFantasy || false,
            isMoto: item.isMoto || false,
            isCamioneta: item.isCamioneta || false,
            isBox: false,
            boxSize: 10,
            pricePerPiece: 0,
            isMultipleCars: false,
            cars: [],
            seriesId: item.seriesId || '',
            seriesName: item.seriesName || '',
            seriesSize: item.seriesSize || 5,
            seriesPosition: item.seriesPosition || 1,
            seriesPrice: item.seriesPrice || 0,
            seriesDefaultPrice: item.seriesDefaultPrice || 0
        })
        setShowSuggestions(false)
    }

    const handleCancelUpdate = () => {
        setExistingItemToUpdate(null)
        setNewItem({
            ...newItem,
            quantity: 1,
            purchasePrice: 0,
            suggestedPrice: 0,
            condition: 'mint',
            notes: '',
            photos: [],
            location: ''
        })
    }

    const handleBrandChange = async (value: string) => {
        if (value === 'custom') {
            setShowCustomBrandInput(true)
            setNewItem({ ...newItem, brand: '' })
        } else {
            setShowCustomBrandInput(false)
            setNewItem({ ...newItem, brand: value })
        }
    }

    const handleSaveCustomBrand = async () => {
        if (customBrandInput.trim()) {
            try {
                const newBrand = await createCustomBrandMutation.mutateAsync(customBrandInput.trim())
                setNewItem({ ...newItem, brand: newBrand.name })
                setShowCustomBrandInput(false)
                setCustomBrandInput('')
            } catch (error) {
                console.error('Error saving custom brand:', error)
            }
        }
    }

    // Image modal handlers
    const handleImageClick = (photos: string[], index: number = 0) => {
        if (photos && photos.length > 0) {
            setAllImagesForModal(photos)
            setSelectedImageIndex(index)
            setSelectedImage(photos[index])
            setShowImageModal(true)
        }
    }

    const handleNextImage = () => {
        const nextIndex = (selectedImageIndex + 1) % allImagesForModal.length
        setSelectedImageIndex(nextIndex)
        setSelectedImage(allImagesForModal[nextIndex])
    }

    const handlePrevImage = () => {
        const prevIndex = (selectedImageIndex - 1 + allImagesForModal.length) % allImagesForModal.length
        setSelectedImageIndex(prevIndex)
        setSelectedImage(allImagesForModal[prevIndex])
    }

    const handleCloseImageModal = () => {
        setShowImageModal(false)
        setSelectedImage('')
        setSelectedImageIndex(0)
        setAllImagesForModal([])
    }

    // Calcular margen de ganancia sugerido basado en condición
    const calculateSuggestedMargin = (purchasePrice: number, condition: string): number => {
        if (purchasePrice === 0) return 0

        // Márgenes sugeridos según condición:
        const margins = {
            'mint': 0.50,    // 50% de ganancia
            'good': 0.40,    // 40% de ganancia
            'fair': 0.30,    // 30% de ganancia
            'poor': 0.20     // 20% de ganancia
        }

        const margin = margins[condition as keyof typeof margins] || 0.40
        return purchasePrice * (1 + margin)
    }

    // Auto-calcular precio sugerido cuando cambia precio de compra o condición
    const handlePurchasePriceChange = (value: number) => {
        setNewItem(prev => ({
            ...prev,
            purchasePrice: value,
            suggestedPrice: calculateSuggestedMargin(value, prev.condition)
        }))
    }

    const handleConditionChange = (condition: string) => {
        setNewItem(prev => ({
            ...prev,
            condition: condition as any,
            suggestedPrice: calculateSuggestedMargin(prev.purchasePrice, condition)
        }))
    }

    // Photo handling functions with Cloudinary upload
    const handleFileUpload = async (files: FileList | null, isEditing: boolean = false) => {
        if (!files) return

        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
        }

        // Track number of uploads in progress
        setUploadingPhotos(prev => prev + files.length)

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    // Comprimir imagen
                    const compressedFile = await imageCompression(file, compressionOptions)
                    console.log(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)

                    // Subir a Cloudinary
                    const result = await uploadImage(compressedFile)
                    if (result) {
                        // Guardar solo la URL de Cloudinary, no base64
                        if (isEditing && editingItem) {
                            setEditingItem((prev: any) => ({
                                ...prev,
                                photos: [...(prev.photos || []), result.url]
                            }))
                        } else {
                            setNewItem(prev => ({
                                ...prev,
                                photos: [...prev.photos, result.url]
                            }))
                        }
                        console.log(`☁️ Uploaded to Cloudinary: ${result.url}`)
                    } else {
                        toast.error('Falló la carga de imagen a Cloudinary')
                    }
                } catch (error) {
                    console.error('Error al subir imagen:', error)
                    toast.error('Error al subir imagen a Cloudinary')
                } finally {
                    setUploadingPhotos(prev => Math.max(0, prev - 1))
                }
            }
        }
    }

    const removePhoto = (index: number, isEditing: boolean = false) => {
        if (isEditing && editingItem) {
            setEditingItem((prev: any) => ({
                ...prev,
                photos: prev.photos?.filter((_: any, i: number) => i !== index) || []
            }))
        } else {
            setNewItem(prev => ({
                ...prev,
                photos: prev.photos.filter((_, i) => i !== index)
            }))
        }
    }

    return (
        <div className="space-y-6 w-full">
            {/* Debug: Show loading status */}
            {isLoading && inventoryItems.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-700">
                    🔄 Loading... (isLoading: {isLoading ? 'true' : 'false'}, items: {inventoryItems.length})
                </div>
            )}

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                <div>
                    <h1 className="text-2xl font-bold text-white">Inventario</h1>
                    <p className="text-slate-400">Gestiona tus piezas de Hot Wheels</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isSelectionMode ? (
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleToggleSelectionMode}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            {selectedItems.size > 0 && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={handleDeselectAllItems}
                                        size="sm"
                                    >
                                        Deseleccionar ({selectedItems.size})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<ShoppingCart size={18} />}
                                        onClick={handleAddToCart}
                                        size="sm"
                                    >
                                        Agregar al Carrito ({selectedItems.size})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<FileText size={18} />}
                                        onClick={() => setShowQuoteModal(true)}
                                        size="sm"
                                    >
                                        Generar Cotización ({selectedItems.size})
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={<Image size={18} />}
                                        onClick={() => setShowCollageModal(true)}
                                        size="sm"
                                    >
                                        Collages para FB
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Edit size={18} />}
                                        onClick={() => setShowBulkEditModal(true)}
                                        size="sm"
                                    >
                                        Editar ({selectedItems.size})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon={<Facebook size={18} />}
                                        onClick={() => setShowFacebookModal(true)}
                                        size="sm"
                                    >
                                        Publicar en Facebook
                                    </Button>
                                    <Button
                                        variant="danger"
                                        icon={<Trash2 size={18} />}
                                        onClick={handleBulkDelete}
                                        size="sm"
                                    >
                                        Eliminar ({selectedItems.size})
                                    </Button>
                                </>
                            )}
                            {selectedItems.size === 0 && filteredItems.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={handleSelectAllItems}
                                    size="sm"
                                >
                                    Seleccionar Todo
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            {filteredItems.length > 0 && (
                                <Button
                                    variant="secondary"
                                    icon={<CheckSquare size={18} />}
                                    onClick={handleToggleSelectionMode}
                                    size="sm"
                                >
                                    Seleccionar
                                </Button>
                            )}
                            <Button
                                icon={<Plus size={18} />}
                                onClick={() => setShowAddModal(true)}
                                size="sm"
                            >
                                Agregar Pieza
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="space-y-4 w-full">
                    {/* Search is now shared globally across all pages */}

                    {/* First row: Search and Condition */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 w-full">
                        <div className="relative w-full">
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <Input
                                placeholder="Buscar por nombre o código..."
                                value={searchTerm}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="pl-10 pr-10"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => handleFilterChange('search', '')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition"
                                    aria-label="Limpiar búsqueda"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <select
                            value={filterCondition}
                            onChange={(e) => handleFilterChange('condition', e.target.value)}
                            className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                            style={{
                                fontSize: '16px',
                                WebkitAppearance: 'none',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <option value="">Todas las condiciones</option>
                            <option value="mint">Mint</option>
                            <option value="good">Bueno</option>
                            <option value="fair">Regular</option>
                            <option value="poor">Malo</option>
                        </select>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400 select-none">
                                {filteredItems.length} pieza{filteredItems.length !== 1 ? 's' : ''} encontrada{filteredItems.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Second row: Brand and Type filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                        <select
                            value={filterBrand}
                            onChange={(e) => {
                                handleFilterChange('brand', e.target.value)
                                // Reset type-specific filters when brand changes
                                if (e.target.value === '') {
                                    handleFilterChange('pieceType', '')
                                    handleFilterChange('treasureHunt', 'all')
                                    handleFilterChange('chase', false)
                                }
                            }}
                            className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                            style={{
                                fontSize: '16px',
                                WebkitAppearance: 'none',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <option value="">Todas las marcas</option>
                            {allBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>

                        {/* Piece Type filter - only show if brand is selected */}
                        {filterBrand && (
                            <select
                                value={filterPieceType}
                                onChange={(e) => {
                                    handleFilterChange('pieceType', e.target.value)
                                    // Reset special edition filters when type changes
                                    handleFilterChange('treasureHunt', 'all')
                                    handleFilterChange('chase', false)
                                }}
                                className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                                style={{
                                    fontSize: '16px',
                                    WebkitAppearance: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <option value="">Todos los tipos</option>
                                <option value="basic">Básico</option>
                                <option value="premium">Premium</option>
                                <option value="rlc">RLC</option>
                                <option value="silver_series">Silver Series</option>
                                <option value="elite_64">Elite 64</option>
                            </select>
                        )}

                        {/* TH/STH filter - only for Hot Wheels Basic */}
                        {filterBrand?.toLowerCase() === 'hot wheels' && filterPieceType === 'basic' && (
                            <select
                                value={filterTreasureHunt}
                                onChange={(e) => handleFilterChange('treasureHunt', e.target.value as 'all' | 'th' | 'sth')}
                                className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                                style={{
                                    fontSize: '16px',
                                    WebkitAppearance: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <option value="all">Todos (TH/STH)</option>
                                <option value="th">Solo TH</option>
                                <option value="sth">Solo STH</option>
                            </select>
                        )}

                        {/* Chase filter - for Mini GT, Kaido, M2, or Hot Wheels Premium */}
                        {((filterBrand && ['mini gt', 'kaido house', 'm2 machines'].includes(filterBrand.toLowerCase())) ||
                            (filterBrand?.toLowerCase() === 'hot wheels' && filterPieceType === 'premium')) && (
                                <label className="flex items-center gap-2 input cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filterChase}
                                        onChange={(e) => handleFilterChange('chase', e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Solo Chase 🌟
                                    </span>
                                </label>
                            )}

                        {/* Fantasy filter - only for Hot Wheels */}
                        {filterBrand?.toLowerCase() === 'hot wheels' && (
                            <label className="flex items-center gap-2 input cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterFantasy}
                                    onChange={(e) => handleFilterChange('fantasy', e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Solo Fantasías 🎨
                                </span>
                            </label>
                        )}

                        {/* Moto filter */}
                        <label className="flex items-center gap-2 input cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterMoto}
                                onChange={(e) => handleFilterChange('moto', e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Solo Motos 🏍️
                            </span>
                        </label>

                        {/* Camioneta filter */}
                        <label className="flex items-center gap-2 input cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterCamioneta}
                                onChange={(e) => handleFilterChange('camioneta', e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Solo Camionetas 🚚
                            </span>
                        </label>

                        {/* Fast and Furious filter */}
                        <label className="flex items-center gap-2 input cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterFastFurious}
                                onChange={(e) => handleFilterChange('fastFurious', e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Solo Fast and Furious 🏎️
                            </span>
                        </label>
                    </div>

                    {/* Tercera fila: Filtros adicionales (ubicación, stock, precio) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                        <select
                            value={filterLocation}
                            onChange={(e) => {
                                setCurrentPage(1);
                                updateFilter('filterLocation', e.target.value);
                            }}
                            className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                            style={{
                                fontSize: '16px',
                                WebkitAppearance: 'none',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <option value="">Todas las ubicaciones</option>
                            {uniqueLocations.map(location => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>

                        <label className="flex items-center gap-2 input cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterLowStock}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    updateFilter('filterLowStock', e.target.checked);
                                }}
                                className="rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Stock bajo (≤3)
                            </span>
                        </label>

                        <input
                            type="number"
                            value={filterPriceMin}
                            onChange={(e) => {
                                setCurrentPage(1);
                                setFilterPriceMin(e.target.value);
                            }}
                            placeholder="Precio mínimo"
                            className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                            style={{
                                fontSize: '16px',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        />

                        <input
                            type="number"
                            value={filterPriceMax}
                            onChange={(e) => {
                                setCurrentPage(1);
                                setFilterPriceMax(e.target.value);
                            }}
                            placeholder="Precio máximo"
                            className="input px-4 py-3 min-h-[44px] touch-manipulation rounded-lg w-full"
                            style={{
                                fontSize: '16px',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        />
                    </div>

                    {/* Clear filters button */}
                    {(searchTerm || filterCondition || filterBrand || filterPieceType || filterTreasureHunt !== 'all' || filterChase || filterLocation || filterLowStock || filterFantasy || filterMoto || filterCamioneta || filterFastFurious || filterPriceMin || filterPriceMax) && (
                        <div className="flex justify-end">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setCurrentPage(1) // Reset page
                                    updateFilter('searchTerm', '')
                                    updateFilter('filterCondition', '')
                                    updateFilter('filterBrand', '')
                                    updateFilter('filterPieceType', '')
                                    updateFilter('filterTreasureHunt', 'all')
                                    updateFilter('filterChase', false)
                                    updateFilter('filterFantasy', false)
                                    updateFilter('filterMoto', false)
                                    updateFilter('filterCamioneta', false)
                                    updateFilter('filterFastFurious', false)
                                    updateFilter('filterLocation', '')
                                    updateFilter('filterLowStock', false)
                                    setFilterPriceMin('')
                                    setFilterPriceMax('')
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Pagination Controls - Top */}
            <PaginationControls />

            {/* Inventory Grid with loading indicator */}
            <div className="relative">
                {/* Subtle prefetch indicator when preparing next page */}
                {isPrefetchingNext && !isLoading && (
                    <div className="absolute top-4 right-4 z-20 bg-blue-50 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border border-blue-200">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        <p className="text-xs text-blue-600 font-medium">Preparando siguiente página...</p>
                    </div>
                )}

                {/* Current page loading indicator */}
                {isLoading && inventoryData && (
                    <div className="absolute top-4 right-4 z-20 bg-slate-800 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border border-slate-700">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        <p className="text-xs text-slate-400 font-medium">Cargando...</p>
                    </div>
                )}

                {/* Inventory Grid */}
                {isLoading && inventoryItems.length === 0 ? (
                    // Show loading spinner only if we're actually loading AND have no data to show
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-primary-600"></div>
                        <p className="mt-4 text-slate-400">Cargando inventario...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    // Show "no items" message when not loading and no filtered items
                    <Card>
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No hay piezas en el inventario</h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || filterCondition || filterBrand || filterPieceType || filterTreasureHunt !== 'all' || filterChase
                                    ? 'No se encontraron piezas con los filtros aplicados'
                                    : 'Comienza agregando tu primera pieza al inventario'
                                }
                            </p>
                            {!searchTerm && !filterCondition && !filterBrand && !filterPieceType && filterTreasureHunt === 'all' && !filterChase && (
                                <Button icon={<Plus size={20} />} onClick={() => setShowAddModal(true)}>
                                    Agregar Primera Pieza
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full">
                        {filteredItems.map((item: InventoryItem) => (
                            <Card
                                key={item._id}
                                hover={!isSelectionMode}
                                className={`relative ${selectedItems.has(item._id!) ? 'ring-2 ring-primary-500' : ''}`}
                            >
                                <div
                                    className={`${isSelectionMode ? 'cursor-pointer' : ''}`}
                                    onClick={() => isSelectionMode && item._id && handleToggleItemSelection(item._id)}
                                >
                                    {/* Selection Checkbox */}
                                    {isSelectionMode && (
                                        <div className="absolute top-3 left-3 z-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item._id!)}
                                                onChange={() => item._id && handleToggleItemSelection(item._id)}
                                                className="w-6 h-6 rounded border-slate-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {/* Car Image Placeholder */}
                                        <div
                                            className="bg-gray-200 rounded-lg flex items-center justify-center h-32 relative group cursor-pointer"
                                            onClick={() => !isSelectionMode && item.photos && item.photos.length > 0 && handleImageClick(item.photos)}
                                        >
                                            {item.photos && item.photos.length > 0 ? (
                                                <>
                                                    <LazyImage
                                                        src={item.photos[0]}
                                                        alt="Hot Wheels"
                                                        className={`w-full h-full object-cover rounded-lg transition-all ${isSelectionMode && selectedItems.has(item._id!) ? 'opacity-75' : 'group-hover:opacity-90'
                                                            }`}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image'
                                                        }}
                                                        onClick={() => !isSelectionMode && item.photos && item.photos.length > 0 && handleImageClick(item.photos)}
                                                    />
                                                    {/* Zoom indicator */}
                                                    {!isSelectionMode && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
                                                            <Maximize2 size={32} className="text-white drop-shadow-lg" />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <Package size={48} className="text-gray-400" />
                                            )}

                                            {/* Brand Badge - Top Left */}
                                            {item.brand && (
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-gray-900 bg-opacity-80 text-white text-xs font-semibold rounded shadow-lg backdrop-blur-sm">
                                                    {item.brand}
                                                </div>
                                            )}

                                            {/* Type and Special Badges - Top Right */}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                                {/* Piece Type Badge */}
                                                {item.pieceType && (
                                                    <span className={`px-2 py-1 text-xs font-bold rounded shadow-lg backdrop-blur-sm ${item.pieceType === 'basic' ? 'bg-blue-500 bg-opacity-90 text-white' :
                                                        item.pieceType === 'premium' ? 'bg-purple-500 bg-opacity-90 text-white' :
                                                            item.pieceType === 'rlc' ? 'bg-orange-500 bg-opacity-90 text-white' :
                                                                item.pieceType === 'silver_series' ? 'bg-slate-700/300 bg-opacity-90 text-white' :
                                                                    item.pieceType === 'elite_64' ? 'bg-red-500 bg-opacity-90 text-white' :
                                                                        'bg-gray-400 bg-opacity-90 text-white'
                                                        }`}>
                                                        {formatPieceType(item.pieceType).toUpperCase()}
                                                    </span>
                                                )}

                                                {/* Treasure Hunt Badge */}
                                                {item.isSuperTreasureHunt && (
                                                    <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded shadow-lg">
                                                        $TH
                                                    </span>
                                                )}
                                                {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                    <span className="px-2 py-1 text-xs font-bold bg-green-500 bg-opacity-90 text-white rounded shadow-lg">
                                                        TH
                                                    </span>
                                                )}

                                                {/* Chase Badge */}
                                                {item.isChase && (
                                                    <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white rounded shadow-lg">
                                                        CHASE
                                                    </span>
                                                )}
                                            </div>
                                        </div>                                {/* Car Info */}
                                        <div>
                                            <h3 className="font-semibold text-white truncate">
                                                {item.hotWheelsCar?.model || item.carId || 'Nombre no disponible'}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate">
                                                {item.hotWheelsCar?.series} {item.hotWheelsCar?.year ? `(${item.hotWheelsCar.year})` : ''}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {item.hotWheelsCar?.toy_num || item.carId}
                                            </p>

                                            {/* Series Badge */}
                                            {item.seriesId && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                                    🎁 {item.seriesName} ({item.seriesPosition}/{item.seriesSize})
                                                </div>
                                            )}

                                            {/* Box Badge - If this IS a sealed box */}
                                            {item.isBox && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                                    📦 {item.boxName} - {item.registeredPieces || 0}/{item.boxSize} piezas
                                                    {item.boxStatus === 'sealed' && ' 🔒'}
                                                    {item.boxStatus === 'unpacking' && ' ⏳'}
                                                </div>
                                            )}

                                            {/* Source Box Badge - If this piece came from a box */}
                                            {item.sourceBox && !item.isBox && (
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-gray-700 text-xs font-medium rounded-full">
                                                    📦 De: {item.sourceBox}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-2 gap-2">
                                                <span className={`
                      px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap
                      ${item.condition === 'mint' ? 'bg-green-100 text-green-800' :
                                                        item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                                                            item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                    }
                    `}>
                                                    {item.condition === 'mint' ? 'Mint' :
                                                        item.condition === 'good' ? 'Bueno' :
                                                            item.condition === 'fair' ? 'Regular' : 'Malo'}
                                                </span>
                                                <span className="text-xs font-medium text-white text-right flex-shrink-0">
                                                    {item.quantity - (item.reservedQuantity || 0)}/{item.quantity}
                                                    {(item.reservedQuantity || 0) > 0 && (
                                                        <span className="text-orange-600 block text-xs">
                                                            ({item.reservedQuantity} res.)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Costo:</span>
                                                <span className="font-medium">${item.purchasePrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Sugerido:</span>
                                                <span className="font-medium text-green-600">${item.suggestedPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm border-t pt-1">
                                                <span className="text-slate-400">Ganancia:</span>
                                                <span className="font-semibold text-primary-600">
                                                    ${(item.suggestedPrice - item.purchasePrice).toFixed(2)}
                                                    <span className="text-xs ml-1">
                                                        (+{(((item.suggestedPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%)
                                                    </span>
                                                </span>
                                            </div>
                                            {item.location && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500 pt-1 border-t">
                                                    <MapPin size={12} />
                                                    <span className="truncate">{item.location}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!isSelectionMode && (
                                            <div className="flex space-x-2 pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    className="flex-1"
                                                    onClick={() => navigate(`/inventory/${item._id}`)}
                                                >
                                                    <Info size={16} className="mr-1" />
                                                    Detalle
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleEditItem(item)}
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => item._id && handleDeleteItem(item._id)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls - Bottom */}
            <PaginationControls />

            {/* Add Item Modal */}
            {showAddModal && (
                <Modal
                    isOpen={showAddModal}
                    onClose={resetForm}
                    title="Agregar Nueva Pieza"
                    maxWidth="md"
                    footer={
                        <div className="flex space-x-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={resetForm}
                                disabled={isAddingItem}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleAddItem}
                                disabled={
                                    isAddingItem ||
                                    uploadingPhotos > 0 ||
                                    (newItem.isMultipleCars ? newItem.cars.length === 0 : !newItem.carId)
                                }
                            >
                                {isAddingItem ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Guardando...</span>
                                    </div>
                                ) : uploadingPhotos > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Subiendo {uploadingPhotos} foto{uploadingPhotos > 1 ? 's' : ''}...</span>
                                    </div>
                                ) : existingItemToUpdate ? (
                                    '✏️ Actualizar Pieza'
                                ) : newItem.isMultipleCars ? (
                                    `Agregar ${newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} Piezas (${newItem.cars.length} modelos)`
                                ) : newItem.isBox ? (
                                    `Agregar ${newItem.quantity} Piezas`
                                ) : (
                                    'Agregar Pieza'
                                )}
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Compra
                            </label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="purchaseType"
                                        checked={!newItem.isBox && !newItem.isMultipleCars}
                                        onChange={() => {
                                            setNewItem({
                                                ...newItem,
                                                isBox: false,
                                                isMultipleCars: false,
                                                quantity: 1,
                                                pricePerPiece: 0,
                                                cars: []
                                            })
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Pieza Individual (1 modelo)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="purchaseType"
                                        checked={newItem.isBox && !newItem.isMultipleCars}
                                        onChange={() => {
                                            setNewItem({
                                                ...newItem,
                                                isBox: true,
                                                isMultipleCars: false,
                                                quantity: newItem.boxSize,
                                                pricePerPiece: newItem.purchasePrice / newItem.boxSize,
                                                cars: []
                                            })
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Caja del mismo modelo (ej: 10 del mismo)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="purchaseType"
                                        checked={newItem.isMultipleCars}
                                        onChange={() => {
                                            setNewItem({
                                                ...newItem,
                                                isBox: false,
                                                isMultipleCars: true,
                                                carId: '',
                                                quantity: 0,
                                                pricePerPiece: 0,
                                                cars: []
                                            })
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Serie/Caja con múltiples modelos diferentes</span>
                                </label>
                            </div>
                            {newItem.isMultipleCars && (
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 Usa esta opción para series como Fast & Furious donde cada caja trae varios modelos diferentes
                                </p>
                            )}
                        </div>

                        {/* Multiple Cars Section (for series/boxes with different models) */}
                        {newItem.isMultipleCars && (
                            <div className="border-2 border-blue-200 rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-white">Modelos en la caja/serie</h4>
                                    <span className="text-sm text-slate-400">
                                        {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas totales
                                    </span>
                                </div>

                                {/* Series Checkbox - ONLY shown when adding multiple cars */}
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!newItem.seriesId}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewItem({
                                                        ...newItem,
                                                        seriesId: `SERIES-${Date.now()}`,
                                                        seriesName: '',
                                                        seriesSize: 5,
                                                        seriesPosition: 1,
                                                        seriesPrice: 0,
                                                        seriesDefaultPrice: 0
                                                    })
                                                } else {
                                                    setNewItem({
                                                        ...newItem,
                                                        seriesId: '',
                                                        seriesName: '',
                                                        seriesSize: 5,
                                                        seriesPosition: 1,
                                                        seriesPrice: 0,
                                                        seriesDefaultPrice: 0
                                                    })
                                                }
                                            }}
                                        />
                                        <span className="font-medium text-purple-900">
                                            🎁 Estos modelos pertenecen a una serie
                                        </span>
                                    </label>
                                    <p className="text-xs text-purple-700 mt-1 ml-6">
                                        Marca esto si los carros que vas a agregar son parte de una colección/serie vendible completa
                                    </p>
                                </div>

                                {/* Series Configuration - ONLY shown when checkbox is marked */}
                                {newItem.seriesId && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                ID de Serie (auto-generado)
                                            </label>
                                            <input
                                                type="text"
                                                className="input w-full bg-slate-700"
                                                value={newItem.seriesId}
                                                readOnly
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre de la Serie *
                                            </label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                placeholder="ej: Marvel Series 2024"
                                                value={newItem.seriesName}
                                                onChange={(e) => setNewItem({ ...newItem, seriesName: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Total de Piezas en Serie *
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                className="input w-full"
                                                min="2"
                                                max="20"
                                                value={newItem.seriesSize || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val === '') {
                                                        setNewItem({ ...newItem, seriesSize: '' as any })
                                                    } else {
                                                        const num = parseInt(val)
                                                        setNewItem({ ...newItem, seriesSize: isNaN(num) ? 5 : num })
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value === '') {
                                                        setNewItem({ ...newItem, seriesSize: 5 })
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Precio de Serie Completa (Opcional)
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="input w-full"
                                                placeholder="Auto (85% del total)"
                                                value={newItem.seriesPrice || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val === '') {
                                                        setNewItem({ ...newItem, seriesPrice: '' as any })
                                                    } else {
                                                        const num = parseFloat(val)
                                                        setNewItem({ ...newItem, seriesPrice: isNaN(num) ? 0 : num })
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value === '') {
                                                        setNewItem({ ...newItem, seriesPrice: 0 })
                                                    }
                                                }}
                                            />
                                        </div>

                                        {newItem.suggestedPrice > 0 && newItem.seriesSize > 0 && (
                                            <div className="col-span-2 text-xs bg-slate-800 p-2 rounded border border-purple-200">
                                                💡 Precio sugerido: <strong>${(newItem.suggestedPrice * newItem.seriesSize * 0.85).toFixed(2)}</strong>
                                                {' '}(85% de ${(newItem.suggestedPrice * newItem.seriesSize).toFixed(2)})
                                                {newItem.seriesPrice > 0 && (
                                                    <span className="ml-2 text-green-600 font-medium">
                                                        → ${(newItem.seriesPrice / newItem.seriesSize).toFixed(2)}/pieza
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Add car to list */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        placeholder="Código (ej: FHY65)"
                                        className="input flex-1"
                                        value={newItem.carId}
                                        onChange={(e) => setNewItem({ ...newItem, carId: e.target.value })}
                                    />
                                    <div className="flex gap-2">
                                        <Stepper
                                            value={newItem.quantity || 1}
                                            onChange={(val) => setNewItem({ ...newItem, quantity: val })}
                                            min={1}
                                            max={99}
                                            step={1}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (newItem.carId && newItem.quantity > 0) {
                                                    setNewItem({
                                                        ...newItem,
                                                        cars: [...newItem.cars, { carId: newItem.carId, quantity: newItem.quantity }],
                                                        carId: '',
                                                        quantity: 1
                                                    })
                                                }
                                            }}
                                            disabled={!newItem.carId || newItem.quantity === 0}
                                        >
                                            <Plus size={16} />
                                        </Button>
                                    </div>
                                </div>

                                {/* List of cars */}
                                {newItem.cars.length > 0 && (
                                    <div className="space-y-2">
                                        {newItem.cars.map((car, index) => (
                                            <div key={index} className="flex justify-between items-center bg-slate-700/30 p-2 rounded">
                                                <span className="text-sm">
                                                    <span className="font-medium">{car.carId}</span>
                                                    <span className="text-slate-400 ml-2">× {car.quantity}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewItem({
                                                            ...newItem,
                                                            cars: newItem.cars.filter((_, i) => i !== index)
                                                        })
                                                    }}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {newItem.cars.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        Agrega los modelos que vienen en la caja/serie
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Box Size Selection */}
                        {newItem.isBox && !newItem.isMultipleCars && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tamaño de Caja
                                </label>
                                <select
                                    className="input w-full"
                                    value={newItem.boxSize}
                                    onChange={(e) => {
                                        const boxSize = parseInt(e.target.value) as 5 | 8 | 10
                                        setNewItem({
                                            ...newItem,
                                            boxSize,
                                            quantity: boxSize,
                                            pricePerPiece: newItem.purchasePrice / boxSize
                                        })
                                    }}
                                >
                                    <option value={5}>5 piezas</option>
                                    <option value={8}>8 piezas</option>
                                    <option value={10}>10 piezas</option>
                                </select>
                            </div>
                        )}

                        {/* Single Car ID - Only for individual and box (same model) */}
                        {!newItem.isMultipleCars && (
                            <div className="relative">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Código de Hot Wheels
                                    </label>
                                    <OCRScanner
                                        onTextExtracted={(text: string) => handleCarIdChange(text)}
                                        onImageCaptured={async (imageBase64: string) => {
                                            // Convert base64 to File and upload to Cloudinary
                                            try {
                                                const file = base64ToFile(imageBase64, 'ocr-capture.jpg')
                                                const result = await uploadImage(file)
                                                if (result) {
                                                    setNewItem(prev => ({ ...prev, photos: [...prev.photos, result.url] }))
                                                    console.log('✅ OCR photo uploaded to Cloudinary:', result.url)
                                                } else {
                                                    console.error('Failed to upload OCR photo to Cloudinary')
                                                    // Fallback to base64 if Cloudinary fails
                                                    setNewItem(prev => ({ ...prev, photos: [...prev.photos, imageBase64] }))
                                                }
                                            } catch (error) {
                                                console.error('Error uploading OCR photo:', error)
                                                // Fallback to base64 if error
                                                setNewItem(prev => ({ ...prev, photos: [...prev.photos, imageBase64] }))
                                            }
                                        }}
                                        buttonText="📷 Escanear"
                                        buttonClassName="!py-1 !px-2 text-xs"
                                    />
                                </div>
                                {existingItemToUpdate && (
                                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
                                        <span className="text-sm text-yellow-800">
                                            ✏️ Editando pieza existente
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCancelUpdate}
                                            className="text-yellow-600 hover:text-yellow-800 text-sm underline"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="ej: FHY65"
                                    value={newItem.carId}
                                    onChange={(e) => handleCarIdChange(e.target.value)}
                                    onFocus={() => newItem.carId.length > 0 && setShowSuggestions(true)}
                                />

                                {/* Dropdown with suggestions */}
                                {showSuggestions && !existingItemToUpdate && getMatchingItems.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        <div className="p-2 bg-slate-700/30 border-b text-xs text-slate-400">
                                            {getMatchingItems.length} pieza{getMatchingItems.length !== 1 ? 's' : ''} encontrada{getMatchingItems.length !== 1 ? 's' : ''} (búsqueda inteligente)
                                        </div>
                                        {getMatchingItems.map((item: InventoryItem) => {
                                            const similarity = calculateSimilarity(newItem.carId, item.carId)
                                            const isExactMatch = item.carId.toLowerCase().includes(newItem.carId.toLowerCase())

                                            return (
                                                <button
                                                    key={item._id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                                                    onClick={() => handleSelectExistingItem(item)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium text-sm">{item.carId}</div>
                                                            <div className="text-xs text-slate-400">
                                                                {item.quantity} disponible{item.quantity !== 1 ? 's' : ''} • {item.condition} • ${item.suggestedPrice}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            {!isExactMatch && (
                                                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${similarity >= 90
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                    }`}>
                                                                    {Math.round(similarity)}%
                                                                </span>
                                                            )}
                                                            <Edit size={14} className="text-blue-500" />
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quantity - Only for individual and box (same model) */}
                        {!newItem.isMultipleCars && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {newItem.isBox ? 'Total de Piezas (automático)' : 'Cantidad'}
                                </label>
                                {newItem.isBox ? (
                                    <div className="flex items-center gap-2 p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">{newItem.quantity}</span>
                                        <span className="text-xs text-gray-500">piezas automáticas</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-start">
                                        <Stepper
                                            value={newItem.quantity || 1}
                                            onChange={(val) => setNewItem({ ...newItem, quantity: val })}
                                            min={1}
                                            max={999}
                                            step={1}
                                        />
                                    </div>
                                )}
                                {newItem.isBox && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Se agregarán {newItem.quantity} piezas del mismo Hot Wheels
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {newItem.isMultipleCars || newItem.isBox ? 'Precio Total de la Caja/Serie' : 'Precio de Compra'}
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="0.00"
                                value={newItem.purchasePrice === 0 ? '' : newItem.purchasePrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const numValue = value === '' ? 0 : parseFloat(value)
                                    const finalValue = isNaN(numValue) ? 0 : numValue

                                    // For multiple cars, don't auto-calculate suggested price
                                    if (newItem.isMultipleCars && newItem.cars.length > 0) {
                                        setNewItem(prev => ({
                                            ...prev,
                                            purchasePrice: finalValue
                                        }))
                                    } else {
                                        handlePurchasePriceChange(finalValue)

                                        if (newItem.isBox) {
                                            setNewItem(prev => ({
                                                ...prev,
                                                pricePerPiece: finalValue / newItem.boxSize
                                            }))
                                        }
                                    }
                                }}
                            />
                            {newItem.isMultipleCars && newItem.cars.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas total = ${newItem.purchasePrice > 0 ? (newItem.purchasePrice / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2) : '0.00'} por pieza
                                </p>
                            )}
                            {newItem.isBox && newItem.purchasePrice > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ${(newItem.purchasePrice / newItem.boxSize).toFixed(2)} por pieza
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                {newItem.isMultipleCars && newItem.seriesId
                                    ? 'Precio Individual por Pieza (si se vende por separado)'
                                    : newItem.isMultipleCars || newItem.isBox
                                        ? 'Precio de Venta por Pieza'
                                        : 'Precio Sugerido'}
                                {!newItem.isMultipleCars && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                        <TrendingUp size={12} />
                                        {newItem.purchasePrice > 0 && newItem.suggestedPrice > 0 ?
                                            `+${(((newItem.suggestedPrice - newItem.purchasePrice) / newItem.purchasePrice) * 100).toFixed(0)}%`
                                            : 'Auto'}
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="0.00"
                                value={newItem.suggestedPrice === 0 ? '' : newItem.suggestedPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const numValue = value === '' ? 0 : parseFloat(value)
                                    setNewItem({ ...newItem, suggestedPrice: isNaN(numValue) ? 0 : numValue })
                                }}
                            />
                            {newItem.isMultipleCars && newItem.seriesId && newItem.cars.length > 0 && newItem.suggestedPrice > 0 && (
                                <p className="text-xs text-yellow-600 mt-1">
                                    ⚠️ Este es el precio si vendes cada pieza POR SEPARADO. El precio de serie completa se configura abajo.
                                </p>
                            )}
                            {newItem.isMultipleCars && !newItem.seriesId && newItem.cars.length > 0 && newItem.suggestedPrice > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    💰 Si vendes todas por separado: ${(newItem.suggestedPrice * newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)} total
                                </p>
                            )}
                            {!newItem.isMultipleCars && newItem.purchasePrice > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Sugerido: ${calculateSuggestedMargin(newItem.purchasePrice, newItem.condition).toFixed(2)}
                                    {newItem.isBox && ` (Ganancia: $${((newItem.suggestedPrice - (newItem.purchasePrice / newItem.boxSize)) * newItem.boxSize).toFixed(2)} por caja)`}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Actual (Opcional)
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="0.00"
                                value={newItem.actualPrice === undefined ? '' : newItem.actualPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const numValue = value === '' ? undefined : parseFloat(value)
                                    setNewItem({ ...newItem, actualPrice: numValue === undefined || isNaN(numValue) ? undefined : numValue })
                                }}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Precio al que se vende actualmente (diferente al sugerido)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condición (afecta margen sugerido)
                            </label>
                            <select
                                className="input w-full"
                                value={newItem.condition}
                                onChange={(e) => handleConditionChange(e.target.value)}
                            >
                                <option value="mint">Mint (+50% ganancia)</option>
                                <option value="good">Bueno (+40% ganancia)</option>
                                <option value="fair">Regular (+30% ganancia)</option>
                                <option value="poor">Malo (+20% ganancia)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <MapPin size={14} />
                                Ubicación Física (Opcional)
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="ej: Caja A, Estante 3, Vitrina 2"
                                value={newItem.location}
                                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Dónde guardas físicamente esta pieza
                            </p>
                        </div>

                        {/* Brand Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Marca
                            </label>
                            <select
                                className="input w-full"
                                value={showCustomBrandInput ? 'custom' : newItem.brand}
                                onChange={(e) => handleBrandChange(e.target.value)}
                            >
                                <option value="">Seleccionar marca...</option>
                                {allBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                                <option value="custom">+ Agregar otra marca</option>
                            </select>

                            {showCustomBrandInput && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        className="input flex-1"
                                        placeholder="Nombre de la marca"
                                        value={customBrandInput}
                                        onChange={(e) => setCustomBrandInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleSaveCustomBrand()
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSaveCustomBrand}
                                        disabled={!customBrandInput.trim()}
                                    >
                                        Guardar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setShowCustomBrandInput(false)
                                            setCustomBrandInput('')
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Piece Type */}
                        {newItem.brand && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Pieza
                                </label>
                                <select
                                    className="input w-full"
                                    value={newItem.pieceType}
                                    onChange={(e) => setNewItem({ ...newItem, pieceType: e.target.value as any })}
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="basic">Básico</option>
                                    <option value="premium">Premium</option>
                                    <option value="rlc">RLC</option>
                                    <option value="silver_series">Silver Series</option>
                                    <option value="elite_64">Elite 64</option>
                                </select>
                            </div>
                        )}

                        {/* Treasure Hunt (only for Hot Wheels Basic) */}
                        {newItem.brand?.toLowerCase() === 'hot wheels' && newItem.pieceType === 'basic' && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newItem.isTreasureHunt}
                                        disabled={newItem.isSuperTreasureHunt}
                                        onChange={(e) => setNewItem({
                                            ...newItem,
                                            isTreasureHunt: e.target.checked,
                                            isSuperTreasureHunt: false
                                        })}
                                        className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${newItem.isSuperTreasureHunt ? 'text-gray-400' : 'text-gray-700'}`}>
                                        🔍 Treasure Hunt (TH)
                                    </span>
                                </label>

                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newItem.isSuperTreasureHunt}
                                        disabled={newItem.isTreasureHunt}
                                        onChange={(e) => setNewItem({
                                            ...newItem,
                                            isSuperTreasureHunt: e.target.checked,
                                            isTreasureHunt: false
                                        })}
                                        className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${newItem.isTreasureHunt ? 'text-gray-400' : 'text-gray-700'}`}>
                                        ⭐ Super Treasure Hunt (STH)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Fantasy Casting (only for Hot Wheels) */}
                        {newItem.brand?.toLowerCase() === 'hot wheels' && (
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newItem.isFantasy}
                                        onChange={(e) => setNewItem({ ...newItem, isFantasy: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        🎨 Fantasía (diseño original)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Moto flag */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newItem.isMoto}
                                    onChange={(e) => setNewItem({ ...newItem, isMoto: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🏍️ Moto
                                </span>
                            </label>
                        </div>

                        {/* Camioneta flag */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newItem.isCamioneta}
                                    onChange={(e) => setNewItem({ ...newItem, isCamioneta: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🚙 Camioneta
                                </span>
                            </label>
                        </div>

                        {/* Fast and Furious flag */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newItem.isFastFurious}
                                    onChange={(e) => setNewItem({ ...newItem, isFastFurious: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🏎️ Fast and Furious
                                </span>
                            </label>
                        </div>

                        {/* Chase (only for Mini GT, Kaido House, M2, or Hot Wheels Premium) */}
                        {(newItem.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(newItem.brand.toLowerCase())) ||
                            (newItem.brand?.toLowerCase() === 'hot wheels' && newItem.pieceType === 'premium') ? (
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newItem.isChase}
                                        onChange={(e) => setNewItem({ ...newItem, isChase: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        🌟 Chase
                                    </span>
                                </label>
                            </div>
                        ) : null}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas (Opcional)
                            </label>
                            <textarea
                                className="input w-full h-20 resize-none"
                                placeholder="Notas adicionales..."
                                value={newItem.notes}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                            />
                        </div>

                        {/* Photos Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fotos
                            </label>

                            {/* Photo Upload */}
                            <div className="mb-3">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                    multiple
                                    capture="environment"
                                    onChange={(e) => handleFileUpload(e.target.files, false)}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label
                                    htmlFor="photo-upload"
                                    className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                >
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-sm text-slate-400">
                                        Subir fotos (múltiples archivos)
                                    </span>
                                </label>
                            </div>

                            {/* Photo Preview */}
                            {newItem.photos.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {newItem.photos.map((photo, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={photo}
                                                alt={`Foto ${index + 1}`}
                                                loading="lazy"
                                                className="w-full h-20 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, false)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Summary Section */}
                        {((newItem.carId || newItem.cars.length > 0) && (newItem.purchasePrice > 0 || newItem.suggestedPrice > 0)) && (
                            <div className="border-t pt-4">
                                <h4 className="font-medium text-white mb-2">Resumen</h4>
                                <div className="bg-slate-700/30 p-3 rounded-lg text-sm space-y-1">
                                    {/* Multiple Cars Summary */}
                                    {newItem.isMultipleCars && newItem.cars.length > 0 && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Tipo:</span>
                                                <span className="font-medium">Serie/Caja con múltiples modelos</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Modelos diferentes:</span>
                                                <span className="font-medium">{newItem.cars.length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Total de piezas:</span>
                                                <span className="font-medium">
                                                    {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)}
                                                </span>
                                            </div>
                                            <div className="border-t pt-1 mt-1 space-y-1">
                                                {newItem.cars.map((car, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs">
                                                        <span>{car.carId}</span>
                                                        <span>× {car.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                                <span>Precio total:</span>
                                                <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Precio por pieza:</span>
                                                <span className="font-medium">
                                                    ${(newItem.purchasePrice / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)}
                                                </span>
                                            </div>
                                            {newItem.suggestedPrice > 0 && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>Precio sugerido (por pieza):</span>
                                                        <span className="font-medium text-green-600">
                                                            ${newItem.suggestedPrice.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-t pt-1 mt-1">
                                                        <span>Ganancia potencial total:</span>
                                                        <span className="font-medium text-green-600">
                                                            ${((newItem.suggestedPrice * newItem.cars.reduce((sum, car) => sum + car.quantity, 0)) - newItem.purchasePrice).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Single Car or Box Summary */}
                                    {!newItem.isMultipleCars && newItem.carId && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Hot Wheels:</span>
                                                <span className="font-medium">{newItem.carId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tipo:</span>
                                                <span className="font-medium">
                                                    {newItem.isBox ? `Caja de ${newItem.boxSize} piezas` : 'Pieza individual'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Total de piezas:</span>
                                                <span className="font-medium">{newItem.quantity}</span>
                                            </div>
                                            {newItem.isBox && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>Precio total caja:</span>
                                                        <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Precio por pieza:</span>
                                                        <span className="font-medium">${(newItem.purchasePrice / newItem.boxSize).toFixed(2)}</span>
                                                    </div>
                                                </>
                                            )}
                                            {!newItem.isBox && newItem.purchasePrice > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Precio de compra:</span>
                                                    <span className="font-medium">${newItem.purchasePrice.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {newItem.suggestedPrice > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Precio sugerido{newItem.isBox ? ' (por pieza)' : ''}:</span>
                                                    <span className="font-medium text-green-600">${newItem.suggestedPrice.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {newItem.isBox && newItem.suggestedPrice > 0 && newItem.purchasePrice > 0 && (
                                                <div className="flex justify-between border-t pt-1 mt-1">
                                                    <span>Ganancia potencial total:</span>
                                                    <span className="font-medium text-green-600">
                                                        ${((newItem.suggestedPrice - (newItem.purchasePrice / newItem.boxSize)) * newItem.boxSize).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Edit Item Modal */}
            <Modal
                isOpen={showEditModal && editingItem !== null}
                onClose={() => {
                    setShowEditModal(false)
                    setEditingItem(null)
                    setEditingItemSnapshot(null)
                }}
                title="Editar Pieza"
                maxWidth="md"
                footer={
                    <div className="flex space-x-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowEditModal(false)
                                setEditingItem(null)
                                setEditingItemSnapshot(null)
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleUpdateItem}
                            disabled={!editingItem?.carId}
                        >
                            Actualizar Pieza
                        </Button>
                    </div>
                }
            >
                {editingItem && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código/ID del Hot Wheels
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="ej: FHY65"
                                value={editingItem.carId}
                                onChange={(e) => setEditingItem({ ...editingItem, carId: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad
                            </label>
                            <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                className="input w-full"
                                value={editingItem.quantity || ''}
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, quantity: '' as any })
                                    } else {
                                        const numValue = parseInt(value)
                                        setEditingItem({ ...editingItem, quantity: isNaN(numValue) ? 1 : Math.max(1, numValue) })
                                    }
                                }}
                                onBlur={(e) => {
                                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                        setEditingItem({ ...editingItem, quantity: 1 })
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio de Compra
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input w-full"
                                placeholder="0.00"
                                value={editingItem.purchasePrice === 0 || editingItem.purchasePrice === '' ? '' : editingItem.purchasePrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, purchasePrice: '' as any })
                                    } else {
                                        const numValue = parseFloat(value)
                                        setEditingItem({ ...editingItem, purchasePrice: isNaN(numValue) ? 0 : numValue })
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, purchasePrice: 0 })
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Sugerido
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input w-full"
                                placeholder="0.00"
                                value={editingItem.suggestedPrice === 0 || editingItem.suggestedPrice === '' ? '' : editingItem.suggestedPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, suggestedPrice: '' as any })
                                    } else {
                                        const numValue = parseFloat(value)
                                        setEditingItem({ ...editingItem, suggestedPrice: isNaN(numValue) ? 0 : numValue })
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, suggestedPrice: 0 })
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Actual (Opcional)
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="0.00"
                                value={editingItem.actualPrice === 0 || editingItem.actualPrice === undefined ? '' : editingItem.actualPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const numValue = value === '' ? undefined : parseFloat(value)
                                    setEditingItem({ ...editingItem, actualPrice: numValue === undefined || isNaN(numValue) ? undefined : numValue })
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condición
                            </label>
                            <select
                                className="input w-full"
                                value={editingItem.condition}
                                onChange={(e) => setEditingItem({ ...editingItem, condition: e.target.value as any })}
                            >
                                <option value="mint">Mint</option>
                                <option value="good">Bueno</option>
                                <option value="fair">Regular</option>
                                <option value="poor">Malo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ubicación Física (Opcional)
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="ej: Caja A, Estante 3"
                                value={editingItem.location || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                            />
                        </div>

                        {/* Brand Selection - Edit Mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Marca
                            </label>
                            <select
                                className="input w-full"
                                value={editingItem.brand || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                            >
                                <option value="">Sin marca</option>
                                {allBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                        </div>

                        {/* Piece Type - Edit Mode */}
                        {editingItem.brand && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Pieza
                                </label>
                                <select
                                    className="input w-full"
                                    value={editingItem.pieceType || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, pieceType: e.target.value })}
                                >
                                    <option value="">Sin tipo</option>
                                    <option value="basic">Básico</option>
                                    <option value="premium">Premium</option>
                                    <option value="rlc">RLC</option>
                                    <option value="silver_series">Silver Series</option>
                                    <option value="elite_64">Elite 64</option>
                                </select>
                            </div>
                        )}

                        {/* Treasure Hunt - Edit Mode */}
                        {editingItem.brand?.toLowerCase() === 'hot wheels' && editingItem.pieceType === 'basic' && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isTreasureHunt || false}
                                        disabled={editingItem.isSuperTreasureHunt}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            isTreasureHunt: e.target.checked,
                                            isSuperTreasureHunt: false
                                        })}
                                        className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${editingItem.isSuperTreasureHunt ? 'text-gray-400' : 'text-gray-700'}`}>
                                        🔍 Treasure Hunt (TH)
                                    </span>
                                </label>

                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isSuperTreasureHunt || false}
                                        disabled={editingItem.isTreasureHunt}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            isSuperTreasureHunt: e.target.checked,
                                            isTreasureHunt: false
                                        })}
                                        className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${editingItem.isTreasureHunt ? 'text-gray-400' : 'text-gray-700'}`}>
                                        ⭐ Super Treasure Hunt (STH)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Fantasy Casting - Edit Mode (only for Hot Wheels) */}
                        {editingItem.brand?.toLowerCase() === 'hot wheels' && (
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isFantasy || false}
                                        onChange={(e) => setEditingItem({ ...editingItem, isFantasy: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        🎨 Fantasía (diseño original)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Chase - Edit Mode (for Mini GT, Kaido House, M2, or Hot Wheels Premium) */}
                        {(editingItem.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(editingItem.brand.toLowerCase())) ||
                            (editingItem.brand?.toLowerCase() === 'hot wheels' && editingItem.pieceType === 'premium') ? (
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isChase || false}
                                        onChange={(e) => setEditingItem({ ...editingItem, isChase: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        🌟 Chase
                                    </span>
                                </label>
                            </div>
                        ) : null}

                        {/* Moto - Edit Mode */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editingItem.isMoto || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isMoto: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🏍️ Moto
                                </span>
                            </label>
                        </div>

                        {/* Camioneta - Edit Mode */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editingItem.isCamioneta || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isCamioneta: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🚚 Camioneta
                                </span>
                            </label>
                        </div>

                        {/* Fast and Furious - Edit Mode */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editingItem.isFastFurious || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isFastFurious: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    🏎️ Fast and Furious
                                </span>
                            </label>
                        </div>

                        {/* Series Information Section */}
                        <div className="pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-semibold text-white mb-3">Información de Serie (Opcional)</h3>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ID de Serie
                                        </label>
                                        <input
                                            type="text"
                                            className="input w-full text-sm"
                                            placeholder="ej: MARVEL-2024-001"
                                            value={editingItem.seriesId || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, seriesId: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre de Serie
                                        </label>
                                        <input
                                            type="text"
                                            className="input w-full text-sm"
                                            placeholder="ej: Marvel Series 2024"
                                            value={editingItem.seriesName || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, seriesName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tamaño Serie
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            className="input w-full text-sm"
                                            placeholder="5"
                                            value={editingItem.seriesSize || ''}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value === '') {
                                                    setEditingItem({ ...editingItem, seriesSize: undefined })
                                                } else {
                                                    const numValue = parseInt(value)
                                                    setEditingItem({ ...editingItem, seriesSize: isNaN(numValue) ? undefined : numValue })
                                                }
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Posición
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            className="input w-full text-sm"
                                            placeholder="1"
                                            value={editingItem.seriesPosition || ''}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value === '') {
                                                    setEditingItem({ ...editingItem, seriesPosition: undefined })
                                                } else {
                                                    const numValue = parseInt(value)
                                                    setEditingItem({ ...editingItem, seriesPosition: isNaN(numValue) ? undefined : numValue })
                                                }
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio Serie
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="input w-full text-sm"
                                            placeholder="0.00"
                                            value={editingItem.seriesPrice || ''}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9.]/g, '')
                                                if (value === '') {
                                                    setEditingItem({ ...editingItem, seriesPrice: undefined })
                                                } else {
                                                    const numValue = parseFloat(value)
                                                    setEditingItem({ ...editingItem, seriesPrice: isNaN(numValue) ? undefined : numValue })
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {editingItem.seriesId && (
                                    <div className="text-xs text-gray-500 bg-slate-700/30 p-2 rounded">
                                        💡 Los items con el mismo ID de serie se pueden vender como set completo
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas (Opcional)
                            </label>
                            <textarea
                                className="input w-full h-20 resize-none"
                                placeholder="Notas adicionales..."
                                value={editingItem.notes}
                                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                            />
                        </div>

                        {/* Photos Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fotos
                            </label>

                            {/* Photo Upload */}
                            <div className="mb-3">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                    multiple
                                    capture="environment"
                                    onChange={(e) => handleFileUpload(e.target.files, true)}
                                    className="hidden"
                                    id="photo-upload-edit"
                                />
                                <label
                                    htmlFor="photo-upload-edit"
                                    className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                >
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-sm text-slate-400">
                                        Subir fotos (múltiples archivos)
                                    </span>
                                </label>
                            </div>

                            {/* Photo Preview */}
                            {editingItem.photos && editingItem.photos.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {editingItem.photos.map((photo: string, index: number) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={photo}
                                                alt={`Foto ${index + 1}`}
                                                loading="lazy"
                                                className="w-full h-20 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, true)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image Viewer Modal */}
            {showImageModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
                    onClick={handleCloseImageModal}
                >
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {/* Close Button */}
                        <button
                            onClick={handleCloseImageModal}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                        >
                            <X size={32} />
                        </button>

                        {/* Previous Button */}
                        {allImagesForModal.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePrevImage()
                                }}
                                className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                            >
                                <ChevronLeft size={32} />
                            </button>
                        )}

                        {/* Image */}
                        <div
                            className="max-w-7xl max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage}
                                alt="Hot Wheels - Vista Completa"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                        </div>

                        {/* Next Button */}
                        {allImagesForModal.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleNextImage()
                                }}
                                className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                            >
                                <ChevronRight size={32} />
                            </button>
                        )}

                        {/* Image Counter */}
                        {allImagesForModal.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                                {selectedImageIndex + 1} / {allImagesForModal.length}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Facebook Publish Modal */}
            <FacebookPublishModal
                isOpen={showFacebookModal}
                onClose={() => setShowFacebookModal(false)}
                selectedItems={getSelectedItems()}
                onSuccess={() => {
                    dispatch(setSelectionMode(false))
                    dispatch(clearSelection())
                }}
            />

            {/* Quote Report Modal */}
            {showQuoteModal && (
                <InventoryQuoteReport
                    items={getSelectedItems()}
                    onClose={() => setShowQuoteModal(false)}
                />
            )}

            {/* Collage Generator Modal */}
            <CollageGenerator
                isOpen={showCollageModal}
                onClose={() => setShowCollageModal(false)}
                selectedItems={getSelectedItems()}
            />

            {/* Bulk Edit Modal */}
            <BulkEditModal
                isOpen={showBulkEditModal}
                onClose={() => setShowBulkEditModal(false)}
                selectedItems={getSelectedItems()}
                onSave={async (updates) => {
                    try {
                        const selectedForEdit = getSelectedItems()
                        await Promise.all(
                            selectedForEdit.map(item =>
                                updateItemMutation.mutateAsync({
                                    id: item._id!,
                                    data: updates as any
                                }).then(() => {
                                    // Cache the updated item locally
                                    dispatch(updateCachedItem({
                                        ...item,
                                        ...updates
                                    }))
                                })
                            )
                        )
                        setShowBulkEditModal(false)
                    } catch (error) {
                        console.error('Error updating items:', error)
                        throw error
                    }
                }}
            />
        </div>
    )
}
