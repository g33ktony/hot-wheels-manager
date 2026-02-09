import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface DeliveryCartItem {
    inventoryItemId: string
    carId: string
    carName: string
    quantity: number
    unitPrice: number
    photos?: string[]
    primaryPhotoIndex?: number
    maxAvailable: number // Para validación de stock
    brand?: string
    color?: string
}

interface DeliveryCartState {
    items: DeliveryCartItem[]
}

const initialState: DeliveryCartState = {
    items: []
}

const deliveryCartSlice = createSlice({
    name: 'deliveryCart',
    initialState,
    reducers: {
        addToDeliveryCart: (state, action: PayloadAction<DeliveryCartItem>) => {
            const newItem = action.payload
            const existingItem = state.items.find(item => item.inventoryItemId === newItem.inventoryItemId)

            if (existingItem) {
                // Si ya existe, sumar cantidades (no exceder maxAvailable)
                const newTotal = existingItem.quantity + newItem.quantity
                existingItem.quantity = Math.min(newTotal, existingItem.maxAvailable)
            } else {
                // Agregar nuevo item
                state.items.push({
                    ...newItem,
                    quantity: Math.min(newItem.quantity, newItem.maxAvailable)
                })
            }
        },

        removeFromDeliveryCart: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.inventoryItemId !== action.payload)
        },

        updateDeliveryCartQuantity: (state, action: PayloadAction<{ inventoryItemId: string; quantity: number }>) => {
            const item = state.items.find(i => i.inventoryItemId === action.payload.inventoryItemId)
            if (item) {
                // Validar que no exceda el stock disponible
                item.quantity = Math.max(1, Math.min(action.payload.quantity, item.maxAvailable))
            }
        },

        updateDeliveryCartPrice: (state, action: PayloadAction<{ inventoryItemId: string; price: number }>) => {
            const item = state.items.find(i => i.inventoryItemId === action.payload.inventoryItemId)
            if (item) {
                item.unitPrice = Math.max(0, action.payload.price)
            }
        },

        clearDeliveryCart: (state) => {
            state.items = []
        },

        // Bulk add items (para selección múltiple desde inventario)
        addMultipleToDeliveryCart: (state, action: PayloadAction<DeliveryCartItem[]>) => {
            action.payload.forEach(newItem => {
                const existingItem = state.items.find(item => item.inventoryItemId === newItem.inventoryItemId)

                if (existingItem) {
                    // Sumar cantidades sin exceder el máximo
                    const newTotal = existingItem.quantity + newItem.quantity
                    existingItem.quantity = Math.min(newTotal, existingItem.maxAvailable)
                } else {
                    // Agregar nuevo item
                    state.items.push({
                        ...newItem,
                       quantity: Math.min(newItem.quantity, newItem.maxAvailable)
                    })
                }
            })
        }
    }
})

export const {
    addToDeliveryCart,
    removeFromDeliveryCart,
    updateDeliveryCartQuantity,
    updateDeliveryCartPrice,
    clearDeliveryCart,
    addMultipleToDeliveryCart
} = deliveryCartSlice.actions

export default deliveryCartSlice.reducer
