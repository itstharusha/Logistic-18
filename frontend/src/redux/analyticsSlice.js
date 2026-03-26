/**
 * analyticsSlice.js
 * Redux slice for Logistic 18 Analytics & Reports module
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchDashboard,
  apiFetchKPI,
  apiGenerateReport,
  apiDownloadReport,
} from '../utils/analyticsApi.js';

// ─── ASYNC THUNKS ───────────────────────────────────────────────────────────

export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await apiFetchDashboard(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load dashboard');
    }
  }
);

export const fetchKPI = createAsyncThunk(
  'analytics/fetchKPI',
  async ({ type, days = 30 } = {}, { rejectWithValue }) => {
    try {
      const data = await apiFetchKPI({ type, days });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load KPI data');
    }
  }
);

export const generateReport = createAsyncThunk(
  'analytics/generateReport',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiGenerateReport(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate report');
    }
  }
);

export const downloadReport = createAsyncThunk(
  'analytics/downloadReport',
  async ({ reportId, format = 'pdf' }, { rejectWithValue }) => {
    try {
      await apiDownloadReport(reportId, format);
      return reportId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to download report');
    }
  }
);

// ─── INITIAL STATE ───────────────────────────────────────────────────────────

const initialState = {
  dashboardData: null,
  kpiData: null,
  reports: [],
  loading: false,
  kpiLoading: false,
  reportLoading: false,
  downloadLoading: false,
  error: null,
  kpiError: null,
  reportError: null,
};

// ─── SLICE ───────────────────────────────────────────────────────────────────

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearErrors(state) {
      state.error = null;
      state.kpiError = null;
      state.reportError = null;
    },
    clearKpiData(state) {
      state.kpiData = null;
    },
    addReport(state, action) {
      state.reports.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // fetchDashboard
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // fetchKPI
    builder
      .addCase(fetchKPI.pending, (state) => {
        state.kpiLoading = true;
        state.kpiError = null;
      })
      .addCase(fetchKPI.fulfilled, (state, action) => {
        state.kpiLoading = false;
        state.kpiData = action.payload;
      })
      .addCase(fetchKPI.rejected, (state, action) => {
        state.kpiLoading = false;
        state.kpiError = action.payload;
      });

    // generateReport
    builder
      .addCase(generateReport.pending, (state) => {
        state.reportLoading = true;
        state.reportError = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.reportLoading = false;
        state.reports.unshift(action.payload);
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.reportLoading = false;
        state.reportError = action.payload;
      });

    // downloadReport
    builder
      .addCase(downloadReport.pending, (state) => {
        state.downloadLoading = true;
      })
      .addCase(downloadReport.fulfilled, (state) => {
        state.downloadLoading = false;
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.downloadLoading = false;
        state.reportError = action.payload;
      });
  },
});

export const { clearErrors, clearKpiData, addReport } = analyticsSlice.actions;

// ─── SELECTORS (✅ FIXED: NULL-SAFE) ─────────────────────────────────────────
export const selectDashboard = (state) => state.analytics?.dashboardData ?? null;
export const selectKpiData = (state) => state.analytics?.kpiData ?? null;
export const selectReports = (state) => state.analytics?.reports ?? [];
export const selectLoading = (state) => state.analytics?.loading ?? false;
export const selectKpiLoading = (state) => state.analytics?.kpiLoading ?? false;
export const selectReportLoading = (state) => state.analytics?.reportLoading ?? false;
export const selectDownloadLoading = (state) => state.analytics?.downloadLoading ?? false;
export const selectError = (state) => state.analytics?.error ?? null;
export const selectKpiError = (state) => state.analytics?.kpiError ?? null;
export const selectReportError = (state) => state.analytics?.reportError ?? null;

export default analyticsSlice.reducer;