import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { inventoryService } from '@/services/inventory'
import ReactCrop, { Crop as CropType } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import jsPDF from 'jspdf'
import type { InventoryItem } from '../../../shared/types'
import { 
    ArrowLeft, 
    Share2, 
    MapPin, 
    DollarSign, 
    Package, 
    Tag, 
    Info,
    Edit,
    Trash2,
    Image as ImageIcon,
    FileText,
    X
} from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import toast from 'react-hot-toast'

export default function ItemDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [item, setItem] = useState<InventoryItem | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showShareModal, setShowShareModal] = useState(false)
    const [showCropModal, setShowCropModal] = useState(false)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
    const [sharePrice, setSharePrice] = useState<number>(0)
    const [crop, setCrop] = useState<CropType>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
    })
    const imageRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        loadItem()
    }, [id])

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

    const handleOpenShareModal = () => {
        setSharePrice(getFinalPrice())
        setShowShareModal(true)
    }

    const getCroppedImage = async (): Promise<Blob> => {
        if (!imageRef.current || !crop.width || !crop.height) {
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
        
        // Use a single scale factor to maintain aspect ratio
        const scale = image.naturalWidth / image.width

        // Calculate crop dimensions in natural (original) image size
        const cropX = crop.x * scale
        const cropY = crop.y * scale
        const cropWidth = crop.width * scale
        const cropHeight = crop.height * scale

        // Set canvas size to match crop dimensions
        canvas.width = cropWidth
        canvas.height = cropHeight

        const ctx = canvas.getContext('2d', { 
            alpha: false,
            willReadFrequently: false 
        })
        
        if (!ctx) {
            throw new Error('Failed to get canvas context')
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the cropped portion
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
            setShowCropModal(true)
        } catch (error) {
            console.error('Error sharing image:', error)
            toast.error('Error al compartir imagen')
        }
    }

    const handleConfirmCrop = async () => {
        try {
            const croppedBlob = await getCroppedImage()
            const file = new File([croppedBlob], 'hot-wheels.jpg', { type: 'image/jpeg' })

            const carName = getCarName()
            const price = sharePrice
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
                const url = URL.createObjectURL(croppedBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${carName.replace(/\s+/g, '-')}.jpg`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Imagen descargada')
            }

            setShowCropModal(false)
            setShowShareModal(false)
        } catch (error) {
            console.error('Error sharing:', error)
            toast.error('Error al compartir')
        }
    }

    const handleSharePDF = async () => {
        try {
            const carName = getCarName()
            const price = sharePrice
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            // Add title
            pdf.setFontSize(20)
            pdf.text(carName, 20, 20)

            // Add price
            pdf.setFontSize(16)
            pdf.text(`Precio: $${price.toFixed(2)}`, 20, 35)

            // Add image if available
            if (item?.photos && item.photos.length > 0) {
                const photo = item.photos[selectedPhotoIndex]
                try {
                    pdf.addImage(photo, 'JPEG', 20, 50, 170, 120)
                } catch (e) {
                    console.warn('Could not add image to PDF:', e)
                }
            }

            // Add details
            pdf.setFontSize(12)
            let yPos = 180
            
            if (item?.brand) {
                pdf.text(`Marca: ${item.brand}`, 20, yPos)
                yPos += 7
            }
            
            if (item?.condition) {
                pdf.text(`Condición: ${item.condition}`, 20, yPos)
                yPos += 7
            }

            if (item?.notes) {
                pdf.text(`Notas: ${item.notes}`, 20, yPos)
            }

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
                    <p className="text-gray-600">Cargando detalle...</p>
                </div>
            </div>
        )
    }

    if (!item) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Item no encontrado</p>
                    <Button onClick={() => navigate('/inventory')}>
                        Volver al Inventario
                    </Button>
                </div>
            </div>
        )
    }

    const carName = getCarName()
    const finalPrice = getFinalPrice()

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/inventory')}
                        className="!p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-bold truncate flex-1">{carName}</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Main Image Gallery */}
                <Card className="overflow-hidden">
                    {item.photos && item.photos.length > 0 ? (
                        <div>
                            <img
                                src={item.photos[selectedPhotoIndex]}
                                alt={carName}
                                crossOrigin="anonymous"
                                className="w-full h-64 object-contain bg-gray-100"
                            />
                            {item.photos.length > 1 && (
                                <div className="flex gap-2 p-3 overflow-x-auto">
                                    {item.photos.map((photo, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedPhotoIndex(index)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                                                selectedPhotoIndex === index
                                                    ? 'border-primary-600'
                                                    : 'border-gray-200'
                                            }`}
                                        >
                                            <img
                                                src={photo}
                                                alt={`${carName} ${index + 1}`}
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center bg-gray-100">
                            <Package className="w-16 h-16 text-gray-400" />
                        </div>
                    )}
                </Card>

                {/* Price Card */}
                <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 mb-1">Precio al Cliente</p>
                                <p className="text-4xl font-bold">${finalPrice.toFixed(2)}</p>
                            </div>
                            <DollarSign className="w-12 h-12 opacity-50" />
                        </div>
                        {item.purchasePrice && (
                            <div className="mt-4 pt-4 border-t border-white/20">
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-90">Precio de Compra:</span>
                                    <span className="font-semibold">${item.purchasePrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="opacity-90">Ganancia:</span>
                                    <span className="font-semibold">
                                        ${(finalPrice - item.purchasePrice).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Details Section */}
                <Card>
                    <div className="p-5 space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            Detalles
                        </h2>

                        <div className="space-y-3">
                            {item.brand && (
                                <div className="flex items-center gap-3">
                                    <Tag className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Marca</p>
                                        <p className="font-medium">{item.brand}</p>
                                    </div>
                                </div>
                            )}

                            {item.quantity !== undefined && (
                                <div className="flex items-center gap-3">
                                    <Package className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Cantidad Disponible</p>
                                        <p className="font-medium">{item.quantity} unidades</p>
                                    </div>
                                </div>
                            )}

                            {item.condition && (
                                <div className="flex items-center gap-3">
                                    <Info className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Condición</p>
                                        <p className="font-medium capitalize">{item.condition}</p>
                                    </div>
                                </div>
                            )}

                            {item.location && (
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Ubicación</p>
                                        <p className="font-medium">{item.location}</p>
                                    </div>
                                </div>
                            )}

                            {(item.isTreasureHunt || item.isSuperTreasureHunt || item.isChase) && (
                                <div className="flex items-center gap-3">
                                    <Tag className="w-5 h-5 text-yellow-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Tipo Especial</p>
                                        <div className="flex gap-2 mt-1">
                                            {item.isSuperTreasureHunt && (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                    STH
                                                </span>
                                            )}
                                            {item.isTreasureHunt && (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                    TH
                                                </span>
                                            )}
                                            {item.isChase && (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                                    Chase
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {item.notes && (
                                <div className="pt-3 border-t">
                                    <p className="text-sm text-gray-500 mb-1">Notas</p>
                                    <p className="text-gray-700">{item.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Action Buttons */}
                <Card>
                    <div className="p-4 space-y-2">
                        <Button
                            className="w-full justify-center gap-2"
                            onClick={() => navigate(`/inventory?edit=${item._id}`)}
                        >
                            <Edit className="w-4 h-4" />
                            Editar Item
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar Item
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Floating Share Button */}
            <button
                onClick={handleOpenShareModal}
                className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-20"
            >
                <Share2 className="w-6 h-6" />
            </button>

            {/* Share Modal */}
            <Modal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                title="📤 Compartir con Cliente"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-lg mb-3">{carName}</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Precio para compartir:</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={sharePrice}
                                    onChange={(e) => setSharePrice(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-xl font-bold text-primary-600"
                                />
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600">
                        Selecciona el formato para compartir:
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleShareImage}
                            className="p-4 border-2 rounded-lg transition-all border-gray-200 hover:border-primary-600 hover:bg-primary-50"
                        >
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                            <p className="font-medium">Imagen</p>
                            <p className="text-xs text-gray-500">Recortar y compartir</p>
                        </button>

                        <button
                            onClick={handleSharePDF}
                            className="p-4 border-2 rounded-lg transition-all border-gray-200 hover:border-primary-600 hover:bg-primary-50"
                        >
                            <FileText className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                            <p className="font-medium">PDF</p>
                            <p className="text-xs text-gray-500">Documento completo</p>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Crop Modal */}
            <Modal
                isOpen={showCropModal}
                onClose={() => setShowCropModal(false)}
                title="✂️ Recortar Imagen"
                maxWidth="4xl"
                footer={
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowCropModal(false)}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleConfirmCrop}
                        >
                            <Share2 className="w-4 h-4 mr-1" />
                            Compartir
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900">
                            Ajusta el área que quieres compartir con el cliente
                        </p>
                    </div>

                    {item.photos && item.photos[selectedPhotoIndex] && (
                        <div className="w-full bg-gray-100 rounded-lg overflow-auto" style={{ maxHeight: '45vh' }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                aspect={undefined}
                            >
                                <img
                                    ref={imageRef}
                                    src={item.photos[selectedPhotoIndex]}
                                    alt={carName}
                                    crossOrigin="anonymous"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </ReactCrop>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
