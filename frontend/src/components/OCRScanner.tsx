import { useState, useRef } from 'react'
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

export default function OCRScanner({ 
    onTextExtracted, 
    buttonText = 'Escanear nombre',
    buttonClassName = ''
}: OCRScannerProps) {
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
        width: 90,
        height: 30,
        x: 5,
        y: 35
    })
    const imageRef = useRef<HTMLImageElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processImage = async (imageData: string) => {
        setIsProcessing(true)
        setProgress(0)

        try {
            const result = await Tesseract.recognize(
                imageData,
                'eng', // English language for better Hot Wheels name recognition
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            setProgress(Math.round(m.progress * 100))
                        }
                    }
                }
            )

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
        setExtractedText('')
        setEditedText('')
        setProgress(0)
        setCrop({
            unit: '%',
            width: 90,
            height: 30,
            x: 5,
            y: 35
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
                className={`flex items-center gap-2 ${buttonClassName}`}
            >
                {isProcessing ? (
                    <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Procesando {progress}%...</span>
                    </>
                ) : (
                    <>
                        <Camera className="w-4 h-4" />
                        <span>{buttonText}</span>
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

            {/* Crop Modal */}
            <Modal
                isOpen={showCropModal}
                onClose={handleClose}
                title="✂️ Recorta el área del texto"
                maxWidth="2xl"
                footer={
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={handleCropConfirm}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando {progress}%
                                </>
                            ) : (
                                <>
                                    <Crop className="w-4 h-4 mr-2" />
                                    Escanear área seleccionada
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex gap-2">
                            <Crop className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">
                                    Ajusta el área de recorte
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Arrastra los bordes para seleccionar solo el nombre del auto. 
                                    Esto mejorará la precisión del reconocimiento de texto.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Crop area */}
                    {capturedImage && (
                        <div className="max-h-[60vh] overflow-auto bg-gray-100 rounded-lg p-2">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                aspect={undefined}
                            >
                                <img
                                    ref={imageRef}
                                    src={capturedImage}
                                    alt="Imagen para recortar"
                                    className="max-w-full"
                                />
                            </ReactCrop>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={handleClose}
                title="📸 Texto Escaneado"
                maxWidth="lg"
                footer={
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={handleConfirm}
                            disabled={!editedText.trim()}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Confirmar
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Show cropped image */}
                    {croppedImage && (
                        <div className="relative">
                            <img
                                src={croppedImage}
                                alt="Área escaneada"
                                className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                            />
                        </div>
                    )}

                    {/* Info message */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex gap-2">
                            <Edit3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">
                                    Verifica y edita si es necesario
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    El texto detectado se puede editar antes de confirmar
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Editable text field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Texto Detectado
                        </label>
                        <Input
                            type="text"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            placeholder="Edita el texto si es necesario..."
                            className="text-lg font-medium"
                            autoFocus
                        />
                        {extractedText && editedText !== extractedText && (
                            <p className="text-xs text-gray-500 mt-1">
                                Original: <span className="font-mono">{extractedText}</span>
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
