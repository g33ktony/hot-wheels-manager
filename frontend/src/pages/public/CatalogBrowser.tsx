import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Loader2, ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronDown, ChevronUp } from 'lucide-react'
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // State
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [yearFilter, setYearFilter] = useState(searchParams.get('year') || '')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [showYears, setShowYears] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [pendingItemForLead, setPendingItemForLead] = useState<CatalogItem | null>(null)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Check if lead already captured
  useEffect(() => {
    const captured = localStorage.getItem('leadCaptured')
    if (captured === 'true') {
      setLeadCaptured(true)
    }
  }, [])

  // Fetch suggestions (debounced)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      setLoadingSuggestions(true)
      try {
        const response = await publicService.searchCatalog({
          q: searchTerm,
          page: 1,
          limit: 8 // Just get top 8 suggestions
        })
        setSuggestions(response.data)
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300) // Debounce 300ms
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: CatalogItem) => {
    setSearchTerm(suggestion.carModel)
    setShowSuggestions(false)
    setPage(1)
    // Trigger search with selected model
    setTimeout(() => {
      handleSearch()
    }, 100)
  }

  // Search function
  const handleSearch = async () => {
    if (!searchTerm.trim() && !yearFilter) return // Don't search without criteria
    setHasSearched(true)
    setLoading(true)
    try {
      const response = await publicService.searchCatalog({
        q: searchTerm,
        year: yearFilter,
        sort: sortOrder,
        page,
        limit: 20
      })

      setResults(response.data)
      setTotalPages(response.pagination.pages)
      setTotalItems(response.pagination.total || 0)
      if (response.availableYears) {
        setAvailableYears(response.availableYears)
      }

      // Update URL params
      const newParams: Record<string, string> = {}
      if (searchTerm) newParams.q = searchTerm
      if (yearFilter) newParams.year = yearFilter
      setSearchParams(newParams)
    } catch (error) {
      console.error('Error searching catalog:', error)
      toast.error('Error al buscar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Search when filters change (only if user has already searched)
  useEffect(() => {
    if (hasSearched) handleSearch()
  }, [page, yearFilter, sortOrder])

  // Auto-search if URL has query params on mount
  useEffect(() => {
    if (searchParams.get('q') || searchParams.get('year')) {
      setHasSearched(true)
      handleSearch()
    }
  }, [])

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

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Explora Hot Wheels
        </h1>
        <p className={`text-lg font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
          {totalItems.toLocaleString()} modelos en catálogo
        </p>
      </div>

      {/* Search Section */}
      <div className={`max-w-4xl mx-auto mb-8 p-6 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'
        } shadow-md`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Input with Autocomplete */}
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por modelo, serie o fabricante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              className="pl-10"
            />
            <SearchIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              size={20}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-96 overflow-y-auto ${isDark
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-slate-200'
                  }`}
              >
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion._id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 border-b last:border-b-0 ${isDark
                      ? 'border-slate-700 hover:bg-slate-700'
                      : 'border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                    {/* Small thumbnail */}
                    <div className="w-12 h-12 flex-shrink-0 rounded bg-slate-700 flex items-center justify-center overflow-hidden">
                      {suggestion.photo_url ? (
                        <img
                          src={`https://images.weserv.nl/?url=${suggestion.photo_url}&w=48&h=48&fit=cover`}
                          alt={suggestion.carModel}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="text-xl">🏎️</span>
                      )}
                    </div>

                    {/* Model info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {suggestion.carModel}
                      </p>
                      <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {suggestion.series} • {suggestion.year}
                      </p>
                    </div>

                    {/* Availability badge */}
                    {suggestion.availability?.available && (
                      <div className="flex-shrink-0 px-2 py-1 bg-green-500 text-white text-xs rounded">
                        Disponible
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {loadingSuggestions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} size={18} />
              </div>
            )}
          </div>

          {/* Sort Order + Year Filter */}
          <div className="flex flex-col gap-4">
            {/* Sort Buttons */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Orden:</span>
              <button
                type="button"
                onClick={() => { setSortOrder('desc'); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'desc'
                    ? isDark
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-primary-500 text-white shadow-lg'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <ArrowDownNarrowWide size={16} />
                Más recientes
              </button>
              <button
                type="button"
                onClick={() => { setSortOrder('asc'); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'asc'
                    ? isDark
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-primary-500 text-white shadow-lg'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <ArrowUpNarrowWide size={16} />
                Más antiguos
              </button>
            </div>

            {/* Collapsible Year Filter - only show when there are results */}
            {availableYears.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowYears(!showYears)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                    }`}
                >
                  {showYears ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Filtrar por año
                  {yearFilter && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${isDark ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white'}`}>
                      {yearFilter}
                    </span>
                  )}
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    ({availableYears.length} años)
                  </span>
                </button>

                {showYears && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* All Years Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setYearFilter('')
                        setPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${yearFilter === ''
                          ? isDark
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-primary-500 text-white shadow-lg'
                          : isDark
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      Todos
                    </button>

                    {/* Only relevant year buttons, ordered according to sort */}
                    {(sortOrder === 'desc' ? availableYears : [...availableYears].reverse()).map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setYearFilter(year)
                          setPage(1)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${yearFilter === year
                            ? isDark
                              ? 'bg-primary-600 text-white shadow-lg'
                              : 'bg-primary-500 text-white shadow-lg'
                            : isDark
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
      {!hasSearched ? (
        <div className="text-center py-16">
          <div className="text-7xl mb-6">🏎️</div>
          <h3 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ¿Qué modelo buscas?
          </h3>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Escribe un nombre, serie o fabricante para comenzar
          </p>
        </div>
      ) : loading ? (
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
                      src={item.photo_url.includes('weserv') ? item.photo_url : `https://images.weserv.nl/?url=${item.photo_url}&w=300&h=200&fit=contain`}
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
