import { FixedSizeGrid as Grid } from 'react-window'
import Card from '@/components/common/Card'
import { InventoryItem } from '../../../shared/types'

interface InventoryGridProps {
    items: InventoryItem[]
    columnCount: number
    itemHeight: number
    gap: number
    onSelectItem: (item: InventoryItem) => void
    renderItem: (item: InventoryItem) => React.ReactNode
}

export default function VirtualizedInventoryGrid({
    items,
    columnCount,
    itemHeight,
    gap,
    renderItem,
}: InventoryGridProps) {
    // Calculate grid dimensions
    const rowCount = Math.ceil(items.length / columnCount)
    const gridHeight = Math.min(rowCount * (itemHeight + gap), 800) // Max height 800px
    const gridWidth = typeof window !== 'undefined' ? window.innerWidth - 40 : 1000

    // Cell renderer for react-window
    const Cell = ({ columnIndex, rowIndex, style }: any) => {
        const itemIndex = rowIndex * columnCount + columnIndex
        if (itemIndex >= items.length) return null

        const item = items[itemIndex]

        return (
            <div
                style={{
                    ...style,
                    padding: `${gap / 2}px`,
                    boxSizing: 'border-box',
                }}
            >
                <div className="h-full">
                    {renderItem(item)}
                </div>
            </div>
        )
    }

    return (
        <Grid
            columnCount={columnCount}
            columnWidth={gridWidth / columnCount}
            height={gridHeight}
            rowCount={rowCount}
            rowHeight={itemHeight + gap}
            width={gridWidth}
        >
            {Cell}
        </Grid>
    )
}
