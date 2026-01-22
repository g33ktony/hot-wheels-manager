import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SelectionState {
  selectedItemIds: string[];
  isSelectionMode: boolean;
}

const initialState: SelectionState = {
  selectedItemIds: [],
  isSelectionMode: false
};

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    // Toggle selection mode
    setSelectionMode(state, action: PayloadAction<boolean>) {
      state.isSelectionMode = action.payload;
      if (!action.payload) {
        // Clear selection when exiting selection mode
        state.selectedItemIds = [];
      }
    },

    // Toggle a single item selection
    toggleItemSelection(state, action: PayloadAction<string>) {
      const itemId = action.payload;
      const index = state.selectedItemIds.indexOf(itemId);
      
      if (index > -1) {
        state.selectedItemIds.splice(index, 1);
      } else {
        state.selectedItemIds.push(itemId);
      }
    },

    // Select multiple items
    selectItems(state, action: PayloadAction<string[]>) {
      state.selectedItemIds = [...new Set([...state.selectedItemIds, ...action.payload])];
    },

    // Deselect multiple items
    deselectItems(state, action: PayloadAction<string[]>) {
      state.selectedItemIds = state.selectedItemIds.filter(id => !action.payload.includes(id));
    },

    // Select all items from a list
    selectAllItems(state, action: PayloadAction<string[]>) {
      state.selectedItemIds = [...new Set(action.payload)];
    },

    // Clear all selections
    clearSelection(state) {
      state.selectedItemIds = [];
    }
  }
});

export const {
  setSelectionMode,
  toggleItemSelection,
  selectItems,
  deselectItems,
  selectAllItems,
  clearSelection
} = selectionSlice.actions;

export default selectionSlice.reducer;
