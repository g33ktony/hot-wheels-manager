import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

interface SearchFilters {
  searchTerm: string
  filterCondition: string
  filterBrand: string
  filterPieceType: string
  filterLocation: string
  filterLowStock: boolean
  filterTreasureHunt: 'all' | 'th' | 'sth'
  filterChase: boolean
  filterFantasy: boolean
  filterMoto: boolean
  filterCamioneta: boolean
  filterFastFurious: boolean
}

interface SearchContextType {
  filters: SearchFilters
  updateFilter: (key: keyof SearchFilters, value: any) => void
  resetFilters: () => void
  currentPage: string
}

const defaultFilters: SearchFilters = {
  searchTerm: '',
  filterCondition: '',
  filterBrand: '',
  filterPieceType: '',
  filterLocation: '',
  filterLowStock: false,
  filterTreasureHunt: 'all',
  filterChase: false,
  filterFantasy: true,
  filterMoto: false,
  filterCamioneta: false,
  filterFastFurious: false
}

const getDefaultFiltersForPage = (page: string): SearchFilters => {
  if (page === 'pos') {
    return {
      ...defaultFilters,
      filterFantasy: false,
    }
  }

  return defaultFilters
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

interface SearchProviderProps {
  children: ReactNode
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const location = useLocation()
  const currentPage = location.pathname.split('/')[1] || 'dashboard'
  const storageKey = `searchFilters:${currentPage}`
  const pageDefaults = useMemo(() => getDefaultFiltersForPage(currentPage), [currentPage])

  const [filters, setFilters] = useState<SearchFilters>(() => {
    return getDefaultFiltersForPage(currentPage)
  })

  // Load page-scoped filters when route page changes
  useEffect(() => {
    console.log('📄 Page changed to:', currentPage)

    if (currentPage === 'pos') {
      setFilters(pageDefaults)
      localStorage.removeItem(storageKey)
      console.log('🔄 POS filters reset on entry')
      return
    }

    try {
      const saved = localStorage.getItem(storageKey)
      const parsed = saved ? JSON.parse(saved) : null
      setFilters(parsed ? { ...pageDefaults, ...parsed } : pageDefaults)
      console.log('🔄 Loaded filters for page', currentPage, parsed || pageDefaults)
    } catch {
      setFilters(pageDefaults)
    }
  }, [currentPage, storageKey, pageDefaults])

  // Persist current page filters
  useEffect(() => {
    if (currentPage === 'pos') {
      return
    }
    localStorage.setItem(storageKey, JSON.stringify(filters))
  }, [filters, storageKey, currentPage])

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFiltersForPage(currentPage))
    localStorage.removeItem(storageKey)
  }, [storageKey, currentPage])

  return (
    <SearchContext.Provider value={{ filters, updateFilter, resetFilters, currentPage }}>
      {children}
    </SearchContext.Provider>
  )
}
