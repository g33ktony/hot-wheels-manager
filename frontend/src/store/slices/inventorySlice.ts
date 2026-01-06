import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InventoryItem {
  _id?: string;
  carId: string | { _id: string; name: string; year?: number; color?: string; series?: string };
  quantity?: number;
  purchasePrice?: number;
  suggestedPrice?: number;
  actualPrice?: number;
  condition?: string;
  notes?: string;
  photos?: string[];
  location?: string;
  brand?: string;
  pieceType?: string;
  isTreasureHunt?: boolean;
  isSuperTreasureHunt?: boolean;
  isChase?: boolean;
  isFantasy?: boolean;
  dateAdded?: string | Date;
  lastUpdated?: string | Date;
  year?: number;
  color?: string;
  series?: string;
  reservedQuantity?: number;
}

export interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  lastRefreshed: number | null;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

const initialState: InventoryState = {
  items: [],
  isLoading: false,
  error: null,
  lastRefreshed: null,
  totalItems: 0,
  currentPage: 1,
  totalPages: 0,
  itemsPerPage: 15
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },

    // Set items and pagination info
    setInventoryItems(
      state,
      action: PayloadAction<{
        items: InventoryItem[];
        totalItems: number;
        currentPage: number;
        totalPages: number;
        itemsPerPage: number;
      }>
    ) {
      state.items = action.payload.items;
      state.totalItems = action.payload.totalItems;
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
      state.itemsPerPage = action.payload.itemsPerPage;
      state.lastRefreshed = Date.now();
      state.error = null;
      state.isLoading = false;
    },

    // Set error
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Add item to inventory
    addItem(state, action: PayloadAction<InventoryItem>) {
      state.items.unshift(action.payload);
      state.totalItems += 1;
      state.lastRefreshed = Date.now();
    },

    // Update item in inventory
    updateItem(state, action: PayloadAction<InventoryItem>) {
      const index = state.items.findIndex((item) => item._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
        state.lastRefreshed = Date.now();
      }
    },

    // Delete item from inventory
    deleteItem(state, action: PayloadAction<string>) {
      const index = state.items.findIndex((item) => item._id === action.payload);
      if (index !== -1) {
        state.items.splice(index, 1);
        state.totalItems -= 1;
        state.lastRefreshed = Date.now();
      }
    },

    // Update pagination
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },
    // Clear all inventory
    clearInventory(state) {
      state.items = [];
      state.totalItems = 0;
      state.currentPage = 1;
      state.totalPages = 0;
      state.lastRefreshed = null;
      state.error = null;
    }
  }
});

export const {
  setLoading,
  setInventoryItems,
  setError,
  addItem,
  updateItem,
  deleteItem,
  setCurrentPage,
  clearInventory
} = inventorySlice.actions;

export default inventorySlice.reducer;
