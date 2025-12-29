import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface FiltersState {
    searchTerm: string
    condition: string
    brand: string
    pieceType: string
    treasureHunt: 'all' | 'th' | 'sth'
    chase: boolean
    currentPage: number
    itemsPerPage: number
}

const initialState: FiltersState = {
    searchTerm: '',
    condition: '',
    brand: '',
    pieceType: '',
    treasureHunt: 'all',
    chase: false,
    currentPage: 1,
    itemsPerPage: 15,
}

const filtersSlice = createSlice({
    name: 'filters',
    initialState,
    reducers: {
        setSearchTerm: (state, action: PayloadAction<string>) => {
            state.searchTerm = action.payload
            state.currentPage = 1 // Reset to page 1 on search
        },
        setCondition: (state, action: PayloadAction<string>) => {
            state.condition = action.payload
            state.currentPage = 1
        },
        setBrand: (state, action: PayloadAction<string>) => {
            state.brand = action.payload
            state.pieceType = '' // Reset piece type when brand changes
            state.treasureHunt = 'all'
            state.chase = false
            state.currentPage = 1
        },
        setPieceType: (state, action: PayloadAction<string>) => {
            state.pieceType = action.payload
            state.treasureHunt = 'all'
            state.chase = false
            state.currentPage = 1
        },
        setTreasureHunt: (state, action: PayloadAction<'all' | 'th' | 'sth'>) => {
            state.treasureHunt = action.payload
            state.currentPage = 1
        },
        setChase: (state, action: PayloadAction<boolean>) => {
            state.chase = action.payload
            state.currentPage = 1
        },
        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload
        },
        clearFilters: (state) => {
            state.searchTerm = ''
            state.condition = ''
            state.brand = ''
            state.pieceType = ''
            state.treasureHunt = 'all'
            state.chase = false
            state.currentPage = 1
        },
    },
})

export const {
    setSearchTerm,
    setCondition,
    setBrand,
    setPieceType,
    setTreasureHunt,
    setChase,
    setCurrentPage,
    clearFilters,
} = filtersSlice.actions
export default filtersSlice.reducer
