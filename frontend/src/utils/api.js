import apiClient from './apiClient.js';

// Auth API calls
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  getCurrentUser: () => apiClient.get('/auth/me'),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
};

// User API calls
export const userAPI = {
  getProfile: (userId) => apiClient.get(`/users/${userId}`),
  updateProfile: (userId, data) => apiClient.put(`/users/${userId}`, data),
  listUsers: (params) => apiClient.get('/users', { params }),
  assignRole: (userId, data) => apiClient.post(`/users/${userId}/assign-role`, data),
  deactivateUser: (userId) => apiClient.post(`/users/${userId}/deactivate`),
  activateUser: (userId) => apiClient.post(`/users/${userId}/activate`),
  createUser: (data) => apiClient.post('/users/create', data),

  getActivityLog: (userId, params) => apiClient.get(`/users/${userId}/activity-log`, { params }),
  checkEmailAvailability: (email) => apiClient.get(`/users/check-email/${email}`),
};

// Supplier API calls
export const supplierAPI = {
  listSuppliers: (params) => apiClient.get('/suppliers', { params }),
  getSupplier: (id) => apiClient.get(`/suppliers/${id}`),
  createSupplier: (data) => apiClient.post('/suppliers', data),
  updateSupplier: (id, data) => apiClient.put(`/suppliers/${id}`, data),
  compareSuppliers: (ids) => apiClient.post('/suppliers/compare', { supplierIds: ids }),
  getRiskHistory: (id) => apiClient.get(`/suppliers/${id}/history`),
  overrideScore: (id, data) => apiClient.post(`/suppliers/${id}/override-score`, data),
  updateMetrics: (id, data) => apiClient.post(`/suppliers/${id}/update-metrics`, data),
  updateStatus: (id, data) => apiClient.patch(`/suppliers/${id}/status`, data),
};

// Shipment API calls
export const shipmentAPI = {
  listShipments: (params) => apiClient.get('/shipments', { params }),
  getShipment: (id) => apiClient.get(`/shipments/${id}`),
  registerShipment: (data) => apiClient.post('/shipments', data),
  updateShipment: (id, data) => apiClient.put(`/shipments/${id}`, data),
  updateShipmentStatus: (id, data) => apiClient.patch(`/shipments/${id}/status`, data),
  getTrackingEvents: (id) => apiClient.get(`/shipments/${id}/tracking`),
};

// Inventory API calls (placeholder)
export const inventoryAPI = {
  listInventory: (params) => apiClient.get('/inventory', { params }),
  getDashboard: () => apiClient.get('/inventory/dashboard'),
  getReorderList: () => apiClient.get('/inventory/reorder-list'),
  getInventoryItem: (id) => apiClient.get(`/inventory/${id}`),
  createInventoryItem: (data) => apiClient.post('/inventory', data),
  updateInventoryItem: (id, data) => apiClient.put(`/inventory/${id}`, data),
  updateStock: (id, data) => apiClient.patch(`/inventory/${id}/stock`, data),
  updatePendingOrder: (id, data) => apiClient.patch(`/inventory/${id}/pending-order`, data),
  getForecast: (id) => apiClient.get(`/inventory/${id}/forecast`),
  deleteInventoryItem: (id) => apiClient.delete(`/inventory/${id}`),
};

// Alerts API calls (Kulatunga)
export const alertAPI = {
  listAlerts: (params) => apiClient.get('/alerts', { params }),
  getAlert: (id) => apiClient.get(`/alerts/${id}`),
  acknowledgeAlert: (id) => apiClient.post(`/alerts/${id}/acknowledge`),
  resolveAlert: (id, data) => apiClient.post(`/alerts/${id}/resolve`, data),
  getDashboard: () => apiClient.get('/alerts/dashboard'),
  getMyAlerts: (params) => apiClient.get('/alerts/my', { params }),
  getHistory: (params) => apiClient.get('/alerts/history/all', { params }),
  createNewAlert: (data) => apiClient.post('/alerts', data),
  escalateAlerts: () => apiClient.post('/alerts/escalate'),
};

// Analytics API calls (placeholder)
export const analyticsAPI = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getKPI: (params) => apiClient.get('/analytics/kpi', { params }),
  generateReport: (data) => apiClient.post('/analytics/generate', data),
};

// Warehouse API calls
export const warehouseAPI = {
  listWarehouses: (params) => apiClient.get('/inventory/warehouses', { params }),
  getActiveWarehouses: () => apiClient.get('/inventory/warehouses/active'),
  getWarehouseStats: () => apiClient.get('/inventory/warehouses/stats'),
  getWarehouse: (warehouseId) => apiClient.get(`/inventory/warehouses/${warehouseId}`),
  createWarehouse: (data) => apiClient.post('/inventory/warehouses', data),
  updateWarehouse: (warehouseId, data) => apiClient.put(`/inventory/warehouses/${warehouseId}`, data),
  getWarehouseWithInventory: (warehouseId) => apiClient.get(`/inventory/warehouses/${warehouseId}/inventory`),
  setDefaultWarehouse: (warehouseId) => apiClient.patch(`/inventory/warehouses/${warehouseId}/default`),
  deleteWarehouse: (warehouseId) => apiClient.delete(`/inventory/warehouses/${warehouseId}`)
};

// Warehouse Transfer API calls (Wijemanna's module)
export const transferAPI = {
  listTransfers: (params) => apiClient.get('/inventory/transfers', { params }),
  getTransferStats: () => apiClient.get('/inventory/transfers/stats'),
  createTransfer: (data) => apiClient.post('/inventory/transfers', data),
  approveTransfer: (transferId) => apiClient.patch(`/inventory/transfers/${transferId}/approve`),
  completeTransfer: (transferId) => apiClient.patch(`/inventory/transfers/${transferId}/complete`),
  cancelTransfer: (transferId, reason) => apiClient.patch(`/inventory/transfers/${transferId}/cancel`, { reason }),
};
