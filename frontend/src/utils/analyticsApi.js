/**
 * analyticsApi.js
 * API service layer for Logistic 18 Analytics & Reports module
 */

import apiClient from './apiClient';

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/dashboard
 */
export async function apiFetchDashboard(params = {}) {
  const response = await apiClient.get('/analytics/dashboard', { params });
  return response.data?.data || response.data;
}

// ─── KPI DRILLDOWN ───────────────────────────────────────────────────────────

/**
 * GET /api/analytics/kpi?type=<metric>&days=<number>
 */
export async function apiFetchKPI({ type, days = 30 }) {
  const response = await apiClient.get('/analytics/kpi', {
    params: { type, days },
  });
  return response.data?.data || response.data;
}

// ─── REPORT GENERATION ───────────────────────────────────────────────────────

/**
 * POST /api/analytics/generate
 */
export async function apiGenerateReport(payload) {
  const response = await apiClient.post('/analytics/generate', payload);
  return response.data?.data || response.data;
}

// ─── REPORT DOWNLOAD ─────────────────────────────────────────────────────────

/**
 * GET /api/analytics/:reportId/download
 * Returns a blob (PDF or CSV). Triggers file download automatically.
 */
export async function apiDownloadReport(reportId, format = 'pdf') {
  const response = await apiClient.get(`/analytics/${reportId}/download`, {
    responseType: 'blob',
    headers: {
      Accept: format === 'csv' ? 'text/csv' : 'application/pdf',
    },
  });

  const blob = response.data;

  const extension = format === 'csv' ? 'csv' : 'pdf';
  const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';

  const blobUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = `logistic18-report-${reportId}.${extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}