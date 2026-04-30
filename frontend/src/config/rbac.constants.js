/**
 * rbac.constants.js — Frontend RBAC Definitions
 *
 * MUST be kept in sync with backend/src/config/rbac.constants.js
 * Single source of truth for role definitions on the frontend.
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
// ROLE DESCRIPTIONS & STYLING
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
// PAGE ACCESS REQUIREMENTS
// ─────────────────────────────────────────────

export const PAGE_ACCESS = {
  '/': [],  // Dashboard accessible by all authenticated users
  '/users': [ROLES.ORG_ADMIN],
  '/inventory': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  '/warehouses': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  '/suppliers': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  '/suppliers/:id': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.VIEWER],
  '/shipments': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER],
  '/shipments/:id': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST, ROLES.VIEWER],
  '/alerts': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER, ROLES.VIEWER],
  '/analytics': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  '/analytics/kpi': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  '/reports': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
};

// ─────────────────────────────────────────────
// FEATURE ACCESS MATRIX
// ─────────────────────────────────────────────

export const FEATURE_ACCESS = {
  // User Management
  'create_user': [ROLES.ORG_ADMIN],
  'edit_user': [ROLES.ORG_ADMIN],
  'delete_user': [ROLES.ORG_ADMIN],
  'manage_roles': [ROLES.ORG_ADMIN],
  
  // Supplier Management
  'create_supplier': [ROLES.ORG_ADMIN],
  'edit_supplier': [ROLES.ORG_ADMIN],
  'override_supplier_score': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'view_supplier_audit': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  
  // Shipment Management
  'create_shipment': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR],
  'edit_shipment': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR],
  'track_shipment': [ROLES.ORG_ADMIN, ROLES.LOGISTICS_OPERATOR, ROLES.RISK_ANALYST],
  
  // Inventory Management
  'create_inventory': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  'edit_inventory': [ROLES.ORG_ADMIN, ROLES.INVENTORY_MANAGER],
  
  // Alert Management
  'acknowledge_alert': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST, ROLES.LOGISTICS_OPERATOR, ROLES.INVENTORY_MANAGER],
  'resolve_alert': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'escalate_alert': [ROLES.ORG_ADMIN],
  
  // Analytics & Reports
  'export_report': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'generate_report': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
  'view_audit_logs': [ROLES.ORG_ADMIN, ROLES.RISK_ANALYST],
};

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/**
 * canAccessPage
 * Check if a user can access a specific page
 * @param {string} userRole - Current user's role
 * @param {string} pagePath - Page path to check
 * @returns {boolean}
 */
export function canAccessPage(userRole, pagePath) {
  const requiredRoles = PAGE_ACCESS[pagePath];
  
  // If no specific roles required, everyone can access (public page)
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  
  return requiredRoles.includes(userRole);
}

/**
 * canAccessFeature
 * Check if a user can access a specific feature
 * @param {string} userRole - Current user's role
 * @param {string} featureName - Feature name to check
 * @returns {boolean}
 */
export function canAccessFeature(userRole, featureName) {
  const requiredRoles = FEATURE_ACCESS[featureName];
  
  if (!requiredRoles) {
    return false; // Feature doesn't exist or is not mapped
  }
  
  return requiredRoles.includes(userRole);
}

/**
 * getRoleLabel
 * Get human-readable label for a role
 * @param {string} role - Role name
 * @returns {string}
 */
export function getRoleLabel(role) {
  return ROLE_DESCRIPTIONS[role]?.label || role;
}

/**
 * getRoleDescription
 * Get description for a role
 * @param {string} role - Role name
 * @returns {string}
 */
export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role]?.description || '';
}

/**
 * getRoleColor
 * Get styling color for a role
 * @param {string} role - Role name
 * @returns {object} { color, textColor, icon }
 */
export function getRoleColor(role) {
  return ROLE_DESCRIPTIONS[role] || {
    color: '#f3f4f6',
    textColor: '#6b7280',
    icon: '❓',
  };
}

/**
 * isValidRole
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

export default {
  ROLES,
  VALID_ROLES,
  ROLE_DESCRIPTIONS,
  PAGE_ACCESS,
  FEATURE_ACCESS,
  canAccessPage,
  canAccessFeature,
  getRoleLabel,
  getRoleDescription,
  getRoleColor,
  isValidRole,
};
