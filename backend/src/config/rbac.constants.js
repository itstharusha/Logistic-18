/**
 * rbac.constants.js — Centralized Role & Permission Definitions
 *
 * Single source of truth for all RBAC role definitions and their permissions.
 * Used throughout backend for:
 * - Route authorization middleware
 * - User role validation
 * - Permission checks
 *
 * Must be kept in sync with frontend/src/config/rbac.constants.js
 */

// ─────────────────────────────────────────────
// ROLE DEFINITIONS
// ─────────────────────────────────────────────

export const ROLES = {
  ORG_ADMIN: 'ORG_ADMIN',
  RISK_ANALYST: 'RISK_ANALYST',
  LOGISTICS_OPERATOR: 'LOGISTICS_OPERATOR',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  VIEWER: 'VIEWER',
};

// All valid role values (for validation)
export const VALID_ROLES = Object.values(ROLES);

// ─────────────────────────────────────────────
// ROUTE PERMISSION MATRIX
// ─────────────────────────────────────────────

/**
 * ROUTE_PERMISSIONS
 * Maps endpoint patterns to required roles.
 * Used for documentation and potential future middleware expansion.
 */
export const ROUTE_PERMISSIONS = {
  // Auth routes (public)
  'POST /auth/register': [],
  'POST /auth/login': [],
  'POST /auth/refresh': [],

  // Auth routes (protected)
  'POST /auth/logout': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'POST /auth/change-password': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /auth/me': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],

  // User management (ORG_ADMIN only)
  'GET /users': [ROLES.ORG_ADMIN],
  'POST /users/create': [ROLES.ORG_ADMIN],
  'POST /users/invite': [ROLES.ORG_ADMIN],
  'GET /users/:userId': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER], // Can view own profile
  'PUT /users/:userId': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER], // Can update own profile
  'POST /users/:userId/assign-role': [ROLES.ORG_ADMIN],
  'POST /users/:userId/deactivate': [ROLES.ORG_ADMIN],
  'POST /users/:userId/activate': [ROLES.ORG_ADMIN],
  'GET /users/:userId/activity-log': [ROLES.ORG_ADMIN],
  'POST /users/bulk/assign-role': [ROLES.ORG_ADMIN],
  'POST /users/bulk/deactivate': [ROLES.ORG_ADMIN],
  'POST /users/bulk/activate': [ROLES.ORG_ADMIN],

  // Supplier routes
  'GET /suppliers': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  'POST /suppliers': [ROLES.ORG_ADMIN],
  'GET /suppliers/:id': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  'PUT /suppliers/:id': [ROLES.ORG_ADMIN],
  'PATCH /suppliers/:id/status': [ROLES.ORG_ADMIN],
  'POST /suppliers/compare': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  'GET /suppliers/:id/history': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  'POST /suppliers/:id/override-score': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'POST /suppliers/:id/update-metrics': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],

  // Shipment routes
  'GET /shipments': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'POST /shipments': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR],
  'GET /shipments/:shipmentId': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'PUT /shipments/:shipmentId': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR],
  'PATCH /shipments/:shipmentId/status': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR],
  'GET /shipments/:shipmentId/tracking': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER],

  // Inventory routes
  'GET /inventory/dashboard': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /inventory/reorder-list': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  'GET /inventory/warehouses/active': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /inventory/warehouses/stats': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /inventory/warehouses': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'POST /inventory/warehouses': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  'GET /inventory/warehouses/:warehouseId': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],

  // Alert routes
  'GET /alerts/dashboard': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /alerts/my': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'GET /alerts/history/all': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'POST /alerts/escalate': [ROLES.ORG_ADMIN],
  'GET /alerts': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'POST /alerts': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'GET /alerts/:alertId': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  'POST /alerts/:alertId/acknowledge': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER],
  'POST /alerts/:alertId/resolve': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],

  // Analytics routes
  'GET /analytics/kpi': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'GET /analytics/dashboard': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'GET /analytics/suppliers/performance': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'GET /analytics/shipments/delays': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'GET /analytics/inventory/risk': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'GET /analytics/alerts/summary': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.VIEWER],
  'POST /analytics/generate': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'GET /analytics/:reportId/download': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
};

// ─────────────────────────────────────────────
// ROLE DESCRIPTIONS
// ─────────────────────────────────────────────

export const ROLE_DESCRIPTIONS = {
  [ROLES.ORG_ADMIN]: {
    label: 'Organization Admin',
    description: 'Full administrative control within their organisation.',
    color: '#fee2e2',
    textColor: '#ef4444',
    icon: '🔴',
  },
  [ROLES.RISK_ANALYST]: {
    label: 'Risk Analyst',
    description: 'Monitors and manages risk across the platform.',
    color: '#ecfdf5',
    textColor: '#10b981',
    icon: '🟢',
  },
  [ROLES.LOGISTICS_OPERATOR]: {
    label: 'Logistics Operator',
    description: 'Manages day-to-day shipment operations.',
    color: '#e0f2fe',
    textColor: '#0ea5e9',
    icon: '🔵',
  },
  [ROLES.INVENTORY_MANAGER]: {
    label: 'Inventory Manager',
    description: 'Oversees stock levels and demand forecasting.',
    color: '#fef3c7',
    textColor: '#f59e0b',
    icon: '🟡',
  },
  [ROLES.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only observer (e.g., executives, auditors).',
    color: '#f3f4f6',
    textColor: '#6b7280',
    icon: '⚪',
  },
};

// ─────────────────────────────────────────────
// PERMISSION GROUPS (Optional - for future expansion)
// ─────────────────────────────────────────────

export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  SUPPLIER_MANAGEMENT: 'SUPPLIER_MANAGEMENT',
  SHIPMENT_MANAGEMENT: 'SHIPMENT_MANAGEMENT',
  INVENTORY_MANAGEMENT: 'INVENTORY_MANAGEMENT',
  ALERT_MANAGEMENT: 'ALERT_MANAGEMENT',
  ANALYTICS: 'ANALYTICS',
};

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

/**
 * isValidRole
 * Checks if a role is valid (exists in our role definitions)
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/**
 * getRoleLabel
 * Gets the human-readable label for a role
 * @param {string} role - Role name
 * @returns {string} Human-readable label
 */
export function getRoleLabel(role) {
  return ROLE_DESCRIPTIONS[role]?.label || role;
}

/**
 * getRoleDescription
 * Gets the description for a role
 * @param {string} role - Role name
 * @returns {string} Role description
 */
export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role]?.description || '';
}

/**
 * isAuthenticatedRoute
 * Checks if a route requires authentication
 * @param {string} endpoint - Route endpoint (e.g., "GET /suppliers")
 * @returns {boolean}
 */
export function isAuthenticatedRoute(endpoint) {
  const permissions = ROUTE_PERMISSIONS[endpoint];
  return Array.isArray(permissions) && permissions.length > 0;
}

export default {
  ROLES,
  VALID_ROLES,
  ROUTE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PERMISSION_GROUPS,
  isValidRole,
  getRoleLabel,
  getRoleDescription,
  isAuthenticatedRoute,
};
