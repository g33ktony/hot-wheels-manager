import { useState, useMemo } from 'react'
import { MessageCircle, Maximize2, Bell, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { CatalogItem } from '@/services/public'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import ImageModal from '@/components/ImageModal'
import { getPlaceholderLogo } from '@/utils/placeholderLogo'
import SegmentBadge from './SegmentBadge'
import LeadCaptureModal from './LeadCaptureModal'
import ReportDataModal from './ReportDataModal'

interface CatalogItemDetailModalProps {
  item: CatalogItem
  isOpen: boolean
  onClose: () => void
}

export default function CatalogItemDetailModal({
  item,
  isOpen,
  onClose
}: CatalogItemDetailModalProps) {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const [showImageViewer, setShowImageViewer] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Build array of available photos (only valid URLs)
  const photos = useMemo(() => {
    const isValidUrl = (url?: string) => url && url.startsWith('https://') && !url.includes('wiki-file:')
    const list: { url: string; label: string }[] = []
    if (isValidUrl(item.photo_url)) {
      list.push({ url: item.photo_url!, label: item.photo_url_carded ? 'Loose' : '' })
    }
    if (isValidUrl(item.photo_url_carded)) {
      list.push({ url: item.photo_url_carded!, label: 'Carded' })
    }
    return list
  }, [item.photo_url, item.photo_url_carded])

  const hasMultiplePhotos = photos.length > 1

  const proxyUrl = (url: string) =>
    url.includes('weserv') ? url : `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=600&h=400&fit=contain`

  // Get Facebook Messenger URL
  const getMessengerLink = () => {
    const fbPageId = import.meta.env.VITE_FACEBOOK_PAGE_ID || 'YOUR_PAGE_ID'
    const message = encodeURIComponent(
      `Hola! Estoy interesado en: ${item.carModel}\n` +
      `Serie: ${item.series}\n` +
      `Año: ${item.year}\n` +
      `Link: ${window.location.href}`
    )
    return `https://m.me/${fbPageId}?text=${message}`
  }

  const handleContactClick = () => {
    window.open(getMessengerLink(), '_blank')
  }

  const handleNotifyClick = () => {
    setShowNotifyModal(true)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Detalles del Modelo"
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Section with Carousel */}
          <div>
            <div
              className="relative bg-slate-700 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setShowImageViewer(true)}
            >
              {photos.length > 0 ? (
                <>
                  <img
                    src={proxyUrl(photos[currentPhotoIndex].url)}
                    alt={item.carModel}
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series)
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <Maximize2
                      size={48}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  {/* Navigation Arrows */}
                  {hasMultiplePhotos && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all opacity-80 hover:opacity-100 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all opacity-80 hover:opacity-100 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>

                      {/* Photo label badge */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {photos.map((photo, idx) => (
                          <button
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${idx === currentPhotoIndex
                              ? 'bg-white text-slate-900 shadow-lg'
                              : 'bg-black/50 text-white hover:bg-black/70'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentPhotoIndex(idx)
                            }}
                          >
                            {photo.label || `${idx + 1}/${photos.length}`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <img src={getPlaceholderLogo(item.series)} alt="Auto a Escala" className="w-full h-full object-contain p-8" />
                </div>
              )}

              {/* Availability Badge */}
              {item.availability.available && (
                <div className="absolute top-4 right-4 px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full shadow-lg">
                  ✓ Disponible
                </div>
              )}
            </div>

            <p className={`text-xs text-center mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Click en la imagen para ver en pantalla completa
            </p>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            {/* Model Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SegmentBadge segment={item.segment} size="md" />
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {item.carModel}
              </h2>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <DetailRow label="Serie" value={item.series} isDark={isDark} />
              {item.sub_series && <DetailRow label="Sub-serie" value={item.sub_series} isDark={isDark} />}
              <DetailRow label="Año" value={item.year} isDark={isDark} />
              {item.color && <DetailRow label="Color" value={item.color} isDark={isDark} />}
              {item.car_make && <DetailRow label="Fabricante" value={item.car_make} isDark={isDark} />}
              {item.tampo && <DetailRow label="Tampo" value={item.tampo} isDark={isDark} />}
              {item.wheel_type && <DetailRow label="Ruedas" value={item.wheel_type} isDark={isDark} />}
              <DetailRow label="Toy #" value={item.toy_num} isDark={isDark} />
              <DetailRow label="Col #" value={item.col_num} isDark={isDark} />
            </div>

            {/* Pack Contents - Show if this is a multi-pack */}
            {item.pack_contents && item.pack_contents.length > 0 && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <h3 className={`font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  📦 Contenido del Pack ({item.pack_contents.length} autos)
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {item.pack_contents.map((car, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border flex gap-3 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
                        }`}
                    >
                      {/* Car Photo */}
                      <div className="w-16 h-16 flex-shrink-0 rounded bg-slate-700 flex items-center justify-center overflow-hidden">
                        {car.photo_url && car.photo_url.startsWith('https://') ? (
                          <img
                            src={car.photo_url.includes('weserv') ? car.photo_url : `https://images.weserv.nl/?url=${encodeURIComponent(car.photo_url)}&w=64&h=64&fit=contain`}
                            alt={car.casting_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series)
                            }}
                          />
                        ) : (
                          <img src={getPlaceholderLogo(item.series)} alt="Auto a Escala" className="w-full h-full object-contain p-1" />
                        )}
                      </div>

                      {/* Car Details */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {car.casting_name}
                        </p>
                        <div className={`text-xs space-y-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {car.body_color && <p>Color: {car.body_color}</p>}
                          {car.tampo && <p>Tampo: {car.tampo}</p>}
                          {car.wheel_type && <p>Ruedas: {car.wheel_type}</p>}
                          {car.notes && <p className="text-xs italic">{car.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability & Pricing */}
            {item.availability.available ? (
              <div className={`p-4 rounded-lg border-2 ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    ✓ Disponible para entrega
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Your Price */}
                  {item.availability.price && (
                    <div>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Nuestro precio:
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        ${item.availability.price.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* eBay Price Comparison (if available) */}
                  {item.availability.ebayPrice && (
                    <div className="pt-2 border-t border-green-200 dark:border-green-800">
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Precio promedio eBay:
                      </p>
                      <p className={`text-lg line-through ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        ${item.availability.ebayPrice.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Stock info */}
                  {item.availability.quantity && (
                    <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      {item.availability.quantity} unidad(es) disponible(s)
                    </p>
                  )}

                  <p className="text-sm font-semibold text-blue-600">
                    🚚 Entrega inmediata
                  </p>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-lg border-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'
                }`}>
                <p className={`font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No disponible actualmente
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Podemos notificarte cuando este modelo esté disponible
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {item.availability.available ? (
                <>
                  {/* Contact via Messenger */}
                  <Button
                    variant="primary"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleContactClick}
                    icon={<MessageCircle size={20} />}
                  >
                    Contactar por Messenger
                  </Button>

                  <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Te responderemos con información sobre envío y pago
                  </p>
                </>
              ) : (
                <>
                  {/* Notify when available */}
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleNotifyClick}
                    icon={<Bell size={20} />}
                  >
                    Notificarme cuando esté disponible
                  </Button>
                </>
              )}

              {/* Report data button - always visible */}
              <button
                onClick={() => setShowReportModal(true)}
                className={`w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors ${isDark
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Flag size={14} />
                Reportar dato incorrecto
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Image Viewer Modal */}
      {photos.length > 0 && (
        <ImageModal
          isOpen={showImageViewer}
          images={photos.map(p => `https://images.weserv.nl/?url=${encodeURIComponent(p.url)}&w=1200&h=1200&fit=contain`)}
          initialIndex={currentPhotoIndex}
          onClose={() => setShowImageViewer(false)}
          title={item.carModel}
        />
      )}

      {/* Notify Me Modal */}
      <LeadCaptureModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        onSuccess={() => {
          setShowNotifyModal(false)
          onClose()
        }}
        interestedInItem={{
          catalogId: item._id,
          carModel: `${item.carModel} ${item.series} (${item.year})`,
          requestType: 'notify'
        }}
      />

      {/* Report Data Modal */}
      <ReportDataModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        item={{
          _id: item._id,
          carModel: item.carModel,
          series: item.series,
          year: item.year
        }}
      />
    </>
  )
}

// Helper component for detail rows
function DetailRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {label}:
      </span>
      <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  )
}
