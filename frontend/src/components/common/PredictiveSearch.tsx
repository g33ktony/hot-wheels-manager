import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, Package, ShoppingCart, Truck, Users, AlertCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { searchService } from '@/services/search'

interface SearchResult {
  id: string
  type: 'inventory' | 'sale' | 'delivery' | 'customer' | 'presale' | 'catalog'
  name: string
  price?: number
  photoUrl?: string
  extra?: string
}

interface GroupedResults {
  [key: string]: SearchResult[]
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  inventory: { icon: <Package size={16} />, color: 'text-blue-500', label: 'Inventario' },
  sale: { icon: <ShoppingCart size={16} />, color: 'text-green-500', label: 'Ventas' },
  delivery: { icon: <Truck size={16} />, color: 'text-purple-500', label: 'Entregas' },
  customer: { icon: <Users size={16} />, color: 'text-orange-500', label: 'Clientes' },
  presale: { icon: <AlertCircle size={16} />, color: 'text-yellow-500', label: 'Pre-Ventas' },
  catalog: { icon: <Package size={16} />, color: 'text-indigo-500', label: 'Catálogo' },
}

export default function PredictiveSearch() {
  const { mode } = useTheme()
  const isDark = mode === 'dark'
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedResults>({})
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout>()
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounced search
  const handleInputChange = useCallback((value: string) => {
    setQuery(value)

    // Clear previous timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (value.length < 3) {
      setSuggestions([])
      setGroupedSuggestions({})
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchService.predictive(value)
        setSuggestions(results.slice(0, 10)) // Top 10
        
        // Group by type
        const grouped = results.slice(0, 10).reduce((acc: GroupedResults, result: SearchResult) => {
          const typeLabel = typeConfig[result.type]?.label || result.type
          if (!acc[typeLabel]) acc[typeLabel] = []
          acc[typeLabel].push(result)
          return acc
        }, {})
        
        setGroupedSuggestions(grouped)
        setIsOpen(true)
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce
  }, [])

  const handleSuggestionClick = (result: SearchResult) => {
    // Navigate to appropriate page with search
    const queryParam = encodeURIComponent(result.name)
    navigate(`/search?q=${queryParam}`)
    setIsOpen(false)
    setQuery('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setIsOpen(false)
      setQuery('')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={searchRef} className="flex-1 max-w-sm relative">
      <form onSubmit={handleSearch} className="relative">
        <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
        <input
          type="text"
          placeholder="Busca piezas, clientes, ventas..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:bg-slate-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-emerald-500'}`}
        />
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          {isLoading && (
            <div className={`px-4 py-3 text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Buscando...
            </div>
          )}

          {!isLoading && suggestions.length === 0 && query.length >= 3 && (
            <div className={`px-4 py-3 text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              No se encontraron resultados
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div className="space-y-0">
              {Object.entries(groupedSuggestions).map(([type, items]) => (
                <div key={type}>
                  <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
                    {type}
                  </div>
                  {items.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSuggestionClick(result)}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-opacity-50 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                    >
                      {/* Thumbnail */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        {result.photoUrl ? (
                          <img
                            src={result.photoUrl}
                            alt={result.name}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <span className="text-lg hidden">🚗</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {result.name}
                        </p>
                        {result.extra && (
                          <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {result.extra}
                          </p>
                        )}
                      </div>

                      {/* Type icon and Price */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {result.price && (
                          <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            ${result.price.toFixed(2)}
                          </span>
                        )}
                        <span className={typeConfig[result.type]?.color}>
                          {typeConfig[result.type]?.icon}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
