import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Loader2, ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { publicService, CatalogItem } from '@/services/public'
import PublicLayout from '@/components/public/PublicLayout'
import CatalogItemDetailModal from '@/components/public/CatalogItemDetailModal'
import LeadCaptureModal from '@/components/public/LeadCaptureModal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { getPlaceholderLogo } from '@/utils/placeholderLogo'
import SegmentBadge from '@/components/public/SegmentBadge'
import toast from 'react-hot-toast'

export default function CatalogBrowser() {
  const { mode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDark = mode === 'dark'

  // Redirigir si el usuario ya tiene sesión activa (solo si viene desde la raíz o login)
  useEffect(() => {
    // Solo redirigir si no hay un parámetro específico o si queremos forzar dashboard al entrar a /
    // Para permitir ver el catálogo siendo admin, podríamos chequear una query param o simplemente dejarlo pasar si viene de sidebar
    const fromSidebar = searchParams.get('adminView') === 'true'

    // Si es admin y entra a la ruta pública normal, mandarlo al dashboard
    if (user && !fromSidebar && (location.pathname === '/browse' || location.pathname === '/')) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate, searchParams, location.pathname])

  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // State
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [yearFilter, setYearFilter] = useState(searchParams.get('year') || '')
  const [brandFilter, setBrandFilter] = useState<string[]>(
    searchParams.get('brand') ? searchParams.get('brand')?.split(',') || [] : ['Hot Wheels']
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableBrands, _setAvailableBrands] = useState<string[]>(['Hot Wheels', 'Mini GT', 'Pop Race', 'Kaido House'])
  const [showYears, setShowYears] = useState(false)
  const [showBrands, setShowBrands] = useState(false)
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

  // Search function — accepts overrides to avoid stale closure issues
  const handleSearch = async (overrides?: { search?: string; pageNum?: number; brands?: string[] }) => {
    const q = overrides?.search ?? searchTerm
    const p = overrides?.pageNum ?? page
    const brands = overrides?.brands ?? brandFilter

    // Check if there's any search criteria
    const hasBrandFilter = brands.length > 0 && !(brands.length === 1 && brands[0] === 'Hot Wheels')
    if (!q.trim() && !yearFilter && !hasBrandFilter) return // Don't search without criteria
    setHasSearched(true)
    setLoading(true)
    try {
      const response = await publicService.searchCatalog({
        q,
        year: yearFilter,
        brand: brands.length > 0 ? brands.join(',') : '',
        sort: sortOrder,
        page: p,
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
      if (q) newParams.q = q
      if (yearFilter) newParams.year = yearFilter
      if (brandFilter.length > 0) newParams.brand = brandFilter.join(',')

      // Preserve adminView if it exists to prevent redirecting admins to dashboard
      const isAdminView = searchParams.get('adminView') === 'true'
      if (isAdminView) {
        newParams.adminView = 'true'
      }

      setSearchParams(newParams)
    } catch (error) {
      console.error('Error searching catalog:', error)
      toast.error('Error al buscar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: CatalogItem) => {
    setSearchTerm(suggestion.carModel)
    setShowSuggestions(false)
    setPage(1)
    // Search immediately with the known values (avoids stale closure)
    handleSearch({ search: suggestion.carModel, pageNum: 1 })
  }

  // Search when filters change (only if user has already searched)
  useEffect(() => {
    if (hasSearched) handleSearch()
  }, [page, yearFilter, brandFilter.join(','), sortOrder])

  // Auto-search if URL has query params on mount
  useEffect(() => {
    if (searchParams.get('q') || searchParams.get('year') || searchParams.get('brand')) {
      setHasSearched(true)
      handleSearch()
    }
  }, [])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to page 1 on new search
    handleSearch({ pageNum: 1 })
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
          Explora Autos a Escala
        </h1>
        {totalItems > 0 && (
          <p className={`text-lg font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
            {totalItems.toLocaleString()} modelos en catálogo
          </p>
        )}
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
                      {suggestion.photo_url && suggestion.photo_url.startsWith('https://') ? (
                        <img
                          src={`https://images.weserv.nl/?url=${encodeURIComponent(suggestion.photo_url)}&w=48&h=48&fit=cover`}
                          alt={suggestion.carModel}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <img src={getPlaceholderLogo(suggestion.series, suggestion.brand)} alt="Auto a Escala" className="w-full h-full object-contain p-1" />
                      )}
                    </div>

                    {/* Model info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {suggestion.carModel}
                      </p>
                      <p className={`text-sm truncate flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <SegmentBadge segment={suggestion.segment} />
                        <span className="truncate">{suggestion.series} • {suggestion.year}</span>
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

            {/* Collapsible Brand Filter */}
            <div>
              <button
                type="button"
                onClick={() => setShowBrands(!showBrands)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                {showBrands ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Filtrar por marca
                {brandFilter.length > 0 && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${isDark ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white'}`}>
                    {brandFilter.length}
                  </span>
                )}
              </button>

              {showBrands && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {/* All Brands Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const finalBrands = ['Hot Wheels']
                      setBrandFilter(finalBrands)
                      setPage(1)
                      // Immediately search with new brands
                      handleSearch({ brands: finalBrands, pageNum: 1 })
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${brandFilter.length === 1 && brandFilter[0] === 'Hot Wheels'
                      ? isDark
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-primary-500 text-white shadow-lg'
                      : isDark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    Solo Hot Wheels
                  </button>

                  {/* Brand buttons */}
                  {availableBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        const newBrands = brandFilter.includes(brand)
                          ? brandFilter.filter(b => b !== brand)
                          : [...brandFilter, brand]
                        // Ensure at least one brand is selected
                        const finalBrands = newBrands.length > 0 ? newBrands : ['Hot Wheels']
                        setBrandFilter(finalBrands)
                        setPage(1)
                        // Immediately search with new brands
                        handleSearch({ brands: finalBrands, pageNum: 1 })
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${brandFilter.includes(brand)
                        ? isDark
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-primary-500 text-white shadow-lg'
                        : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <img src="/hot-wheels-placeholder.png" alt="Auto a Escala" className="w-48 h-32 mx-auto mb-6 opacity-60" />
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
                  {item.photo_url && item.photo_url.startsWith('https://') ? (
                    <img
                      src={item.photo_url.includes('weserv') ? item.photo_url : `https://images.weserv.nl/?url=${encodeURIComponent(item.photo_url)}&w=300&h=200&fit=contain`}
                      alt={item.carModel}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series, item.brand)
                      }}
                    />
                  ) : (
                    <img src={getPlaceholderLogo(item.series, item.brand)} alt="Auto a Escala" className="w-full h-full object-contain p-4" />
                  )}

                  {/* Segment Badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <SegmentBadge segment={item.segment} />
                    {item.brand && item.brand !== 'Hot Wheels' && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase shadow-sm">
                        {item.brand}
                      </span>
                    )}
                  </div>

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
