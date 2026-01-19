import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
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
  const location = useLocation()
  const currentPage = location.pathname.split('/')[1] || 'dashboard'
  
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // Only load searchTerm from localStorage (global), not page-specific filters
    const saved = localStorage.getItem('globalSearchTerm')
    return {
      ...defaultFilters,
      searchTerm: saved ? JSON.parse(saved) : ''
    }
  })

  // When page changes, reset all filters except search term (restore from localStorage)
  useEffect(() => {
    console.log('📄 Page changed to:', currentPage)
    // Restore search term from localStorage to ensure it persists across pages
    const savedSearchTerm = localStorage.getItem('globalSearchTerm')
    const searchTermValue = savedSearchTerm ? JSON.parse(savedSearchTerm) : ''
    
    // Keep search term but reset all other filters when navigating to a different page
    setFilters(prev => ({
      ...defaultFilters,
      searchTerm: searchTermValue || prev.searchTerm // Restore from localStorage or keep current
    }))
    console.log('🔄 Filters reset for page', currentPage, '- Search term preserved:', searchTermValue)
  }, [currentPage])

  // Save only searchTerm to localStorage (global across pages)
  useEffect(() => {
    localStorage.setItem('globalSearchTerm', JSON.stringify(filters.searchTerm))
    console.log('🔍 Global search term updated:', filters.searchTerm)
  }, [filters.searchTerm])

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    localStorage.removeItem('globalSearchTerm')
  }, [])

  return (
    <SearchContext.Provider value={{ filters, updateFilter, resetFilters, currentPage }}>
      {children}
    </SearchContext.Provider>
  )
}
