/**
 * Hook de React para consumir SSE del endpoint de enriquecimiento
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { CatalogEnrichmentProgress } from '../../../shared/catalog-types'

interface UseCatalogEnrichmentReturn {
  progress: CatalogEnrichmentProgress | null
  isLoading: boolean
  error: string | null
  startEnrichment: () => Promise<void>
  cancelEnrichment: () => void
  isComplete: boolean
}

export function useCatalogEnrichment(): UseCatalogEnrichmentReturn {
  const [progress, setProgress] = useState<CatalogEnrichmentProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const cancelEnrichment = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsLoading(false)
  }, [])

  const startEnrichment = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setProgress(null)

    try {
      const response = await fetch('/api/catalog/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      // Consumir SSE
      const eventSource = new EventSource('/api/catalog/enrich')
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data) as CatalogEnrichmentProgress

        setProgress(data)

        if (data.step === 'complete' || data.step === 'error') {
          eventSource.close()
          eventSourceRef.current = null
          setIsLoading(false)

          if (data.step === 'error') {
            setError(data.error?.message || 'Error desconocido')
          }
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        eventSourceRef.current = null
        setIsLoading(false)
        setError('Conexión perdida')
      }
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return {
    progress,
    isLoading,
    error,
    startEnrichment,
    cancelEnrichment,
    isComplete: progress?.step === 'complete',
  }
}
