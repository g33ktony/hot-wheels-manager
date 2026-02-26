import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
    id: string
    email: string
    name: string
    role: string
    phone?: string
    storeId?: string
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    token: string | null
    isLoading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    token: null,
    isLoading: false,
    error: null,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload
            state.isAuthenticated = true
            state.error = null
        },
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload
        },
        logout: (state) => {
            state.user = null
            state.isAuthenticated = false
            state.token = null
            state.error = null
        },
        setAuthLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setAuthError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
    },
})

export const { setUser, setToken, logout, setAuthLoading, setAuthError } = authSlice.actions
export default authSlice.reducer
