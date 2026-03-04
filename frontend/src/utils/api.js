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
  inviteUser: (data) => apiClient.post('/users/invite', data),
  getActivityLog: (userId, params) => apiClient.get(`/users/${userId}/activity-log`, { params }),
  checkEmailAvailability: (email) => apiClient.get(`/users/check-email/${email}`),
};

// Supplier API calls (placeholder)
export const supplierAPI = {
  listSuppliers: (params) => apiClient.get('/suppliers', { params }),
  getSupplier: (id) => apiClient.get(`/suppliers/${id}`),
  createSupplier: (data) => apiClient.post('/suppliers', data),
  updateSupplier: (id, data) => apiClient.put(`/suppliers/${id}`, data),
};

// Shipment API calls (placeholder)
export const shipmentAPI = {
  listShipments: (params) => apiClient.get('/shipments', { params }),
  getShipment: (id) => apiClient.get(`/shipments/${id}`),
  registerShipment: (data) => apiClient.post('/shipments', data),
};

// Inventory API calls (Wijemanna)
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

// Warehouse API calls (Wijemanna)
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

// Alerts API calls (placeholder)
export const alertAPI = {
  listAlerts: (params) => apiClient.get('/alerts', { params }),
  getAlert: (id) => apiClient.get(`/alerts/${id}`),
  acknowledgeAlert: (id) => apiClient.post(`/alerts/${id}/acknowledge`),
  resolveAlert: (id, data) => apiClient.post(`/alerts/${id}/resolve`, data),
};

// Analytics API calls (placeholder)
export const analyticsAPI = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getKPI: (params) => apiClient.get('/analytics/kpi', { params }),
  generateReport: (data) => apiClient.post('/analytics/generate', data),
};
