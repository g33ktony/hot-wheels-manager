import { useState, useRef, useEffect } from 'react'
import { X, Download, Share2, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './common/Button'
import Modal from './common/Modal'
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
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
        if (!completedCrop || !imgRef.current || completedCrop.width === 0 || completedCrop.height === 0) {
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

        const image = imgRef.current
        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        canvas.width = completedCrop.width
        canvas.height = completedCrop.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            console.error('Could not get canvas context')
            return
        }

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

        canvas.toBlob((blob) => {
            if (blob) {
                const croppedUrl = URL.createObjectURL(blob)
                const updated = [...collageItems]
                updated[currentItemIndex].croppedImage = croppedUrl
                setCollageItems(updated)

                if (currentItemIndex < collageItems.length - 1) {
                    setCurrentItemIndex(currentItemIndex + 1)
                    setCrop(undefined)
                    setCompletedCrop(undefined)
                } else {
                    setCurrentStep('price')
                    setCurrentItemIndex(0)
                }
            } else {
                console.error('Failed to create blob from canvas')
            }
        }, 'image/jpeg', 0.95)
    }
        }, 'image/jpeg', 0.95)
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

            // Canvas dimensions
            const cols = items.length <= 3 ? items.length : 3
            const rows = Math.ceil(items.length / 3)
            const cellWidth = 400
            const cellHeight = 400
            const padding = 10
            const headerHeight = 80
            const footerHeight = 60

            canvas.width = cols * cellWidth + (cols + 1) * padding
            canvas.height = rows * cellHeight + (rows + 1) * padding + headerHeight + footerHeight

            // Background
            ctx.fillStyle = '#f8fafc'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Header with gradient
            const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
            headerGradient.addColorStop(0, '#1e40af')
            headerGradient.addColorStop(1, '#3b82f6')
            ctx.fillStyle = headerGradient
            ctx.fillRect(0, 0, canvas.width, headerHeight)

            // Store name in header
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(storeName, canvas.width / 2, 50)

            let loadedImages = 0
            const totalImages = items.length

            const drawImagesRecursively = (index: number) => {
                if (index >= totalImages) {
                    // All images loaded, draw footer and resolve
                    // Footer
                    ctx.fillStyle = '#1e293b'
                    ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight)

                    ctx.fillStyle = '#94a3b8'
                    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('¡Disponibles para entrega!', canvas.width / 2, canvas.height - 30)

                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
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

                    // White background for cell
                    ctx.fillStyle = '#ffffff'
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
                    ctx.shadowBlur = 20
                    ctx.shadowOffsetY = 4
                    ctx.fillRect(x, y, cellWidth, cellHeight)
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetY = 0

                    // Draw image (fit and center)
                    const imageHeight = cellHeight - 60 // Reserve space for price
                    const scale = Math.min(cellWidth / img.width, imageHeight / img.height)
                    const scaledWidth = img.width * scale
                    const scaledHeight = img.height * scale
                    const imgX = x + (cellWidth - scaledWidth) / 2
                    const imgY = y + (imageHeight - scaledHeight) / 2

                    ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight)

                    // Price tag at bottom
                    const priceGradient = ctx.createLinearGradient(x, y + cellHeight - 60, x + cellWidth, y + cellHeight)
                    priceGradient.addColorStop(0, '#10b981')
                    priceGradient.addColorStop(1, '#059669')
                    ctx.fillStyle = priceGradient
                    ctx.fillRect(x, y + cellHeight - 60, cellWidth, 60)

                    ctx.fillStyle = '#ffffff'
                    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText(`$${item.customPrice.toFixed(2)}`, x + cellWidth / 2, y + cellHeight - 25)

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
                                Arrastra para seleccionar el área a recortar o presiona "Continuar" para usar la imagen completa
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
