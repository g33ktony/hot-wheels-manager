import React, { useMemo } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import type { InventoryItem } from '@shared/types'

interface InventoryListProps {
  items: InventoryItem[]
  searchTerm: string
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
  onImageClick: (images: string[], index: number) => void
  isSelectionMode?: boolean
  selectedItems?: Set<string>
  onSelectItem?: (id: string, selected: boolean) => void
}

export const InventoryList: React.FC<InventoryListProps> = ({
  items,
  searchTerm,
  onEdit,
  onDelete,
  onImageClick,
  isSelectionMode = false,
  selectedItems = new Set(),
  onSelectItem = () => {}
}) => {
  // Fuzzy search filter (75% similarity threshold)
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items
    }
    
    const query = searchTerm.toLowerCase()
    const SIMILARITY_THRESHOLD = 75
    
    const levenshteinDistance = (str1: string, str2: string): number => {
      const track = new Array(str2.length + 1)
        .fill(null)
        .map(() => new Array(str1.length + 1).fill(0))

      for (let i = 0; i <= str1.length; i += 1) track[0][i] = i
      for (let j = 0; j <= str2.length; j += 1) track[j][0] = j

      for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
          track[j][i] = Math.min(
            track[j][i - 1] + 1,
            track[j - 1][i] + 1,
            track[j - 1][i - 1] + indicator
          )
        }
      }
      return track[str2.length][str1.length]
    }

    const calculateSimilarity = (str1: string, str2: string): number => {
      const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
      const maxLength = Math.max(str1.length, str2.length)
      if (maxLength === 0) return 100
      return ((maxLength - distance) / maxLength) * 100
    }

    return items.filter((item: any) => {
      const carData = typeof item.carId === 'object' ? (item.carId as any) : null
      const carName = carData?.name || ''
      const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || ''

      // Exact match first
      if (
        carName.toLowerCase().includes(query) ||
        carIdStr.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.pieceType?.toLowerCase().includes(query)
      ) {
        return true
      }

      // Fuzzy match
      const carNameSimilarity = calculateSimilarity(query, carName)
      const brandSimilarity = calculateSimilarity(query, item.brand || '')
      const pieceTypeSimilarity = calculateSimilarity(query, item.pieceType || '')

      return (
        carNameSimilarity >= SIMILARITY_THRESHOLD ||
        brandSimilarity >= SIMILARITY_THRESHOLD ||
        pieceTypeSimilarity >= SIMILARITY_THRESHOLD
      )
    })
  }, [items, searchTerm])

  if (filteredItems.length === 0 && searchTerm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se encontraron artículos para "{searchTerm}"</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems.map((item) => {
        if (!item._id) return null

        const carData = typeof item.carId === 'object' ? (item.carId as any) : null
        const carName = carData?.name || ''
        const quantity = item.quantity || 0
        const reserved = item.reservedQuantity || 0
        const available = quantity - reserved
        const isSelected = selectedItems.has(item._id)

        return (
          <div
            key={item._id}
            className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden ${
              isSelectionMode && isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Checkbox for selection mode */}
            {isSelectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelectItem(item._id!, e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
            )}

            {/* Image */}
            {item.photos && item.photos.length > 0 ? (
              <div className="relative h-48 bg-gray-200 cursor-pointer group overflow-hidden">
                <img
                  src={item.photos[0]}
                  alt={carName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/300x200?text=No+Image'
                  }}
                  onClick={() => onImageClick(item.photos!, 0)}
                />
                {item.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                    +{item.photos.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Sin imagen</span>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">
                {carName || item._id}
              </h3>
              
              {item.brand && (
                <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
              )}

              {/* Prices */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-gray-600">Compra: ${item.purchasePrice?.toFixed(2)}</p>
                  <p className="text-gray-600">Venta: ${item.suggestedPrice?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Stock: {quantity}</p>
                  <p className={available > 0 ? 'text-green-600' : 'text-red-600'}>
                    Disponible: {available}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.notes}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
                >
                  <Edit size={16} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => onDelete(item._id!)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm"
                >
                  <Trash2 size={16} />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
