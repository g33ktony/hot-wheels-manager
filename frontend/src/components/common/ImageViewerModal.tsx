import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageViewerModalProps {
    isOpen: boolean
    images: string[]
    initialIndex?: number
    onClose: () => void
}

export default function ImageViewerModal({
    isOpen,
    images,
    initialIndex = 0,
    onClose,
}: ImageViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        if (isOpen) setCurrentIndex(initialIndex)
    }, [isOpen, initialIndex])

    const handlePrev = useCallback(() => {
        setCurrentIndex((i) => (i - 1 + images.length) % images.length)
    }, [images.length])

    const handleNext = useCallback(() => {
        setCurrentIndex((i) => (i + 1) % images.length)
    }, [images.length])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev()
            else if (e.key === 'ArrowRight') handleNext()
            else if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, handlePrev, handleNext, onClose])

    if (!isOpen || images.length === 0) return null

    const src = images[currentIndex]

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
            onClick={onClose}
        >
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                >
                    <X size={32} />
                </button>

                {images.length > 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev() }}
                        className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}

                <div className="max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
                    <img
                        src={src}
                        alt="Auto a Escala - Vista Completa"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>

                {images.length > 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext() }}
                        className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}

                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    )
}
