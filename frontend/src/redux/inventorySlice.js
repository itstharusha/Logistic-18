import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryAPI, warehouseAPI } from '../utils/api.js';

// Async thunks
export const listInventory = createAsyncThunk(
  'inventory/listInventory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.listInventory(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch inventory');
    }
  }
);

export const getDashboard = createAsyncThunk(
  'inventory/getDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getDashboard();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard');
    }
  }
);

export const getReorderList = createAsyncThunk(
  'inventory/getReorderList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getReorderList();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch reorder list');
    }
  }
);

export const getWarehouses = createAsyncThunk(
  'inventory/getWarehouses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.getActiveWarehouses();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch warehouses');
    }
  }
);

export const getInventoryItem = createAsyncThunk(
  'inventory/getInventoryItem',
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getInventoryItem(itemId);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch item');
    }
  }
);

export const createInventoryItem = createAsyncThunk(
  'inventory/createInventoryItem',
  async (data, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.createInventoryItem(data);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create item');
    }
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateInventoryItem',
  async ({ itemId, data }, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.updateInventoryItem(itemId, data);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update item');
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async ({ itemId, currentStock }, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.updateStock(itemId, { currentStock });
      return response.data.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update stock');
    }
  }
);

export const updatePendingOrder = createAsyncThunk(
  'inventory/updatePendingOrder',
  async ({ itemId, pendingOrderQty, incomingStockDays }, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.updatePendingOrder(itemId, { pendingOrderQty, incomingStockDays });
      return response.data.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update pending order');
    }
  }
);

export const getForecast = createAsyncThunk(
  'inventory/getForecast',
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getForecast(itemId);
      return response.data.forecast;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch forecast');
    }
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteInventoryItem',
  async (itemId, { rejectWithValue }) => {
    try {
      await inventoryAPI.deleteInventoryItem(itemId);
      return itemId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete item');
    }
  }
);

// Inventory slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    items: [],
    total: 0,
    dashboard: null,
    reorderList: [],
    warehouses: [],
    selectedItem: null,
    forecast: null,
    loading: false,
    dashboardLoading: false,
    error: null,
    message: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    setSelectedItem: (state, action) => {
      state.selectedItem = action.payload;
    },
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
    clearForecast: (state) => {
      state.forecast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List inventory
      .addCase(listInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(listInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get dashboard
      .addCase(getDashboard.pending, (state) => {
        state.dashboardLoading = true;
      })
      .addCase(getDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(getDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.error = action.payload;
      })
      // Get reorder list
      .addCase(getReorderList.pending, (state) => {
        state.loading = true;
      })
      .addCase(getReorderList.fulfilled, (state, action) => {
        state.loading = false;
        state.reorderList = action.payload.items;
      })
      .addCase(getReorderList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get warehouses
      .addCase(getWarehouses.fulfilled, (state, action) => {
        state.warehouses = action.payload.warehouses;
      })
      // Get single item
      .addCase(getInventoryItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(getInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create item
      .addCase(createInventoryItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Inventory item created successfully';
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update item
      .addCase(updateInventoryItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Inventory item updated successfully';
        const index = state.items.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.selectedItem?._id === action.payload._id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update stock
      .addCase(updateStock.fulfilled, (state, action) => {
        state.message = 'Stock level updated';
        const index = state.items.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update pending order
      .addCase(updatePendingOrder.fulfilled, (state, action) => {
        state.message = 'Pending order updated';
        const index = state.items.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updatePendingOrder.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Get forecast
      .addCase(getForecast.pending, (state) => {
        state.loading = true;
      })
      .addCase(getForecast.fulfilled, (state, action) => {
        state.loading = false;
        state.forecast = action.payload;
      })
      .addCase(getForecast.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete item
      .addCase(deleteInventoryItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Inventory item deleted';
        state.items = state.items.filter((i) => i._id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearMessage, setSelectedItem, clearSelectedItem, clearForecast } = inventorySlice.actions;
export default inventorySlice.reducer;
