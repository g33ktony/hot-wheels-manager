export const INVENTORY_EDITABLE_FIELDS = [
    'carId',
    'quantity',
    'purchasePrice',
    'suggestedPrice',
    'actualPrice',
    'condition',
    'notes',
    'photos',
    'location',
    'brand',
    'pieceType',
    'isTreasureHunt',
    'isSuperTreasureHunt',
    'isChase',
    'isFantasy',
    'isMoto',
    'isCamioneta',
    'isFastFurious',
    'seriesId',
    'seriesName',
    'seriesSize',
    'seriesPosition',
    'seriesPrice',
]

const areValuesEqual = (a: any, b: any): boolean => {
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false
        if (a.length !== b.length) return false
        return a.every((value, index) => value === b[index])
    }
    return a === b
}

export const buildInventoryEditPatch = (original: any, updated: any): Record<string, any> => {
    if (!original || !updated) return {}

    const patch: Record<string, any> = {}

    INVENTORY_EDITABLE_FIELDS.forEach((field) => {
        const originalValue = original[field]
        const updatedValue = updated[field]
        if (!areValuesEqual(originalValue, updatedValue)) {
            patch[field] = updatedValue
        }
    })

    return patch
}