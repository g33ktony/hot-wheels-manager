import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Loader2, ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react'
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

const resolveCatalogImageUrl = (url?: string): string => {
  if (!url) return ''
  if (url.startsWith('wiki-file:')) {
    const fileName = url.replace('wiki-file:', '').trim()
    return fileName
      ? `https://hotwheels.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
      : ''
  }
  // Handle relative URLs to uploads
  if (url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001'}${url}`
  }
  return url
}

export default function CatalogBrowser() {
  const { mode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDark = mode === 'dark'

  const neumorphSurfaceClass = isDark
    ? 'backdrop-blur-xl bg-slate-900/62 shadow-[14px_14px_26px_rgba(2,6,23,0.52),-10px_-10px_18px_rgba(148,163,184,0.16)]'
    : 'backdrop-blur-xl bg-white/94 shadow-[14px_14px_26px_rgba(148,163,184,0.28),-10px_-10px_18px_rgba(255,255,255,0.99)]'

  const neumorphInsetClass = isDark
    ? 'bg-slate-800 border border-slate-600/40 shadow-[inset_4px_4px_8px_rgba(2,6,23,0.52),inset_-3px_-3px_6px_rgba(148,163,184,0.1)]'
    : 'bg-slate-100 border border-slate-300/60 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.24),inset_-3px_-3px_6px_rgba(255,255,255,0.94)]'

  const neumorphPillClass = isDark
    ? 'bg-slate-800/62 text-slate-100 border-0 shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(148,163,184,0.1)] hover:bg-slate-700/72'
    : 'bg-white/86 text-slate-700 border-0 shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(255,255,255,0.96)] hover:bg-white/92'

  const neumorphPillActiveClass = isDark
    ? 'bg-emerald-600 text-white border-0 shadow-[8px_8px_14px_rgba(2,6,23,0.45),-6px_-6px_10px_rgba(16,185,129,0.2)]'
    : 'bg-emerald-500 text-white border-0 shadow-[8px_8px_14px_rgba(148,163,184,0.22),-6px_-6px_10px_rgba(16,185,129,0.15)]'

  const featuredShellClass = isDark
    ? 'max-w-2xl mx-auto rounded-3xl px-5 py-6 bg-slate-900/56 backdrop-blur-xl shadow-[16px_16px_32px_rgba(2,6,23,0.55),-12px_-12px_24px_rgba(148,163,184,0.12)]'
    : 'max-w-2xl mx-auto rounded-3xl px-5 py-6 bg-white/92 backdrop-blur-xl shadow-[16px_16px_32px_rgba(148,163,184,0.28),-12px_-12px_24px_rgba(255,255,255,0.98)]'

  const featuredCardClass = isDark
    ? 'max-w-sm mx-auto rounded-2xl overflow-hidden transition-all duration-300 bg-slate-900/62 backdrop-blur-xl shadow-[14px_14px_28px_rgba(2,6,23,0.58),-12px_-12px_24px_rgba(148,163,184,0.14)]'
    : 'max-w-sm mx-auto rounded-2xl overflow-hidden transition-all duration-300 bg-white/94 backdrop-blur-xl shadow-[14px_14px_28px_rgba(148,163,184,0.3),-12px_-12px_24px_rgba(255,255,255,0.98)]'

  const featuredInsetClass = isDark
    ? 'bg-slate-800 border border-slate-600/40 shadow-[inset_6px_6px_12px_rgba(2,6,23,0.7),inset_-5px_-5px_10px_rgba(148,163,184,0.12)]'
    : 'bg-slate-100 border border-slate-300/60 shadow-[inset_6px_6px_12px_rgba(148,163,184,0.24),inset_-6px_-6px_12px_rgba(255,255,255,0.95)]'

  const catalogCardShellClass = isDark
    ? 'relative overflow-hidden rounded-2xl bg-slate-900/52 backdrop-blur-xl shadow-[16px_16px_32px_rgba(2,6,23,0.45),-10px_-10px_18px_rgba(148,163,184,0.12)]'
    : 'relative overflow-hidden rounded-2xl bg-white/88 backdrop-blur-xl shadow-[16px_16px_32px_rgba(148,163,184,0.24),-10px_-10px_18px_rgba(255,255,255,0.96)]'

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
  const [availableBrands, _setAvailableBrands] = useState<string[]>(['Hot Wheels', 'Mini GT', 'Pop Race', 'Kaido House', 'Tomica'])
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

  // Random featured item for hero placeholder
  const [featuredItem, setFeaturedItem] = useState<CatalogItem | null>(null)
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [refreshingFeatured, setRefreshingFeatured] = useState(false)
  const [viewMode, setViewMode] = useState<'full' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'full'

    const savedMode = localStorage.getItem('publicCatalogViewMode')
    if (savedMode === 'compact' || savedMode === 'full') return savedMode

    return window.innerWidth < 768 ? 'compact' : 'full'
  })

  const fetchFeatured = async (preserveScrollPosition = false) => {
    const keepCurrentCardVisible = preserveScrollPosition && !!featuredItem

    if (keepCurrentCardVisible) {
      setRefreshingFeatured(true)
    } else {
      setFeaturedLoading(true)
    }

    try {
      const response = await publicService.getRandomItem()
      if (response.success && response.data) {
        setFeaturedItem(response.data)
      }
    } catch (_e) {
      console.warn('Could not load featured item')
    } finally {
      if (keepCurrentCardVisible) {
        setRefreshingFeatured(false)
      } else {
        setFeaturedLoading(false)
      }
    }
  }

  // Fetch random featured item on mount
  useEffect(() => {
    fetchFeatured()
  }, [])

  // Check if lead already captured
  useEffect(() => {
    const captured = localStorage.getItem('leadCaptured')
    if (captured === 'true') {
      setLeadCaptured(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('publicCatalogViewMode', viewMode)
  }, [viewMode])

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
  const handleSearch = async (overrides?: {
    search?: string
    pageNum?: number
    brands?: string[]
    year?: string
    preferredToyNum?: string
    preferredYear?: string
  }) => {
    const q = overrides?.search ?? searchTerm
    const p = overrides?.pageNum ?? page
    const brands = overrides?.brands ?? brandFilter
    const effectiveYear = overrides?.year ?? yearFilter

    // Check if there's any search criteria
    const hasBrandFilter = brands.length > 0 && !(brands.length === 1 && brands[0] === 'Hot Wheels')
    if (!q.trim() && !effectiveYear && !hasBrandFilter) return // Don't search without criteria
    setHasSearched(true)
    setLoading(true)
    try {
      const response = await publicService.searchCatalog({
        q,
        year: effectiveYear,
        brand: brands.length > 0 ? brands.join(',') : '',
        preferredToyNum: overrides?.preferredToyNum,
        preferredYear: overrides?.preferredYear,
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
      if (effectiveYear) newParams.year = effectiveYear
      if (brands.length > 0) newParams.brand = brands.join(',')

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

  const handleFeaturedExactSearch = () => {
    if (!featuredItem) return

    setSearchTerm(featuredItem.carModel || '')
    setYearFilter(featuredItem.year || '')
    setPage(1)
    setHasSearched(true)
    setShowSuggestions(false)

    handleSearch({
      search: featuredItem.carModel,
      year: featuredItem.year,
      preferredToyNum: featuredItem.toy_num,
      preferredYear: featuredItem.year,
      pageNum: 1
    })
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
          Tu próxima joya diecast está aquí
        </h1>
        <p className={`text-sm sm:text-base font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Explora modelos reales, series icónicas y piezas difíciles de encontrar
        </p>
        {totalItems > 0 && (
          <p className={`text-lg font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
            {totalItems.toLocaleString()} modelos en catálogo
          </p>
        )}
      </div>

      {/* Search Section */}
      <div className={`relative z-40 max-w-4xl mx-auto mb-8 p-5 sm:p-6 rounded-2xl ${neumorphSurfaceClass}`}>
        <form onSubmit={handleSubmit} className="relative space-y-4">
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
              className={`pl-10 rounded-xl ${neumorphInsetClass}`}
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
                className={`absolute z-[80] w-full mt-2 rounded-2xl p-2 max-h-96 overflow-y-auto shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-700/90' : 'bg-white border border-slate-200'}`}
              >
                {suggestions.map((suggestion) => (
                  (() => {
                    const previewUrl = resolveCatalogImageUrl(suggestion.photo_url)
                    return (
                      <div
                        key={suggestion._id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 rounded-xl mb-2 last:mb-0 ${neumorphInsetClass} ${isDark ? 'hover:brightness-110' : 'hover:brightness-95'}`}
                      >
                        {/* Small thumbnail */}
                        <div className={`w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700/70' : 'bg-[#dfe8f5] border border-white/85'}`}>
                          {previewUrl && (previewUrl.startsWith('https://') || previewUrl.startsWith('http://')) ? (
                            <img
                              src={previewUrl.includes('weserv') || previewUrl.startsWith('http://localhost') ? previewUrl : `https://images.weserv.nl/?url=${encodeURIComponent(previewUrl)}&w=48&h=48&fit=cover`}
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
                    )
                  })()
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Orden:</span>
              <button
                type="button"
                onClick={() => { setSortOrder('desc'); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'desc'
                  ? neumorphPillActiveClass
                  : neumorphPillClass
                  }`}
              >
                <ArrowDownNarrowWide size={16} />
                Más recientes
              </button>
              <button
                type="button"
                onClick={() => { setSortOrder('asc'); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'asc'
                  ? neumorphPillActiveClass
                  : neumorphPillClass
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
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${neumorphPillClass} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
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
                        ? neumorphPillActiveClass
                        : neumorphPillClass
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
                          ? neumorphPillActiveClass
                          : neumorphPillClass
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
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${neumorphPillClass} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
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
                      const allBrandNames = ['Hot Wheels', 'Mini GT', 'Pop Race', 'Kaido House', 'Tomica']
                      // If "Todas" is selected, deselect it and select only Hot Wheels
                      // If "Todas" is not selected, select all brands
                      const isAllSelected = brandFilter.length === allBrandNames.length
                      const finalBrands = isAllSelected ? ['Hot Wheels'] : allBrandNames
                      setBrandFilter(finalBrands)
                      setPage(1)
                      // Immediately search with new brands
                      handleSearch({ brands: finalBrands, pageNum: 1 })
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${brandFilter.length === 5
                      ? neumorphPillActiveClass
                      : neumorphPillClass
                      }`}
                  >
                    Todas
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
                        ? neumorphPillActiveClass
                        : neumorphPillClass
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
            className={`w-full rounded-2xl ${neumorphPillActiveClass}`}
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
        <div className={`text-center py-12 ${featuredShellClass}`}>
          {featuredLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className={`animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={36} />
            </div>
          ) : featuredItem ? (
            <>
              <div className="max-w-sm mx-auto mb-4 flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-300' : 'text-sky-700'}`}>
                  Item Aleatorio del Catalogo
                </p>
                <button
                  type="button"
                  onClick={() => fetchFeatured(true)}
                  disabled={refreshingFeatured}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${neumorphPillClass}`}
                >
                  {refreshingFeatured ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    'Otro modelo'
                  )}
                </button>
              </div>

              {/* Featured random item */}
              <div className={featuredCardClass}>
                {/* Photo */}
                <div className={`relative h-56 flex items-center justify-center ${featuredInsetClass}`}>
                  {(() => {
                    const imgUrl = resolveCatalogImageUrl(featuredItem.photo_url)
                    return imgUrl && (imgUrl.startsWith('https://') || imgUrl.startsWith('http://')) ? (
                      <img
                        src={imgUrl.includes('weserv') ? imgUrl : `https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&w=400&h=280&fit=contain`}
                        alt={featuredItem.carModel}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getPlaceholderLogo(featuredItem.series, featuredItem.brand)
                        }}
                      />
                    ) : (
                      <img src={getPlaceholderLogo(featuredItem.series, featuredItem.brand)} alt="Auto a Escala" className="w-full h-full object-contain p-6 opacity-60" />
                    )
                  })()}
                  {featuredItem.segment && (
                    <div className="absolute top-2 left-2">
                      <SegmentBadge segment={featuredItem.segment} />
                    </div>
                  )}
                  {refreshingFeatured && (
                    <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 text-left">
                  <h4 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {featuredItem.carModel}
                  </h4>
                  <p className={`text-sm mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {featuredItem.series} &bull; {featuredItem.year}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {featuredItem.color && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${featuredInsetClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        🎨 {featuredItem.color}
                      </span>
                    )}
                    {featuredItem.wheel_type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${featuredInsetClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        🛞 {featuredItem.wheel_type}
                      </span>
                    )}
                    {featuredItem.toy_num && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${featuredInsetClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        #{featuredItem.toy_num}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={handleFeaturedExactSearch}
                      className={`flex-1 ${neumorphPillActiveClass}`}
                    >
                      Buscar este exacto
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleItemClick(featuredItem)}
                      className={`flex-1 ${neumorphPillClass}`}
                    >
                      Ver detalles
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className={`text-2xl font-semibold mt-6 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ¿Qué modelo buscas?
              </h3>
              <p className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Escribe un nombre, serie o fabricante para comenzar
              </p>
            </>
          ) : (
            <>
              <img src="/hw-flame-gold.jpg" alt="Auto a Escala" className="w-48 h-48 mx-auto mb-6 opacity-60 object-contain" />
              <h3 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ¿Qué modelo buscas?
              </h3>
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Escribe un nombre, serie o fabricante para comenzar
              </p>
            </>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-600'}`} size={48} />
        </div>
      ) : results.length > 0 ? (
        <>
          <div className={`mb-4 p-3 rounded-2xl flex items-center justify-between gap-3 ${neumorphSurfaceClass}`}>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Mostrando {results.length} de {totalItems.toLocaleString()} resultados
            </p>

            <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${neumorphInsetClass}`}>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'compact' ? neumorphPillActiveClass : neumorphPillClass}`}
                title="Vista compacta"
              >
                <List size={16} />
                Compacta
              </button>
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'full' ? neumorphPillActiveClass : neumorphPillClass}`}
                title="Vista completa"
              >
                <LayoutGrid size={16} />
                Completa
              </button>
            </div>
          </div>

          {viewMode === 'compact' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 mb-8">
              {results.map((item) => {
                const previewUrl = resolveCatalogImageUrl(item.photo_url)
                return (
                  <div
                    key={item._id}
                    onClick={() => handleItemClick(item)}
                    className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${catalogCardShellClass}`}
                  >
                    <div className="relative h-[250px] sm:h-[270px]">
                      <div className="absolute inset-0">
                        {previewUrl && (previewUrl.startsWith('https://') || previewUrl.startsWith('http://')) ? (
                          <img
                            src={previewUrl.includes('weserv') || previewUrl.startsWith('http://localhost') ? previewUrl : `https://images.weserv.nl/?url=${encodeURIComponent(previewUrl)}&w=500&h=700&fit=cover`}
                            alt={item.carModel}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series, item.brand)
                            }}
                          />
                        ) : (
                          <img src={getPlaceholderLogo(item.series, item.brand)} alt="Auto a Escala" className="w-full h-full object-contain p-3" />
                        )}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />

                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <SegmentBadge segment={item.segment} />
                        {item.brand && item.brand !== 'Hot Wheels' && (
                          <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded uppercase shadow-sm backdrop-blur-sm">
                            {item.brand}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        {item.availability.available ? (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-md">Disponible</span>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isDark ? 'bg-slate-700/90 text-slate-300' : 'bg-slate-200/95 text-slate-700'}`}>
                            No stock
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-2 bottom-2">
                        <div className={`rounded-xl p-2 ${neumorphInsetClass}`}>
                          <h3 className={`font-bold text-xs sm:text-sm leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.carModel}
                          </h3>
                          <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {item.series} • {item.year}
                          </p>
                          <div className={`mt-1 flex items-center justify-between gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span className="truncate">{item.toy_num ? `#${item.toy_num}` : (item.col_num ? `Col ${item.col_num}` : 'Coleccionable')}</span>
                            {item.availability.available && item.availability.price ? (
                              <span className="font-bold text-green-600">${item.availability.price.toFixed(2)}</span>
                            ) : (
                              <span className="font-semibold">Ver detalle</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
              {results.map((item) => {
                const previewUrl = resolveCatalogImageUrl(item.photo_url)
                return (
                  <div
                    key={item._id}
                    onClick={() => handleItemClick(item)}
                    className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${catalogCardShellClass}`}
                  >
                    <div className="relative h-[320px]">
                      {previewUrl && (previewUrl.startsWith('https://') || previewUrl.startsWith('http://')) ? (
                        <img
                          src={previewUrl.includes('weserv') || previewUrl.startsWith('http://localhost') ? previewUrl : `https://images.weserv.nl/?url=${encodeURIComponent(previewUrl)}&w=900&h=1200&fit=cover`}
                          alt={item.carModel}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getPlaceholderLogo(item.series, item.brand)
                          }}
                        />
                      ) : (
                        <img src={getPlaceholderLogo(item.series, item.brand)} alt="Auto a Escala" className="w-full h-full object-contain p-5" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />

                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <SegmentBadge segment={item.segment} />
                        {item.brand && item.brand !== 'Hot Wheels' && (
                          <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded uppercase shadow-sm backdrop-blur-sm">
                            {item.brand}
                          </span>
                        )}
                      </div>

                      {item.availability.available && (
                        <div className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                          Disponible
                        </div>
                      )}

                      <div className="absolute inset-x-3 bottom-3">
                        <div className={`rounded-xl p-3 ${neumorphInsetClass}`}>
                          <h3 className={`font-bold text-sm sm:text-base mb-1.5 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.carModel}
                          </h3>

                          <div className={`text-xs sm:text-sm grid grid-cols-2 gap-x-2 gap-y-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p className="col-span-2 truncate">Serie: {item.series}</p>
                            <p>Año: {item.year}</p>
                            {item.toy_num && <p>Toy #: {item.toy_num}</p>}
                            {item.col_num && <p>Col #: {item.col_num}</p>}
                            {item.color && <p className="col-span-2 truncate">Color: {item.color}</p>}
                            {item.wheel_type && <p className="col-span-2 truncate">Ruedas: {item.wheel_type}</p>}
                          </div>

                          {item.availability.available && item.availability.price && (
                            <div className="mt-2 pt-2 border-t border-slate-200/45 dark:border-slate-700/55 flex items-center justify-between">
                              <p className="text-lg font-bold text-green-600">
                                ${item.availability.price.toFixed(2)}
                              </p>
                              <p className="text-[11px] sm:text-xs text-blue-600 font-semibold">
                                Entrega inmediata
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button
                variant="primary"
                onClick={handlePrevPage}
                disabled={page === 1}
                className={`${neumorphPillClass} ${isDark ? 'disabled:!text-slate-400' : 'disabled:!text-slate-400'} disabled:!opacity-90`}
                icon={<ChevronLeft size={18} />}
              >
                Anterior
              </Button>

              <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Página {page} de {totalPages}
              </span>

              <Button
                variant="primary"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className={`${neumorphPillClass} ${isDark ? 'disabled:!text-slate-400' : 'disabled:!text-slate-400'} disabled:!opacity-90`}
                icon={<ChevronRight size={18} />}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 ${neumorphSurfaceClass}`}>
            <span className="text-4xl">🔍</span>
          </div>
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
