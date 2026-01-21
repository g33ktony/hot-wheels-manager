import { useState, useCallback } from 'react'
import api from '@/services/api'

export interface HotWheelsItem {
  _id?: string
  toy_num: string
  col_num: string
  model: string
  series: string
  series_num: string
  photo_url: string
  year: number
}

export const useSearchHotWheels = () => {
  const [results, setResults] = useState<HotWheelsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async (page = 1, limit = 100) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.get<any>('/hotwheels/search', {
        params: {
          page,
          limit
        }
      })

      setResults(response.data.data?.cars || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar Hot Wheels')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const searchByName = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Si no hay query, cargar todos
      await loadAll()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.get<any>('/hotwheels/search', {
        params: {
          search: query,
          limit: 100
        }
      })

      setResults(response.data.data?.cars || [])
    } catch (err: any) {
      setError(err.message || 'Error al buscar en Hot Wheels')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [loadAll])

  return {
    results,
    isLoading,
    error,
    searchByName,
    loadAll
  }
}
