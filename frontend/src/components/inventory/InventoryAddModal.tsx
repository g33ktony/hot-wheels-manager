import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Stepper from '@/components/common/Stepper'
import OCRScanner from '@/components/OCRScanner'
import { Plus, Upload, Camera, X, Trash2, MapPin, TrendingUp, Edit } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import toast from 'react-hot-toast'
import { useSearchHotWheels } from '@/hooks/useSearchHotWheels'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory'
import { useCreateCustomBrand } from '@/hooks/useCustomBrands'
import { getPlaceholderLogo } from '@/utils/placeholderLogo'

// ─── File-level utilities ────────────────────────────────────────────────────

const levenshteinDistance = (str1: string, str2: string): number => {
    const track = new Array(str2.length + 1)
        .fill(null)
        .map(() => new Array(str1.length + 1).fill(0))
    for (let i = 0; i <= str1.length; i += 1) track[0][i] = i
    for (let j = 0; j <= str2.length; j += 1) track[j][0] = j
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

const calculateSimilarity = (str1: string, str2: string): number => {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 100
    return ((maxLength - distance) / maxLength) * 100
}

const formatPieceType = (pieceType: string | undefined): string => {
    if (!pieceType) return ''
    const typeMap: Record<string, string> = {
        basic: 'Básico',
        premium: 'Premium',
        rlc: 'RLC',
        silver_series: 'Silver Series',
        elite_64: 'Elite 64',
    }
    return typeMap[pieceType] || pieceType
}

function detectPieceType(catalogItem: any): 'basic' | 'premium' | 'rlc' | '' {
    if (!catalogItem.series) return ''
    const s = catalogItem.series.toLowerCase()
    if (s.includes('rlc') || s.includes('r.l.c')) return 'rlc'
    if (s.includes('premium') || s.includes('boulevard') || s.includes('car culture') || s.includes('garage') || s.includes('masters')) return 'premium'
    return 'basic'
}

function detectSeriesInfo(catalogItem: any): { isPartOfSeries: boolean; seriesName: string; seriesSize: number; position: number } {
    const series = catalogItem.series || ''
    const seriesNum = catalogItem.series_num || ''
    const patterns = [
        /^(.+?)\s+(\d+)\/(\d+)$/i,
        /^(.+?)\s+(\d+)\s+of\s+(\d+)$/i,
        /^(.+?)\s+#(\d+)\s*-\s*(\d+)$/i,
    ]
    for (const pattern of patterns) {
        const match = series.match(pattern)
        if (match) {
            const [, seriesName, position, total] = match
            return { isPartOfSeries: true, seriesName: seriesName.trim(), seriesSize: parseInt(total, 10), position: parseInt(position, 10) }
        }
    }
    if (seriesNum && seriesNum.includes('/')) {
        const [posStr, totalStr] = seriesNum.split('/')
        const pos = parseInt(posStr, 10)
        const total = parseInt(totalStr, 10)
        if (!isNaN(pos) && !isNaN(total)) {
            return { isPartOfSeries: true, seriesName: series || 'Series', seriesSize: total, position: pos }
        }
    }
    if (series.length > 10 && /\b\d+\b/.test(series)) {
        return { isPartOfSeries: true, seriesName: series, seriesSize: 5, position: 1 }
    }
    return { isPartOfSeries: false, seriesName: '', seriesSize: 5, position: 1 }
}

async function base64ToFile(base64: string, fileName: string): Promise<File> {
    // Use browser decoding path to avoid malformed byte arrays from manual atob chunking
    const response = await fetch(base64)
    const blob = await response.blob()

    // Keep original mime type when available; fallback to JPEG
    const mimeType = blob.type || 'image/jpeg'

    return new File([blob], fileName, {
        type: mimeType,
        lastModified: Date.now(),
    })
}

// ─── Initial state ───────────────────────────────────────────────────────────

const INITIAL_ITEM = {
    carId: '',
    quantity: 1,
    purchasePrice: 28,
    suggestedPrice: 35,
    actualPrice: undefined as number | undefined,
    condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
    notes: '',
    photos: [] as string[],
    primaryPhotoIndex: 0,
    location: '',
    brand: 'Hot Wheels' as string,
    pieceType: 'basic' as 'basic' | 'premium' | 'rlc' | '',
    isTreasureHunt: false,
    isSuperTreasureHunt: false,
    isChase: false,
    isFantasy: false,
    isMoto: false,
    isCamioneta: false,
    isFastFurious: false,
    isBox: false,
    boxSize: 10 as 5 | 8 | 10,
    pricePerPiece: 0,
    isMultipleCars: false,
    cars: [] as Array<{ carId: string; quantity: number }>,
    seriesId: '',
    seriesName: '',
    seriesSize: 5 as number | string,
    seriesPosition: 1,
    seriesPrice: 0 as number | string,
    seriesDefaultPrice: 0,
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface InventoryAddModalProps {
    isOpen: boolean
    isDark: boolean
    allBrands: string[]
    selectedStore: string | null
    inventoryItems: any[]
    onClose: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InventoryAddModal({
    isOpen,
    isDark,
    allBrands,
    selectedStore,
    inventoryItems,
    onClose,
}: InventoryAddModalProps) {
    // ── Internal state ──
    const [newItem, setNewItem] = useState({ ...INITIAL_ITEM })
    const [isAddingItem, setIsAddingItem] = useState(false)
    const [uploadingPhotos, setUploadingPhotos] = useState(0)
    const [customBrandInput, setCustomBrandInput] = useState('')
    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false)
    const [existingItemToUpdate, setExistingItemToUpdate] = useState<any>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [showCatalogResults, setShowCatalogResults] = useState(false)
    const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])

    // ── Hooks ──
    const { results: hotWheelsResults, isLoading: isSearchingCatalog, searchByName } = useSearchHotWheels()
    const { uploadImage } = useCloudinaryUpload()
    const createItemMutation = useCreateInventoryItem()
    const updateItemMutation = useUpdateInventoryItem()
    const { mutateAsync: createCustomBrandMutation } = useCreateCustomBrand()

    // Sync catalog search results
    useEffect(() => {
        if (hotWheelsResults && hotWheelsResults.length > 0) {
            setCatalogSearchResults(hotWheelsResults)
        } else {
            setCatalogSearchResults([])
        }
    }, [hotWheelsResults])

    // ── Helpers ──
    const calculateSuggestedMargin = (purchasePrice: number, condition: string): number => {
        if (purchasePrice === 0) return 0
        const margins: Record<string, number> = { mint: 0.50, good: 0.40, fair: 0.30, poor: 0.20 }
        return purchasePrice * (1 + (margins[condition] ?? 0.40))
    }

    const resetForm = () => {
        setNewItem({ ...INITIAL_ITEM })
        setExistingItemToUpdate(null)
        setShowSuggestions(false)
        setShowCustomBrandInput(false)
        setCustomBrandInput('')
        setShowCatalogResults(false)
        setCatalogSearchResults([])
        onClose()
    }

    // ── Handlers ──
    const handlePurchasePriceChange = (value: number) => {
        setNewItem(prev => ({
            ...prev,
            purchasePrice: value,
            suggestedPrice: calculateSuggestedMargin(value, prev.condition),
        }))
    }

    const handleConditionChange = (condition: string) => {
        setNewItem(prev => ({
            ...prev,
            condition: condition as 'mint' | 'good' | 'fair' | 'poor',
            suggestedPrice: calculateSuggestedMargin(prev.purchasePrice, condition),
        }))
    }

    const handleCarIdChange = (value: string) => {
        setNewItem(prev => ({ ...prev, carId: value }))
        if (value.length > 0) {
            setShowSuggestions(true)
            if (value.length >= 2) {
                searchByName(value)
                setShowCatalogResults(true)
            }
        } else {
            setShowSuggestions(false)
            setShowCatalogResults(false)
            setCatalogSearchResults([])
        }
    }

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
            primaryPhotoIndex: item.primaryPhotoIndex || 0,
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
            seriesDefaultPrice: item.seriesDefaultPrice || 0,
        })
        setShowSuggestions(false)
    }

    const handleCancelUpdate = () => {
        setExistingItemToUpdate(null)
        setNewItem(prev => ({
            ...prev,
            quantity: 1,
            purchasePrice: 0,
            suggestedPrice: 0,
            condition: 'mint',
            notes: '',
            photos: [],
            location: '',
        }))
    }

    const handleSelectCatalogItem = (catalogItem: any) => {
        const resolveCatalogPhotoUrl = (url?: string) => {
            if (!url || typeof url !== 'string') return ''
            if (url.startsWith('wiki-file:')) {
                const fileName = url.replace('wiki-file:', '').trim()
                return fileName
                    ? `https://hotwheels.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
                    : ''
            }
            if (url.startsWith('http://') || url.startsWith('https://')) return url
            return ''
        }

        const catalogCandidates = [
            catalogItem.photo_url,
            catalogItem.photo_url_carded,
            ...(Array.isArray(catalogItem.photo_gallery) ? catalogItem.photo_gallery : []),
        ]
            .map(resolveCatalogPhotoUrl)
            .filter((url: string) => Boolean(url))

        const photos = Array.from(new Set([...(newItem.photos || []), ...catalogCandidates]))
        const detectedType = detectPieceType(catalogItem)
        const seriesInfo = detectSeriesInfo(catalogItem)

        setNewItem(prev => ({
            ...prev,
            carId: catalogItem.model,
            photos,
            pieceType: detectedType as any,
            isMultipleCars: seriesInfo.isPartOfSeries,
            seriesName: seriesInfo.seriesName,
            seriesSize: seriesInfo.seriesSize,
            seriesPosition: seriesInfo.position,
            notes: prev.notes
                ? `${prev.notes} | Toy#: ${catalogItem.toy_num} - ${catalogItem.series}`
                : `Toy#: ${catalogItem.toy_num} - ${catalogItem.series}`,
        }))

        setShowCatalogResults(false)
        const typeLabel = detectedType ? `(${formatPieceType(detectedType)})` : ''
        const seriesLabel = seriesInfo.isPartOfSeries
            ? ` - Serie: ${seriesInfo.seriesName} ${seriesInfo.position}/${seriesInfo.seriesSize}`
            : ''
        const photosLabel = catalogCandidates.length > 0 ? ` • ${catalogCandidates.length} foto(s)` : ''
        toast.success(`✅ ${catalogItem.model} ${typeLabel}${seriesLabel}${photosLabel} agregado`)
    }

    const handleBrandChange = async (value: string) => {
        if (value === 'custom') {
            setShowCustomBrandInput(true)
        } else {
            setNewItem(prev => ({ ...prev, brand: value }))
            setShowCustomBrandInput(false)
        }
    }

    const handleSaveCustomBrand = async () => {
        if (customBrandInput.trim()) {
            try {
                const newBrand = await createCustomBrandMutation(customBrandInput.trim())
                setNewItem(prev => ({ ...prev, brand: newBrand.name }))
                setShowCustomBrandInput(false)
                setCustomBrandInput('')
            } catch (error) {
                console.error('Error saving custom brand:', error)
            }
        }
    }

    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return

        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
        }

        setUploadingPhotos(prev => prev + files.length)

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    const compressedFile = await imageCompression(file, compressionOptions)
                    const result = await uploadImage(compressedFile)
                    if (result) {
                        setNewItem(prev => ({ ...prev, photos: [...prev.photos, result.url] }))
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

    const removePhoto = (index: number) => {
        setNewItem(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index),
        }))
    }

    const handleAddItem = async () => {
        try {
            setIsAddingItem(true)

            if (existingItemToUpdate) {
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
                        isFastFurious: newItem.isFastFurious,
                    },
                })
            } else if (newItem.isMultipleCars && newItem.cars.length > 0) {
                const totalPieces = newItem.cars.reduce((sum, car) => sum + car.quantity, 0)
                const pricePerPiece = totalPieces > 0 ? (newItem.purchasePrice as number) / totalPieces : 0
                const suggestedPricePerPiece =
                    newItem.seriesId && (newItem.seriesPrice as number) > 0
                        ? (newItem.seriesPrice as number) / totalPieces
                        : (newItem.suggestedPrice as number)

                let position = 1
                for (const car of newItem.cars) {
                    await createItemMutation.mutateAsync({
                        data: {
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
                            ...(newItem.seriesId && {
                                seriesId: newItem.seriesId,
                                seriesName: newItem.seriesName,
                                seriesSize: typeof newItem.seriesSize === 'string' ? parseInt(newItem.seriesSize) || 5 : newItem.seriesSize,
                                seriesPosition: position++,
                                seriesPrice: typeof newItem.seriesPrice === 'string' ? parseFloat(newItem.seriesPrice) || 0 : newItem.seriesPrice,
                            }),
                        },
                        selectedStore: selectedStore || undefined,
                    })
                }
            } else {
                const finalPurchasePrice = newItem.isBox
                    ? (newItem.purchasePrice as number) / newItem.boxSize
                    : (newItem.purchasePrice as number)

                await createItemMutation.mutateAsync({
                    data: {
                        carId: newItem.carId,
                        quantity: newItem.quantity,
                        purchasePrice: finalPurchasePrice,
                        suggestedPrice: newItem.suggestedPrice,
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
                        ...(newItem.seriesId && {
                            seriesId: newItem.seriesId,
                            seriesName: newItem.seriesName,
                            seriesSize: typeof newItem.seriesSize === 'string' ? parseInt(newItem.seriesSize) || 5 : newItem.seriesSize,
                            seriesPosition: newItem.seriesPosition,
                            seriesPrice: typeof newItem.seriesPrice === 'string' ? parseFloat(newItem.seriesPrice) || 0 : newItem.seriesPrice,
                        }),
                    },
                    selectedStore: selectedStore || undefined,
                })
            }

            resetForm()
        } catch (error) {
            console.error('Error adding/updating item:', error)
        } finally {
            setIsAddingItem(false)
        }
    }

    // ── Derived data ──
    const getMatchingItems = useMemo(() => {
        if (!newItem.carId || newItem.carId.length === 0) return []
        const SIMILARITY_THRESHOLD = 75
        return (
            inventoryItems
                ?.filter((item: any) => {
                    if (!item.carId) return false
                    if (item.carId.toLowerCase().includes(newItem.carId.toLowerCase())) return true
                    return calculateSimilarity(newItem.carId, item.carId) >= SIMILARITY_THRESHOLD
                })
                .sort((a: any, b: any) => {
                    if (!a.carId || !b.carId) return 0
                    const aExact = a.carId.toLowerCase().includes(newItem.carId.toLowerCase())
                    const bExact = b.carId.toLowerCase().includes(newItem.carId.toLowerCase())
                    if (aExact && !bExact) return -1
                    if (!aExact && bExact) return 1
                    return calculateSimilarity(newItem.carId, b.carId) - calculateSimilarity(newItem.carId, a.carId)
                }) || []
        )
    }, [newItem.carId, inventoryItems])

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={resetForm}
            title="Agregar Nueva Pieza"
            maxWidth="md"
            footer={
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                        variant="secondary"
                        className="w-full sm:flex-1 h-10"
                        onClick={resetForm}
                        disabled={isAddingItem}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="w-full sm:flex-1 h-10"
                        onClick={handleAddItem}
                        disabled={
                            isAddingItem ||
                            uploadingPhotos > 0 ||
                            (newItem.isMultipleCars ? newItem.cars.length === 0 : !newItem.carId)
                        }
                    >
                        {isAddingItem ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Guardando...</span>
                            </div>
                        ) : uploadingPhotos > 0 ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>
                                    Subiendo {uploadingPhotos} foto{uploadingPhotos > 1 ? 's' : ''}...
                                </span>
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
            <div className="space-y-4 sm:space-y-5">
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
                                onChange={() =>
                                    setNewItem(prev => ({
                                        ...prev,
                                        isBox: false,
                                        isMultipleCars: false,
                                        quantity: 1,
                                        pricePerPiece: 0,
                                        cars: [],
                                    }))
                                }
                                className="mr-2"
                            />
                            <span className="text-sm">Pieza Individual (1 modelo)</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="purchaseType"
                                checked={newItem.isBox && !newItem.isMultipleCars}
                                onChange={() =>
                                    setNewItem(prev => ({
                                        ...prev,
                                        isBox: true,
                                        isMultipleCars: false,
                                        quantity: prev.boxSize,
                                        pricePerPiece: (prev.purchasePrice as number) / prev.boxSize,
                                        cars: [],
                                    }))
                                }
                                className="mr-2"
                            />
                            <span className="text-sm">Caja del mismo modelo (ej: 10 del mismo)</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="purchaseType"
                                checked={newItem.isMultipleCars}
                                onChange={() =>
                                    setNewItem(prev => ({
                                        ...prev,
                                        isBox: false,
                                        isMultipleCars: true,
                                        carId: '',
                                        quantity: 0,
                                        pricePerPiece: 0,
                                        cars: [],
                                    }))
                                }
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

                {/* Multiple Cars Section */}
                {newItem.isMultipleCars && (
                    <div className="border-2 border-blue-200 rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-white">Modelos en la caja/serie</h4>
                            <span className="text-sm text-slate-400">
                                {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas totales
                            </span>
                        </div>

                        {/* Series Checkbox */}
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!newItem.seriesId}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setNewItem(prev => ({
                                                ...prev,
                                                seriesId: `SERIES-${Date.now()}`,
                                                seriesName: '',
                                                seriesSize: 5,
                                                seriesPosition: 1,
                                                seriesPrice: 0,
                                                seriesDefaultPrice: 0,
                                            }))
                                        } else {
                                            setNewItem(prev => ({
                                                ...prev,
                                                seriesId: '',
                                                seriesName: '',
                                                seriesSize: 5,
                                                seriesPosition: 1,
                                                seriesPrice: 0,
                                                seriesDefaultPrice: 0,
                                            }))
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

                        {/* Series Configuration */}
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
                                        onChange={(e) => setNewItem(prev => ({ ...prev, seriesName: e.target.value }))}
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
                                                setNewItem(prev => ({ ...prev, seriesSize: '' }))
                                            } else {
                                                const num = parseInt(val)
                                                setNewItem(prev => ({ ...prev, seriesSize: isNaN(num) ? 5 : num }))
                                            }
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value === '') {
                                                setNewItem(prev => ({ ...prev, seriesSize: 5 }))
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
                                                setNewItem(prev => ({ ...prev, seriesPrice: '' }))
                                            } else {
                                                const num = parseFloat(val)
                                                setNewItem(prev => ({ ...prev, seriesPrice: isNaN(num) ? 0 : num }))
                                            }
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value === '') {
                                                setNewItem(prev => ({ ...prev, seriesPrice: 0 }))
                                            }
                                        }}
                                    />
                                </div>

                                {(newItem.suggestedPrice as number) > 0 && (newItem.seriesSize as number) > 0 && (
                                    <div className="col-span-2 text-xs bg-slate-800 p-2 rounded border border-purple-200">
                                        💡 Precio sugerido:{' '}
                                        <strong>
                                            ${((newItem.suggestedPrice as number) * (newItem.seriesSize as number) * 0.85).toFixed(2)}
                                        </strong>
                                        {' '}(85% de ${((newItem.suggestedPrice as number) * (newItem.seriesSize as number)).toFixed(2)})
                                        {(newItem.seriesPrice as number) > 0 && (
                                            <span className="ml-2 text-emerald-400 font-medium">
                                                → ${((newItem.seriesPrice as number) / (newItem.seriesSize as number)).toFixed(2)}/pieza
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
                                onChange={(e) => setNewItem(prev => ({ ...prev, carId: e.target.value }))}
                            />
                            <div className="flex gap-2">
                                <Stepper
                                    value={newItem.quantity || 1}
                                    onChange={(val) => setNewItem(prev => ({ ...prev, quantity: val }))}
                                    min={1}
                                    max={99}
                                    step={1}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (newItem.carId && newItem.quantity > 0) {
                                            setNewItem(prev => ({
                                                ...prev,
                                                cars: [...prev.cars, { carId: prev.carId, quantity: prev.quantity }],
                                                carId: '',
                                                quantity: 1,
                                            }))
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
                                    <div
                                        key={index}
                                        className="flex justify-between items-center bg-slate-700/30 p-2 rounded"
                                    >
                                        <span className="text-sm">
                                            <span className="font-medium">{car.carId}</span>
                                            <span className="text-slate-400 ml-2">× {car.quantity}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNewItem(prev => ({
                                                    ...prev,
                                                    cars: prev.cars.filter((_, i) => i !== index),
                                                }))
                                            }
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {newItem.cars.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">
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
                                setNewItem(prev => ({
                                    ...prev,
                                    boxSize,
                                    quantity: boxSize,
                                    pricePerPiece: (prev.purchasePrice as number) / boxSize,
                                }))
                            }}
                        >
                            <option value={5}>5 piezas</option>
                            <option value={8}>8 piezas</option>
                            <option value={10}>10 piezas</option>
                        </select>
                    </div>
                )}

                {/* Single Car ID */}
                {!newItem.isMultipleCars && (
                    <div className="relative">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Casting / Nombre
                            </label>
                            <OCRScanner
                                onTextExtracted={(text: string) => handleCarIdChange(text)}
                                onImageCaptured={async (imageBase64: string) => {
                                    try {
                                        const file = await base64ToFile(imageBase64, 'ocr-capture.jpg')
                                        const result = await uploadImage(file)
                                        if (result) {
                                            setNewItem(prev => ({ ...prev, photos: [...prev.photos, result.url] }))
                                            console.log('✅ OCR photo uploaded to Cloudinary:', result.url)
                                            toast.success('Foto escaneada adjuntada automáticamente')
                                        } else {
                                            console.error('Failed to upload OCR photo to Cloudinary')
                                            toast.error('No se pudo adjuntar la foto escaneada automáticamente. Intenta escanear de nuevo.')
                                            // Do not fall back to base64 — backend rejects it
                                        }
                                    } catch (error) {
                                        console.error('Error uploading OCR photo:', error)
                                        toast.error('Error al adjuntar la foto escaneada. Intenta de nuevo.')
                                        // Do not fall back to base64 — backend rejects it
                                    }
                                }}
                                buttonText="📷 Escanear"
                                buttonClassName="!py-1 !px-2 text-xs"
                            />
                        </div>

                        {existingItemToUpdate && (
                            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
                                <span className="text-sm text-yellow-800">✏️ Editando pieza existente</span>
                                <button
                                    type="button"
                                    onClick={handleCancelUpdate}
                                    className="text-yellow-600 hover:text-yellow-800 text-sm underline"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="ej: FHY65"
                                value={newItem.carId}
                                onChange={(e) => handleCarIdChange(e.target.value)}
                                onFocus={() => newItem.carId.length > 0 && setShowSuggestions(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setShowSuggestions(false)
                                }}
                            />
                            {(showSuggestions || showCatalogResults) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSuggestions(false)
                                        setShowCatalogResults(false)
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Cerrar sugerencias"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Inventory suggestions dropdown */}
                        {showSuggestions && !existingItemToUpdate && getMatchingItems.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <div className="p-2 bg-slate-700/30 border-b text-xs text-slate-400">
                                    {getMatchingItems.length} pieza{getMatchingItems.length !== 1 ? 's' : ''} encontrada
                                    {getMatchingItems.length !== 1 ? 's' : ''} (búsqueda inteligente)
                                </div>
                                {getMatchingItems.map((item: any) => {
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
                                                        <span
                                                            className={`text-xs font-medium px-2 py-0.5 rounded ${similarity >= 90
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                                }`}
                                                        >
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

                        {/* Hot Wheels catalog dropdown */}
                        {showCatalogResults && catalogSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-emerald-900 border border-emerald-600 rounded-lg shadow-lg max-h-64 overflow-y-auto top-full">
                                <div className="sticky top-0 p-2 bg-emerald-800/50 border-b border-emerald-600 text-xs text-emerald-200 font-semibold">
                                    📚 Catálogo Autos a Escala ({catalogSearchResults.length} resultado
                                    {catalogSearchResults.length !== 1 ? 's' : ''})
                                </div>
                                {catalogSearchResults.map((item: any, idx: number) => {
                                    const seriesInfo = detectSeriesInfo(item)
                                    const previewPhoto = (() => {
                                        const candidate =
                                            item.photo_url ||
                                            item.photo_url_carded ||
                                            (Array.isArray(item.photo_gallery) ? item.photo_gallery[0] : '')
                                        if (!candidate || typeof candidate !== 'string') return ''
                                        if (candidate.startsWith('wiki-file:')) {
                                            const fileName = candidate.replace('wiki-file:', '').trim()
                                            return fileName
                                                ? `https://hotwheels.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
                                                : ''
                                        }
                                        return candidate
                                    })()

                                    return (
                                        <button
                                            key={`${item.toy_num}-${idx}`}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-emerald-700/30 border-b last:border-b-0 transition-colors"
                                            onClick={() => handleSelectCatalogItem(item)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-12 h-12 bg-emerald-800 rounded overflow-hidden flex items-center justify-center relative">
                                                    {previewPhoto ? (
                                                        <img
                                                            src={previewPhoto}
                                                            alt={item.model}
                                                            className="w-full h-full object-contain"
                                                            crossOrigin="anonymous"
                                                            onError={(e) => {
                                                                ; (e.currentTarget as HTMLImageElement).style.display = 'none'
                                                                const parent = (e.currentTarget as HTMLImageElement).parentElement
                                                                if (parent && !parent.querySelector('[data-fallback]')) {
                                                                    const fallback = document.createElement('img')
                                                                    fallback.setAttribute('data-fallback', 'true')
                                                                    fallback.src = getPlaceholderLogo(item.series)
                                                                    fallback.alt = 'Auto a Escala'
                                                                    fallback.className = 'w-full h-full object-contain p-1'
                                                                    parent.appendChild(fallback)
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={getPlaceholderLogo(item.series)}
                                                            alt="Auto a Escala"
                                                            className="w-full h-full object-contain p-1"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm text-emerald-100">
                                                            {item.model}
                                                        </span>
                                                        {seriesInfo.isPartOfSeries && (
                                                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-500/50">
                                                                📦 {seriesInfo.position}/{seriesInfo.seriesSize}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-emerald-300 space-y-0.5">
                                                        <p>
                                                            Serie: <span className="font-semibold">{item.series}</span> • Año:{' '}
                                                            <span className="font-semibold">{item.year}</span>
                                                        </p>
                                                        <p>
                                                            Toy #: <span className="font-mono">{item.toy_num}</span> • Col #:{' '}
                                                            <span className="font-mono">{item.col_num}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-700/50 text-emerald-100">
                                                        Agregar
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Loading catalog results */}
                        {showCatalogResults && isSearchingCatalog && catalogSearchResults.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-emerald-900 border border-emerald-600 rounded-lg shadow-lg p-3">
                                <div className="text-xs text-emerald-200 flex items-center gap-2">
                                    <div className="animate-spin inline-block">
                                        <div className="w-3 h-3 border-2 border-emerald-400 border-t-emerald-100 rounded-full" />
                                    </div>
                                    Buscando en catálogo...
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Quantity */}
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
                                    onChange={(val) => setNewItem(prev => ({ ...prev, quantity: val }))}
                                    min={1}
                                    max={999}
                                    step={1}
                                />
                            </div>
                        )}
                        {newItem.isBox && (
                            <p className="text-xs text-gray-500 mt-2">
                                Se agregarán {newItem.quantity} piezas del mismo auto a escala
                            </p>
                        )}
                    </div>
                )}

                {/* Purchase Price */}
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

                            if (newItem.isMultipleCars && newItem.cars.length > 0) {
                                setNewItem(prev => ({ ...prev, purchasePrice: finalValue }))
                            } else {
                                handlePurchasePriceChange(finalValue)
                                if (newItem.isBox) {
                                    setNewItem(prev => ({ ...prev, pricePerPiece: finalValue / prev.boxSize }))
                                }
                            }
                        }}
                    />
                    {newItem.isMultipleCars && newItem.cars.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            💡 {newItem.cars.reduce((sum, car) => sum + car.quantity, 0)} piezas total = $
                            {(newItem.purchasePrice as number) > 0
                                ? ((newItem.purchasePrice as number) / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)
                                : '0.00'}{' '}
                            por pieza
                        </p>
                    )}
                    {newItem.isBox && (newItem.purchasePrice as number) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            ${((newItem.purchasePrice as number) / newItem.boxSize).toFixed(2)} por pieza
                        </p>
                    )}
                </div>

                {/* Suggested Price */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        {newItem.isMultipleCars && newItem.seriesId
                            ? 'Precio Individual por Pieza (si se vende por separado)'
                            : newItem.isMultipleCars || newItem.isBox
                                ? 'Precio de Venta por Pieza'
                                : 'Precio Sugerido'}
                        {!newItem.isMultipleCars && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-700 text-emerald-400 rounded-full">
                                <TrendingUp size={12} />
                                {(newItem.purchasePrice as number) > 0 && (newItem.suggestedPrice as number) > 0
                                    ? `+${((((newItem.suggestedPrice as number) - (newItem.purchasePrice as number)) / (newItem.purchasePrice as number)) * 100).toFixed(0)}%`
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
                            setNewItem(prev => ({ ...prev, suggestedPrice: isNaN(numValue) ? 0 : numValue }))
                        }}
                    />
                    {newItem.isMultipleCars && newItem.seriesId && newItem.cars.length > 0 && (newItem.suggestedPrice as number) > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                            ⚠️ Este es el precio si vendes cada pieza POR SEPARADO. El precio de serie completa se configura abajo.
                        </p>
                    )}
                    {newItem.isMultipleCars && !newItem.seriesId && newItem.cars.length > 0 && (newItem.suggestedPrice as number) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            💰 Si vendes todas por separado: $
                            {((newItem.suggestedPrice as number) * newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)} total
                        </p>
                    )}
                    {!newItem.isMultipleCars && (newItem.purchasePrice as number) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            💡 Sugerido: ${calculateSuggestedMargin(newItem.purchasePrice as number, newItem.condition).toFixed(2)}
                            {newItem.isBox &&
                                ` (Ganancia: $${(((newItem.suggestedPrice as number) - (newItem.purchasePrice as number) / newItem.boxSize) * newItem.boxSize).toFixed(2)} por caja)`}
                        </p>
                    )}
                </div>

                {/* Actual Price */}
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
                            setNewItem(prev => ({
                                ...prev,
                                actualPrice: numValue === undefined || isNaN(numValue) ? undefined : numValue,
                            }))
                        }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Precio al que se vende actualmente (diferente al sugerido)
                    </p>
                </div>

                {/* Condition */}
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        Condición (afecta margen sugerido)
                    </label>
                    <select
                        className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                        value={newItem.condition}
                        onChange={(e) => handleConditionChange(e.target.value)}
                    >
                        <option value="mint">Mint (+50% ganancia)</option>
                        <option value="good">Bueno (+40% ganancia)</option>
                        <option value="fair">Regular (+30% ganancia)</option>
                        <option value="poor">Malo (+20% ganancia)</option>
                    </select>
                </div>

                {/* Location */}
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
                        onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Dónde guardas físicamente esta pieza</p>
                </div>

                {/* Brand */}
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        Marca
                    </label>
                    <select
                        className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                        value={showCustomBrandInput ? 'custom' : newItem.brand}
                        onChange={(e) => handleBrandChange(e.target.value)}
                    >
                        <option value="">Seleccionar marca...</option>
                        {allBrands.map((brand) => (
                            <option key={brand} value={brand}>
                                {brand}
                            </option>
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
                            <Button size="sm" onClick={handleSaveCustomBrand} disabled={!customBrandInput.trim()}>
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
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Tipo de Pieza
                        </label>
                        <select
                            className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                            value={newItem.pieceType}
                            onChange={(e) => setNewItem(prev => ({ ...prev, pieceType: e.target.value as any }))}
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

                {/* Treasure Hunt */}
                {newItem.brand?.toLowerCase() === 'hot wheels' && newItem.pieceType === 'basic' && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newItem.isTreasureHunt}
                                disabled={newItem.isSuperTreasureHunt}
                                onChange={(e) =>
                                    setNewItem(prev => ({
                                        ...prev,
                                        isTreasureHunt: e.target.checked,
                                        isSuperTreasureHunt: false,
                                    }))
                                }
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
                                onChange={(e) =>
                                    setNewItem(prev => ({
                                        ...prev,
                                        isSuperTreasureHunt: e.target.checked,
                                        isTreasureHunt: false,
                                    }))
                                }
                                className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={`text-sm font-medium ${newItem.isTreasureHunt ? 'text-gray-400' : 'text-gray-700'}`}>
                                ⭐ Super Treasure Hunt (STH)
                            </span>
                        </label>
                    </div>
                )}

                {/* Fantasy Casting */}
                {newItem.brand?.toLowerCase() === 'hot wheels' && (
                    <div>
                        <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={newItem.isFantasy}
                                onChange={(e) => setNewItem(prev => ({ ...prev, isFantasy: e.target.checked }))}
                                className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                            />
                            <span className="text-sm font-medium">🎨 Fantasía (diseño original)</span>
                        </label>
                    </div>
                )}

                {/* Moto */}
                <div>
                    <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={newItem.isMoto}
                            onChange={(e) => setNewItem(prev => ({ ...prev, isMoto: e.target.checked }))}
                            className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                        />
                        <span className="text-sm font-medium">🏍️ Moto</span>
                    </label>
                </div>

                {/* Camioneta */}
                <div>
                    <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={newItem.isCamioneta}
                            onChange={(e) => setNewItem(prev => ({ ...prev, isCamioneta: e.target.checked }))}
                            className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                        />
                        <span className="text-sm font-medium">🚙 Camioneta</span>
                    </label>
                </div>

                {/* Fast and Furious */}
                <div>
                    <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={newItem.isFastFurious}
                            onChange={(e) => setNewItem(prev => ({ ...prev, isFastFurious: e.target.checked }))}
                            className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                        />
                        <span className="text-sm font-medium">🏎️ Fast and Furious</span>
                    </label>
                </div>

                {/* Chase */}
                {((newItem.brand &&
                    ['mini gt', 'kaido house', 'm2 machines'].includes(newItem.brand.toLowerCase())) ||
                    (newItem.brand?.toLowerCase() === 'hot wheels' && newItem.pieceType === 'premium')) && (
                        <div>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={newItem.isChase}
                                    onChange={(e) => setNewItem(prev => ({ ...prev, isChase: e.target.checked }))}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">🌟 Chase</span>
                            </label>
                        </div>
                    )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas (Opcional)
                    </label>
                    <textarea
                        className="input w-full h-20 resize-none"
                        placeholder="Notas adicionales..."
                        value={newItem.notes}
                        onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                    />
                </div>

                {/* Photos Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fotos</label>

                    <div className="mb-3 space-y-2">
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                            multiple
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                            id="photo-upload"
                        />
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                            multiple
                            capture="environment"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                            id="photo-camera"
                        />
                        <div className="flex gap-2">
                            <label
                                htmlFor="photo-upload"
                                className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                            >
                                <Upload size={20} className="text-gray-400" />
                                <span className="text-sm text-slate-400">Galería</span>
                            </label>
                            <label
                                htmlFor="photo-camera"
                                className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                            >
                                <Camera size={20} className="text-gray-400" />
                                <span className="text-sm text-slate-400">Cámara</span>
                            </label>
                        </div>
                    </div>

                    {/* Photo Preview */}
                    {newItem.photos.length > 0 && (
                        <div className="space-y-3">
                            <div className="border-2 border-blue-400 rounded-lg p-2 bg-blue-50">
                                <p className="text-xs text-blue-700 font-semibold mb-2">⭐ FOTO DESTACADA</p>
                                <img
                                    src={newItem.photos[newItem.primaryPhotoIndex || 0]}
                                    alt="Foto destacada"
                                    loading="lazy"
                                    className="w-full h-32 object-cover rounded"
                                />
                            </div>

                            {newItem.photos.length > 1 && (
                                <div>
                                    <p className="text-xs text-gray-600 font-semibold mb-2">
                                        Doble click para cambiar foto destacada:
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {newItem.photos.map((photo, index) => (
                                            <div
                                                key={index}
                                                className="relative group cursor-pointer"
                                                onClick={() => setNewItem(prev => ({ ...prev, primaryPhotoIndex: index }))}
                                            >
                                                <img
                                                    src={photo}
                                                    alt={`Foto ${index + 1}`}
                                                    loading="lazy"
                                                    className={`w-full h-20 object-cover rounded border-2 transition-all ${(newItem.primaryPhotoIndex || 0) === index
                                                            ? 'border-blue-500 ring-2 ring-blue-300'
                                                            : 'border-gray-300 hover:border-blue-400'
                                                        }`}
                                                />
                                                {(newItem.primaryPhotoIndex || 0) === index && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded">
                                                        <span className="text-white text-xl">⭐</span>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        removePhoto(index)
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Summary */}
                {((newItem.carId || newItem.cars.length > 0) &&
                    ((newItem.purchasePrice as number) > 0 || (newItem.suggestedPrice as number) > 0)) && (
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-white mb-2">Resumen</h4>
                            <div className="bg-slate-700/30 p-3 rounded-lg text-sm space-y-1">
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
                                            <span className="font-medium">${(newItem.purchasePrice as number).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Precio por pieza:</span>
                                            <span className="font-medium">
                                                ${((newItem.purchasePrice as number) / newItem.cars.reduce((sum, car) => sum + car.quantity, 0)).toFixed(2)}
                                            </span>
                                        </div>
                                        {(newItem.suggestedPrice as number) > 0 && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Precio sugerido (por pieza):</span>
                                                    <span className="font-medium text-green-600">
                                                        ${(newItem.suggestedPrice as number).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-t pt-1 mt-1">
                                                    <span>Ganancia potencial total:</span>
                                                    <span className="font-medium text-green-600">
                                                        ${(
                                                            (newItem.suggestedPrice as number) *
                                                            newItem.cars.reduce((sum, car) => sum + car.quantity, 0) -
                                                            (newItem.purchasePrice as number)
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {!newItem.isMultipleCars && newItem.carId && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Auto a Escala:</span>
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
                                                    <span className="font-medium">
                                                        ${(newItem.purchasePrice as number).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Precio por pieza:</span>
                                                    <span className="font-medium">
                                                        ${((newItem.purchasePrice as number) / newItem.boxSize).toFixed(2)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {!newItem.isBox && (newItem.purchasePrice as number) > 0 && (
                                            <div className="flex justify-between">
                                                <span>Precio de compra:</span>
                                                <span className="font-medium">
                                                    ${(newItem.purchasePrice as number).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        {(newItem.suggestedPrice as number) > 0 && (
                                            <div className="flex justify-between">
                                                <span>Precio sugerido{newItem.isBox ? ' (por pieza)' : ''}:</span>
                                                <span className="font-medium text-green-600">
                                                    ${(newItem.suggestedPrice as number).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        {newItem.isBox &&
                                            (newItem.suggestedPrice as number) > 0 &&
                                            (newItem.purchasePrice as number) > 0 && (
                                                <div className="flex justify-between border-t pt-1 mt-1">
                                                    <span>Ganancia potencial total:</span>
                                                    <span className="font-medium text-green-600">
                                                        ${(
                                                            ((newItem.suggestedPrice as number) -
                                                                (newItem.purchasePrice as number) / newItem.boxSize) *
                                                            newItem.boxSize
                                                        ).toFixed(2)}
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
    )
}
