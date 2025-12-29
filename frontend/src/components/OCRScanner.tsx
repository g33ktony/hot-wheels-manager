import { useState, useRef, useEffect } from 'react'
import { Camera, X, Check, Loader, Edit3, Crop } from 'lucide-react'
import ReactCrop, { Crop as CropType } from 'react-image-crop'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import 'react-image-crop/dist/ReactCrop.css'
import Modal from './common/Modal'
import Button from './common/Button'
import Input from './common/Input'

// OCR.space API key - Get your own free key at https://ocr.space/ocrapi
const OCR_API_KEY = 'K88513455088957' // Free tier: 25,000 requests/month

interface OCRScannerProps {
    onTextExtracted: (text: string) => void
    onImageCaptured?: (imageData: string) => void
                    {/* Crop area: show full image, no zoom */}
                    {capturedImage && (
                        <>
                            <div className="w-full bg-gray-100 rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    aspect={undefined}
                                >
                                    <img
                                        ref={imageRef}
                                        src={capturedImage}
                                        alt="Imagen para recortar"
                                        className="w-full h-auto"
                                        style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                    />
                                </ReactCrop>
                            </div>
                            <div className="mt-2 flex items-center justify-end gap-2">
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
                        </>
                    )}
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return zoomedSnapshot || ''
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

    // Extract the zoomed portion from the original image
    const captureZoomedView = async () => {
        if (!zoomImageRef.current) {
            return capturedImage || ''
        }

        const img = zoomImageRef.current
        const imgRect = img.getBoundingClientRect()
        // Prefer the internal transform component wrapper as viewport
        const viewportEl = (zoomContainerRef.current?.querySelector('.react-transform-component') as HTMLElement) || zoomContainerRef.current
        const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : imgRect

        // Compute screen-space intersection of image and viewport
        const overlapLeft = Math.max(viewportRect.left, imgRect.left)
        const overlapTop = Math.max(viewportRect.top, imgRect.top)
        const overlapRight = Math.min(viewportRect.right, imgRect.right)
        const overlapBottom = Math.min(viewportRect.bottom, imgRect.bottom)
        const overlapWidth = Math.max(0, overlapRight - overlapLeft)
        const overlapHeight = Math.max(0, overlapBottom - overlapTop)

        if (overlapWidth <= 0 || overlapHeight <= 0) {
            return capturedImage || ''
        }

        // Map intersection back to original image coordinates
        const scaleX = img.naturalWidth / imgRect.width
        const scaleY = img.naturalHeight / imgRect.height
        const sx = (overlapLeft - imgRect.left) * scaleX
        const sy = (overlapTop - imgRect.top) * scaleY
        const sWidth = overlapWidth * scaleX
        const sHeight = overlapHeight * scaleY

        // Create snapshot canvas exactly the size of the visible area
        const dpr = window.devicePixelRatio || 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(overlapWidth * dpr)
        canvas.height = Math.round(overlapHeight * dpr)
        const ctx = canvas.getContext('2d')
        if (!ctx) return capturedImage || ''
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)

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
                    {/* Instructions */}
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

                    {/* Crop area */}
                    {capturedImage && (
                        <>
                            {isZoomMode ? (
                                // Zoom mode: Image with pinch-to-zoom
                                <div ref={zoomContainerRef} className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                                    <TransformWrapper
                                        ref={transformWrapperRef}
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
                                                    wrapperStyle={{ width: '100%', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <img
                                                        ref={zoomImageRef}
                                                        src={capturedImage}
                                                        alt="Imagen para zoom"
                                                        className="w-full h-auto select-none"
                                                        style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                                    />
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
                                                                if (!snapshot || snapshot.length < 20) {
                                                                    alert('No se pudo capturar el área visible. Ajusta el zoom y prueba de nuevo.')
                                                                    return
                                                                }
                                                                // Use the zoomed snapshot as a NEW image in crop mode
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
                                </div>
                            ) : (
                                // Crop mode: Fresh image with no zoom applied
                                zoomedSnapshot && (
                                    <>
                                        <div className="w-full bg-gray-100 rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                                            <ReactCrop
                                                crop={crop}
                                                onChange={(c) => setCrop(c)}
                                                aspect={undefined}
                                            >
                                                <img
                                                    ref={imageRef}
                                                    src={zoomedSnapshot}
                                                    alt="Imagen para recortar"
                                                    className="w-full h-auto"
                                                    style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                                />
                                            </ReactCrop>
                                        </div>

                                        {/* Action bar for crop mode (below image, not overlay) */}
                                        <div className="mt-2 flex items-center justify-between gap-2">
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
                                    </>
                                )
                            )}
                        </>
                    )}
                </div>
            </Modal>

            {/* Confirmation Modal */}
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
                    {croppedImage && (
                        <div className="relative">
                            <img
                                src={croppedImage}
                                alt="Área escaneada"
                                className="w-full h-32 sm:h-48 object-contain bg-gray-100 rounded-lg"
                            />
                        </div>
                    )}

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

                    <div className="text-xs text-gray-500 text-right">
                        {editedText.length} caracteres
                    </div>
                </div>
            </Modal>
        </>
    )
}
