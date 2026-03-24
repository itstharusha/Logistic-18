import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { shipmentAPI } from '../utils/api.js';

export const listShipments = createAsyncThunk(
  'shipments/listShipments',
  async (params, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.listShipments(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch shipments');
    }
  }
);

export const getShipment = createAsyncThunk(
  'shipments/getShipment',
  async (id, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.getShipment(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch shipment');
    }
  }
);

export const createShipment = createAsyncThunk(
  'shipments/createShipment',
  async (data, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.registerShipment(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to register shipment');
    }
  }
);

export const updateShipment = createAsyncThunk(
  'shipments/updateShipment',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.updateShipment(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update shipment');
    }
  }
);

export const updateShipmentStatus = createAsyncThunk(
  'shipments/updateShipmentStatus',
  async ({ id, status, notes }, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.updateShipmentStatus(id, { status, notes });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update shipment status');
    }
  }
);

export const getTrackingEvents = createAsyncThunk(
  'shipments/getTrackingEvents',
  async (id, { rejectWithValue }) => {
    try {
      const response = await shipmentAPI.getTrackingEvents(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tracking events');
    }
  }
);

const shipmentsSlice = createSlice({
  name: 'shipments',
  initialState: {
    shipments:       [],
    total:           0,
    selectedShipment: null,
    trackingEvents:  [],
    loading:         false,
    detailLoading:   false,
    error:           null,
    message:         null,
  },
  reducers: {
    clearError:             (state) => { state.error = null; },
    clearMessage:           (state) => { state.message = null; },
    clearSelectedShipment:  (state) => {
      state.selectedShipment = null;
      state.trackingEvents   = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // List shipments
      .addCase(listShipments.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(listShipments.fulfilled, (state, action) => {
        state.loading   = false;
        state.shipments = action.payload.shipments;
        state.total     = action.payload.total;
      })
      .addCase(listShipments.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // Get single shipment
      .addCase(getShipment.pending, (state) => {
        state.detailLoading = true;
        state.error         = null;
      })
      .addCase(getShipment.fulfilled, (state, action) => {
        state.detailLoading   = false;
        state.selectedShipment = action.payload.shipment;
      })
      .addCase(getShipment.rejected, (state, action) => {
        state.detailLoading = false;
        state.error         = action.payload;
      })

      // Create shipment
      .addCase(createShipment.pending,  (state) => { state.loading = true; })
      .addCase(createShipment.fulfilled, (state, action) => {
        state.loading  = false;
        state.message  = 'Shipment registered successfully';
        state.shipments.unshift(action.payload.shipment);
        state.total   += 1;
      })
      .addCase(createShipment.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // Update shipment
      .addCase(updateShipment.pending,  (state) => { state.loading = true; })
      .addCase(updateShipment.fulfilled, (state, action) => {
        state.loading  = false;
        state.message  = 'Shipment updated successfully';
        const idx = state.shipments.findIndex(s => s._id === action.payload.shipment._id);
        if (idx !== -1) state.shipments[idx] = action.payload.shipment;
        if (state.selectedShipment?._id === action.payload.shipment._id) {
          state.selectedShipment = action.payload.shipment;
        }
      })
      .addCase(updateShipment.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // Update status
      .addCase(updateShipmentStatus.pending,  (state) => { state.loading = true; })
      .addCase(updateShipmentStatus.fulfilled, (state, action) => {
        state.loading  = false;
        state.message  = 'Shipment status updated';
        const idx = state.shipments.findIndex(s => s._id === action.payload.shipment._id);
        if (idx !== -1) state.shipments[idx] = action.payload.shipment;
        if (state.selectedShipment?._id === action.payload.shipment._id) {
          state.selectedShipment = action.payload.shipment;
        }
      })
      .addCase(updateShipmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // Get tracking events
      .addCase(getTrackingEvents.pending,  (state) => { state.detailLoading = true; })
      .addCase(getTrackingEvents.fulfilled, (state, action) => {
        state.detailLoading  = false;
        state.trackingEvents = action.payload.events;
      })
      .addCase(getTrackingEvents.rejected, (state, action) => {
        state.detailLoading = false;
        state.error         = action.payload;
      });
  },
});

export const { clearError, clearMessage, clearSelectedShipment } = shipmentsSlice.actions;
export default shipmentsSlice.reducer;
