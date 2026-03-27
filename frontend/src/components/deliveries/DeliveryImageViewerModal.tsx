import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface DeliveryImageViewerModalProps {
  isOpen: boolean
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export default function DeliveryImageViewerModal({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: DeliveryImageViewerModalProps) {
  if (!isOpen || images.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[70]">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300"
      >
        <X size={24} />
      </button>

      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
      >
        <ChevronLeft size={32} />
      </button>

      <div className="flex flex-col items-center justify-center max-w-4xl max-h-[90vh]">
        <img
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain"
        />
        <div className="mt-4 text-white text-center">
          <p className="text-sm">
            Imagen {currentIndex + 1} de {images.length}
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
      >
        <ChevronRight size={32} />
      </button>
    </div>
  )
}
