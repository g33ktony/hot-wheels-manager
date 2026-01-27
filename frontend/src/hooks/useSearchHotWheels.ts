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

// Helper function to proxy image URLs
const getProxiedImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return ''
  // If it's a Wikia URL, use the backend proxy
  if (imageUrl.includes('static.wikia.nocookie.net')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    return `${apiUrl}/hotwheels/image?url=${encodeURIComponent(imageUrl)}`
  }
  // Otherwise return as-is (for absolute URLs)
  return imageUrl
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

      const cars = response.data.data?.cars || []
      // Transform photo URLs to use proxy
      const transformedCars = cars.map((car: HotWheelsItem) => ({
        ...car,
        photo_url: getProxiedImageUrl(car.photo_url)
      }))
      setResults(transformedCars)
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

      const cars = response.data.data?.cars || []
      // Transform photo URLs to use proxy
      const transformedCars = cars.map((car: HotWheelsItem) => ({
        ...car,
        photo_url: getProxiedImageUrl(car.photo_url)
      }))
      setResults(transformedCars)
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
