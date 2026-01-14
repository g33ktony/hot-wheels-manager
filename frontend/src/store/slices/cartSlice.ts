import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { InventoryItem as ReduxInventoryItem } from '../slices/inventorySlice'

export interface CartItem extends ReduxInventoryItem {
    customPrice: number
    cartQuantity: number
}

interface CartState {
    items: CartItem[]
}

const initialState: CartState = {
    items: []
}

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<{ item: ReduxInventoryItem; quantity: number; customPrice?: number }>) => {
            const { item, quantity, customPrice } = action.payload
            const existingItem = state.items.find(c => c._id === item._id)

            if (existingItem) {
                // Update quantity if item already exists
                existingItem.cartQuantity += quantity
            } else {
                // Add new item to cart
                const cartItem: CartItem = {
                    ...item,
                    customPrice: customPrice || item.actualPrice || item.suggestedPrice || 0,
                    cartQuantity: quantity
                }
                state.items.push(cartItem)
            }
        },

        removeFromCart: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item._id !== action.payload)
        },

        updateCartQuantity: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
            const item = state.items.find(c => c._id === action.payload.itemId)
            if (item) {
                item.cartQuantity = action.payload.quantity
            }
        },

        updateCartPrice: (state, action: PayloadAction<{ itemId: string; price: number }>) => {
            const item = state.items.find(c => c._id === action.payload.itemId)
            if (item) {
                item.customPrice = action.payload.price
            }
        },

        clearCart: (state) => {
            state.items = []
        },

        // Bulk add items to cart (for inventory selection)
        addMultipleToCart: (state, action: PayloadAction<ReduxInventoryItem[]>) => {
            action.payload.forEach(item => {
                const existingItem = state.items.find(c => c._id === item._id)
                
                if (existingItem) {
                    // Increment quantity if already in cart
                    existingItem.cartQuantity += 1
                } else {
                    // Add new item with quantity 1
                    const cartItem: CartItem = {
                        ...item,
                        customPrice: item.actualPrice || item.suggestedPrice || 0,
                        cartQuantity: 1
                    }
                    state.items.push(cartItem)
                }
            })
        }
    }
})

export const {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartPrice,
    clearCart,
    addMultipleToCart
} = cartSlice.actions

export default cartSlice.reducer
