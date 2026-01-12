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
    const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
    const [croppedImageData, setCroppedImageData] = useState<string | null>(null)
    const [shareMode, setShareMode] = useState<'image' | 'pdf' | null>(null)
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
                    ctx.fillStyle = '#94a3b8'
                    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('Hot Wheels Manager', canvas.width / 2, footerY + 30)

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

            // MODERN GRADIENT HEADER
            // Primary gradient rectangle
            pdf.setFillColor(30, 64, 175) // Dark blue
            pdf.rect(0, 0, pageWidth, 55, 'F')

            // Lighter overlay for gradient effect
            pdf.setFillColor(59, 130, 246) // Lighter blue
            pdf.setGState(new pdf.GState({ opacity: 0.6 }))
            pdf.rect(0, 0, pageWidth, 55, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

            // Racing stripes decoration
            pdf.setFillColor(255, 255, 255)
            pdf.setGState(new pdf.GState({ opacity: 0.15 }))
            pdf.rect(0, 0, pageWidth, 2, 'F')
            pdf.rect(0, 53, pageWidth, 2, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

            // Icon/Emoji
            pdf.setFontSize(28)
            pdf.text('🏎️', pageWidth / 2 - 5, 18)

            // Title with better formatting
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(20)
            pdf.setFont('helvetica', 'bold')
            const titleLines = pdf.splitTextToSize(carName, pageWidth - 2 * margin)
            let titleY = 35
            titleLines.forEach((line: string) => {
                pdf.text(line, pageWidth / 2, titleY, { align: 'center' })
                titleY += 8
            })

            let currentY = 65

            // MODERN PRICE CARD
            const priceCardHeight = 28

            // Price card shadow effect
            pdf.setFillColor(0, 0, 0)
            pdf.setGState(new pdf.GState({ opacity: 0.1 }))
            pdf.roundedRect(margin + 1, currentY + 2, pageWidth - 2 * margin, priceCardHeight, 4, 4, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

            // Price card with green gradient
            pdf.setFillColor(16, 185, 129) // Green
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, priceCardHeight, 4, 4, 'F')

            // Accent stripe
            pdf.setFillColor(255, 255, 255)
            pdf.setGState(new pdf.GState({ opacity: 0.2 }))
            pdf.roundedRect(margin + 4, currentY + 4, 2, priceCardHeight - 8, 1, 1, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

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
                    pdf.setGState(new pdf.GState({ opacity: 0.08 }))
                    pdf.roundedRect(imgX - imgPadding + 1, currentY + 2, imgWidth + imgPadding * 2, imgHeight + imgPadding * 2, 3, 3, 'F')
                    pdf.setGState(new pdf.GState({ opacity: 1 }))

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

            // DETAILS CARD
            const detailsCardHeight = 50

            // Card shadow
            pdf.setFillColor(0, 0, 0)
            pdf.setGState(new pdf.GState({ opacity: 0.08 }))
            pdf.roundedRect(margin + 1, currentY + 2, pageWidth - 2 * margin, detailsCardHeight, 4, 4, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

            // Card background
            pdf.setFillColor(255, 255, 255)
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, detailsCardHeight, 4, 4, 'F')

            // Header section of card
            pdf.setFillColor(240, 249, 255) // Light blue
            pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, 12, 4, 4, 'F')

            pdf.setTextColor(30, 64, 175)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'bold')
            pdf.text('📋 ESPECIFICACIONES', pageWidth / 2, currentY + 8, { align: 'center' })

            currentY += 18

            // Details content
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            const detailX = margin + 8

            if (item?.brand) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('🏷️ Marca:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.brand, detailX + 25, currentY)
                pdf.setFont('helvetica', 'normal')
                currentY += 8
            }

            if (item?.condition) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('✨ Condición:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.condition, detailX + 32, currentY)
                pdf.setFont('helvetica', 'normal')
                currentY += 8
            }

            if (item?.pieceType) {
                pdf.setTextColor(100, 116, 139)
                pdf.text('📦 Tipo:', detailX, currentY)
                pdf.setTextColor(30, 41, 59)
                pdf.setFont('helvetica', 'bold')
                pdf.text(item.pieceType, detailX + 20, currentY)
            }

            // PROFESSIONAL FOOTER
            const footerY = pageHeight - 25

            // Footer background
            pdf.setFillColor(30, 41, 59)
            pdf.rect(0, footerY, pageWidth, 25, 'F')

            // Decorative line with gradient effect
            pdf.setFillColor(59, 130, 246)
            pdf.setGState(new pdf.GState({ opacity: 0.8 }))
            pdf.rect(pageWidth * 0.25, footerY, pageWidth * 0.5, 1, 'F')
            pdf.setGState(new pdf.GState({ opacity: 1 }))

            // Footer text
            pdf.setTextColor(148, 163, 184)
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Hot Wheels Manager', pageWidth / 2, footerY + 10, { align: 'center' })

            pdf.setTextColor(100, 116, 139)
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.text('¡Gracias por tu interés!', pageWidth / 2, footerY + 18, { align: 'center' })

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
                                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${selectedPhotoIndex === index
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
                    {/* Preview Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <p className="text-sm font-medium text-gray-700">Vista Previa Moderna</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">🏎️</span>
                                <p className="font-semibold text-sm line-clamp-2">{carName}</p>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-2 text-center">
                                <p className="text-xs font-semibold tracking-wide">PRECIO</p>
                                <p className="text-2xl font-bold">${sharePrice.toFixed(2)}</p>
                            </div>
                            <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs space-y-1">
                                <p className="font-semibold text-blue-900 text-center">📋 ESPECIFICACIONES</p>
                                {item?.brand && <p className="text-gray-600">🏷️ <span className="font-medium">{item.brand}</span></p>}
                                {item?.condition && <p className="text-gray-600">✨ <span className="font-medium">{item.condition}</span></p>}
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 text-center">
                            ✨ Diseño profesional con gradientes y efectos modernos
                        </p>
                    </div>

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

                    <p className="text-sm text-gray-700 font-medium">
                        Selecciona el formato para compartir:
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleShareImage}
                            className="group relative overflow-hidden p-5 border-2 rounded-xl transition-all border-gray-200 hover:border-blue-500 hover:shadow-lg bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Popular</span>
                            </div>
                            <ImageIcon className="w-10 h-10 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                            <p className="font-bold text-gray-900">Imagen</p>
                            <p className="text-xs text-gray-600 mt-1">Recortar y compartir</p>
                            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span>Rápido</span>
                            </div>
                        </button>

                        <button
                            onClick={handleSharePDF}
                            className="group relative overflow-hidden p-5 border-2 rounded-xl transition-all border-gray-200 hover:border-red-500 hover:shadow-lg bg-white hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Pro</span>
                            </div>
                            <FileText className="w-10 h-10 mx-auto mb-2 text-red-600 group-hover:scale-110 transition-transform" />
                            <p className="font-bold text-gray-900">PDF</p>
                            <p className="text-xs text-gray-600 mt-1">Documento completo</p>
                            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span>Profesional</span>
                            </div>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Crop Modal */}
            <Modal
                isOpen={showCropModal}
                onClose={() => {
                    setShowCropModal(false)
                    setShareMode(null)
                    setCompletedCrop(null)
                }}
                title="✂️ Recortar Imagen"
                maxWidth="4xl"
                footer={
                    <div className="flex gap-2 w-full">
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
                        <div className="w-full bg-gray-100 rounded-lg overflow-auto" style={{ maxHeight: '70vh', minHeight: '400px' }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={undefined}
                            >
                                <img
                                    ref={imageRef}
                                    src={item.photos[selectedPhotoIndex]}
                                    alt={carName}
                                    crossOrigin="anonymous"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                    onLoad={() => {
                                        // Set initial completedCrop when image loads
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
        </div>
    )
}
