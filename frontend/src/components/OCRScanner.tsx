import { useState, useRef } from 'react'
import { Camera, X, Check, Loader, Edit3 } from 'lucide-react'
import Tesseract from 'tesseract.js'
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
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [extractedText, setExtractedText] = useState('')
    const [editedText, setEditedText] = useState('')
    const [progress, setProgress] = useState(0)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processImage = async (imageData: string) => {
        setIsProcessing(true)
        setProgress(0)
        setCapturedImage(imageData)

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
            setShowConfirmModal(true)
        } catch (error) {
            console.error('OCR Error:', error)
            alert('❌ Error al escanear la imagen. Por favor intenta de nuevo.')
        } finally {
            setIsProcessing(false)
        }
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
                processImage(imageData)
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
        setCapturedImage(null)
        setExtractedText('')
        setEditedText('')
        setProgress(0)
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
                    {/* Show captured image */}
                    {capturedImage && (
                        <div className="relative">
                            <img
                                src={capturedImage}
                                alt="Imagen capturada"
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
