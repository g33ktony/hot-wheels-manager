import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
}

interface SearchContextType {
  filters: SearchFilters
  updateFilter: (key: keyof SearchFilters, value: any) => void
  resetFilters: () => void
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
  filterFantasy: false
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
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('globalSearchFilters')
    if (saved) {
      try {
        return { ...defaultFilters, ...JSON.parse(saved) }
      } catch (e) {
        console.warn('Failed to parse saved filters:', e)
      }
    }
    return defaultFilters
  })

  // Save to localStorage whenever filters change
  useEffect(() => {
    localStorage.setItem('globalSearchFilters', JSON.stringify(filters))
    console.log('🔍 Global search updated:', filters)
  }, [filters])

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    localStorage.removeItem('globalSearchFilters')
  }

  return (
    <SearchContext.Provider value={{ filters, updateFilter, resetFilters }}>
      {children}
    </SearchContext.Provider>
  )
}
