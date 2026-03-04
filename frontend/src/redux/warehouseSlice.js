import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { warehouseAPI, transferAPI } from '../utils/api.js';

// ==========================================
// WAREHOUSE ASYNC THUNKS
// ==========================================

export const listWarehouses = createAsyncThunk(
  'warehouse/listWarehouses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.listWarehouses(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch warehouses');
    }
  }
);

export const getActiveWarehouses = createAsyncThunk(
  'warehouse/getActiveWarehouses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.getActiveWarehouses();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch active warehouses');
    }
  }
);

export const getWarehouseStats = createAsyncThunk(
  'warehouse/getWarehouseStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.getWarehouseStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch warehouse stats');
    }
  }
);

export const getWarehouse = createAsyncThunk(
  'warehouse/getWarehouse',
  async (warehouseId, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.getWarehouse(warehouseId);
      return response.data.warehouse;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch warehouse');
    }
  }
);

export const getWarehouseWithInventory = createAsyncThunk(
  'warehouse/getWarehouseWithInventory',
  async (warehouseId, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.getWarehouseWithInventory(warehouseId);
      return response.data.warehouse;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch warehouse details');
    }
  }
);

export const createWarehouse = createAsyncThunk(
  'warehouse/createWarehouse',
  async (data, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.createWarehouse(data);
      return response.data.warehouse;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create warehouse');
    }
  }
);

export const updateWarehouse = createAsyncThunk(
  'warehouse/updateWarehouse',
  async ({ warehouseId, data }, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.updateWarehouse(warehouseId, data);
      return response.data.warehouse;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update warehouse');
    }
  }
);

export const setDefaultWarehouse = createAsyncThunk(
  'warehouse/setDefaultWarehouse',
  async (warehouseId, { rejectWithValue }) => {
    try {
      const response = await warehouseAPI.setDefaultWarehouse(warehouseId);
      return response.data.warehouse;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to set default warehouse');
    }
  }
);

export const deleteWarehouse = createAsyncThunk(
  'warehouse/deleteWarehouse',
  async (warehouseId, { rejectWithValue }) => {
    try {
      await warehouseAPI.deleteWarehouse(warehouseId);
      return warehouseId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete warehouse');
    }
  }
);

// ==========================================
// TRANSFER ASYNC THUNKS
// ==========================================

export const listTransfers = createAsyncThunk(
  'warehouse/listTransfers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await transferAPI.listTransfers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch transfers');
    }
  }
);

export const getTransferStats = createAsyncThunk(
  'warehouse/getTransferStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await transferAPI.getTransferStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch transfer stats');
    }
  }
);

export const createTransfer = createAsyncThunk(
  'warehouse/createTransfer',
  async (data, { rejectWithValue }) => {
    try {
      const response = await transferAPI.createTransfer(data);
      return response.data.transfer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create transfer');
    }
  }
);

export const approveTransfer = createAsyncThunk(
  'warehouse/approveTransfer',
  async (transferId, { rejectWithValue }) => {
    try {
      const response = await transferAPI.approveTransfer(transferId);
      return response.data.transfer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to approve transfer');
    }
  }
);

export const completeTransfer = createAsyncThunk(
  'warehouse/completeTransfer',
  async (transferId, { rejectWithValue }) => {
    try {
      const response = await transferAPI.completeTransfer(transferId);
      return response.data.transfer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to complete transfer');
    }
  }
);

export const cancelTransfer = createAsyncThunk(
  'warehouse/cancelTransfer',
  async ({ transferId, reason }, { rejectWithValue }) => {
    try {
      const response = await transferAPI.cancelTransfer(transferId, reason);
      return response.data.transfer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to cancel transfer');
    }
  }
);

// ==========================================
// WAREHOUSE SLICE
// ==========================================

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState: {
    warehouses: [],
    activeWarehouses: [],
    warehouseStats: null,
    selectedWarehouse: null,
    transfers: [],
    transferStats: null,
    total: 0,
    transferTotal: 0,
    loading: false,
    statsLoading: false,
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
    clearSelectedWarehouse: (state) => {
      state.selectedWarehouse = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List warehouses
      .addCase(listWarehouses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listWarehouses.fulfilled, (state, action) => {
        state.loading = false;
        state.warehouses = action.payload.warehouses;
        state.total = action.payload.total;
      })
      .addCase(listWarehouses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get active warehouses
      .addCase(getActiveWarehouses.fulfilled, (state, action) => {
        state.activeWarehouses = action.payload.warehouses;
      })
      // Get warehouse stats
      .addCase(getWarehouseStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(getWarehouseStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.warehouseStats = action.payload;
      })
      .addCase(getWarehouseStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload;
      })
      // Get single warehouse
      .addCase(getWarehouse.pending, (state) => {
        state.loading = true;
      })
      .addCase(getWarehouse.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedWarehouse = action.payload;
      })
      .addCase(getWarehouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get warehouse with inventory
      .addCase(getWarehouseWithInventory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getWarehouseWithInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedWarehouse = action.payload;
      })
      .addCase(getWarehouseWithInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create warehouse
      .addCase(createWarehouse.pending, (state) => {
        state.loading = true;
      })
      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Warehouse created successfully';
        state.warehouses.unshift(action.payload);
        state.activeWarehouses.push(action.payload);
        state.total += 1;
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update warehouse
      .addCase(updateWarehouse.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateWarehouse.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Warehouse updated successfully';
        const index = state.warehouses.findIndex((w) => w._id === action.payload._id);
        if (index !== -1) state.warehouses[index] = action.payload;
        const activeIndex = state.activeWarehouses.findIndex((w) => w._id === action.payload._id);
        if (activeIndex !== -1) state.activeWarehouses[activeIndex] = action.payload;
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Set default warehouse
      .addCase(setDefaultWarehouse.fulfilled, (state, action) => {
        state.message = 'Default warehouse set';
        state.warehouses.forEach((w) => {
          w.isDefault = w._id === action.payload._id;
        });
      })
      .addCase(setDefaultWarehouse.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete warehouse
      .addCase(deleteWarehouse.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteWarehouse.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Warehouse deleted successfully';
        state.warehouses = state.warehouses.filter((w) => w._id !== action.payload);
        state.activeWarehouses = state.activeWarehouses.filter((w) => w._id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteWarehouse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // List transfers
      .addCase(listTransfers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listTransfers.fulfilled, (state, action) => {
        state.loading = false;
        state.transfers = action.payload.transfers;
        state.transferTotal = action.payload.total;
      })
      .addCase(listTransfers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get transfer stats
      .addCase(getTransferStats.fulfilled, (state, action) => {
        state.transferStats = action.payload;
      })
      // Create transfer
      .addCase(createTransfer.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTransfer.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Transfer request created successfully';
        state.transfers.unshift(action.payload);
        state.transferTotal += 1;
      })
      .addCase(createTransfer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Approve transfer
      .addCase(approveTransfer.fulfilled, (state, action) => {
        state.message = 'Transfer approved';
        const index = state.transfers.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.transfers[index] = action.payload;
      })
      .addCase(approveTransfer.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Complete transfer
      .addCase(completeTransfer.fulfilled, (state, action) => {
        state.message = 'Transfer completed';
        const index = state.transfers.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.transfers[index] = action.payload;
      })
      .addCase(completeTransfer.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Cancel transfer
      .addCase(cancelTransfer.fulfilled, (state, action) => {
        state.message = 'Transfer cancelled';
        const index = state.transfers.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.transfers[index] = action.payload;
      })
      .addCase(cancelTransfer.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError, clearMessage, clearSelectedWarehouse } = warehouseSlice.actions;
export default warehouseSlice.reducer;
