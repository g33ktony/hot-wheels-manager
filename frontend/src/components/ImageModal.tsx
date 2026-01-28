import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export default function ImageModal({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  title
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          title="Cerrar"
        >
          <X size={32} />
        </button>

        {/* Title */}
        {title && (
          <div className="text-white text-center mb-4 px-4">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center relative">
          <img
            src={currentImage}
            alt={`Imagen ${currentIndex + 1}`}
            className="max-h-[70vh] max-w-full object-contain"
          />

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 p-2 rounded-full"
                title="Anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 p-2 rounded-full"
                title="Siguiente"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="text-white text-center mt-4">
            <p className="text-sm">
              {currentIndex + 1} de {images.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
