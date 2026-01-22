import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InventoryItem } from '@shared/types';

export interface ItemsCacheState {
  itemsById: Record<string, InventoryItem>;
}

const initialState: ItemsCacheState = {
  itemsById: {}
};

const itemsCacheSlice = createSlice({
  name: 'itemsCache',
  initialState,
  reducers: {
    // Add or update single item in cache
    cacheItem(state, action: PayloadAction<InventoryItem>) {
      if (action.payload._id) {
        state.itemsById[action.payload._id] = action.payload;
      }
    },

    // Add or update multiple items in cache
    cacheItems(state, action: PayloadAction<InventoryItem[]>) {
      action.payload.forEach(item => {
        if (item._id) {
          state.itemsById[item._id] = item;
        }
      });
    },

    // Update a single item
    updateCachedItem(state, action: PayloadAction<InventoryItem>) {
      if (action.payload._id) {
        state.itemsById[action.payload._id] = {
          ...state.itemsById[action.payload._id],
          ...action.payload
        };
      }
    },

    // Remove item from cache
    removeCachedItem(state, action: PayloadAction<string>) {
      delete state.itemsById[action.payload];
    },

    // Clear entire cache
    clearItemsCache(state) {
      state.itemsById = {};
    }
  }
});

export const {
  cacheItem,
  cacheItems,
  updateCachedItem,
  removeCachedItem,
  clearItemsCache
} = itemsCacheSlice.actions;

export default itemsCacheSlice.reducer;
