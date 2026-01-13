import { useState, useRef, useEffect } from 'react'
import { X, Download, Share2, Edit2, Check, ChevronLeft, ChevronRight, FileText, Images } from 'lucide-react'
import Button from './common/Button'
import Modal from './common/Modal'
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import jsPDF from 'jspdf'
import type { InventoryItem } from '@shared/types'

interface CollageItem {
    item: InventoryItem
    croppedImage: string | null
    customPrice: number
    originalImage: string
}

interface CollageGeneratorProps {
    isOpen: boolean
    onClose: () => void
    selectedItems: InventoryItem[]
}

export default function CollageGenerator({
    isOpen,
    onClose,
    selectedItems
}: CollageGeneratorProps) {
    const [collageItems, setCollageItems] = useState<CollageItem[]>([])
    const [currentStep, setCurrentStep] = useState<'crop' | 'price' | 'preview'>('crop')
    const [currentItemIndex, setCurrentItemIndex] = useState(0)
    const [crop, setCrop] = useState<CropType>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [generatedCollages, setGeneratedCollages] = useState<string[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [isDownloadingImages, setIsDownloadingImages] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)
    const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null)
    const [tempPrice, setTempPrice] = useState('')

    const storeName = import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage'

    // Initialize collage items with original photos and prices
    useEffect(() => {
        if (selectedItems.length > 0) {
            const items = selectedItems
                .filter(item => item.photos && item.photos.length > 0)
                .map(item => ({
                    item,
                    croppedImage: null,
                    customPrice: item.actualPrice || item.suggestedPrice || 0,
                    originalImage: item.photos![0]
                }))
            setCollageItems(items)
        }
    }, [selectedItems])

    // Split items into groups of 6
    const getCollageGroups = () => {
        const groups: CollageItem[][] = []
        for (let i = 0; i < collageItems.length; i += 6) {
            groups.push(collageItems.slice(i, i + 6))
        }
        return groups
    }

    const handleCropComplete = () => {
        console.log('handleCropComplete called', { completedCrop, hasImage: !!imgRef.current })

        // If no crop or crop is too small (less than 10 pixels), use original image
        if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height || completedCrop.width < 10 || completedCrop.height < 10) {
            console.log('Using original image (no valid crop)')
            // Skip crop, use original image
            const updated = [...collageItems]
            updated[currentItemIndex].croppedImage = updated[currentItemIndex].originalImage
            setCollageItems(updated)

            if (currentItemIndex < collageItems.length - 1) {
                setCurrentItemIndex(currentItemIndex + 1)
                setCrop(undefined)
                setCompletedCrop(undefined)
            } else {
                setCurrentStep('price')
                setCurrentItemIndex(0)
            }
            return
        }

        console.log('Creating cropped image', completedCrop)
        const image = imgRef.current
        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        console.log('Canvas setup:', { scaleX, scaleY, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })

        canvas.width = completedCrop.width
        canvas.height = completedCrop.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            console.error('Could not get canvas context')
            return
        }

        try {
            ctx.drawImage(
                image,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0,
                0,
                completedCrop.width,
                completedCrop.height
            )
            console.log('Image drawn to canvas successfully')
        } catch (error) {
            console.error('Error drawing image to canvas:', error)
            return
        }

        // Try using canvas.toBlob with error handling
        try {
            canvas.toBlob((blob) => {
                console.log('toBlob callback executed', { hasBlob: !!blob })
                if (blob) {
                    console.log('Cropped blob created successfully', blob.size)
                    const croppedUrl = URL.createObjectURL(blob)
                    const updated = [...collageItems]
                    updated[currentItemIndex].croppedImage = croppedUrl
                    setCollageItems(updated)

                    if (currentItemIndex < collageItems.length - 1) {
                        console.log('Moving to next item')
                        setCurrentItemIndex(currentItemIndex + 1)
                        setCrop(undefined)
                        setCompletedCrop(undefined)
                    } else {
                        console.log('Moving to price step')
                        setCurrentStep('price')
                        setCurrentItemIndex(0)
                    }
                } else {
                    console.error('Failed to create blob from canvas')
                }
            }, 'image/jpeg', 0.95)
        } catch (error) {
            console.error('Error in toBlob:', error)
        }
    }

    const handlePriceEdit = (index: number, newPrice: number) => {
        const updated = [...collageItems]
        updated[index].customPrice = newPrice
        setCollageItems(updated)
    }

    const startPriceEdit = (index: number) => {
        setEditingPriceIndex(index)
        setTempPrice(collageItems[index].customPrice.toString())
    }

    const savePriceEdit = () => {
        if (editingPriceIndex !== null) {
            const price = parseFloat(tempPrice)
            if (!isNaN(price) && price >= 0) {
                handlePriceEdit(editingPriceIndex, price)
            }
            setEditingPriceIndex(null)
            setTempPrice('')
        }
    }

    const cancelPriceEdit = () => {
        setEditingPriceIndex(null)
        setTempPrice('')
    }

    const generateCollages = async () => {
        setIsGenerating(true)
        const groups = getCollageGroups()
        const collages: string[] = []

        for (const group of groups) {
            const collageBlob = await createCollageImage(group)
            if (collageBlob) {
                collages.push(URL.createObjectURL(collageBlob))
            }
        }

        setGeneratedCollages(collages)
        setCurrentStep('preview')
        setIsGenerating(false)
    }

    const createCollageImage = (items: CollageItem[]): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                resolve(null)
                return
            }

            // Canvas dimensions - High quality, minimal design
            const cols = items.length <= 3 ? items.length : 3
            const rows = Math.ceil(items.length / 3)
            const cellWidth = 800 // Increased for better quality
            const cellHeight = 800 // Increased for better quality
            const padding = 8 // Minimal padding
            const headerHeight = 0 // No header - minimalist
            const footerHeight = 0 // No footer - minimalist

            canvas.width = cols * cellWidth + (cols + 1) * padding
            canvas.height = rows * cellHeight + (rows + 1) * padding + headerHeight + footerHeight

            // Simple light gray background
            ctx.fillStyle = '#e5e7eb'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            let loadedImages = 0
            const totalImages = items.length

            const drawImagesRecursively = (index: number) => {
                if (index >= totalImages) {
                    // All images loaded, resolve with high quality
                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.98)
                    return
                }

                const item = items[index]
                const img = new Image()
                img.crossOrigin = 'anonymous'

                img.onload = () => {
                    const col = index % 3
                    const row = Math.floor(index / 3)
                    const x = col * cellWidth + (col + 1) * padding
                    const y = row * cellHeight + (row + 1) * padding + headerHeight

                    // White background for cell (no shadows - minimalist)
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(x, y, cellWidth, cellHeight)

                    // Draw image - FULL SIZE to maximize quality and visibility
                    const scale = Math.min(cellWidth / img.width, cellHeight / img.height)
                    const scaledWidth = img.width * scale
                    const scaledHeight = img.height * scale
                    const imgX = x + (cellWidth - scaledWidth) / 2
                    const imgY = y + (cellHeight - scaledHeight) / 2

                    // Enable image smoothing for best quality
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = 'high'
                    ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight)

                    // Semi-transparent overlay at top for price (minimal, overlaid on image)
                    const overlayHeight = 90
                    const gradient = ctx.createLinearGradient(x, y, x, y + overlayHeight)
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)')
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
                    ctx.fillStyle = gradient
                    ctx.fillRect(x, y, cellWidth, overlayHeight)

                    // Price text - top center, overlaid on image
                    ctx.fillStyle = '#ffffff'
                    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
                    ctx.shadowBlur = 8
                    ctx.shadowOffsetY = 2
                    ctx.fillText(`$${item.customPrice.toFixed(2)}`, x + cellWidth / 2, y + 60)
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Quantity text - bottom center, overlaid on image
                    const availableQty = item.item.quantity - (item.item.reservedQuantity || 0)
                    if (availableQty > 0) {
                        // Semi-transparent overlay at bottom
                        const bottomOverlayHeight = 70
                        const bottomGradient = ctx.createLinearGradient(x, y + cellHeight - bottomOverlayHeight, x, y + cellHeight)
                        bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
                        bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)')
                        ctx.fillStyle = bottomGradient
                        ctx.fillRect(x, y + cellHeight - bottomOverlayHeight, cellWidth, bottomOverlayHeight)

                        ctx.fillStyle = '#ffffff'
                        ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        ctx.textAlign = 'center'
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
                        ctx.shadowBlur = 8
                        ctx.shadowOffsetY = 2
                        ctx.fillText(`${availableQty} disponibles`, x + cellWidth / 2, y + cellHeight - 25)
                        ctx.shadowColor = 'transparent'
                        ctx.shadowBlur = 0
                        ctx.shadowOffsetY = 0
                    }

                    loadedImages++
                    drawImagesRecursively(index + 1)
                }

                img.onerror = () => {
                    loadedImages++
                    drawImagesRecursively(index + 1)
                }

                img.src = item.croppedImage || item.originalImage
            }

            drawImagesRecursively(0)
        })
    }

    const downloadCollage = (collageUrl: string, index: number) => {
        const link = document.createElement('a')
        link.href = collageUrl
        link.download = `collage-${index + 1}.jpg`
        link.click()
    }

    const shareCollage = async (collageUrl: string) => {
        try {
            const response = await fetch(collageUrl)
            const blob = await response.blob()
            const file = new File([blob], 'collage.jpg', { type: 'image/jpeg' })

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Collage de Hot Wheels'
                })
            } else {
                // Fallback: download
                downloadCollage(collageUrl, 0)
            }
        } catch (error) {
            console.error('Error sharing:', error)
        }
    }

    const generatePDF = async () => {
        setIsGeneratingPDF(true)
        try {
            // Create PDF in landscape orientation to fit collages better
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 10

            for (let i = 0; i < generatedCollages.length; i++) {
                if (i > 0) {
                    pdf.addPage()
                }

                // Load image
                const img = await loadImageForPDF(generatedCollages[i])

                // Calculate dimensions to fit page while maintaining aspect ratio
                const imgAspectRatio = img.width / img.height
                const pageAspectRatio = (pageWidth - 2 * margin) / (pageHeight - 2 * margin)

                let imgWidth, imgHeight
                if (imgAspectRatio > pageAspectRatio) {
                    // Image is wider - fit to width
                    imgWidth = pageWidth - 2 * margin
                    imgHeight = imgWidth / imgAspectRatio
                } else {
                    // Image is taller - fit to height
                    imgHeight = pageHeight - 2 * margin
                    imgWidth = imgHeight * imgAspectRatio
                }

                const x = (pageWidth - imgWidth) / 2
                const y = (pageHeight - imgHeight) / 2

                pdf.addImage(generatedCollages[i], 'JPEG', x, y, imgWidth, imgHeight)
            }

            // Save PDF as blob
            const pdfBlob = pdf.output('blob')
            const pdfFile = new File([pdfBlob], 'collages.pdf', { type: 'application/pdf' })

            // Try to share, fallback to download
            if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: 'Collages PDF',
                    text: `Collages de ${storeName}`
                })
            } else {
                // Fallback: trigger download
                const url = URL.createObjectURL(pdfBlob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'collages.pdf'
                link.click()
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Error generating PDF:', error)
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const loadImageForPDF = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = url
        })
    }

    const downloadAllImages = async () => {
        setIsDownloadingImages(true)
        try {
            // Try to use Web Share API for mobile devices
            if (navigator.share && generatedCollages.length > 0) {
                // Convert all images to files
                const files = await Promise.all(
                    generatedCollages.map(async (url, index) => {
                        const response = await fetch(url)
                        const blob = await response.blob()
                        return new File([blob], `collage-${index + 1}.jpg`, { type: 'image/jpeg' })
                    })
                )

                // Try sharing multiple files
                if (navigator.canShare({ files })) {
                    await navigator.share({
                        files,
                        title: 'Collages',
                        text: `${generatedCollages.length} collages de ${storeName}`
                    })
                } else {
                    // Fallback: download one by one
                    downloadImagesSequentially()
                }
            } else {
                // Desktop or no Web Share API: download one by one
                downloadImagesSequentially()
            }
        } catch (error) {
            console.error('Error downloading images:', error)
            // If sharing failed, try downloading
            downloadImagesSequentially()
        } finally {
            setIsDownloadingImages(false)
        }
    }

    const downloadImagesSequentially = () => {
        generatedCollages.forEach((url, index) => {
            setTimeout(() => {
                downloadCollage(url, index)
            }, index * 500) // Delay each download by 500ms to avoid browser blocking
        })
    }

    const handleClose = () => {
        setCurrentStep('crop')
        setCurrentItemIndex(0)
        setCrop(undefined)
        setCompletedCrop(undefined)
        setGeneratedCollages([])
        onClose()
    }

    if (!isOpen || collageItems.length === 0) return null

    const groups = getCollageGroups()
    const currentItem = collageItems[currentItemIndex]

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Generar Collages para Facebook"
            maxWidth="4xl"
        >
            <div className="p-6">
                {/* Progress indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            {currentStep === 'crop' && `Recortar imágenes (${currentItemIndex + 1}/${collageItems.length})`}
                            {currentStep === 'price' && 'Editar precios'}
                            {currentStep === 'preview' && `${groups.length} ${groups.length === 1 ? 'Collage generado' : 'Collages generados'}`}
                        </span>
                        <span className="text-sm text-gray-500">
                            {groups.length} {groups.length === 1 ? 'collage' : 'collages'} de {collageItems.length} {collageItems.length === 1 ? 'imagen' : 'imágenes'}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{
                                width: currentStep === 'crop'
                                    ? `${((currentItemIndex + 1) / collageItems.length) * 33}%`
                                    : currentStep === 'price'
                                        ? '66%'
                                        : '100%'
                            }}
                        />
                    </div>
                </div>

                {/* Crop Step */}
                {currentStep === 'crop' && currentItem && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {currentItem.item.brand} - ${currentItem.customPrice.toFixed(2)}
                            </h4>
                            <p className="text-sm text-gray-600 mb-4">
                                Arrastra para seleccionar el área a recortar o presiona "Siguiente" sin seleccionar para usar la imagen completa
                            </p>
                            <div className="flex justify-center bg-white p-4 rounded-lg">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                >
                                    <img
                                        ref={imgRef}
                                        src={currentItem.originalImage}
                                        alt="Crop"
                                        crossOrigin="anonymous"
                                        style={{ maxHeight: '400px', maxWidth: '100%' }}
                                    />
                                </ReactCrop>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (currentItemIndex > 0) {
                                        setCurrentItemIndex(currentItemIndex - 1)
                                        setCrop(undefined)
                                        setCompletedCrop(undefined)
                                    }
                                }}
                                disabled={currentItemIndex === 0}
                                icon={<ChevronLeft size={18} />}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCropComplete}
                                icon={currentItemIndex < collageItems.length - 1 ? <ChevronRight size={18} /> : <Check size={18} />}
                            >
                                {currentItemIndex < collageItems.length - 1 ? 'Siguiente' : 'Finalizar recorte'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Price Edit Step */}
                {currentStep === 'price' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {collageItems.map((item, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="aspect-square relative">
                                        <img
                                            src={item.croppedImage || item.originalImage}
                                            alt={item.item.brand}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium text-gray-900 truncate mb-2">
                                            {item.item.brand}
                                        </p>
                                        {editingPriceIndex === index ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={tempPrice}
                                                    onChange={(e) => setTempPrice(e.target.value)}
                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    step="0.01"
                                                    min="0"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') savePriceEdit()
                                                        if (e.key === 'Escape') cancelPriceEdit()
                                                    }}
                                                />
                                                <button
                                                    onClick={savePriceEdit}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={cancelPriceEdit}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-green-600">
                                                    ${item.customPrice.toFixed(2)}
                                                </span>
                                                <button
                                                    onClick={() => startPriceEdit(index)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-4 border-t">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setCurrentStep('crop')
                                    setCurrentItemIndex(collageItems.length - 1)
                                }}
                                icon={<ChevronLeft size={18} />}
                            >
                                Volver a recortar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={generateCollages}
                                disabled={isGenerating}
                                icon={isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Check size={18} />}
                            >
                                {isGenerating ? 'Generando...' : 'Generar Collages'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Preview Step */}
                {currentStep === 'preview' && (
                    <div className="space-y-6">
                        {generatedCollages.map((collageUrl, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                    <h4 className="font-medium text-gray-900">
                                        Collage {index + 1} de {generatedCollages.length}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        {groups[index].length} {groups[index].length === 1 ? 'imagen' : 'imágenes'}
                                    </p>
                                </div>
                                <div className="p-4">
                                    <img
                                        src={collageUrl}
                                        alt={`Collage ${index + 1}`}
                                        className="w-full rounded-lg"
                                    />
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => downloadCollage(collageUrl, index)}
                                        icon={<Download size={18} />}
                                        className="flex-1"
                                    >
                                        Descargar
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => shareCollage(collageUrl)}
                                        icon={<Share2 size={18} />}
                                        className="flex-1"
                                    >
                                        Compartir
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Download All Images Button */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                                            <Images className="text-white" size={24} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-1">Descargar Imágenes</h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Descarga todos los collages al carrete fotográfico
                                        </p>
                                        <Button
                                            variant="primary"
                                            onClick={downloadAllImages}
                                            disabled={isDownloadingImages}
                                            icon={isDownloadingImages ?
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> :
                                                <Images size={18} />
                                            }
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {isDownloadingImages ? 'Descargando...' : `Descargar ${generatedCollages.length} ${generatedCollages.length === 1 ? 'Imagen' : 'Imágenes'}`}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* PDF Generation Button */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                            <FileText className="text-white" size={24} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-1">Generar PDF</h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Crea un PDF con todos los collages (un collage por página) listo para compartir
                                        </p>
                                        <Button
                                            variant="primary"
                                            onClick={generatePDF}
                                            disabled={isGeneratingPDF}
                                            icon={isGeneratingPDF ?
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> :
                                                <FileText size={18} />
                                            }
                                        >
                                            {isGeneratingPDF ? 'Generando PDF...' : 'Generar y Compartir PDF'}
                                        </Button>
                                    </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentStep('price')}
                                icon={<ChevronLeft size={18} />}
                            >
                                Editar precios
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleClose}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
