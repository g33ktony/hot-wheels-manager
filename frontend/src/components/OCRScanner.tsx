import { useState, useRef, useEffect } from 'react'
import { Camera, X, Check, Loader, Edit3, Crop } from 'lucide-react'
import ReactCrop, { Crop as CropType } from 'react-image-crop'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import html2canvas from 'html2canvas'
import 'react-image-crop/dist/ReactCrop.css'
import Modal from './common/Modal'
import Button from './common/Button'
import Input from './common/Input'

// OCR.space API key - Get your own free key at https://ocr.space/ocrapi
const OCR_API_KEY = 'K88513455088957' // Free tier: 25,000 requests/month

interface OCRScannerProps {
    onTextExtracted: (text: string) => void
    onImageCaptured?: (imageData: string) => void
    buttonText?: string
    buttonClassName?: string
}

// Detect if device is mobile
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768)
}

export default function OCRScanner({ 
    onTextExtracted, 
    buttonText = 'Escanear nombre',
    buttonClassName = '',
    onImageCaptured
}: OCRScannerProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showCropModal, setShowCropModal] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [extractedText, setExtractedText] = useState('')
    const [editedText, setEditedText] = useState('')
    const [progress, setProgress] = useState(0)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [croppedImage, setCroppedImage] = useState<string | null>(null)
    const [isZoomMode, setIsZoomMode] = useState(true)
    const [zoomedSnapshot, setZoomedSnapshot] = useState<string | null>(null)
    const zoomContainerRef = useRef<HTMLDivElement>(null)
    const zoomImageRef = useRef<HTMLImageElement>(null)
    const transformComponentRef = useRef<HTMLDivElement>(null)
    const [crop, setCrop] = useState<CropType>({
        unit: '%',
        width: 85,
        height: 25,
        x: 7.5,
        y: 37.5
    })
    const imageRef = useRef<HTMLImageElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Check if mobile on mount and window resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(isMobileDevice())
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Don't render on desktop
    if (!isMobile) {
        return null
    }

    const processImage = async (imageData: string) => {
        setIsProcessing(true)
        setProgress(50)

        try {
            // Call OCR.space API
            const formData = new FormData()
            formData.append('base64Image', imageData)
            formData.append('language', 'eng')
            formData.append('isOverlayRequired', 'false')
            formData.append('detectOrientation', 'true')
            formData.append('scale', 'true')
            formData.append('OCREngine', '2') // Engine 2 is better for difficult images

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': OCR_API_KEY
                },
                body: formData
            })

            if (!response.ok) {
                throw new Error('OCR API request failed')
            }

            const result = await response.json()
            
            if (result.IsErroredOnProcessing) {
                throw new Error(result.ErrorMessage?.[0] || 'OCR processing error')
            }

            setProgress(100)

            // Extract text from OCR result
            const extractedText = result.ParsedResults?.[0]?.ParsedText || ''
            
            // Clean up the extracted text
            const cleanedText = extractedText
                .trim()
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0)
                .join(' ')
                .replace(/\s+/g, ' ')

            setExtractedText(cleanedText)
            setEditedText(cleanedText)
            setShowCropModal(false)
            setShowConfirmModal(true)
        } catch (error) {
            console.error('OCR Error:', error)
            alert('❌ Error al escanear la imagen. Por favor intenta de nuevo.')
        } finally {
            setIsProcessing(false)
        }
    }

    const getCroppedImage = async (): Promise<string> => {
        if (!imageRef.current || !crop.width || !crop.height) {
            return capturedImage || ''
        }

        const image = imageRef.current
        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height
        
        canvas.width = crop.width * scaleX
        canvas.height = crop.height * scaleY
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return capturedImage || ''
        }

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        )

        return canvas.toDataURL('image/jpeg', 0.95)
    }

    const handleCropConfirm = async () => {
        const croppedImageData = await getCroppedImage()
        // Save original full image to item photos, not the cropped one
        if (capturedImage && onImageCaptured) {
            onImageCaptured(capturedImage)
        }
        setCroppedImage(croppedImageData)
        await processImage(croppedImageData)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Por favor selecciona una imagen válida')
                return
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('La imagen es muy grande. Máximo 10MB.')
                return
            }

            const reader = new FileReader()
            reader.onload = (event) => {
                const imageData = event.target?.result as string
                setCapturedImage(imageData)
                setShowCropModal(true)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCapture = () => {
        fileInputRef.current?.click()
    }

    const handleConfirm = () => {
        onTextExtracted(editedText.trim())
        handleClose()
    }

    const handleClose = () => {
        setShowConfirmModal(false)
        setShowCropModal(false)
        setCapturedImage(null)
        setCroppedImage(null)
        setZoomedSnapshot(null)
        setExtractedText('')
        setEditedText('')
        setProgress(0)
        setIsZoomMode(true)
        setCrop({
            unit: '%',
            width: 85,
            height: 25,
            x: 7.5,
            y: 37.5
        })
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Capture exactly what is visible inside the zoom component using html2canvas
    const captureZoomedView = async () => {
        if (!transformComponentRef.current) {
            return capturedImage || ''
        }

        const target = transformComponentRef.current
        const canvas = await html2canvas(target, {
            backgroundColor: '#f3f4f6',
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: window.devicePixelRatio || 1,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY
        })
        return canvas.toDataURL('image/jpeg', 0.95)
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCapture}
                disabled={isProcessing}
                className={`flex items-center gap-1 text-xs ${buttonClassName}`}
            >
                {isProcessing ? (
                    <>
                        <Loader className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Procesando {progress}%...</span>
                        <span className="sm:hidden">{progress}%</span>
                    </>
                ) : (
                    <>
                        <Camera className="w-3 h-3" />
                        <span className="hidden sm:inline">{buttonText}</span>
                        <span className="sm:hidden">OCR</span>
                    </>
                )}
            </Button>

            {/* Hidden file input for camera/file selection */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment" // Use back camera on mobile
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Crop Modal - Optimized for mobile */}
            <Modal
                isOpen={showCropModal}
                onClose={handleClose}
                title="✂️ Recorta el texto"
                maxWidth="4xl"
                footer={
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={handleCropConfirm}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                                    <span className="hidden sm:inline">Procesando {progress}%</span>
                                    <span className="sm:hidden">{progress}%</span>
                                </>
                            ) : (
                                <>
                                    <Crop className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Escanear área</span>
                                    <span className="sm:hidden">Escanear</span>
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    {/* Instructions - More compact for mobile */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex gap-2">
                            <Crop className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-blue-900">
                                    Ajusta el área
                                </p>
                                <p className="text-xs text-blue-700">
                                    Selecciona solo el nombre del auto
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Crop area - Full width on mobile */}
                    {capturedImage && (
                        <div
                            ref={zoomContainerRef}
                            className="relative w-full overflow-hidden bg-gray-100 rounded-lg"
                        >
                            {isZoomMode ? (
                                // Modo Zoom: Solo visualización con pinch-to-zoom
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={1}
                                    maxScale={5}
                                    wheel={{ step: 0.1 }}
                                    pinch={{ step: 0.08 }}
                                    doubleClick={{ disabled: true }}
                                >
                                    {({ zoomIn, zoomOut, resetTransform }) => (
                                        <>
                                            <TransformComponent
                                                wrapperStyle={{ width: '100%', maxHeight: '60vh' }}
                                            >
                                                <div ref={transformComponentRef} className="flex items-center justify-center">
                                                    <img
                                                        ref={zoomImageRef}
                                                        src={capturedImage}
                                                        alt="Imagen para zoom"
                                                        className="w-full h-auto select-none"
                                                        style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            </TransformComponent>

                                            {/* Zoom controls */}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-1 shadow-sm z-10">
                                                <Button size="sm" variant="secondary" onClick={() => zoomIn()} className="h-8 w-8 !p-0 !min-h-0">
                                                    +
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => zoomOut()} className="h-8 w-8 !p-0 !min-h-0">
                                                    -
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => resetTransform()} className="h-8 w-8 !p-0 !min-h-0">
                                                    ↺
                                                </Button>
                                            </div>

                                            {/* Switch to crop mode */}
                                            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm z-10">
                                                <p className="text-[11px] text-gray-700">🔍 Usa zoom para encontrar el texto</p>
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1"
                                                    onClick={async () => {
                                                        try {
                                                            const snapshot = await captureZoomedView()
                                                            setZoomedSnapshot(snapshot)
                                                            setIsZoomMode(false)
                                                        } catch (error) {
                                                            console.error('Error capturing zoom:', error)
                                                            alert('Error al capturar el zoom. Intenta de nuevo.')
                                                        }
                                                    }}
                                                >
                                                    <Crop className="w-4 h-4 mr-1" />
                                                    Recortar
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </TransformWrapper>
                            ) : (
                                // Modo Recorte: Usa snapshot zoomeado
                                <div className="relative w-full">
                                    <ReactCrop
                                        crop={crop}
                                        onChange={(c) => setCrop(c)}
                                        aspect={undefined}
                                        className="max-h-[60vh] w-full"
                                    >
                                        <img
                                            ref={imageRef}
                                            src={zoomedSnapshot || capturedImage}
                                            alt="Imagen para recortar"
                                            className="w-full h-auto block mx-auto"
                                            style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                        />
                                    </ReactCrop>

                                    {/* Action bar for crop mode */}
                                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm z-10">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                setIsZoomMode(true)
                                                setZoomedSnapshot(null)
                                            }}
                                            className="px-2 py-1"
                                        >
                                            ← Ajustar zoom
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1"
                                            onClick={handleCropConfirm}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                                                    {progress}%
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Escanear área
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirmation Modal - Optimized for mobile */}
            <Modal
                isOpen={showConfirmModal}
                onClose={handleClose}
                title="📸 Texto Detectado"
                maxWidth="2xl"
                footer={
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={handleConfirm}
                            disabled={!editedText.trim()}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Confirmar
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    {/* Show cropped image - Smaller on mobile */}
                    {croppedImage && (
                        <div className="relative">
                            <img
                                src={croppedImage}
                                alt="Área escaneada"
                                className="w-full h-32 sm:h-48 object-contain bg-gray-100 rounded-lg"
                            />
                        </div>
                    )}

                    {/* Info message - More compact */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex gap-2">
                            <Edit3 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-blue-900">
                                    Verifica el texto
                                </p>
                                <p className="text-xs text-blue-700">
                                    Edita si es necesario
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Editable text field */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Texto Detectado
                        </label>
                        <Input
                            type="text"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            placeholder="Edita el texto..."
                            className="text-base font-medium"
                            autoFocus
                        />
                        {extractedText && editedText !== extractedText && (
                            <p className="text-xs text-gray-500 mt-1">
                                Original: <span className="font-mono text-xs">{extractedText}</span>
                            </p>
                        )}
                    </div>

                    {/* Character count */}
                    <div className="text-xs text-gray-500 text-right">
                        {editedText.length} caracteres
                    </div>
                </div>
            </Modal>
        </>
    )
}
