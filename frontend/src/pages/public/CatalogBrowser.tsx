import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { publicService, CatalogItem } from '@/services/public'
import PublicLayout from '@/components/public/PublicLayout'
import CatalogItemDetailModal from '@/components/public/CatalogItemDetailModal'
import LeadCaptureModal from '@/components/public/LeadCaptureModal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import toast from 'react-hot-toast'

export default function CatalogBrowser() {
  const { mode } = useTheme()
  const isDark = mode === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [yearFilter, setYearFilter] = useState(searchParams.get('year') || '')
  const [seriesFilter, setSeriesFilter] = useState(searchParams.get('series') || '')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [pendingItemForLead, setPendingItemForLead] = useState<CatalogItem | null>(null)

  // Check if lead already captured
  useEffect(() => {
    const captured = localStorage.getItem('leadCaptured')
    if (captured === 'true') {
      setLeadCaptured(true)
    }
  }, [])

  // Search function
  const handleSearch = async () => {
    setLoading(true)
    try {
      const response = await publicService.searchCatalog({
        q: searchTerm,
        year: yearFilter,
        series: seriesFilter,
        page,
        limit: 20
      })

      setResults(response.data)
      setTotalPages(response.pagination.pages)

      // Update URL params
      const newParams: Record<string, string> = {}
      if (searchTerm) newParams.q = searchTerm
      if (yearFilter) newParams.year = yearFilter
      if (seriesFilter) newParams.series = seriesFilter
      setSearchParams(newParams)
    } catch (error) {
      console.error('Error searching catalog:', error)
      toast.error('Error al buscar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Search on mount and when page changes
  useEffect(() => {
    handleSearch()
  }, [page])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to page 1 on new search
    handleSearch()
  }

  // Handle item click
  const handleItemClick = (item: CatalogItem) => {
    // Check if lead is captured
    if (!leadCaptured) {
      // Save the item and show lead modal first
      setPendingItemForLead(item)
      setShowLeadModal(true)
      return
    }

    // Show item detail
    setSelectedItem(item)
  }

  // Handle lead capture success
  const handleLeadCaptured = () => {
    setLeadCaptured(true)
    localStorage.setItem('leadCaptured', 'true')
    setShowLeadModal(false)
    toast.success('¡Gracias! Ya puedes explorar el catálogo.')

    // If there was a pending item, show it now
    if (pendingItemForLead) {
      setSelectedItem(pendingItemForLead)
      setPendingItemForLead(null)
    }
  }

  // Pagination controls
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Available years (2000-2024)
  const years = Array.from({ length: 25 }, (_, i) => (2024 - i).toString())

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Explora Hot Wheels
        </h1>
        <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Miles de modelos disponibles para coleccionistas
        </p>
      </div>

      {/* Search Section */}
      <div className={`max-w-4xl mx-auto mb-8 p-6 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'
        } shadow-md`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por modelo, serie o fabricante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <SearchIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              size={20}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Todos los años</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <Input
              type="text"
              placeholder="Filtrar por serie..."
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
            />
          </div>

          {/* Search Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Buscando...
              </>
            ) : (
              <>
                <SearchIcon className="mr-2" size={18} />
                Buscar
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-600'}`} size={48} />
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {results.map((item) => (
              <div
                key={item._id}
                onClick={() => handleItemClick(item)}
                className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${isDark
                    ? 'bg-slate-800 hover:bg-slate-750 hover:shadow-xl'
                    : 'bg-white hover:shadow-lg'
                  } shadow-md border ${isDark ? 'border-slate-700' : 'border-slate-200'
                  }`}
              >
                {/* Image */}
                <div className="relative h-48 bg-slate-700 flex items-center justify-center">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url.includes('weserv') ? item.photo_url : `https://images.weserv.nl/?url=${encodeURIComponent(item.photo_url)}&w=300&h=200&fit=contain`}
                      alt={item.carModel}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image'
                      }}
                    />
                  ) : (
                    <div className={`text-6xl ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      🏎️
                    </div>
                  )}

                  {/* Availability Badge */}
                  {item.availability.available && (
                    <div className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                      Disponible
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className={`font-semibold text-base mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                    {item.carModel}
                  </h3>

                  <div className={`text-sm space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <p>{item.series}</p>
                    <p>Año: {item.year}</p>
                    {item.color && <p>Color: {item.color}</p>}
                  </div>

                  {/* Price (if available) */}
                  {item.availability.available && item.availability.price && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-lg font-bold text-green-600">
                        ${item.availability.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-600">
                        Entrega inmediata
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button
                variant="secondary"
                onClick={handlePrevPage}
                disabled={page === 1}
                icon={<ChevronLeft size={18} />}
              >
                Anterior
              </Button>

              <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Página {page} de {totalPages}
              </span>

              <Button
                variant="secondary"
                onClick={handleNextPage}
                disabled={page === totalPages}
                icon={<ChevronRight size={18} />}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            No se encontraron resultados
          </h3>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadModal}
        onClose={() => {
          setShowLeadModal(false)
          setPendingItemForLead(null) // Clear pending item on close
        }}
        onSuccess={handleLeadCaptured}
        interestedInItem={
          pendingItemForLead
            ? {
              catalogId: pendingItemForLead._id,
              carModel: `${pendingItemForLead.carModel} ${pendingItemForLead.series} (${pendingItemForLead.year})`,
              requestType: 'availability'
            }
            : undefined
        }
      />

      {/* Item Detail Modal */}
      {selectedItem && (
        <CatalogItemDetailModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </PublicLayout>
  )
}
