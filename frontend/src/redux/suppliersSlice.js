import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supplierAPI } from '../utils/api.js';

export const listSuppliers = createAsyncThunk(
  'suppliers/listSuppliers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.listSuppliers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch suppliers');
    }
  }
);

export const getSupplier = createAsyncThunk(
  'suppliers/getSupplier',
  async (id, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.getSupplier(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch supplier');
    }
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/createSupplier',
  async (data, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.createSupplier(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create supplier');
    }
  }
);

export const updateSupplier = createAsyncThunk(
  'suppliers/updateSupplier',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.updateSupplier(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update supplier');
    }
  }
);

export const compareSuppliers = createAsyncThunk(
  'suppliers/compareSuppliers',
  async (ids, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.compareSuppliers(ids);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to compare suppliers');
    }
  }
);

export const getRiskHistory = createAsyncThunk(
  'suppliers/getRiskHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.getRiskHistory(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch risk history');
    }
  }
);

export const overrideScore = createAsyncThunk(
  'suppliers/overrideScore',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.overrideScore(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to override score');
    }
  }
);

export const updateSupplierStatus = createAsyncThunk(
  'suppliers/updateSupplierStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await supplierAPI.updateStatus(id, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update status');
    }
  }
);

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState: {
    suppliers: [],
    total: 0,
    selectedSupplier: null,
    riskHistory: [],
    comparisonData: null,
    loading: false,
    detailLoading: false,
    error: null,
    message: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearMessage: (state) => { state.message = null; },
    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
      state.riskHistory = [];
    },
    clearComparisonData: (state) => { state.comparisonData = null; },
  },
  extraReducers: (builder) => {
    builder
      // List suppliers
      .addCase(listSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload.suppliers;
        state.total = action.payload.total;
      })
      .addCase(listSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get single supplier
      .addCase(getSupplier.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(getSupplier.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedSupplier = action.payload.supplier;
      })
      .addCase(getSupplier.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })
      // Create supplier
      .addCase(createSupplier.pending, (state) => { state.loading = true; })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Supplier registered successfully';
        state.suppliers.unshift(action.payload.supplier);
        state.total += 1;
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update supplier
      .addCase(updateSupplier.pending, (state) => { state.loading = true; })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Supplier updated successfully';
        const idx = state.suppliers.findIndex(s => s._id === action.payload.supplier._id);
        if (idx !== -1) state.suppliers[idx] = action.payload.supplier;
        if (state.selectedSupplier?._id === action.payload.supplier._id) {
          state.selectedSupplier = action.payload.supplier;
        }
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Compare suppliers
      .addCase(compareSuppliers.pending, (state) => { state.loading = true; })
      .addCase(compareSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.comparisonData = action.payload.suppliers;
      })
      .addCase(compareSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get risk history
      .addCase(getRiskHistory.pending, (state) => { state.detailLoading = true; })
      .addCase(getRiskHistory.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.riskHistory = action.payload.history;
      })
      .addCase(getRiskHistory.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })
      // Override score
      .addCase(overrideScore.pending, (state) => { state.loading = true; })
      .addCase(overrideScore.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Risk score overridden successfully';
        state.selectedSupplier = action.payload.supplier;
        const idx = state.suppliers.findIndex(s => s._id === action.payload.supplier._id);
        if (idx !== -1) state.suppliers[idx] = action.payload.supplier;
      })
      .addCase(overrideScore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update status
      .addCase(updateSupplierStatus.pending, (state) => { state.loading = true; })
      .addCase(updateSupplierStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Supplier status updated';
        const idx = state.suppliers.findIndex(s => s._id === action.payload.supplier._id);
        if (idx !== -1) state.suppliers[idx] = action.payload.supplier;
        if (state.selectedSupplier?._id === action.payload.supplier._id) {
          state.selectedSupplier = action.payload.supplier;
        }
      })
      .addCase(updateSupplierStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearMessage, clearSelectedSupplier, clearComparisonData } = suppliersSlice.actions;
export default suppliersSlice.reducer;
