import { configureStore } from '@reduxjs/toolkit'
import uiReducer from './slices/uiSlice'
import filtersReducer from './slices/filtersSlice'
import authReducer from './slices/authSlice'
import inventoryReducer from './slices/inventorySlice'
import cartReducer from './slices/cartSlice'

export const store = configureStore({
    reducer: {
        ui: uiReducer,
        filters: filtersReducer,
        auth: authReducer,
        inventory: inventoryReducer,
        cart: cartReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
