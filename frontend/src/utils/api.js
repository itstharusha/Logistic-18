/**
 * api.js — Typed API Call Wrappers
 *
 * Responsibility:
 *   Organises every backend API call into named, type-safe functions grouped
 *   by domain (auth, users, suppliers, shipments, inventory, alerts, analytics).
 *
 *   Each function wraps a single Axios call via the shared apiClient instance,
 *   which automatically attaches the JWT token and handles token refresh.
 *
 *   Import individual domain objects where needed:
 *     import { supplierAPI, shipmentAPI } from '../utils/api.js';
 */

import apiClient from './apiClient.js';

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────
export const authAPI = {
  /** Register a new user (requires orgId in body) */
  register: (data) => apiClient.post('/auth/register', data),

  /** Login with email + password — returns accessToken and user object */
  login: (email, password) => apiClient.post('/auth/login', { email, password }),

  /** Logout — invalidates the server-side refresh token */
  logout: () => apiClient.post('/auth/logout'),

  /** Exchange a refresh token for a new access token */
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),

  /** Fetch the currently authenticated user's profile (from JWT) */
  getCurrentUser: () => apiClient.get('/auth/me'),

  /** Change the current user's password (requires current password for verification) */
  changePassword: (data) => apiClient.post('/auth/change-password', data),
};

// ─────────────────────────────────────────────
// User Management API (ORG_ADMIN only for most routes)
// ─────────────────────────────────────────────
export const userAPI = {
  /** Get a single user's profile by their MongoDB _id */
  getProfile: (userId) => apiClient.get(`/users/${userId}`),

  /** Update a user's name, email, or role */
  updateProfile: (userId, data) => apiClient.put(`/users/${userId}`, data),

  /** List all users in the organisation (supports pagination via params) */
  listUsers: (params) => apiClient.get('/users', { params }),

  /** Assign an RBAC role to a user (ORG_ADMIN only) */
  assignRole: (userId, data) => apiClient.post(`/users/${userId}/assign-role`, data),

  /** Deactivate a user account (soft delete — data is preserved) */
  deactivateUser: (userId) => apiClient.post(`/users/${userId}/deactivate`),

  /** Reactivate a previously deactivated user account */
  activateUser: (userId) => apiClient.post(`/users/${userId}/activate`),

  /** Send an invitation email to a new user (admin workflow) */
  inviteUser: (data) => apiClient.post('/users/invite', data),

  /** Fetch a user's action history for audit display */
  getActivityLog: (userId, params) => apiClient.get(`/users/${userId}/activity-log`, { params }),

  /** Check if an email is already registered before the user submits the form */
  checkEmailAvailability: (email) => apiClient.get(`/users/check-email/${email}`),
};

// ─────────────────────────────────────────────
// Supplier API
// ─────────────────────────────────────────────
export const supplierAPI = {
  /** List suppliers with optional search, status, tier filters and pagination */
  listSuppliers: (params) => apiClient.get('/suppliers', { params }),

  /** Fetch a single supplier's full profile including history arrays */
  getSupplier: (id) => apiClient.get(`/suppliers/${id}`),

  /** Register a new supplier — triggers initial risk score calculation */
  createSupplier: (data) => apiClient.post('/suppliers', data),

  /** Update supplier profile fields — recalculates risk score if inputs change */
  updateSupplier: (id, data) => apiClient.put(`/suppliers/${id}`, data),

  /** Fetch the supplier's riskHistory array for chart rendering */
  getRiskHistory: (id) => apiClient.get(`/suppliers/${id}/history`),

  /** Record a manual analyst score override with justification */
  overrideScore: (id, data) => apiClient.post(`/suppliers/${id}/override-score`, data),

  /** Manually adjust performance metrics and recalculate the risk score */
  updateMetrics: (id, data) => apiClient.post(`/suppliers/${id}/update-metrics`, data),

  /** Update the supplier's operational status (active/under_watch/high_risk/suspended) */
  updateStatus: (id, data) => apiClient.patch(`/suppliers/${id}/status`, data),

  /** Fetch multiple suppliers by their IDs for side-by-side comparison */
  compareSuppliers: (ids) => apiClient.post('/suppliers/compare', { ids }),
};

// ─────────────────────────────────────────────
// Shipment API
// ─────────────────────────────────────────────
export const shipmentAPI = {
  /** List shipments with optional search, status, carrier filters and pagination */
  listShipments: (params) => apiClient.get('/shipments', { params }),

  /** Fetch a single shipment's full record including tracking events */
  getShipment: (id) => apiClient.get(`/shipments/${id}`),

  /** Register a new shipment — triggers initial risk score calculation */
  registerShipment: (data) => apiClient.post('/shipments', data),

  /** Update shipment fields (e.g. actualDelivery, weight, carrier) */
  updateShipment: (id, data) => apiClient.put(`/shipments/${id}`, data),

  /** Advance the shipment's status in the workflow state machine */
  updateShipmentStatus: (id, data) => apiClient.patch(`/shipments/${id}/status`, data),

  /** Fetch the tracking event timeline for a shipment's detail page */
  getTrackingEvents: (id) => apiClient.get(`/shipments/${id}/tracking`),
};

// ─────────────────────────────────────────────
// Inventory API
// ─────────────────────────────────────────────
export const inventoryAPI = {
  listInventory: (params) => apiClient.get('/inventory', { params }),
  getInventoryItem: (id) => apiClient.get(`/inventory/${id}`),
  createInventoryItem: (data) => apiClient.post('/inventory', data),
  updateInventoryItem: (id, data) => apiClient.put(`/inventory/${id}`, data),
  updateStock: (id, data) => apiClient.patch(`/inventory/${id}/stock`, data),
  updatePendingOrder: (id, data) => apiClient.patch(`/inventory/${id}/pending-order`, data),
  deleteInventoryItem: (id) => apiClient.delete(`/inventory/${id}`),
  getForecast: (id) => apiClient.get(`/inventory/${id}/forecast`),
  getDashboard: () => apiClient.get('/inventory/dashboard'),
  getReorderList: () => apiClient.get('/inventory/reorder-list'),
};

// Warehouse API calls
export const warehouseAPI = {
  listWarehouses: (params) => apiClient.get('/inventory/warehouses', { params }),
  getActiveWarehouses: () => apiClient.get('/inventory/warehouses/active'),
  getWarehouseStats: () => apiClient.get('/inventory/warehouses/stats'),
  getWarehouse: (id) => apiClient.get(`/inventory/warehouses/${id}`),
  getWarehouseWithInventory: (id) => apiClient.get(`/inventory/warehouses/${id}/inventory`),
  createWarehouse: (data) => apiClient.post('/inventory/warehouses', data),
  updateWarehouse: (id, data) => apiClient.put(`/inventory/warehouses/${id}`, data),
  setDefaultWarehouse: (id) => apiClient.patch(`/inventory/warehouses/${id}/default`),
  deleteWarehouse: (id) => apiClient.delete(`/inventory/warehouses/${id}`),
};

// Warehouse Transfer API calls (Wijemanna)
export const transferAPI = {
  listTransfers: (params) => apiClient.get('/inventory/transfers', { params }),
  getTransferStats: () => apiClient.get('/inventory/transfers/stats'),
  getTransfer: (id) => apiClient.get(`/inventory/transfers/${id}`),
  createTransfer: (data) => apiClient.post('/inventory/transfers', data),
  approveTransfer: (id) => apiClient.patch(`/inventory/transfers/${id}/approve`),
  completeTransfer: (id) => apiClient.patch(`/inventory/transfers/${id}/complete`),
  cancelTransfer: (id, reason) => apiClient.patch(`/inventory/transfers/${id}/cancel`, { reason }),
  getWarehousePendingTransfers: (warehouseId, direction) => 
    apiClient.get(`/inventory/transfers/warehouse/${warehouseId}`, { params: { direction } }),
  getItemTransferHistory: (itemId) => apiClient.get(`/inventory/transfers/item/${itemId}`),
};

// ─────────────────────────────────────────────
// Alerts API
// ─────────────────────────────────────────────
export const alertAPI = {
  /** List all alerts with optional status/severity filters */
  listAlerts: (params) => apiClient.get('/alerts', { params }),

  /** Fetch a single alert's full details */
  getAlert: (id) => apiClient.get(`/alerts/${id}`),

  /** Mark an alert as acknowledged (user has seen it) */
  acknowledgeAlert: (id) => apiClient.post(`/alerts/${id}/acknowledge`),

  /** Mark an alert as resolved, with an optional resolution note */
  resolveAlert: (id, data) => apiClient.post(`/alerts/${id}/resolve`, data),
};

// ─────────────────────────────────────────────
// Analytics / Reports API
// ─────────────────────────────────────────────
export const analyticsAPI = {
  /** Fetch KPI summary data for the main dashboard cards */
  getDashboard: () => apiClient.get('/analytics/dashboard'),

  /** Fetch specific KPI metrics (with optional time range params) */
  getKPI: (params) => apiClient.get('/analytics/kpi', { params }),

  /** Trigger report generation (async — result is fetched separately) */
  generateReport: (data) => apiClient.post('/analytics/generate', data),
};
