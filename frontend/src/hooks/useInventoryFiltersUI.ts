import { useCallback, useEffect, useState } from 'react'
import debounce from 'lodash.debounce'

type FilterKey =
  | 'searchTerm'
  | 'filterCondition'
  | 'filterBrand'
  | 'filterPieceType'
  | 'filterTreasureHunt'
  | 'filterChase'
  | 'filterFantasy'
  | 'filterMoto'
  | 'filterCamioneta'
  | 'filterFastFurious'

interface UseInventoryFiltersUIParams {
  searchTerm: string
  updateFilter: (key: FilterKey, value: any) => void
}

export const useInventoryFiltersUI = ({
  searchTerm,
  updateFilter,
}: UseInventoryFiltersUIParams) => {
  const [filterFantasyOnly, setFilterFantasyOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(30)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const handleFantasyOnlyChange = (checked: boolean) => {
    setFilterFantasyOnly(checked)
    if (checked) {
      updateFilter('filterFantasy', false)
    }
  }

  const handleHideFantasyChange = (checked: boolean) => {
    updateFilter('filterFantasy', checked)
    if (checked) {
      setFilterFantasyOnly(false)
    }
  }

  const handleFilterChange = (filterType: string, value: any) => {
    setCurrentPage(1)

    switch (filterType) {
      case 'search':
        updateFilter('searchTerm', value)
        break
      case 'condition':
        updateFilter('filterCondition', value)
        break
      case 'brand':
        updateFilter('filterBrand', value)
        break
      case 'pieceType':
        updateFilter('filterPieceType', value)
        break
      case 'treasureHunt':
        updateFilter('filterTreasureHunt', value)
        break
      case 'chase':
        updateFilter('filterChase', value)
        break
      case 'fantasy':
        updateFilter('filterFantasy', value)
        break
      case 'moto':
        updateFilter('filterMoto', value)
        break
      case 'camioneta':
        updateFilter('filterCamioneta', value)
        break
      case 'fastFurious':
        updateFilter('filterFastFurious', value)
        break
    }
  }

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value)
      setCurrentPage(1)
    }, 200),
    []
  )

  useEffect(() => {
    debouncedSearch(searchTerm)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchTerm, debouncedSearch])

  return {
    filterFantasyOnly,
    setFilterFantasyOnly,
    handleFantasyOnlyChange,
    handleHideFantasyChange,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    debouncedSearchTerm,
    filterPriceMin,
    setFilterPriceMin,
    filterPriceMax,
    setFilterPriceMax,
    showAdvancedFilters,
    setShowAdvancedFilters,
    handleFilterChange,
  }
}
