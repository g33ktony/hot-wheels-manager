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

  const searchByName = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.get<any>('/hotwheels', {
        params: {
          search: query,
          limit: 50
        }
      })

      setResults(response.data.data?.cars || [])
    } catch (err: any) {
      setError(err.message || 'Error al buscar en Hot Wheels')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    results,
    isLoading,
    error,
    searchByName
  }
}
