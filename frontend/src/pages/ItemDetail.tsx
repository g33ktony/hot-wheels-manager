import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { inventoryService } from '@/services/inventory'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import ReactCrop, { Crop as CropType } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import imageCompression from 'browser-image-compression'
import type { InventoryItem } from '../../../shared/types'
import {
    ArrowLeft,
    Share2,
    DollarSign,
    Package,
    Edit,
    Trash2,
    Image as ImageIcon,
    FileText,
    X,
    ChevronLeft,
    ChevronRight,
    Upload,
    Camera,
    Pencil
} from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import EditCatalogModal from '@/components/EditCatalogModal'
import toast from 'react-hot-toast'

export default function ItemDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { mode } = useTheme()
    const { user } = useAuth()
    const { hasPermission } = usePermissions()
    const isDark = mode === 'dark'
    const canEditCatalog = hasPermission('catalog:edit')
    const { uploadImage } = useCloudinaryUpload()

    // Debug: Log admin status
    useEffect(() => {
        console.debug('ItemDetail - User:', { email: user?.email, role: user?.role, canEditCatalog })
    }, [user?.role, canEditCatalog])
    const [item, setItem] = useState<InventoryItem | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showShareModal, setShowShareModal] = useState(false)
    const [showCropModal, setShowCropModal] = useState(false)
    const [showGalleryModal, setShowGalleryModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditCatalogModal, setShowEditCatalogModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [sharePrice, setSharePrice] = useState<number>(0)
    const [showQuantityInShare, setShowQuantityInShare] = useState(true)
    const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
    const [croppedImageData, setCroppedImageData] = useState<string | null>(null)
    const [shareMode, setShareMode] = useState<'image' | 'pdf' | null>(null)
    const [uploadingPhotos, setUploadingPhotos] = useState(0)
    const [floatingButtonBottom, setFloatingButtonBottom] = useState(16)
    const [crop, setCrop] = useState<CropType>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
    })
    const [completedCrop, setCompletedCrop] = useState<CropType | null>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        loadItem()
    }, [id])

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return

        const updateFloatingButtonPosition = () => {
            const viewport = window.visualViewport
            if (!viewport) return

            const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)

            if (keyboardHeight > 120) {
                setFloatingButtonBottom(Math.min(420, keyboardHeight + 12))
            } else {
                setFloatingButtonBottom(16)
            }
        }

        updateFloatingButtonPosition()

        window.visualViewport.addEventListener('resize', updateFloatingButtonPosition)
        window.visualViewport.addEventListener('scroll', updateFloatingButtonPosition)
        window.addEventListener('focusin', updateFloatingButtonPosition)
        window.addEventListener('focusout', updateFloatingButtonPosition)

        return () => {
            window.visualViewport?.removeEventListener('resize', updateFloatingButtonPosition)
            window.visualViewport?.removeEventListener('scroll', updateFloatingButtonPosition)
            window.removeEventListener('focusin', updateFloatingButtonPosition)
            window.removeEventListener('focusout', updateFloatingButtonPosition)
        }
    }, [])

    const loadItem = async () => {
        if (!id) return
        try {
            setIsLoading(true)
            const data = await inventoryService.getById(id)
            if (data && data._id) {
                setItem(data)
            }
        } catch (error) {
            console.error('Error loading item:', error)
            toast.error('Error al cargar el item')
        } finally {
            setIsLoading(false)
        }
    }

    const handleEditItem = (item: InventoryItem) => {
        setEditingItem({
            ...item,
            carId: item.carId || '',
            quantity: item.quantity || 1,
            purchasePrice: item.purchasePrice || 0,
            suggestedPrice: item.suggestedPrice || 0,
            actualPrice: item.actualPrice,
            condition: (item.condition || 'mint') as 'mint' | 'good' | 'fair' | 'poor',
            notes: item.notes || '',
            photos: item.photos || [],
            location: item.location || '',
            brand: item.brand || '',
            pieceType: (item.pieceType || '') as 'basic' | 'premium' | 'rlc' | 'silver_series' | 'elite_64' | undefined,
            isTreasureHunt: item.isTreasureHunt || false,
            isSuperTreasureHunt: item.isSuperTreasureHunt || false,
            isChase: item.isChase || false,
            isFantasy: item.isFantasy || false,
            isMoto: item.isMoto || false,
            isCamioneta: item.isCamioneta || false,
            isFastFurious: item.isFastFurious || false,
            seriesId: item.seriesId || '',
            seriesName: item.seriesName || '',
            seriesSize: item.seriesSize,
            seriesPosition: item.seriesPosition,
            seriesPrice: item.seriesPrice,
            seriesDefaultPrice: item.seriesDefaultPrice || 0,
            primaryPhotoIndex: item.primaryPhotoIndex || 0
        })
        setShowEditModal(true)
    }

    const proxifyImageUrl = (url: string): string => {
        if (!url) return ''
        if (url.startsWith('wiki-file:')) {
            const fileName = url.replace('wiki-file:', '').trim()
            if (fileName) {
                const fandomUrl = `https://hotwheels.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
                return `https://images.weserv.nl/?url=${encodeURIComponent(fandomUrl)}&w=500&h=500&fit=contain`
            }
            return ''
        }
        // Si ya está proxificada o es una URL completa con dominio confiable
        if (url.includes('weserv.nl') || url.includes('cloudinary') || url.includes('localhost')) {
            return url
        }
        // Si es una URL http/https de una fuente externa, proxificar
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500&h=500&fit=contain`
        }
        // Si es una URL relativa o sin protocolo, también proxificar
        return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500&h=500&fit=contain`
    }

    const getCarName = () => {
        if (!item) return ''
        if (typeof item.carId === 'string') return item.carId
        if (item.carId && typeof item.carId === 'object') {
            return (item.carId as any).name || ''
        }
        return ''
    }

    const getFinalPrice = () => {
        if (!item) return 0
        return item.actualPrice || item.suggestedPrice || 0
    }

    const handleDeleteItem = async () => {
        if (!item?._id) return
        try {
            setIsDeleting(true)
            await inventoryService.delete(item._id)
            toast.success('Item eliminado correctamente')
            navigate('/inventory')
        } catch (error) {
            console.error('Error deleting item:', error)
            toast.error('Error al eliminar el item')
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || !editingItem) return

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
                        // Guardar solo la URL de Cloudinary
                        setEditingItem((prev: any) => ({
                            ...prev,
                            photos: [...(prev.photos || []), result.url]
                        }))
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
        if (editingItem) {
            setEditingItem({
                ...editingItem,
                photos: editingItem.photos?.filter((_: any, i: number) => i !== index) || []
            })
        }
    }

    const handleUpdateItem = async () => {
        if (!editingItem?._id) return
        try {
            const updateData: any = {
                carId: editingItem.carId,
                actualPrice: editingItem.actualPrice,
                purchasePrice: editingItem.purchasePrice,
                suggestedPrice: editingItem.suggestedPrice,
                quantity: editingItem.quantity,
                condition: editingItem.condition,
                location: editingItem.location,
                notes: editingItem.notes,
                photos: editingItem.photos,
                brand: editingItem.brand,
                pieceType: editingItem.pieceType,
                isTreasureHunt: editingItem.isTreasureHunt,
                isSuperTreasureHunt: editingItem.isSuperTreasureHunt,
                isChase: editingItem.isChase,
                isFantasy: editingItem.isFantasy,
                isMoto: editingItem.isMoto,
                isCamioneta: editingItem.isCamioneta,
                isFastFurious: editingItem.isFastFurious,
                seriesId: editingItem.seriesId,
                seriesName: editingItem.seriesName,
                seriesSize: editingItem.seriesSize,
                seriesPosition: editingItem.seriesPosition,
                seriesPrice: editingItem.seriesPrice,
                primaryPhotoIndex: editingItem.primaryPhotoIndex
            }
            const updated = await inventoryService.update(editingItem._id as string, updateData)
            setItem(updated)
            setShowEditModal(false)
            setEditingItem(null)
            toast.success('Item actualizado correctamente')
        } catch (error) {
            console.error('Error updating item:', error)
            toast.error('Error al actualizar el item')
        }
    }

    const handleOpenShareModal = () => {
        setSharePrice(getFinalPrice())
        setShowShareModal(true)
    }

    const getCroppedImage = async (): Promise<Blob> => {
        // Use completedCrop if available, otherwise use current crop state
        const cropToUse = completedCrop || crop

        if (!imageRef.current || !cropToUse.width || !cropToUse.height) {
            throw new Error('No crop area selected')
        }

        const image = imageRef.current

        // Wait for image to fully load if it hasn't
        if (!image.complete) {
            await new Promise<void>((resolve) => {
                image.onload = () => resolve()
            })
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false
        })

        if (!ctx) {
            throw new Error('Failed to get canvas context')
        }

        // Calculate crop area based on the displayed image dimensions
        let cropX: number, cropY: number, cropWidth: number, cropHeight: number

        if (cropToUse.unit === '%') {
            // Convert percentage to pixels on the NATURAL (original) image
            cropX = (cropToUse.x / 100) * image.naturalWidth
            cropY = (cropToUse.y / 100) * image.naturalHeight
            cropWidth = (cropToUse.width / 100) * image.naturalWidth
            cropHeight = (cropToUse.height / 100) * image.naturalHeight
        } else {
            // Pixel-based crop: scale to natural dimensions
            const scaleX = image.naturalWidth / image.width
            const scaleY = image.naturalHeight / image.height
            cropX = cropToUse.x * scaleX
            cropY = cropToUse.y * scaleY
            cropWidth = cropToUse.width * scaleX
            cropHeight = cropToUse.height * scaleY
        }

        // Set canvas size to match crop dimensions
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the cropped portion from the NATURAL image
        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        )

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error('Failed to create blob from canvas'))
                }
            }, 'image/jpeg', 1.0)
        })
    }

    const handleShareImage = async () => {
        try {
            setShareMode('image')
            setShowCropModal(true)
        } catch (error) {
            console.error('Error sharing image:', error)
            toast.error('Error al compartir imagen')
        }
    }

    const handleConfirmCrop = async () => {
        try {
            const croppedBlob = await getCroppedImage()

            console.log('✂️ Imagen recortada:', {
                size: croppedBlob.size,
                type: croppedBlob.type,
                cropArea: crop
            })

            // Save cropped image as blob URL
            const croppedUrl = URL.createObjectURL(croppedBlob)
            setCroppedImageUrl(croppedUrl)

            // Also save as base64 for PDF generation
            const reader = new FileReader()
            const base64Data = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(croppedBlob)
            })
            setCroppedImageData(base64Data)

            console.log('✅ Imagen recortada guardada:', {
                hasUrl: !!croppedUrl,
                hasData: !!base64Data,
                dataLength: base64Data.length
            })

            setShowCropModal(false)

            // Route to appropriate action based on mode
            if (shareMode === 'image') {
                await generateAndShareImage(croppedBlob)
            } else if (shareMode === 'pdf') {
                await generateAndSharePDF()
            }

            setShareMode(null)
        } catch (error) {
            console.error('Error processing crop:', error)
            toast.error('Error al procesar la imagen')
        }
    }

    const generateAndShareImage = async (croppedBlob: Blob) => {
        try {
            const carName = getCarName()
            const price = sharePrice

            // Create composite image with car info
            const compositeBlob = await createCompositeImage(croppedBlob, carName, price)
            const file = new File([compositeBlob], 'hot-wheels-report.jpg', { type: 'image/jpeg' })

            const text = `🏎️ ${carName}\n💵 Precio: $${price.toFixed(2)}`

            // Use native share if available
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: carName,
                    text: text,
                    files: [file]
                })
                toast.success('Compartido exitosamente')
            } else {
                // Fallback: download the image
                const url = URL.createObjectURL(compositeBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${carName.replace(/\s+/g, '-')}-report.jpg`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Imagen descargada')
            }

            setShowShareModal(false)

            // Clean up cropped image URL and data
            if (croppedImageUrl) {
                URL.revokeObjectURL(croppedImageUrl)
                setCroppedImageUrl(null)
            }
            setCroppedImageData(null)
        } catch (error) {
            console.error('Error sharing image:', error)
            toast.error('Error al compartir imagen')
        }
    }

    const createCompositeImage = async (croppedBlob: Blob, carName: string, price: number): Promise<Blob> => {
        return new Promise(async (resolve, reject) => {
            try {
                // Load cropped image
                const croppedImage = new Image()
                croppedImage.crossOrigin = 'anonymous'
                const croppedUrl = URL.createObjectURL(croppedBlob)

                croppedImage.onload = () => {
                    URL.revokeObjectURL(croppedUrl)

                    // Create canvas for composite
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'))
                        return
                    }

                    // Design constants - Modern layout
                    const padding = 40
                    const headerHeight = 140
                    const priceCardHeight = 100
                    const detailsCardHeight = 160
                    const footerHeight = 80
                    const spacing = 25
                    const maxImageWidth = 900

                    // Calculate image dimensions maintaining aspect ratio
                    let imgWidth = croppedImage.width
                    let imgHeight = croppedImage.height

                    if (imgWidth > maxImageWidth) {
                        const ratio = maxImageWidth / imgWidth
                        imgWidth = maxImageWidth
                        imgHeight = imgHeight * ratio
                    }

                    const canvasWidth = Math.max(imgWidth + (padding * 2), 700)
                    canvas.width = canvasWidth
                    canvas.height = headerHeight + spacing + imgHeight + spacing + priceCardHeight + spacing + detailsCardHeight + spacing + footerHeight

                    // BACKGROUND - Subtle gradient
                    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
                    bgGradient.addColorStop(0, '#f8fafc')
                    bgGradient.addColorStop(1, '#e2e8f0')
                    ctx.fillStyle = bgGradient
                    ctx.fillRect(0, 0, canvas.width, canvas.height)

                    // HEADER - Modern gradient with brand
                    const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, headerHeight)
                    headerGradient.addColorStop(0, '#1e40af')
                    headerGradient.addColorStop(0.5, '#3b82f6')
                    headerGradient.addColorStop(1, '#60a5fa')
                    ctx.fillStyle = headerGradient
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
                    ctx.shadowBlur = 20
                    ctx.shadowOffsetY = 10
                    ctx.fillRect(0, 0, canvas.width, headerHeight)
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Racing stripes decoration
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
                    ctx.fillRect(0, 0, canvas.width, 8)
                    ctx.fillRect(0, headerHeight - 8, canvas.width, 8)

                    // Hot Wheels icon/emoji
                    ctx.font = '48px Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('🏎️', canvas.width / 2, 50)

                    // Title in header with better typography
                    ctx.fillStyle = '#ffffff'
                    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'

                    // Wrap text if too long
                    const maxWidth = canvas.width - (padding * 2)
                    const words = carName.split(' ')
                    let line = ''
                    let y = 95
                    const lineHeight = 38

                    for (let i = 0; i < words.length; i++) {
                        const testLine = line + words[i] + ' '
                        const metrics = ctx.measureText(testLine)

                        if (metrics.width > maxWidth && i > 0) {
                            ctx.fillText(line, canvas.width / 2, y)
                            line = words[i] + ' '
                            y += lineHeight
                        } else {
                            line = testLine
                        }
                    }
                    ctx.fillText(line, canvas.width / 2, y)

                    // PRODUCT IMAGE with modern card style
                    const imageY = headerHeight + spacing
                    const imageX = (canvas.width - imgWidth) / 2

                    // Card background for image
                    ctx.fillStyle = '#ffffff'
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
                    ctx.shadowBlur = 25
                    ctx.shadowOffsetY = 8
                    const imgPadding = 15
                    ctx.beginPath()
                    ctx.roundRect(imageX - imgPadding, imageY - imgPadding, imgWidth + imgPadding * 2, imgHeight + imgPadding * 2, 16)
                    ctx.fill()
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Enable high quality image rendering
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = 'high'

                    ctx.drawImage(croppedImage, imageX, imageY, imgWidth, imgHeight)

                    // PRICE CARD - Eye-catching design
                    const priceCardY = imageY + imgHeight + spacing
                    const priceCardWidth = canvas.width - (padding * 2)
                    const priceCardX = padding

                    // Price card with vibrant gradient
                    const priceGradient = ctx.createLinearGradient(priceCardX, priceCardY, priceCardX + priceCardWidth, priceCardY + priceCardHeight)
                    priceGradient.addColorStop(0, '#10b981')
                    priceGradient.addColorStop(1, '#059669')

                    ctx.fillStyle = priceGradient
                    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)'
                    ctx.shadowBlur = 20
                    ctx.shadowOffsetY = 8
                    ctx.beginPath()
                    ctx.roundRect(priceCardX, priceCardY, priceCardWidth, priceCardHeight, 16)
                    ctx.fill()
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Accent stripe on price card
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
                    ctx.beginPath()
                    ctx.roundRect(priceCardX + 15, priceCardY + 15, 6, priceCardHeight - 30, 3)
                    ctx.fill()

                    // Price label
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('PRECIO', canvas.width / 2, priceCardY + 30)

                    // Price value
                    ctx.fillStyle = '#ffffff'
                    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText(`$${price.toFixed(2)}`, canvas.width / 2, priceCardY + 78)

                    // DETAILS CARD - Professional info section
                    const detailsCardY = priceCardY + priceCardHeight + spacing
                    ctx.fillStyle = '#ffffff'
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
                    ctx.shadowBlur = 20
                    ctx.shadowOffsetY = 6
                    ctx.beginPath()
                    ctx.roundRect(priceCardX, detailsCardY, priceCardWidth, detailsCardHeight, 16)
                    ctx.fill()
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Details header with accent
                    ctx.fillStyle = '#f0f9ff'
                    ctx.beginPath()
                    ctx.roundRect(priceCardX, detailsCardY, priceCardWidth, 45, 16)
                    ctx.fill()

                    ctx.fillStyle = '#1e40af'
                    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('📋 ESPECIFICACIONES', canvas.width / 2, detailsCardY + 30)

                    // Details content with icons
                    ctx.textAlign = 'left'
                    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    let detailY = detailsCardY + 70

                    if (item?.brand) {
                        ctx.fillStyle = '#64748b'
                        ctx.fillText('🏷️ Marca:', priceCardX + 30, detailY)
                        ctx.fillStyle = '#1e293b'
                        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        ctx.fillText(item.brand, priceCardX + 140, detailY)
                        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        detailY += 32
                    }

                    if (item?.condition) {
                        ctx.fillStyle = '#64748b'
                        ctx.fillText('✨ Condición:', priceCardX + 30, detailY)
                        ctx.fillStyle = '#1e293b'
                        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        ctx.fillText(item.condition, priceCardX + 170, detailY)
                        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        detailY += 32
                    }

                    if (item?.pieceType) {
                        ctx.fillStyle = '#64748b'
                        ctx.fillText('📦 Tipo:', priceCardX + 30, detailY)
                        ctx.fillStyle = '#1e293b'
                        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        ctx.fillText(item.pieceType, priceCardX + 115, detailY)
                    }

                    // FOOTER - Professional branding
                    const footerY = detailsCardY + detailsCardHeight + spacing

                    // Footer background
                    ctx.fillStyle = '#1e293b'
                    ctx.beginPath()
                    ctx.roundRect(0, footerY, canvas.width, footerHeight, 0)
                    ctx.fill()

                    // Decorative top line
                    const footerLineGradient = ctx.createLinearGradient(0, footerY, canvas.width, footerY)
                    footerLineGradient.addColorStop(0, 'rgba(59, 130, 246, 0)')
                    footerLineGradient.addColorStop(0.5, 'rgba(59, 130, 246, 1)')
                    footerLineGradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
                    ctx.fillStyle = footerLineGradient
                    ctx.fillRect(0, footerY, canvas.width, 4)

                    // Footer text
                    const storeName = import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'
                    ctx.fillStyle = '#94a3b8'
                    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText(storeName, canvas.width / 2, footerY + 30)

                    ctx.fillStyle = '#64748b'
                    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.fillText('¡Gracias por tu interés!', canvas.width / 2, footerY + 55)

                    // Convert to blob with high quality
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Failed to create composite blob'))
                        }
                    }, 'image/jpeg', 0.95)
                }

                croppedImage.onerror = () => {
                    URL.revokeObjectURL(croppedUrl)
                    reject(new Error('Failed to load cropped image'))
                }

                croppedImage.src = croppedUrl
            } catch (error) {
                reject(error)
            }
        })
    }

    const handleSharePDF = async () => {
        try {
            setShareMode('pdf')
            setShowCropModal(true)
        } catch (error) {
            console.error('Error preparing PDF:', error)
            toast.error('Error al preparar PDF')
        }
    }

    const generateAndSharePDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf')

            const carName = getCarName()
            const price = sharePrice

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 15
            const storeName = import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'

            // MODERN GRADIENT HEADER (Reducido)
            // Primary gradient rectangle
            pdf.setFillColor(30, 64, 175) // Dark blue
            pdf.rect(0, 0, pageWidth, 35, 'F')

            // Lighter overlay for gradient effect
            pdf.setFillColor(59, 130, 246) // Lighter blue
            pdf.setGState(pdf.GState({ opacity: 0.6 }))
            pdf.rect(0, 0, pageWidth, 35, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Racing stripes decoration
            pdf.setFillColor(255, 255, 255)
            pdf.setGState(pdf.GState({ opacity: 0.15 }))
            pdf.rect(0, 0, pageWidth, 2, 'F')
            pdf.rect(0, 33, pageWidth, 2, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Store name
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')
            pdf.text(storeName, pageWidth / 2, 10, { align: 'center' })

            // Title with better formatting
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            const titleLines = pdf.splitTextToSize(carName, pageWidth - 2 * margin)
            let titleY = 20
            titleLines.forEach((line: string) => {
                pdf.text(line, pageWidth / 2, titleY, { align: 'center' })
                titleY += 7
            })

            let currentY = 45

            // MODERN PRICE CARD
            const priceCardHeight = 28

            // Price card shadow effect
            pdf.setFillColor(0, 0, 0)
            pdf.setGState(pdf.GState({ opacity: 0.1 }))
            pdf.roundedRect(margin + 1, currentY + 2, pageWidth - 2 * margin, priceCardHeight, 4, 4, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Price card with green gradient
            pdf.setFillColor(16, 185, 129) // Green
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, priceCardHeight, 4, 4, 'F')

            // Accent stripe
            pdf.setFillColor(255, 255, 255)
            pdf.setGState(pdf.GState({ opacity: 0.2 }))
            pdf.roundedRect(margin + 4, currentY + 4, 2, priceCardHeight - 8, 1, 1, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Price label
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.text('PRECIO', pageWidth / 2, currentY + 9, { align: 'center' })

            // Price value
            pdf.setFontSize(20)
            pdf.setFont('helvetica', 'bold')
            pdf.text(`$${price.toFixed(2)}`, pageWidth / 2, currentY + 22, { align: 'center' })

            currentY += priceCardHeight + 15

            // PRODUCT IMAGE with card background
            if (item?.photos && item.photos.length > 0) {
                const photo = croppedImageData || item.photos[selectedPhotoIndex]
                try {
                    const img = new Image()
                    if (!croppedImageData) {
                        img.crossOrigin = 'anonymous'
                    }
                    img.src = photo

                    await new Promise((resolve) => {
                        img.onload = resolve
                    })

                    // Calculate image dimensions
                    const maxWidth = pageWidth - 2 * margin - 8
                    const maxHeight = 120
                    const imgRatio = img.width / img.height

                    let imgWidth = maxWidth
                    let imgHeight = imgWidth / imgRatio

                    if (imgHeight > maxHeight) {
                        imgHeight = maxHeight
                        imgWidth = imgHeight * imgRatio
                    }

                    const imgX = (pageWidth - imgWidth) / 2
                    const imgPadding = 4

                    // Card background for image with shadow
                    pdf.setFillColor(0, 0, 0)
                    pdf.setGState(pdf.GState({ opacity: 0.08 }))
                    pdf.roundedRect(imgX - imgPadding + 1, currentY + 2, imgWidth + imgPadding * 2, imgHeight + imgPadding * 2, 3, 3, 'F')
                    pdf.setGState(pdf.GState({ opacity: 1 }))

                    pdf.setFillColor(255, 255, 255)
                    pdf.roundedRect(imgX - imgPadding, currentY, imgWidth + imgPadding * 2, imgHeight + imgPadding * 2, 3, 3, 'F')

                    // Add image
                    pdf.addImage(photo, 'JPEG', imgX, currentY + imgPadding / 2, imgWidth, imgHeight, undefined, 'FAST')

                    currentY += imgHeight + imgPadding * 2 + 15
                } catch (e) {
                    console.warn('Could not add image to PDF:', e)
                    currentY += 15
                }
            }

            // DETAILS CARD (Ampliada)
            const detailsCardHeight = 85

            // Card shadow
            pdf.setFillColor(0, 0, 0)
            pdf.setGState(pdf.GState({ opacity: 0.08 }))
            pdf.roundedRect(margin + 1, currentY + 2, pageWidth - 2 * margin, detailsCardHeight, 4, 4, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Card background
            pdf.setFillColor(255, 255, 255)
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, detailsCardHeight, 4, 4, 'F')

            // Header section of card
            pdf.setFillColor(240, 249, 255) // Light blue
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, 12, 4, 4, 'F')

            pdf.setTextColor(30, 64, 175)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'bold')
            pdf.text('ESPECIFICACIONES', pageWidth / 2, currentY + 8, { align: 'center' })

            currentY += 18

            // Details content
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            const detailX = margin + 8

            if (item?.brand) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('Marca:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.brand, detailX + 18, currentY)
                pdf.setFont('helvetica', 'normal')
                currentY += 10
            }

            if (item?.condition) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('Condicion:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.condition, detailX + 25, currentY)
                pdf.setFont('helvetica', 'normal')
                currentY += 10
            }

            if (item?.pieceType) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('Tipo:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.pieceType, detailX + 15, currentY)
            }

            // PROFESSIONAL FOOTER
            const footerY = pageHeight - 25

            // Footer background
            pdf.setFillColor(30, 41, 59)
            pdf.rect(0, footerY, pageWidth, 25, 'F')

            // Decorative line with gradient effect
            pdf.setFillColor(59, 130, 246)
            pdf.setGState(pdf.GState({ opacity: 0.8 }))
            pdf.rect(pageWidth * 0.25, footerY, pageWidth * 0.5, 1, 'F')
            pdf.setGState(pdf.GState({ opacity: 1 }))

            // Footer text
            pdf.setTextColor(148, 163, 184)
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.text(storeName, pageWidth / 2, footerY + 10, { align: 'center' })

            pdf.setTextColor(100, 116, 139)
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Gracias por tu interes!', pageWidth / 2, footerY + 18, { align: 'center' })

            const pdfBlob = pdf.output('blob')
            const file = new File([pdfBlob], `${carName.replace(/\s+/g, '-')}.pdf`, { type: 'application/pdf' })

            // Use native share if available
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: carName,
                    text: `🏎️ ${carName} - $${price.toFixed(2)}`,
                    files: [file]
                })
                toast.success('PDF compartido exitosamente')
            } else {
                // Fallback: download PDF
                const url = URL.createObjectURL(pdfBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${carName.replace(/\s+/g, '-')}.pdf`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('PDF descargado')
            }

            setShowShareModal(false)
        } catch (error) {
            console.error('Error creating PDF:', error)
            toast.error('Error al crear PDF')
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando detalle...</p>
                </div>
            </div>
        )
    }

    if (!item) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-slate-400 mb-4">Item no encontrado</p>
                    <Button onClick={() => navigate('/inventory')}>
                        Volver al Inventario
                    </Button>
                </div>
            </div>
        )
    }

    const carName = getCarName()
    const finalPrice = getFinalPrice()
    const reservedQuantity = item.reservedQuantity || 0
    const availableQuantity = Math.max(0, item.quantity - reservedQuantity)
    const purchasePrice = item.purchasePrice || 0
    const profit = finalPrice - purchasePrice
    const margin = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0

    const inventoryPhotos = item.photos || []
    const galleryPhotos = Array.isArray(item.hotWheelsCar?.photo_gallery)
        ? item.hotWheelsCar.photo_gallery.filter(
            (url: string) => url && !inventoryPhotos.includes(url) && url !== item.hotWheelsCar?.photo_url_carded
        )
        : []

    const displayPhotos = [
        ...inventoryPhotos.map((url, index) => ({
            url,
            source: 'L' as const,
            title: `Foto local ${index + 1}`,
            isPrimary: index === (item.primaryPhotoIndex || 0),
        })),
        ...(item.hotWheelsCar?.photo_url_carded
            ? [{
                url: item.hotWheelsCar.photo_url_carded,
                source: 'C' as const,
                title: 'Foto carded catálogo',
                isPrimary: false,
            }]
            : []),
        ...galleryPhotos.map((url: string, index: number) => ({
            url,
            source: 'G' as const,
            title: `Galería catálogo ${index + 1}`,
            isPrimary: false,
        })),
    ]

    const safeSelectedPhotoIndex = displayPhotos.length > 0
        ? Math.min(selectedPhotoIndex, displayPhotos.length - 1)
        : 0

    const selectedPhoto = displayPhotos[safeSelectedPhotoIndex]

    const technicalRows: Array<{ label: string; value: string | number | null | undefined }> = [
        { label: 'ID del item', value: item._id },
        { label: 'Car ID', value: item.carId },
        { label: 'Modelo catálogo', value: item.hotWheelsCar?.model || item.carName },
        { label: 'Marca', value: item.brand || item.hotWheelsCar?.brand },
        { label: 'Tipo de pieza', value: item.pieceType },
        { label: 'Serie', value: item.hotWheelsCar?.series || item.series },
        { label: 'Año', value: item.hotWheelsCar?.year || item.year },
        { label: 'Color', value: item.hotWheelsCar?.color || item.color },
        { label: 'Toy #', value: item.hotWheelsCar?.toy_num },
        { label: 'Col #', value: item.hotWheelsCar?.col_num },
        { label: 'Condición', value: item.condition },
        { label: 'Cantidad total', value: item.quantity },
        { label: 'Reservadas', value: reservedQuantity },
        { label: 'Disponibles', value: availableQuantity },
        { label: 'Ubicación', value: item.location },
        { label: 'Fecha alta', value: item.dateAdded ? new Date(item.dateAdded).toLocaleDateString('es-MX') : null },
        { label: 'Última actualización', value: item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('es-MX') : null },
        { label: 'Serie ID', value: item.seriesId },
        { label: 'Serie nombre', value: item.seriesName },
        { label: 'Serie tamaño', value: item.seriesSize },
        { label: 'Serie posición', value: item.seriesPosition },
        { label: 'Precio de serie', value: item.seriesPrice ? `$${item.seriesPrice.toFixed(2)}` : null },
        { label: 'Caja origen', value: item.sourceBox },
        { label: 'ID caja origen', value: item.sourceBoxId },
        { label: 'Es caja', value: item.isBox ? 'Sí' : 'No' },
        { label: 'Nombre caja', value: item.boxName },
        { label: 'Tamaño caja', value: item.boxSize },
        { label: 'Precio caja', value: item.boxPrice ? `$${item.boxPrice.toFixed(2)}` : null },
        { label: 'Estado caja', value: item.boxStatus },
        { label: 'Piezas registradas', value: item.registeredPieces },
        { label: 'Fotos locales', value: inventoryPhotos.length },
        { label: 'Foto carded catálogo', value: item.hotWheelsCar?.photo_url_carded ? 'Sí' : 'No' },
        { label: 'Fotos galería catálogo', value: galleryPhotos.length },
    ]

    const visibleTechnicalRows = technicalRows.filter((row) => row.value !== undefined && row.value !== null && row.value !== '')

    const specialTags = [
        item.isSuperTreasureHunt ? 'Super Treasure Hunt' : null,
        item.isTreasureHunt ? 'Treasure Hunt' : null,
        item.isChase ? 'Chase' : null,
        item.isFantasy ? 'Fantasy' : null,
        item.isMoto ? 'Moto' : null,
        item.isCamioneta ? 'Camioneta' : null,
        item.isFastFurious ? 'Fast & Furious' : null,
    ].filter(Boolean) as string[]

    return (
        <div className={`min-h-screen pb-20 sm:pb-24 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
            <div className={`border-b sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/inventory')}
                        className="!p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className={`text-base sm:text-lg font-bold truncate flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{carName}</h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="lg:col-span-3 space-y-3 sm:space-y-4">
                        <Card className="overflow-hidden p-0">
                            {selectedPhoto ? (
                                <div>
                                    <div className="relative group h-[48vh] min-h-[280px] max-h-[520px] sm:h-[58vh] sm:min-h-[360px] sm:max-h-[680px] bg-black flex items-center justify-center">
                                        <img
                                            src={proxifyImageUrl(selectedPhoto.url)}
                                            alt={carName}
                                            crossOrigin="anonymous"
                                            onClick={() => setShowGalleryModal(true)}
                                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 rounded bg-black/70 text-white text-xs font-semibold">
                                            {selectedPhoto.source === 'L' ? 'Local' : selectedPhoto.source === 'C' ? 'Carded' : 'Galería'}
                                        </div>
                                    </div>

                                    {displayPhotos.length > 1 && (
                                        <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto">
                                            {displayPhotos.map((photo, index) => (
                                                <button
                                                    key={`${photo.source}-${index}`}
                                                    onClick={() => setSelectedPhotoIndex(index)}
                                                    title={photo.title}
                                                    className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 relative ${safeSelectedPhotoIndex === index ? 'border-primary-600' : 'border-slate-700'}`}
                                                >
                                                    <img
                                                        src={proxifyImageUrl(photo.url)}
                                                        alt={`${carName} ${index + 1}`}
                                                        crossOrigin="anonymous"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute bottom-0.5 left-0.5 bg-gray-900/80 text-white text-xs px-1 rounded">
                                                        {photo.source}
                                                    </div>
                                                    {photo.isPrimary && (
                                                        <div className="absolute top-1 right-1 text-lg">⭐</div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={`h-80 flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                    <Package className="w-16 h-16 text-gray-400" />
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                        <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                            <div className="p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90 mb-1">Precio al Cliente</p>
                                        <p className="text-3xl sm:text-4xl font-bold">${finalPrice.toFixed(2)}</p>
                                    </div>
                                    <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
                                </div>
                                <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-white/20 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="opacity-90">Compra:</span>
                                        <span className="font-semibold">${purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-90">Ganancia:</span>
                                        <span className="font-semibold">${profit.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-90">Margen:</span>
                                        <span className="font-semibold">{margin.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                <h2 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Resumen rápido</h2>
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                    <div className={`rounded-lg p-1.5 sm:p-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Disponibles</p>
                                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{availableQuantity}</p>
                                    </div>
                                    <div className={`rounded-lg p-1.5 sm:p-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Reservadas</p>
                                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{reservedQuantity}</p>
                                    </div>
                                    <div className={`rounded-lg p-1.5 sm:p-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Condición</p>
                                        <p className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.condition}</p>
                                    </div>
                                    <div className={`rounded-lg p-1.5 sm:p-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Ubicación</p>
                                        <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.location || 'Sin ubicación'}</p>
                                    </div>
                                </div>

                                {specialTags.length > 0 && (
                                    <div>
                                        <p className={`text-xs mb-1.5 sm:mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Etiquetas especiales</p>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {specialTags.map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 sm:py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card>
                            <div className="p-3 sm:p-4 space-y-2">
                                <h2 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Acciones</h2>
                                <Button
                                    className="w-full justify-center gap-2 h-9 sm:h-10"
                                    onClick={() => item && handleEditItem(item)}
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar Item
                                </Button>
                                {canEditCatalog && item && (
                                    <Button
                                        className="w-full justify-center gap-2 h-9 sm:h-10 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        variant="secondary"
                                        onClick={() => setShowEditCatalogModal(true)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Editar Catálogo
                                    </Button>
                                )}
                                {user?.role === 'admin' && (
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-center gap-2 h-9 sm:h-10 text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {isDeleting ? 'Eliminando...' : 'Eliminar Item'}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                <Card>
                    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                        <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                            Ficha técnica completa
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {visibleTechnicalRows.map((row) => (
                                <div
                                    key={row.label}
                                    className={`rounded-lg p-2.5 sm:p-3 ${isDark ? 'bg-slate-700/40 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}
                                >
                                    <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{row.label}</p>
                                    <p className={`text-sm sm:text-base font-medium break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>{String(row.value)}</p>
                                </div>
                            ))}
                        </div>

                        {item.notes && (
                            <div className={`rounded-lg p-2.5 sm:p-3 ${isDark ? 'bg-slate-700/40 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                                <p className={`text-xs uppercase tracking-wide mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Notas</p>
                                <p className={`${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.notes}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <button
                onClick={handleOpenShareModal}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all hover:scale-110 z-20"
                style={{
                    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${floatingButtonBottom}px)`
                }}
            >
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <Modal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                title="Compartir pieza"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                        <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            Elige cómo quieres compartir esta pieza con tu cliente.
                        </p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Precio para compartir
                        </label>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            className="input w-full"
                            value={sharePrice}
                            onChange={(e) => setSharePrice(Number(e.target.value) || 0)}
                        />
                    </div>

                    <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        <input
                            type="checkbox"
                            checked={showQuantityInShare}
                            onChange={(e) => setShowQuantityInShare(e.target.checked)}
                            className="w-4 h-4 accent-primary-600"
                        />
                        Mostrar cantidad disponible en el reporte
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button className="w-full justify-center gap-2" onClick={handleShareImage}>
                            <ImageIcon className="w-4 h-4" />
                            Compartir imagen
                        </Button>
                        <Button className="w-full justify-center gap-2" variant="secondary" onClick={handleSharePDF}>
                            <FileText className="w-4 h-4" />
                            Compartir PDF
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showCropModal}
                onClose={() => {
                    setShowCropModal(false)
                    setShareMode(null)
                    setCompletedCrop(null)
                }}
                title={shareMode === 'pdf' ? 'Recortar imagen para PDF' : 'Recortar imagen para compartir'}
                maxWidth="lg"
                footer={
                    <div className="flex space-x-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowCropModal(false)
                                setShareMode(null)
                                setCompletedCrop(null)
                            }}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button className="flex-1" onClick={handleConfirmCrop}>
                            <Share2 className="w-4 h-4 mr-1" />
                            Compartir
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900">Ajusta el área que quieres compartir con el cliente.</p>
                    </div>

                    {selectedPhoto && (
                        <div className="w-full bg-slate-700 rounded-lg overflow-auto" style={{ maxHeight: '70vh', minHeight: '400px' }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={undefined}
                            >
                                <img
                                    ref={imageRef}
                                    src={proxifyImageUrl(selectedPhoto.url)}
                                    alt={carName}
                                    crossOrigin="anonymous"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                    onLoad={() => {
                                        if (!completedCrop) {
                                            setCompletedCrop(crop)
                                        }
                                    }}
                                />
                            </ReactCrop>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Edit Item Modal */}
            <Modal
                isOpen={showEditModal && editingItem !== null}
                onClose={() => {
                    setShowEditModal(false)
                    setEditingItem(null)
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Código/ID del auto a escala
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Precio de Compra
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input w-full"
                                placeholder="0.00"
                                value={!editingItem.purchasePrice ? '' : editingItem.purchasePrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, purchasePrice: 0 })
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Precio Sugerido
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input w-full"
                                placeholder="0.00"
                                value={!editingItem.suggestedPrice ? '' : editingItem.suggestedPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    if (value === '') {
                                        setEditingItem({ ...editingItem, suggestedPrice: 0 })
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Condición
                            </label>
                            <select
                                className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Marca
                            </label>
                            <select
                                className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                value={editingItem.brand || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                            >
                                <option value="">Sin marca</option>
                                <option value="Hot Wheels">Hot Wheels</option>
                                <option value="Matchbox">Matchbox</option>
                                <option value="Mini GT">Mini GT</option>
                                <option value="Kaido House">Kaido House</option>
                                <option value="M2 Machines">M2 Machines</option>
                            </select>
                        </div>

                        {/* Piece Type - Edit Mode */}
                        {editingItem.brand && (
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    Tipo de Pieza
                                </label>
                                <select
                                    className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                    value={editingItem.pieceType || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, pieceType: (e.target.value || undefined) as 'basic' | 'premium' | 'rlc' | 'silver_series' | 'elite_64' | undefined })}
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
                                <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isTreasureHunt || false}
                                        disabled={editingItem.isSuperTreasureHunt}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            isTreasureHunt: e.target.checked,
                                            isSuperTreasureHunt: false
                                        })}
                                        className="w-4 h-4 accent-primary-600 cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${editingItem.isSuperTreasureHunt ? (isDark ? 'text-slate-500' : 'text-gray-400') : ''}`}>
                                        🔍 Treasure Hunt (TH)
                                    </span>
                                </label>

                                <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isSuperTreasureHunt || false}
                                        disabled={editingItem.isTreasureHunt}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            isSuperTreasureHunt: e.target.checked,
                                            isTreasureHunt: false
                                        })}
                                        className="w-4 h-4 accent-primary-600 cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm font-medium ${editingItem.isTreasureHunt ? (isDark ? 'text-slate-500' : 'text-gray-400') : ''}`}>
                                        ⭐ Super Treasure Hunt (STH)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Fantasy Casting - Edit Mode (only for Hot Wheels) */}
                        {editingItem.brand?.toLowerCase() === 'hot wheels' && (
                            <div>
                                <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isFantasy || false}
                                        onChange={(e) => setEditingItem({ ...editingItem, isFantasy: e.target.checked })}
                                        className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                    />
                                    <span className="text-sm font-medium">
                                        🎨 Fantasía (diseño original)
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Chase - Edit Mode (for Mini GT, Kaido House, M2, or Hot Wheels Premium) */}
                        {(editingItem.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(editingItem.brand.toLowerCase())) ||
                            (editingItem.brand?.toLowerCase() === 'hot wheels' && editingItem.pieceType === 'premium') ? (
                            <div>
                                <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isChase || false}
                                        onChange={(e) => setEditingItem({ ...editingItem, isChase: e.target.checked })}
                                        className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                    />
                                    <span className="text-sm font-medium">
                                        🌟 Chase
                                    </span>
                                </label>
                            </div>
                        ) : null}

                        {/* Moto - Edit Mode */}
                        <div>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isMoto || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isMoto: e.target.checked })}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className="text-sm font-medium">
                                    🏍️ Moto
                                </span>
                            </label>
                        </div>

                        {/* Camioneta - Edit Mode */}
                        <div>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isCamioneta || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isCamioneta: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    🚚 Camioneta
                                </span>
                            </label>
                        </div>

                        {/* Fast and Furious - Edit Mode */}
                        <div>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isFastFurious || false}
                                    onChange={(e) => setEditingItem({ ...editingItem, isFastFurious: e.target.checked })}
                                    className="rounded"
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
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
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Fotos
                            </label>

                            {/* Photo Upload */}
                            <div className="mb-3 space-y-2">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                    multiple
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                    className="hidden"
                                    id="photo-upload-edit"
                                    disabled={uploadingPhotos > 0}
                                />
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                    multiple
                                    capture="environment"
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                    className="hidden"
                                    id="photo-camera-edit"
                                    disabled={uploadingPhotos > 0}
                                />
                                <div className="flex gap-2">
                                    <label
                                        htmlFor="photo-upload-edit"
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingPhotos > 0
                                            ? 'opacity-50 cursor-not-allowed border-slate-400'
                                            : 'border-slate-600 hover:border-gray-400'
                                            }`}
                                    >
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-sm text-slate-400">Galería</span>
                                    </label>
                                    <label
                                        htmlFor="photo-camera-edit"
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingPhotos > 0
                                            ? 'opacity-50 cursor-not-allowed border-slate-400'
                                            : 'border-slate-600 hover:border-gray-400'
                                            }`}
                                    >
                                        <Camera size={20} className="text-gray-400" />
                                        <span className="text-sm text-slate-400">Cámara</span>
                                    </label>
                                </div>
                            </div>

                            {/* Photo Preview */}
                            {editingItem.photos && editingItem.photos.length > 0 && (
                                <div className="space-y-3">
                                    {/* Foto Principal (Destacada) */}
                                    <div className="border-2 border-blue-400 rounded-lg p-2 bg-blue-50">
                                        <p className="text-xs text-blue-700 font-semibold mb-2">⭐ FOTO DESTACADA</p>
                                        <img
                                            src={proxifyImageUrl(editingItem.photos[editingItem.primaryPhotoIndex || 0])}
                                            alt="Foto destacada"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                            className="w-full h-32 object-contain rounded"
                                        />
                                    </div>

                                    {/* Miniaturas para seleccionar */}
                                    {editingItem.photos.length > 1 && (
                                        <div>
                                            <p className="text-xs text-gray-600 font-semibold mb-2">Click para cambiar foto destacada:</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {editingItem.photos.map((photo: string, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="relative group cursor-pointer"
                                                        onClick={() => setEditingItem({ ...editingItem, primaryPhotoIndex: index })}
                                                    >
                                                        <img
                                                            src={proxifyImageUrl(photo)}
                                                            alt={`Foto ${index + 1}`}
                                                            loading="lazy"
                                                            crossOrigin="anonymous"
                                                            className={`w-full h-20 object-cover rounded border-2 transition-all ${(editingItem.primaryPhotoIndex || 0) === index
                                                                ? 'border-blue-500 ring-2 ring-blue-300'
                                                                : 'border-gray-300 hover:border-blue-400'
                                                                }`}
                                                        />
                                                        {(editingItem.primaryPhotoIndex || 0) === index && (
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
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Eliminar Item"
            >
                <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-red-500/20 border border-red-500/50' : 'bg-red-50 border border-red-200'}`}>
                        <p className={isDark ? 'text-red-200' : 'text-red-900'}>
                            ¿Estás seguro de que quieres eliminar este item? Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={handleDeleteItem}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Lightbox Modal - Simple Image Viewer */}
            {showGalleryModal && item?.photos && (item.photos.length > 0 || item.hotWheelsCar?.photo_url_carded || (Array.isArray(item.hotWheelsCar?.photo_gallery) && item.hotWheelsCar.photo_gallery.length > 0)) && (() => {
                // Build combined photos array (inventory + carded + gallery)
                const allPhotos = [
                    ...item.photos.map((photo, idx) => ({
                        url: photo,
                        type: 'loose' as const,
                        index: idx
                    })),
                    ...(item.hotWheelsCar?.photo_url_carded
                        ? [{
                            url: item.hotWheelsCar.photo_url_carded,
                            type: 'carded' as const,
                            index: -1
                        }]
                        : []),
                    ...(Array.isArray(item.hotWheelsCar?.photo_gallery)
                        ? item.hotWheelsCar.photo_gallery
                            .filter((url: string) => url && !item.photos.includes(url) && url !== item.hotWheelsCar?.photo_url_carded)
                            .map((url: string, idx: number) => ({
                                url,
                                type: 'gallery' as const,
                                index: idx
                            }))
                        : [])
                ]
                const totalPhotos = allPhotos.length
                const currentPhoto = allPhotos[selectedPhotoIndex]

                return (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowGalleryModal(false)}
                    >
                        {/* Image Container */}
                        <div
                            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Main Image */}
                            {currentPhoto && (
                                <img
                                    src={proxifyImageUrl(currentPhoto.url)}
                                    alt={`${carName} - ${currentPhoto.type === 'carded' ? 'Carded' : 'Loose'}`}
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-contain"
                                />
                            )}

                            {/* Left Arrow */}
                            {totalPhotos > 1 && (
                                <button
                                    onClick={() => setSelectedPhotoIndex(prev => prev === 0 ? totalPhotos - 1 : prev - 1)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-lg transition-colors"
                                    aria-label="Foto anterior"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            {/* Right Arrow */}
                            {totalPhotos > 1 && (
                                <button
                                    onClick={() => setSelectedPhotoIndex(prev => prev === totalPhotos - 1 ? 0 : prev + 1)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-lg transition-colors"
                                    aria-label="Siguiente foto"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setShowGalleryModal(false)}
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Photo Counter and Type */}
                            {totalPhotos > 1 && currentPhoto && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-3">
                                    <span>{selectedPhotoIndex + 1} / {totalPhotos}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${currentPhoto.type === 'carded'
                                        ? 'bg-amber-900/80 text-amber-100'
                                        : currentPhoto.type === 'gallery'
                                            ? 'bg-emerald-900/80 text-emerald-100'
                                            : 'bg-slate-700/80 text-slate-100'
                                        }`}>
                                        {currentPhoto.type === 'carded' ? '📦 Carded' : currentPhoto.type === 'gallery' ? '🖼️ Gallery' : '📷 Loose'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* Edit Catalog Modal */}
            {item && (
                <EditCatalogModal
                    isOpen={showEditCatalogModal}
                    onClose={() => setShowEditCatalogModal(false)}
                    item={item}
                    onSuccess={() => {
                        setShowEditCatalogModal(false)
                        loadItem()
                    }}
                />
            )}

        </div>
    )
}