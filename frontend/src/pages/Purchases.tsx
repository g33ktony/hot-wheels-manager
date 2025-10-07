import { useState } from 'react'
import { useQueryClient } from 'react-query'
import { usePurchases, useCreatePurchase, useUpdatePurchase, useUpdatePurchaseStatus, useDeletePurchase } from '@/hooks/usePurchases'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import { useCustomBrands, useCreateCustomBrand } from '@/hooks/useCustomBrands'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Plus, ShoppingBag, Calendar, DollarSign, X, UserPlus, Trash2, Edit, Upload, MapPin, Package, AlertCircle, Car, Box } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import ReceiveVerificationModal from '@/components/ReceiveVerificationModal'
import AutocompleteCarId from '@/components/AutocompleteCarId'

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

export default function Purchases() {
    const queryClient = useQueryClient()
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [purchaseToReceive, setPurchaseToReceive] = useState<any>(null)
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
    const [editingPurchase, setEditingPurchase] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [customBrandInput, setCustomBrandInput] = useState('')
    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false)

    // Series management
    const [showSeriesModal, setShowSeriesModal] = useState(false)
    const [seriesData, setSeriesData] = useState({
        seriesName: '',
        seriesSize: 5,
        brand: '',
        pieceType: '' as 'basic' | 'premium' | 'rlc' | '',
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        location: '',
        unitPrice: 0,
        pieces: [] as Array<{
            carId: string;
            position: number;
            isTreasureHunt?: boolean;
            isSuperTreasureHunt?: boolean;
            isChase?: boolean;
            photos?: string[];
            notes?: string;
        }>
    })

    const [newSupplier, setNewSupplier] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    })
    const [newPurchase, setNewPurchase] = useState({
        supplierId: '',
        totalCost: 0,
        shippingCost: 0,
        trackingNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        estimatedDelivery: '',
        notes: '',
        items: [] as Array<{
            itemType?: 'individual' | 'box' | 'series'; // Tipo de item para renderizado condicional
            carId: string;
            quantity: number;
            unitPrice: number;
            condition: 'mint' | 'good' | 'fair' | 'poor';
            // Brand and type fields
            brand?: string;
            pieceType?: 'basic' | 'premium' | 'rlc' | '';
            isTreasureHunt?: boolean;
            isSuperTreasureHunt?: boolean;
            isChase?: boolean;
            // Series fields
            seriesId?: string;
            seriesName?: string;
            seriesSize?: number;
            seriesPosition?: number;
            seriesPrice?: number;
            // Photos and location
            photos?: string[];
            location?: string;
            notes?: string;
            // Box/Series support
            isBox?: boolean;
            boxName?: string;
            boxSize?: number;
            boxPrice?: number;
        }>
    })

    const { data: purchases, isLoading, error } = usePurchases()
    const { data: suppliers } = useSuppliers()
    const { data: customBrands } = useCustomBrands()
    const createPurchaseMutation = useCreatePurchase()
    const updatePurchaseMutation = useUpdatePurchase()
    const createSupplierMutation = useCreateSupplier()
    const updateStatusMutation = useUpdatePurchaseStatus()
    const deletePurchaseMutation = useDeletePurchase()
    const createCustomBrandMutation = useCreateCustomBrand()

    // Combine predefined and custom brands
    const allBrands = [
        ...PREDEFINED_BRANDS,
        ...(customBrands?.map(b => b.name) || [])
    ].sort()

    if (isLoading) {
        return <Loading text="Cargando compras..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-danger-600">Error al cargar las compras</p>
            </div>
        )
    }

    const handleAddItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, {
                itemType: 'individual', // Por defecto es item individual
                carId: '',
                quantity: 1,
                unitPrice: 0,
                condition: 'mint',
                brand: '',
                pieceType: '',
                isTreasureHunt: false,
                isSuperTreasureHunt: false,
                isChase: false,
                seriesId: '',
                seriesName: '',
                seriesSize: undefined,
                seriesPosition: undefined,
                seriesPrice: 0,
                photos: [],
                location: '',
                notes: '',
                isBox: false,
                boxName: '',
                boxSize: 72,
                boxPrice: 0
            }]
        })
    }

    // @ts-ignore - Función para serie completa, deshabilitada temporalmente
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleAddCompleteSeries = () => {
        // Reset series data and open modal
        setSeriesData({
            seriesName: '',
            seriesSize: 5,
            brand: '',
            pieceType: '',
            condition: 'mint',
            location: '',
            unitPrice: 0,
            pieces: Array.from({ length: 5 }, (_, i) => ({
                carId: '',
                position: i + 1,
                isTreasureHunt: false,
                isSuperTreasureHunt: false,
                isChase: false,
                photos: [],
                notes: ''
            }))
        })
        setShowSeriesModal(true)
    }

    const handleSeriesDataChange = (field: string, value: any) => {
        setSeriesData(prev => {
            const updated = { ...prev, [field]: value }

            // If seriesSize changes, adjust pieces array
            if (field === 'seriesSize') {
                const currentSize = prev.pieces.length
                if (value > currentSize) {
                    // Add more pieces
                    updated.pieces = [
                        ...prev.pieces,
                        ...Array.from({ length: value - currentSize }, (_, i) => ({
                            carId: '',
                            position: currentSize + i + 1,
                            isTreasureHunt: false,
                            isSuperTreasureHunt: false,
                            isChase: false,
                            photos: [],
                            notes: ''
                        }))
                    ]
                } else if (value < currentSize) {
                    // Remove excess pieces
                    updated.pieces = prev.pieces.slice(0, value)
                }
            }

            return updated
        })
    }

    const handleSeriesPieceChange = (index: number, field: string, value: any) => {
        setSeriesData(prev => ({
            ...prev,
            pieces: prev.pieces.map((piece, i) =>
                i === index ? { ...piece, [field]: value } : piece
            )
        }))
    }

    const handleSaveCompleteSeries = () => {
        // Validate that all pieces have carId
        const invalidPieces = seriesData.pieces.filter(p => !p.carId.trim())
        if (invalidPieces.length > 0) {
            alert('Por favor completa el ID de todos los autos de la serie')
            return
        }

        // Add all pieces as individual items
        const newItems = seriesData.pieces.map((piece) => ({
            carId: piece.carId,
            quantity: 1,
            unitPrice: seriesData.unitPrice,
            condition: seriesData.condition,
            brand: seriesData.brand,
            pieceType: seriesData.pieceType,
            isTreasureHunt: piece.isTreasureHunt || false,
            isSuperTreasureHunt: piece.isSuperTreasureHunt || false,
            isChase: piece.isChase || false,
            seriesId: '', // Could generate a UUID here
            seriesName: seriesData.seriesName,
            seriesSize: seriesData.seriesSize,
            seriesPosition: piece.position,
            seriesPrice: seriesData.unitPrice * seriesData.seriesSize,
            photos: piece.photos || [],
            location: seriesData.location,
            notes: piece.notes || `Pieza ${piece.position} de ${seriesData.seriesSize} - ${seriesData.seriesName}`,
            isBox: false,
            boxSize: 10 as 5 | 8 | 10
        }))

        setNewPurchase(prev => ({
            ...prev,
            items: [...prev.items, ...newItems]
        }))

        setShowSeriesModal(false)
    }

    const handleRemoveItem = (index: number) => {
        setNewPurchase({
            ...newPurchase,
            items: newPurchase.items.filter((_, i) => i !== index)
        })
    }

    const handleItemChange = (index: number, field: string, value: any) => {
        console.log(`🔧 handleItemChange: index=${index}, field=${field}, value=${value}`)
        const updatedItems = [...newPurchase.items]
        updatedItems[index] = { ...updatedItems[index], [field]: value }
        console.log('📦 Item actualizado:', updatedItems[index])
        setNewPurchase({ ...newPurchase, items: updatedItems })
    }

    const handleCreateSupplier = async () => {
        if (!newSupplier.name.trim()) {
            alert('El nombre del proveedor es obligatorio')
            return
        }

        try {
            const createdSupplier = await createSupplierMutation.mutateAsync({
                ...newSupplier,
                contactMethod: 'email' // Default contact method
            })

            // Set the newly created supplier as selected
            if (createdSupplier._id) {
                setNewPurchase({ ...newPurchase, supplierId: createdSupplier._id })
            }

            // Reset supplier form and close modal
            setNewSupplier({
                name: '',
                email: '',
                phone: '',
                address: ''
            })
            setShowCreateSupplierModal(false)
        } catch (error) {
            console.error('Error creating supplier:', error)
        }
    }

    const handleAddPurchase = async () => {
        if (!newPurchase.supplierId || newPurchase.items.length === 0) {
            alert('Proveedor e items son obligatorios')
            return
        }

        try {
            // Clean items: convert empty strings to undefined for optional fields
            const cleanedItems = newPurchase.items.map(item => {
                // Generate carId for boxes if not provided
                if (item.isBox && !item.carId) {
                    const boxPrefix = item.boxName?.toUpperCase().replace(/\s+/g, '-') || 'BOX'
                    const timestamp = Date.now()
                    item.carId = `${boxPrefix}-${timestamp}`
                }

                return {
                    carId: item.carId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    condition: item.condition,
                    // Only send pieceType and brand if they have actual values
                    ...(item.pieceType && { pieceType: item.pieceType }),
                    ...(item.brand && item.brand.trim() !== '' && { brand: item.brand }),
                    isTreasureHunt: item.isTreasureHunt || false,
                    isSuperTreasureHunt: item.isSuperTreasureHunt || false,
                    isChase: item.isChase || false,
                    ...(item.seriesId && item.seriesId.trim() !== '' && { seriesId: item.seriesId }),
                    ...(item.seriesName && item.seriesName.trim() !== '' && { seriesName: item.seriesName }),
                    ...(item.seriesSize && { seriesSize: item.seriesSize }),
                    ...(item.seriesPosition && { seriesPosition: item.seriesPosition }),
                    ...(item.seriesPrice && { seriesPrice: item.seriesPrice }),
                    // Box fields
                    isBox: item.isBox || false,
                    ...(item.isBox && item.boxName && item.boxName.trim() !== '' && { boxName: item.boxName }),
                    ...(item.isBox && item.boxSize && { boxSize: item.boxSize }),
                    ...(item.isBox && item.boxPrice && { boxPrice: item.boxPrice }),
                    ...(item.photos && item.photos.length > 0 && { photos: item.photos }),
                    ...(item.location && item.location.trim() !== '' && { location: item.location }),
                    ...(item.notes && item.notes.trim() !== '' && { notes: item.notes })
                }
            })

            if (isEditMode && editingPurchase) {
                // Update existing purchase
                await updatePurchaseMutation.mutateAsync({
                    id: editingPurchase._id,
                    data: {
                        supplierId: newPurchase.supplierId,
                        items: cleanedItems,
                        totalCost: newPurchase.totalCost,
                        shippingCost: newPurchase.shippingCost,
                        trackingNumber: newPurchase.trackingNumber || undefined,
                        purchaseDate: new Date(newPurchase.purchaseDate),
                        estimatedDelivery: newPurchase.estimatedDelivery ? new Date(newPurchase.estimatedDelivery) : undefined,
                        notes: newPurchase.notes || undefined
                    }
                })
            } else {
                // Create new purchase
                await createPurchaseMutation.mutateAsync({
                    supplierId: newPurchase.supplierId,
                    items: cleanedItems,
                    totalCost: newPurchase.totalCost,
                    shippingCost: newPurchase.shippingCost,
                    trackingNumber: newPurchase.trackingNumber || undefined,
                    purchaseDate: new Date(newPurchase.purchaseDate),
                    estimatedDelivery: newPurchase.estimatedDelivery ? new Date(newPurchase.estimatedDelivery) : undefined,
                    notes: newPurchase.notes || undefined
                })
            }

            // Reset form and close modal
            handleCloseModal()
        } catch (error) {
            console.error('Error saving purchase:', error)
        }
    }

    const handleEditPurchase = (purchase: any) => {
        // Format the purchase data for editing

        // Extract supplier ID correctly - handle both populated and non-populated cases
        let supplierId = ''
        if (purchase.supplierId) {
            // If supplierId is an object (populated), extract the _id
            if (typeof purchase.supplierId === 'object' && purchase.supplierId._id) {
                supplierId = String(purchase.supplierId._id)
            } else {
                // If it's already a string ID
                supplierId = String(purchase.supplierId)
            }
        } else if (purchase.supplier) {
            // Fallback: check supplier field
            if (typeof purchase.supplier === 'string') {
                supplierId = purchase.supplier
            } else if (purchase.supplier._id) {
                supplierId = String(purchase.supplier._id)
            }
        }

        const formattedPurchase = {
            supplierId: supplierId,
            items: purchase.items || [],
            totalCost: purchase.totalCost || 0,
            shippingCost: purchase.shippingCost || 0,
            trackingNumber: purchase.trackingNumber || '',
            purchaseDate: purchase.purchaseDate ?
                purchase.purchaseDate.toString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            estimatedDelivery: purchase.estimatedDelivery ?
                purchase.estimatedDelivery.toString().split('T')[0]
                : '',
            notes: purchase.notes || ''
        }

        setNewPurchase(formattedPurchase)
        setEditingPurchase(purchase)
        setIsEditMode(true)
        setShowAddModal(true)
    }

    const handleCloseModal = () => {
        setShowAddModal(false)
        setIsEditMode(false)
        setEditingPurchase(null)
        // Reset form
        setNewPurchase({
            supplierId: '',
            totalCost: 0,
            shippingCost: 0,
            trackingNumber: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            estimatedDelivery: '',
            notes: '',
            items: []
        })
    }

    // Brand handling
    const handleBrandChange = (index: number, value: string) => {
        if (value === 'custom') {
            setShowCustomBrandInput(true)
        } else {
            handleItemChange(index, 'brand', value)
            setShowCustomBrandInput(false)
        }
    }

    const handleSaveCustomBrand = async (index: number) => {
        if (customBrandInput.trim()) {
            try {
                const newBrand = await createCustomBrandMutation.mutateAsync(customBrandInput.trim())
                handleItemChange(index, 'brand', newBrand.name)
                setShowCustomBrandInput(false)
                setCustomBrandInput('')
            } catch (error) {
                console.error('Error saving custom brand:', error)
            }
        }
    }

    // Photo handling with compression
    const handleFileUpload = async (index: number, files: FileList | null) => {
        if (!files) return

        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
        }

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    const compressedFile = await imageCompression(file, compressionOptions)
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        const currentPhotos = newPurchase.items[index].photos || []
                        handleItemChange(index, 'photos', [...currentPhotos, result])
                    }
                    reader.readAsDataURL(compressedFile)
                    console.log(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
                } catch (error) {
                    console.error('Error al comprimir imagen:', error)
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        const currentPhotos = newPurchase.items[index].photos || []
                        handleItemChange(index, 'photos', [...currentPhotos, result])
                    }
                    reader.readAsDataURL(file)
                }
            }
        }
    }

    const removePhoto = (itemIndex: number, photoIndex: number) => {
        const currentPhotos = newPurchase.items[itemIndex].photos || []
        handleItemChange(itemIndex, 'photos', currentPhotos.filter((_, i) => i !== photoIndex))
    }

    // Photo handling for series modal
    const handleSeriesPhotoUpload = async (pieceIndex: number, files: FileList | null) => {
        if (!files) return

        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
        }

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    const compressedFile = await imageCompression(file, compressionOptions)
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        const currentPhotos = seriesData.pieces[pieceIndex].photos || []
                        handleSeriesPieceChange(pieceIndex, 'photos', [...currentPhotos, result])
                    }
                    reader.readAsDataURL(compressedFile)
                    console.log(`📸 Imagen comprimida (Serie): ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
                } catch (error) {
                    console.error('Error al comprimir imagen:', error)
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const result = e.target?.result as string
                        const currentPhotos = seriesData.pieces[pieceIndex].photos || []
                        handleSeriesPieceChange(pieceIndex, 'photos', [...currentPhotos, result])
                    }
                    reader.readAsDataURL(file)
                }
            }
        }
    }

    const handleStatusChange = async (purchaseId: string, newStatus: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled') => {
        try {
            // Special handling for "received" status - show verification modal
            if (newStatus === 'received') {
                const purchase = purchases?.find(p => p._id === purchaseId)
                if (purchase) {
                    setPurchaseToReceive(purchase)
                    setShowReceiveModal(true)
                }
                return
            }

            await updateStatusMutation.mutateAsync({ id: purchaseId, status: newStatus })
        } catch (error) {
            console.error('Error updating purchase status:', error)
            alert('❌ Error al actualizar el estado de la compra. Por favor intenta de nuevo.')
        }
    }

    const handleConfirmReceive = async () => {
        if (!purchaseToReceive?._id) return

        try {
            // The modal already handled creating pending items and updating quantities
            // Just close the modal and refresh the list
            setShowReceiveModal(false)
            setPurchaseToReceive(null)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries(['purchases'])
            queryClient.invalidateQueries(['pending-items'])
            queryClient.invalidateQueries(['pending-items-stats'])

            alert('✅ Compra recibida exitosamente!\n\nLos items recibidos fueron agregados al inventario.')
        } catch (error) {
            console.error('Error marking purchase as received:', error)
            alert('❌ Error al marcar la compra como recibida. Por favor intenta de nuevo.')
        }
    }

    const handleViewDetails = (purchase: any) => {
        setSelectedPurchase(purchase)
        setShowDetailsModal(true)
    }

    const handleDeletePurchase = async (purchaseId: string) => {
        const confirmDelete = window.confirm(
            '¿Estás seguro de que quieres eliminar esta compra?\n\nEsta acción no se puede deshacer y afectará las estadísticas de ventas.'
        )

        if (confirmDelete) {
            try {
                await deletePurchaseMutation.mutateAsync(purchaseId)
            } catch (error) {
                console.error('Error deleting purchase:', error)
            }
        }
    }

    const totalItems = purchases?.length || 0
    const totalValue = purchases?.reduce((sum, purchase) => sum + purchase.totalCost, 0) || 0
    const pendingPurchases = purchases?.filter(p => p.status !== 'received').length || 0

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
                    <p className="text-sm text-gray-600">Gestiona tus compras de Hot Wheels</p>
                </div>
                <Button
                    icon={<Plus size={20} />}
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto min-h-[44px]"
                >
                    Nueva Compra
                </Button>
            </div>

            {/* Stats Cards - 2 columns on mobile, 3 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                <Card>
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 self-start">
                                <ShoppingBag size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Compras</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalItems}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 self-start">
                                <DollarSign size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Valor Total</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 lg:col-span-1">
                    <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 self-start">
                                <Calendar size={20} className="text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Pendientes</p>
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">{pendingPurchases}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Purchases List */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                    {purchases && purchases.length > 0 ? (
                        <div className="space-y-3 lg:space-y-4">
                            {purchases.map((purchase) => (
                                <div key={purchase._id} className="flex flex-col gap-3 p-3 lg:p-4 border rounded-lg touch-manipulation">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 text-sm lg:text-base">
                                                {typeof purchase.supplierId === 'object' ? purchase.supplierId.name : suppliers?.find(s => s._id === purchase.supplierId)?.name || 'Proveedor desconocido'}
                                            </h3>
                                            {purchase.hasPendingItems && purchase.pendingItemsCount && purchase.pendingItemsCount > 0 && (
                                                <div className="flex items-center gap-1 mt-1 text-orange-600">
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs font-medium">
                                                        {purchase.pendingItemsCount} item{purchase.pendingItemsCount > 1 ? 's' : ''} pendiente{purchase.pendingItemsCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                                            purchase.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                purchase.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                    purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                            }`}>
                                            {purchase.status === 'received' ? 'Recibido' :
                                                purchase.status === 'shipped' ? 'Enviado' :
                                                    purchase.status === 'paid' ? 'Pagado' :
                                                        purchase.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                        </span>
                                    </div>

                                    {/* Info section */}
                                    <div className="text-xs lg:text-sm text-gray-600 space-y-1">
                                        <p>Fecha: {(() => {
                                            const dateStr = purchase.purchaseDate.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>
                                        <p>Items: {purchase.items.length} | Total: ${purchase.totalCost.toFixed(2)}</p>
                                        {purchase.trackingNumber && <p>Tracking: {purchase.trackingNumber}</p>}
                                    </div>

                                    {/* Action buttons - responsive layout */}
                                    <div className="flex flex-wrap gap-2">
                                        {purchase.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'paid')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                            >
                                                Marcar Pagado
                                            </Button>
                                        )}
                                        {purchase.status === 'paid' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'shipped')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                            >
                                                Marcar Enviado
                                            </Button>
                                        )}
                                        {purchase.status === 'shipped' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleStatusChange(purchase._id!, 'received')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                                            >
                                                <Package size={16} className="mr-1" />
                                                Verificar y Recibir
                                            </Button>
                                        )}
                                        {purchase.status !== 'cancelled' && purchase.status !== 'received' && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleStatusChange(purchase._id!, 'cancelled')}
                                                disabled={updateStatusMutation.isLoading}
                                                className="min-h-[44px] text-xs lg:text-sm"
                                            >
                                                Cancelar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleViewDetails(purchase)}
                                            className="min-h-[44px] text-xs lg:text-sm flex-1 sm:flex-none"
                                        >
                                            Ver Detalles
                                        </Button>
                                        {purchase.status !== 'received' && purchase.status !== 'cancelled' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleEditPurchase(purchase)}
                                                title="Editar compra"
                                                className="min-h-[44px] text-xs lg:text-sm"
                                            >
                                                <Edit size={16} className="mr-1" />
                                                Editar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDeletePurchase(purchase._id!)}
                                            disabled={deletePurchaseMutation.isLoading}
                                            className="min-h-[44px] text-xs lg:text-sm"
                                        >
                                            <Trash2 size={16} className="mr-1" />
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay compras registradas</h3>
                            <p className="text-gray-600">Registra tu primera compra para comenzar</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Purchase Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {isEditMode ? 'Editar Compra' : 'Nueva Compra'}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Purchase Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Proveedor *
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={newPurchase.supplierId}
                                                onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Seleccionar proveedor</option>
                                                {suppliers?.map((supplier) => (
                                                    <option key={supplier._id} value={supplier._id}>
                                                        {supplier.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setShowCreateSupplierModal(true)}
                                                title="Crear nuevo proveedor"
                                            >
                                                <UserPlus size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha de Compra *
                                        </label>
                                        <Input
                                            type="date"
                                            value={newPurchase.purchaseDate}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Costo de Envío
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={newPurchase.shippingCost || ''}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, shippingCost: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Número de Tracking
                                        </label>
                                        <Input
                                            type="text"
                                            value={newPurchase.trackingNumber}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, trackingNumber: e.target.value })}
                                            placeholder="Número de seguimiento"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Entrega Estimada
                                        </label>
                                        <Input
                                            type="date"
                                            value={newPurchase.estimatedDelivery}
                                            onChange={(e) => setNewPurchase({ ...newPurchase, estimatedDelivery: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notas
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        value={newPurchase.notes}
                                        onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                                        placeholder="Notas adicionales..."
                                    />
                                </div>

                                {/* Items Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-md font-medium text-gray-900">Items de la Compra</h4>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddItem}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Agregar Item
                                        </Button>
                                    </div>

                                    {newPurchase.items.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-600">No hay items agregados</p>
                                            <p className="text-sm text-gray-500">Haz clic en "Agregar Item" y selecciona el tipo dentro del formulario</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {newPurchase.items.map((item, index) => (
                                                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="font-medium text-gray-900">Item {index + 1}</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>

                                                    {/* ✅ NUEVO: Selector de Tipo de Item */}
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Tipo de Item (Debug: {item.itemType || 'undefined'}, isBox: {item.isBox ? 'true' : 'false'})
                                                        </label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    console.log('🔵 Click en Individual')
                                                                    const updatedItems = [...newPurchase.items]
                                                                    updatedItems[index] = { 
                                                                        ...updatedItems[index], 
                                                                        itemType: 'individual',
                                                                        isBox: false
                                                                    }
                                                                    setNewPurchase({ ...newPurchase, items: updatedItems })
                                                                }}
                                                                className={`p-3 border-2 rounded-lg transition-all ${
                                                                    (item.itemType === 'individual' || !item.itemType) && !item.isBox
                                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                                        : 'border-gray-300 hover:border-gray-400'
                                                                }`}
                                                            >
                                                                <Car size={20} className="mx-auto mb-1" />
                                                                <div className="text-xs font-medium">Individual</div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    console.log('🟣 Click en Caja')
                                                                    const updatedItems = [...newPurchase.items]
                                                                    updatedItems[index] = { 
                                                                        ...updatedItems[index], 
                                                                        itemType: 'box',
                                                                        isBox: true,
                                                                        carId: '' // Limpiar carId, se genera automático
                                                                    }
                                                                    setNewPurchase({ ...newPurchase, items: updatedItems })
                                                                }}
                                                                className={`p-3 border-2 rounded-lg transition-all ${
                                                                    item.itemType === 'box' || item.isBox
                                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                                        : 'border-gray-300 hover:border-gray-400'
                                                                }`}
                                                            >
                                                                <Box size={20} className="mx-auto mb-1" />
                                                                <div className="text-xs font-medium">Caja Sellada</div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    console.log('🟢 Click en Serie')
                                                                    const updatedItems = [...newPurchase.items]
                                                                    updatedItems[index] = { 
                                                                        ...updatedItems[index], 
                                                                        itemType: 'series',
                                                                        isBox: false
                                                                    }
                                                                    setNewPurchase({ ...newPurchase, items: updatedItems })
                                                                }}
                                                                className={`p-3 border-2 rounded-lg transition-all ${
                                                                    item.itemType === 'series'
                                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                                        : 'border-gray-300 hover:border-gray-400'
                                                                }`}
                                                            >
                                                                <Package size={20} className="mx-auto mb-1" />
                                                                <div className="text-xs font-medium">Serie</div>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Renderizado condicional según tipo */}
                                                    {(item.itemType === 'box' || item.isBox) ? (
                                                        /* ========== FORMULARIO PARA CAJA SELLADA ========== */
                                                        <div className="space-y-4">
                                                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                                                <div className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                                                                    <Box size={16} className="mr-2" />
                                                                    Configuración de Caja Sellada
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Nombre de la Caja *
                                                                        </label>
                                                                        <Input
                                                                            type="text"
                                                                            value={item.boxName || ''}
                                                                            onChange={(e) => handleItemChange(index, 'boxName', e.target.value)}
                                                                            placeholder="Ej: Caja P, Caja J, Caja Q"
                                                                            required
                                                                        />
                                                                        {!item.boxName && (
                                                                            <div className="text-xs text-red-500 mt-1">⚠️ Campo requerido</div>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Cantidad de Cajas
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                            required
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Piezas por Caja *
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.boxSize || ''}
                                                                            onChange={(e) => handleItemChange(index, 'boxSize', parseInt(e.target.value) || 0)}
                                                                            placeholder="72"
                                                                            min="1"
                                                                            required
                                                                        />
                                                                        {!item.boxSize && (
                                                                            <div className="text-xs text-red-500 mt-1">⚠️ Campo requerido</div>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Precio por Caja *
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.boxPrice || ''}
                                                                            onChange={(e) => handleItemChange(index, 'boxPrice', parseFloat(e.target.value) || 0)}
                                                                            placeholder="2200"
                                                                            min="0"
                                                                            step="0.01"
                                                                            required
                                                                        />
                                                                        {!item.boxPrice && (
                                                                            <div className="text-xs text-red-500 mt-1">⚠️ Campo requerido</div>
                                                                        )}
                                                                    </div>

                                                                    <div className="md:col-span-2">
                                                                        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                                                                            <div className="text-sm font-medium text-purple-900 mb-2">
                                                                                📊 Resumen de Costo
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                                                <div>
                                                                                    <div className="text-gray-600">Costo por Pieza:</div>
                                                                                    <div className="font-semibold text-purple-700">
                                                                                        ${item.boxSize && item.boxPrice ? (item.boxPrice / item.boxSize).toFixed(2) : '0.00'}
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-gray-600">Total Piezas:</div>
                                                                                    <div className="font-semibold text-purple-700">
                                                                                        {(item.boxSize || 0) * (item.quantity || 1)} piezas
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-span-2 pt-2 border-t border-purple-300">
                                                                                    <div className="text-gray-600">Subtotal:</div>
                                                                                    <div className="font-bold text-lg text-purple-900">
                                                                                        ${((item.boxPrice || 0) * (item.quantity || 1)).toFixed(2)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-xs text-gray-500 mt-3 flex items-center">
                                                                    <AlertCircle size={12} className="mr-1" />
                                                                    El Car ID será generado automáticamente (ej: BOX-P-2025)
                                                                </div>
                                                            </div>

                                                            {/* Ubicación y Notas para Caja */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    <MapPin size={16} className="inline mr-1" />
                                                                    Ubicación Física
                                                                </label>
                                                                <Input
                                                                    type="text"
                                                                    value={item.location || ''}
                                                                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                                                                    placeholder="Ej: Bodega A, Estante 3..."
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Notas de la Caja
                                                                </label>
                                                                <textarea
                                                                    value={item.notes || ''}
                                                                    onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                                                    placeholder="Observaciones sobre la caja sellada..."
                                                                    rows={2}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* ========== FORMULARIO PARA ITEM INDIVIDUAL ========== */
                                                        <div className="space-y-4">

                                                    {/* Subtotal destacado */}
                                                    {item.unitPrice > 0 && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                                                            <span className="text-sm font-medium text-blue-700">Subtotal de este item:</span>
                                                            <span className="text-lg font-bold text-blue-900">
                                                                ${((item.unitPrice || 0) * item.quantity).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Información Básica */}
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                            <Car size={16} />
                                                            Información Básica
                                                        </h6>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    ID del Auto *
                                                                    {!item.carId && <span className="text-red-500 text-xs ml-2">(Requerido)</span>}
                                                                </label>
                                                                <AutocompleteCarId
                                                                    value={item.carId}
                                                                    onChange={(value) => handleItemChange(index, 'carId', value)}
                                                                    placeholder="Buscar por ID, nombre o marca..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Cantidad *
                                                                    {item.quantity < 1 && <span className="text-red-500 text-xs ml-2">(Mínimo 1)</span>}
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                    className={item.quantity < 1 ? 'border-red-300 focus:ring-red-500' : ''}
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Precio Unitario *
                                                                    {item.unitPrice <= 0 && <span className="text-red-500 text-xs ml-2">(Requerido)</span>}
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.unitPrice || ''}
                                                                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    className={item.unitPrice <= 0 ? 'border-red-300 focus:ring-red-500' : ''}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Condición
                                                                </label>
                                                                <select
                                                                    value={item.condition}
                                                                    onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="mint">Mint (Perfecto)</option>
                                                                    <option value="good">Good (Buen estado)</option>
                                                                    <option value="fair">Fair (Estado regular)</option>
                                                                    <option value="poor">Poor (Mal estado)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Marca y Tipo de Pieza */}
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <h6 className="text-sm font-semibold text-gray-700 mb-3">
                                                            Clasificación
                                                        </h6>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Marca
                                                                </label>
                                                                <select
                                                                    value={item.brand || ''}
                                                                    onChange={(e) => handleBrandChange(index, e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="">Seleccionar marca...</option>
                                                                    {allBrands.map((brand) => (
                                                                        <option key={brand} value={brand}>{brand}</option>
                                                                    ))}
                                                                    <option value="custom">➕ Agregar nueva marca...</option>
                                                                </select>

                                                                {showCustomBrandInput && (
                                                                    <div className="mt-2 flex gap-2">
                                                                        <Input
                                                                            type="text"
                                                                            value={customBrandInput}
                                                                            onChange={(e) => setCustomBrandInput(e.target.value)}
                                                                            placeholder="Nueva marca..."
                                                                            className="flex-1"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() => handleSaveCustomBrand(index)}
                                                                        >
                                                                            Guardar
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
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

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Tipo de Pieza
                                                                </label>
                                                                <select
                                                                    value={item.pieceType || ''}
                                                                    onChange={(e) => handleItemChange(index, 'pieceType', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="">Seleccionar...</option>
                                                                    <option value="basic">Básico</option>
                                                                    <option value="premium">Premium</option>
                                                                    <option value="rlc">RLC</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* TH/STH/Chase Section - Condicional según marca */}
                                                    {(item.brand?.toLowerCase() === 'hot wheels' && item.pieceType === 'basic') && (
                                                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                                            <h6 className="text-sm font-semibold text-gray-700 mb-3">
                                                                ⭐ Treasure Hunt
                                                            </h6>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`th-${index}`}
                                                                        checked={item.isTreasureHunt || false}
                                                                        onChange={(e) => {
                                                                            handleItemChange(index, 'isTreasureHunt', e.target.checked)
                                                                            if (e.target.checked) {
                                                                                handleItemChange(index, 'isSuperTreasureHunt', false)
                                                                            }
                                                                        }}
                                                                        disabled={item.isSuperTreasureHunt}
                                                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                                                                    />
                                                                    <label htmlFor={`th-${index}`} className="text-sm font-medium text-gray-700">
                                                                        Treasure Hunt (TH)
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`sth-${index}`}
                                                                        checked={item.isSuperTreasureHunt || false}
                                                                        onChange={(e) => {
                                                                            handleItemChange(index, 'isSuperTreasureHunt', e.target.checked)
                                                                            if (e.target.checked) {
                                                                                handleItemChange(index, 'isTreasureHunt', false)
                                                                            }
                                                                        }}
                                                                        disabled={item.isTreasureHunt}
                                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded disabled:opacity-50"
                                                                    />
                                                                    <label htmlFor={`sth-${index}`} className="text-sm font-medium text-gray-700">
                                                                        Super Treasure Hunt ($TH)
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Chase Checkbox - Condicional según marca */}
                                                    {((item.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(item.brand.toLowerCase())) ||
                                                        (item.brand?.toLowerCase() === 'hot wheels' && item.pieceType === 'premium')) && (
                                                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`chase-${index}`}
                                                                        checked={item.isChase || false}
                                                                        onChange={(e) => handleItemChange(index, 'isChase', e.target.checked)}
                                                                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                                    />
                                                                    <label htmlFor={`chase-${index}`} className="text-sm font-medium text-gray-700">
                                                                        🔥 Chase (Pieza especial de edición limitada)
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}

                                                    {/* Series Section */}
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <h6 className="text-sm font-semibold text-gray-700 mb-3">
                                                            Información de Serie (Opcional)
                                                        </h6>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Nombre de la Serie
                                                                </label>
                                                                <Input
                                                                    type="text"
                                                                    value={item.seriesName || ''}
                                                                    onChange={(e) => handleItemChange(index, 'seriesName', e.target.value)}
                                                                    placeholder="Ej: Fast & Furious, Mainline 2024..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Tamaño de Serie
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.seriesSize || ''}
                                                                    onChange={(e) => handleItemChange(index, 'seriesSize', parseInt(e.target.value) || undefined)}
                                                                    placeholder="Ej: 5, 10, 8..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Posición en Serie
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.seriesPosition || ''}
                                                                    onChange={(e) => handleItemChange(index, 'seriesPosition', parseInt(e.target.value) || undefined)}
                                                                    placeholder="Ej: 1, 2, 3..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Ubicación y Notas */}
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                <MapPin size={16} className="inline mr-1" />
                                                                Ubicación Física
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                value={item.location || ''}
                                                                onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                                                                placeholder="Ej: Caja A, Estante 3, Vitrina..."
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Photos Section */}
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            <Upload size={16} className="inline mr-1" />
                                                            Fotos del Item
                                                        </label>
                                                        <div className="space-y-2">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                onChange={(e) => handleFileUpload(index, e.target.files)}
                                                                className="block w-full text-sm text-gray-500
                                                                    file:mr-4 file:py-2 file:px-4
                                                                    file:rounded-md file:border-0
                                                                    file:text-sm file:font-semibold
                                                                    file:bg-blue-50 file:text-blue-700
                                                                    hover:file:bg-blue-100"
                                                            />
                                                            {item.photos && item.photos.length > 0 && (
                                                                <div className="grid grid-cols-4 gap-2 mt-2">
                                                                    {item.photos.map((photo, photoIndex) => (
                                                                        <div key={photoIndex} className="relative group">
                                                                            <img
                                                                                src={photo}
                                                                                alt={`Preview ${photoIndex + 1}`}
                                                                                className="w-full h-20 object-cover rounded border"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removePhoto(index, photoIndex)}
                                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Notes */}
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Notas del Item
                                                        </label>
                                                        <textarea
                                                            value={item.notes || ''}
                                                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                                            placeholder="Observaciones, defectos, detalles especiales..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Resumen Total Mejorado */}
                                    {newPurchase.items.length > 0 && (
                                        <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-2 border-blue-300 shadow-md">
                                            <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="text-2xl">💰</span>
                                                Resumen de Compra
                                            </h5>
                                            
                                            {/* Desglose por item */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-700">Número de items:</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {newPurchase.items.length} {newPurchase.items.length === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-700">Cantidad total de piezas:</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {newPurchase.items.reduce((sum, item) => sum + item.quantity, 0)} piezas
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                                    <span className="font-medium text-gray-900">Subtotal de items:</span>
                                                    <span className="font-bold text-lg text-gray-900">
                                                        ${newPurchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Shipping cost */}
                                            {newPurchase.shippingCost > 0 && (
                                                <div className="flex justify-between items-center mb-3 py-2 border-t border-blue-200">
                                                    <span className="text-sm text-gray-700">Costo de Envío:</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        +${newPurchase.shippingCost.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Grand total */}
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-blue-300 bg-white rounded-lg p-3 shadow-sm">
                                                <span className="font-bold text-gray-900 text-lg">Total General:</span>
                                                <span className="font-bold text-2xl text-blue-600">
                                                    ${(newPurchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) + newPurchase.shippingCost).toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Average price per piece */}
                                            {newPurchase.items.length > 0 && (
                                                <div className="mt-3 text-center text-xs text-gray-600 italic">
                                                    Precio promedio por pieza: $
                                                    {(
                                                        (newPurchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) + newPurchase.shippingCost) /
                                                        newPurchase.items.reduce((sum, item) => sum + item.quantity, 0)
                                                    ).toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-3 pt-6 border-t">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={handleCloseModal}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        className="flex-1"
                                        onClick={handleAddPurchase}
                                        disabled={createPurchaseMutation.isLoading || updatePurchaseMutation.isLoading}
                                    >
                                        {isEditMode
                                            ? (updatePurchaseMutation.isLoading ? 'Actualizando...' : 'Actualizar Compra')
                                            : (createPurchaseMutation.isLoading ? 'Guardando...' : 'Guardar Compra')
                                        }
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Supplier Modal */}
            {showCreateSupplierModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Proveedor</h2>
                            <button
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded"
                                onClick={() => setShowCreateSupplierModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre *
                                    </label>
                                    <Input
                                        type="text"
                                        value={newSupplier.name}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                        placeholder="Nombre del proveedor"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={newSupplier.email}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                        placeholder="email@proveedor.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <Input
                                        type="tel"
                                        value={newSupplier.phone}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección
                                    </label>
                                    <Input
                                        type="text"
                                        value={newSupplier.address}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                        placeholder="Dirección del proveedor"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 border-t mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowCreateSupplierModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleCreateSupplier}
                                    disabled={createSupplierMutation.isLoading}
                                >
                                    {createSupplierMutation.isLoading ? 'Creando...' : 'Crear Proveedor'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Details Modal */}
            {showDetailsModal && selectedPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Detalles de Compra</h2>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Información General</h3>
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Proveedor:</span> {typeof selectedPurchase.supplierId === 'object' ? selectedPurchase.supplierId.name : suppliers?.find(s => s._id === selectedPurchase.supplierId)?.name || 'Proveedor desconocido'}</p>
                                        <p><span className="font-medium">Fecha de Compra:</span> {(() => {
                                            const dateStr = selectedPurchase.purchaseDate.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>
                                        <p><span className="font-medium">Estado:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${selectedPurchase.status === 'received' ? 'bg-green-100 text-green-800' :
                                                selectedPurchase.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    selectedPurchase.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                        selectedPurchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {selectedPurchase.status === 'received' ? 'Recibido' :
                                                    selectedPurchase.status === 'shipped' ? 'Enviado' :
                                                        selectedPurchase.status === 'paid' ? 'Pagado' :
                                                            selectedPurchase.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                            </span>
                                        </p>
                                        {selectedPurchase.trackingNumber && <p><span className="font-medium">Número de Tracking:</span> {selectedPurchase.trackingNumber}</p>}
                                        {selectedPurchase.estimatedDelivery && <p><span className="font-medium">Entrega Estimada:</span> {(() => {
                                            const dateStr = selectedPurchase.estimatedDelivery.toString().split('T')[0];
                                            const [year, month, day] = dateStr.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}</p>}
                                        {selectedPurchase.notes && <p><span className="font-medium">Notas:</span> {selectedPurchase.notes}</p>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Resumen Financiero</h3>
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Costo de Productos:</span> ${(selectedPurchase.totalCost - (selectedPurchase.shippingCost || 0)).toFixed(2)}</p>
                                        <p><span className="font-medium">Costo de Envío:</span> ${selectedPurchase.shippingCost?.toFixed(2) || '0.00'}</p>
                                        <p className="text-lg font-bold"><span className="font-medium">Total:</span> ${selectedPurchase.totalCost.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Artículos Comprados</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condición</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedPurchase.items.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.carId}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.condition}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Series Modal */}
            {showSeriesModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Agregar Serie Completa</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowSeriesModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Series Information */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-4">Información de la Serie</h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre de la Serie *
                                        </label>
                                        <Input
                                            type="text"
                                            value={seriesData.seriesName}
                                            onChange={(e) => handleSeriesDataChange('seriesName', e.target.value)}
                                            placeholder="Ej: Fast & Furious, Mainline 2024..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cantidad de Piezas *
                                        </label>
                                        <select
                                            value={seriesData.seriesSize}
                                            onChange={(e) => handleSeriesDataChange('seriesSize', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={5}>5 piezas</option>
                                            <option value={8}>8 piezas</option>
                                            <option value={10}>10 piezas</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Marca *
                                        </label>
                                        <select
                                            value={seriesData.brand}
                                            onChange={(e) => handleSeriesDataChange('brand', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Seleccionar marca...</option>
                                            {allBrands.map((brand) => (
                                                <option key={brand} value={brand}>{brand}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tipo de Pieza *
                                        </label>
                                        <select
                                            value={seriesData.pieceType}
                                            onChange={(e) => handleSeriesDataChange('pieceType', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="basic">Básico</option>
                                            <option value="premium">Premium</option>
                                            <option value="rlc">RLC</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Condición
                                        </label>
                                        <select
                                            value={seriesData.condition}
                                            onChange={(e) => handleSeriesDataChange('condition', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="mint">Mint</option>
                                            <option value="good">Good</option>
                                            <option value="fair">Fair</option>
                                            <option value="poor">Poor</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <MapPin size={16} className="inline mr-1" />
                                            Ubicación Física
                                        </label>
                                        <Input
                                            type="text"
                                            value={seriesData.location}
                                            onChange={(e) => handleSeriesDataChange('location', e.target.value)}
                                            placeholder="Ej: Caja A, Estante 3..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio por Pieza *
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={seriesData.unitPrice || ''}
                                            onChange={(e) => handleSeriesDataChange('unitPrice', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                                    <div className="text-sm text-gray-600">
                                        <strong>Total de la serie:</strong> ${(seriesData.unitPrice * seriesData.seriesSize).toFixed(2)}
                                        <span className="ml-2">({seriesData.seriesSize} piezas × ${seriesData.unitPrice.toFixed(2)})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Individual Pieces */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-4">Piezas de la Serie</h4>
                                <div className="space-y-4">
                                    {seriesData.pieces.map((piece, index) => (
                                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                            <h5 className="font-medium text-gray-900 mb-3">
                                                Pieza {piece.position} de {seriesData.seriesSize}
                                            </h5>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        ID del Auto *
                                                    </label>
                                                    <Input
                                                        type="text"
                                                        value={piece.carId}
                                                        onChange={(e) => handleSeriesPieceChange(index, 'carId', e.target.value)}
                                                        placeholder="ID del Hot Wheels"
                                                        required
                                                    />
                                                </div>

                                                {/* TH/STH/Chase - Conditional */}
                                                {seriesData.brand?.toLowerCase() === 'hot wheels' && seriesData.pieceType === 'basic' && (
                                                    <div className="md:col-span-2 flex gap-4">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`th-series-${index}`}
                                                                checked={piece.isTreasureHunt || false}
                                                                onChange={(e) => {
                                                                    handleSeriesPieceChange(index, 'isTreasureHunt', e.target.checked)
                                                                    if (e.target.checked) {
                                                                        handleSeriesPieceChange(index, 'isSuperTreasureHunt', false)
                                                                    }
                                                                }}
                                                                disabled={piece.isSuperTreasureHunt}
                                                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                                            />
                                                            <label htmlFor={`th-series-${index}`} className="text-sm font-medium text-gray-700">
                                                                Treasure Hunt (TH)
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`sth-series-${index}`}
                                                                checked={piece.isSuperTreasureHunt || false}
                                                                onChange={(e) => {
                                                                    handleSeriesPieceChange(index, 'isSuperTreasureHunt', e.target.checked)
                                                                    if (e.target.checked) {
                                                                        handleSeriesPieceChange(index, 'isTreasureHunt', false)
                                                                    }
                                                                }}
                                                                disabled={piece.isTreasureHunt}
                                                                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                                            />
                                                            <label htmlFor={`sth-series-${index}`} className="text-sm font-medium text-gray-700">
                                                                Super Treasure Hunt ($TH)
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Chase - Conditional */}
                                                {((seriesData.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(seriesData.brand.toLowerCase())) ||
                                                    (seriesData.brand?.toLowerCase() === 'hot wheels' && seriesData.pieceType === 'premium')) && (
                                                        <div className="md:col-span-2">
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`chase-series-${index}`}
                                                                    checked={piece.isChase || false}
                                                                    onChange={(e) => handleSeriesPieceChange(index, 'isChase', e.target.checked)}
                                                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                                />
                                                                <label htmlFor={`chase-series-${index}`} className="text-sm font-medium text-gray-700">
                                                                    Chase
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* Photos */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        <Upload size={16} className="inline mr-1" />
                                                        Fotos de esta pieza
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => handleSeriesPhotoUpload(index, e.target.files)}
                                                        className="block w-full text-sm text-gray-500
                                                            file:mr-4 file:py-2 file:px-4
                                                            file:rounded-md file:border-0
                                                            file:text-sm file:font-semibold
                                                            file:bg-blue-50 file:text-blue-700
                                                            hover:file:bg-blue-100"
                                                    />
                                                    {piece.photos && piece.photos.length > 0 && (
                                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                                            {piece.photos.map((photo, photoIndex) => (
                                                                <div key={photoIndex} className="relative group">
                                                                    <img
                                                                        src={photo}
                                                                        alt={`Preview ${photoIndex + 1}`}
                                                                        className="w-full h-20 object-cover rounded border"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newPhotos = piece.photos?.filter((_, i) => i !== photoIndex) || []
                                                                            handleSeriesPieceChange(index, 'photos', newPhotos)
                                                                        }}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Notes */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Notas de esta pieza
                                                    </label>
                                                    <textarea
                                                        value={piece.notes || ''}
                                                        onChange={(e) => handleSeriesPieceChange(index, 'notes', e.target.value)}
                                                        placeholder="Observaciones específicas de esta pieza..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 pt-6 border-t mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowSeriesModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleSaveCompleteSeries}
                                >
                                    Agregar {seriesData.seriesSize} Piezas
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receive Verification Modal */}
            {showReceiveModal && purchaseToReceive && (
                <ReceiveVerificationModal
                    purchase={purchaseToReceive}
                    onConfirm={handleConfirmReceive}
                    onClose={() => {
                        setShowReceiveModal(false)
                        setPurchaseToReceive(null)
                    }}
                />
            )}
        </div>
    )
}
