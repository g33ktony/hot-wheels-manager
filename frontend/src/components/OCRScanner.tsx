import { useState, useRef, useEffect } from 'react'
import { Camera, X, Check, Loader, Edit3, Crop } from 'lucide-react'
import Tesseract from 'tesseract.js'
import ReactCrop, { Crop as CropType } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import Modal from './common/Modal'
import Button from './common/Button'
import Input from './common/Input'

interface OCRScannerProps {
    onTextExtracted: (text: string) => void
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
    buttonClassName = ''
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

    const preprocessImage = async (imageData: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    resolve(imageData)
                    return
                }

                const scale = 1.5 // enlarge to improve OCR accuracy
                canvas.width = img.naturalWidth * scale
                canvas.height = img.naturalHeight * scale

                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.filter = 'grayscale(100%) contrast(180%) brightness(110%)'
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                resolve(canvas.toDataURL('image/png', 1.0))
            }
            img.onerror = () => resolve(imageData)
            img.src = imageData
        })
    }

    const processImage = async (imageData: string) => {
        setIsProcessing(true)
        setProgress(0)

        try {
            const result = await Tesseract.recognize(imageData, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
                psm: 6, // Assume a block of text, not full page
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100))
                    }
                }
            })

            // Clean up the extracted text (remove extra spaces, newlines, etc.)
            const cleanedText = result.data.text
                .trim()
                .replace(/\s+/g, ' ') // Multiple spaces to single space
                .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
                .toUpperCase() // Hot Wheels names are usually uppercase

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
        setCroppedImage(croppedImageData)
        const preprocessedImage = await preprocessImage(croppedImageData)
        await processImage(preprocessedImage)
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
        setExtractedText('')
        setEditedText('')
        setProgress(0)
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
                        <div className="relative w-full overflow-auto bg-gray-100 rounded-lg">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                aspect={undefined}
                                className="max-h-[60vh] w-full"
                            >
                                <img
                                    ref={imageRef}
                                    src={capturedImage}
                                    alt="Imagen para recortar"
                                    className="w-full h-auto"
                                    style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                />
                            </ReactCrop>

                            {/* Inline action bar to make the next step obvious */}
                            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                                <p className="text-[11px] text-gray-700">Ajusta y toca Escanear</p>
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
                                            <Crop className="w-4 h-4 mr-1" />
                                            Escanear
                                        </>
                                    )}
                                </Button>
                            </div>
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
