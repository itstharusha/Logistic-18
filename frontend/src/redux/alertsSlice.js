import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { alertAPI } from '../utils/api.js';

// Async thunks

export const fetchAlerts = createAsyncThunk(
    'alerts/fetchAlerts',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await alertAPI.listAlerts(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch alerts');
        }
    }
);

export const fetchAlertDashboard = createAsyncThunk(
    'alerts/fetchDashboard',
    async (_, { rejectWithValue }) => {
        try {
            const response = await alertAPI.getDashboard();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard');
        }
    }
);

export const fetchMyAlerts = createAsyncThunk(
    'alerts/fetchMyAlerts',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await alertAPI.getMyAlerts(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch your alerts');
        }
    }
);

export const fetchAlertHistory = createAsyncThunk(
    'alerts/fetchHistory',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await alertAPI.getHistory(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch alert history');
        }
    }
);

export const fetchAlertDetail = createAsyncThunk(
    'alerts/fetchDetail',
    async (alertId, { rejectWithValue }) => {
        try {
            const response = await alertAPI.getAlert(alertId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch alert detail');
        }
    }
);

export const acknowledgeAlert = createAsyncThunk(
    'alerts/acknowledge',
    async (alertId, { rejectWithValue }) => {
        try {
            const response = await alertAPI.acknowledgeAlert(alertId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to acknowledge alert');
        }
    }
);

export const resolveAlert = createAsyncThunk(
    'alerts/resolve',
    async ({ alertId, resolutionNote }, { rejectWithValue }) => {
        try {
            const response = await alertAPI.resolveAlert(alertId, { resolutionNote });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to resolve alert');
        }
    }
);

export const createAlert = createAsyncThunk(
    'alerts/create',
    async (alertData, { rejectWithValue }) => {
        try {
            const response = await alertAPI.createNewAlert(alertData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to create alert');
        }
    }
);

// Slice
const alertsSlice = createSlice({
    name: 'alerts',
    initialState: {
        // List
        alerts: [],
        pagination: null,
        // Dashboard
        dashboard: null,
        // My alerts
        myAlerts: [],
        // History
        history: [],
        historyPagination: null,
        // Detail
        selectedAlert: null,
        // UI state
        loading: false,
        dashboardLoading: false,
        error: null,
        actionLoading: false,
        actionSuccess: null,
        // Filters
        activeFilter: 'all', // all, mine, open, escalated
        activeSeverity: null,
        activeEntityType: null,
    },
    reducers: {
        setActiveFilter: (state, action) => {
            state.activeFilter = action.payload;
        },
        setActiveSeverity: (state, action) => {
            state.activeSeverity = action.payload;
        },
        setActiveEntityType: (state, action) => {
            state.activeEntityType = action.payload;
        },
        clearActionSuccess: (state) => {
            state.actionSuccess = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearSelectedAlert: (state) => {
            state.selectedAlert = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch alerts
            .addCase(fetchAlerts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAlerts.fulfilled, (state, action) => {
                state.loading = false;
                state.alerts = action.payload.alerts;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchAlerts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Dashboard
            .addCase(fetchAlertDashboard.pending, (state) => {
                state.dashboardLoading = true;
            })
            .addCase(fetchAlertDashboard.fulfilled, (state, action) => {
                state.dashboardLoading = false;
                state.dashboard = action.payload;
            })
            .addCase(fetchAlertDashboard.rejected, (state, action) => {
                state.dashboardLoading = false;
                state.error = action.payload;
            })
            // My alerts
            .addCase(fetchMyAlerts.fulfilled, (state, action) => {
                state.myAlerts = action.payload.alerts;
            })
            // History
            .addCase(fetchAlertHistory.fulfilled, (state, action) => {
                state.history = action.payload.alerts;
                state.historyPagination = action.payload.pagination;
            })
            // Detail
            .addCase(fetchAlertDetail.fulfilled, (state, action) => {
                state.selectedAlert = action.payload.alert;
            })
            // Acknowledge
            .addCase(acknowledgeAlert.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(acknowledgeAlert.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.actionSuccess = 'Alert acknowledged successfully';
                
                // Find the old alert to get previous status
                const oldAlert = state.alerts.find(a => a._id === action.payload.alert._id);
                const oldStatus = oldAlert?.status;
                const newStatus = action.payload.alert.status;
                
                // Update in list
                const idx = state.alerts.findIndex(a => a._id === action.payload.alert._id);
                if (idx !== -1) state.alerts[idx] = action.payload.alert;
                
                // Update selected
                if (state.selectedAlert?._id === action.payload.alert._id) {
                    state.selectedAlert = action.payload.alert;
                }
                
                // Update dashboard stats if they exist
                if (state.dashboard?.stats && oldStatus && oldStatus !== newStatus) {
                    if (oldStatus === 'open') state.dashboard.stats.open -= 1;
                    if (oldStatus === 'escalated') state.dashboard.stats.escalated -= 1;
                    if (newStatus === 'acknowledged') state.dashboard.stats.acknowledged += 1;
                }
            })
            .addCase(acknowledgeAlert.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })
            // Resolve
            .addCase(resolveAlert.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(resolveAlert.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.actionSuccess = 'Alert resolved successfully';
                
                // Find the old alert to get previous status
                const oldAlert = state.alerts.find(a => a._id === action.payload.alert._id);
                const oldStatus = oldAlert?.status;
                const newStatus = action.payload.alert.status;
                
                const idx = state.alerts.findIndex(a => a._id === action.payload.alert._id);
                if (idx !== -1) state.alerts[idx] = action.payload.alert;
                if (state.selectedAlert?._id === action.payload.alert._id) {
                    state.selectedAlert = action.payload.alert;
                }
                
                // Update dashboard stats if they exist
                if (state.dashboard?.stats && oldStatus && oldStatus !== newStatus) {
                    if (oldStatus === 'open') state.dashboard.stats.open -= 1;
                    if (oldStatus === 'acknowledged') state.dashboard.stats.acknowledged -= 1;
                    if (oldStatus === 'escalated') state.dashboard.stats.escalated -= 1;
                    if (newStatus === 'resolved') state.dashboard.stats.resolved += 1;
                }
            })
            .addCase(resolveAlert.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })
            // Create
            .addCase(createAlert.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(createAlert.fulfilled, (state, action) => {
                state.actionLoading = false;
                if (action.payload.alert) {
                    state.alerts.unshift(action.payload.alert);
                    state.actionSuccess = 'Alert created successfully';
                    // Update dashboard stats
                    if (state.dashboard?.stats) {
                        state.dashboard.stats.total += 1;
                        if (action.payload.alert.status === 'open') state.dashboard.stats.open += 1;
                        // Update severity counts
                        const sev = action.payload.alert.severity;
                        if (sev === 'low') state.dashboard.stats.low += 1;
                        if (sev === 'medium') state.dashboard.stats.medium += 1;
                        if (sev === 'high') state.dashboard.stats.high += 1;
                        if (sev === 'critical') state.dashboard.stats.critical += 1;
                    }
                } else if (action.payload.suppressed) {
                    state.actionSuccess = 'Duplicate alert suppressed (cooldown active)';
                }
            })
            .addCase(createAlert.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });
    },
});

export const {
    setActiveFilter,
    setActiveSeverity,
    setActiveEntityType,
    clearActionSuccess,
    clearError,
    clearSelectedAlert,
} = alertsSlice.actions;

export default alertsSlice.reducer;
