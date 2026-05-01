import React from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import '../../styles/RolePermissionMatrix.css';

const ROLES = [
  { key: 'VIEWER',             label: 'Viewer',        sub: 'Read Only' },
  { key: 'LOGISTICS_OPERATOR', label: 'Logistics',     sub: 'Operator' },
  { key: 'INVENTORY_MANAGER',  label: 'Inventory',     sub: 'Manager' },
  { key: 'RISK_ANALYST',       label: 'Risk',          sub: 'Analyst' },
  { key: 'ORG_ADMIN',          label: 'Org',           sub: 'Admin' },
];

const PERMISSION_GROUPS = [
  {
    group: 'Overview',
    rows: [
      { label: 'View Dashboard',  VIEWER: true,  LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: true,  RISK_ANALYST: true,  ORG_ADMIN: true  },
      { label: 'View Reports',    VIEWER: true,  LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: true,  RISK_ANALYST: true,  ORG_ADMIN: true  },
      { label: 'View Alerts',     VIEWER: true,  LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: true,  RISK_ANALYST: true,  ORG_ADMIN: true  },
      { label: 'View Audit Logs', VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: true,  ORG_ADMIN: true  },
    ],
  },
  {
    group: 'Shipments',
    rows: [
      { label: 'Create Shipments', VIEWER: false, LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true },
      { label: 'Edit Shipments',   VIEWER: false, LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true },
    ],
  },
  {
    group: 'Inventory',
    rows: [
      { label: 'Create Inventory', VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: true,  RISK_ANALYST: false, ORG_ADMIN: true },
      { label: 'Edit Inventory',   VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: true,  RISK_ANALYST: false, ORG_ADMIN: true },
    ],
  },
  {
    group: 'User Management',
    rows: [
      { label: 'View Users',    VIEWER: true,  LOGISTICS_OPERATOR: true,  INVENTORY_MANAGER: true,  RISK_ANALYST: true,  ORG_ADMIN: true  },
      { label: 'Create Users',  VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true  },
      { label: 'Edit Users',    VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true  },
      { label: 'Delete Users',  VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true  },
      { label: 'Manage Roles',  VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true  },
    ],
  },
  {
    group: 'System',
    rows: [
      { label: 'System Settings', VIEWER: false, LOGISTICS_OPERATOR: false, INVENTORY_MANAGER: false, RISK_ANALYST: false, ORG_ADMIN: true },
    ],
  },
];

function RolePermissionMatrix({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="rpm-overlay" onClick={onClose}>
      <div className="rpm-modal" onClick={(e) => e.stopPropagation()}>

        <div className="rpm-header">
          <div>
            <h2 className="rpm-title">Role Permissions Matrix</h2>
            <p className="rpm-subtitle">What each role can access and perform</p>
          </div>
          <button className="rpm-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="rpm-body">
          <table className="rpm-table">
            <thead>
              <tr>
                <th className="rpm-th-permission">Permission</th>
                {ROLES.map((role) => (
                  <th key={role.key} className="rpm-th-role">
                    <span className="rpm-role-label">{role.label}</span>
                    <span className="rpm-role-sub">{role.sub}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group.group}>
                  <tr className="rpm-group-row">
                    <td colSpan={ROLES.length + 1} className="rpm-group-label">
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.label} className="rpm-row">
                      <td className="rpm-permission-name">{row.label}</td>
                      {ROLES.map((role) => (
                        <td key={role.key} className="rpm-cell">
                          {row[role.key] ? (
                            <CheckCircle2 size={18} className="rpm-check" />
                          ) : (
                            <XCircle size={18} className="rpm-cross" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rpm-footer">
          <button className="btn-primary-premium" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default RolePermissionMatrix;
