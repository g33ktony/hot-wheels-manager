import React, { useEffect, useRef } from 'react'

interface InfiniteScrollProps {
  onLoadMore: () => void
  isLoading: boolean
  hasMore: boolean
  threshold?: number
  children: React.ReactNode
}

/**
 * Infinite scroll component using Intersection Observer
 * Loads more items when user scrolls near the bottom
 */
export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 0.1,
  children
}) => {
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      { threshold }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [onLoadMore, isLoading, hasMore, threshold])

  return (
    <div>
      {children}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}
      
      {/* End of list */}
      {!hasMore && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay más items para cargar</p>
        </div>
      )}
      
      {/* Intersection observer target - triggers load when visible */}
      {hasMore && <div ref={observerTarget} className="h-10" />}
    </div>
  )
}
