import React from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import '../../styles/RolePermissionMatrix.css';

/**
 * RolePermissionMatrix - Modal showing capabilities for each role
 * Shows a visual grid of what each role can and can't do
 */
function RolePermissionMatrix({ isOpen, onClose }) {
  if (!isOpen) return null;

  const permissions = {
    VIEWER: {
      label: 'Viewer (Read Only)',
      description: 'View-only access to all data',
      capabilities: {
        'View Dashboard': true,
        'View Reports': true,
        'View Alerts': true,
        'View Users': true,
        'Create Users': false,
        'Edit Users': false,
        'Delete Users': false,
        'Manage Roles': false,
        'Create Shipments': false,
        'Edit Shipments': false,
        'Create Inventory': false,
        'Edit Inventory': false,
        'System Settings': false,
        'View Audit Logs': false,
      },
    },
    LOGISTICS_OPERATOR: {
      label: 'Logistics Operator',
      description: 'Manage shipments and logistics operations',
      capabilities: {
        'View Dashboard': true,
        'View Reports': true,
        'View Alerts': true,
        'View Users': true,
        'Create Users': false,
        'Edit Users': false,
        'Delete Users': false,
        'Manage Roles': false,
        'Create Shipments': true,
        'Edit Shipments': true,
        'Create Inventory': false,
        'Edit Inventory': false,
        'System Settings': false,
        'View Audit Logs': false,
      },
    },
    INVENTORY_MANAGER: {
      label: 'Inventory Manager',
      description: 'Manage inventory and warehouse operations',
      capabilities: {
        'View Dashboard': true,
        'View Reports': true,
        'View Alerts': true,
        'View Users': true,
        'Create Users': false,
        'Edit Users': false,
        'Delete Users': false,
        'Manage Roles': false,
        'Create Shipments': false,
        'Edit Shipments': false,
        'Create Inventory': true,
        'Edit Inventory': true,
        'System Settings': false,
        'View Audit Logs': false,
      },
    },
    RISK_ANALYST: {
      label: 'Risk Analyst',
      description: 'Analyze and manage risks and alerts',
      capabilities: {
        'View Dashboard': true,
        'View Reports': true,
        'View Alerts': true,
        'View Users': true,
        'Create Users': false,
        'Edit Users': false,
        'Delete Users': false,
        'Manage Roles': false,
        'Create Shipments': false,
        'Edit Shipments': false,
        'Create Inventory': false,
        'Edit Inventory': false,
        'System Settings': false,
        'View Audit Logs': true,
      },
    },
    ORG_ADMIN: {
      label: 'Organization Admin',
      description: 'Full system access and administration',
      capabilities: {
        'View Dashboard': true,
        'View Reports': true,
        'View Alerts': true,
        'View Users': true,
        'Create Users': true,
        'Edit Users': true,
        'Delete Users': true,
        'Manage Roles': true,
        'Create Shipments': true,
        'Edit Shipments': true,
        'Create Inventory': true,
        'Edit Inventory': true,
        'System Settings': true,
        'View Audit Logs': true,
      },
    },
  };

  const allCapabilities = Object.keys(permissions.ORG_ADMIN.capabilities);

  return (
    <div className="permission-matrix-overlay" onClick={onClose}>
      <div className="permission-matrix-modal" onClick={(e) => e.stopPropagation()}>
        <div className="matrix-header">
          <h2>Role Permissions Matrix</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="matrix-content">
          <p className="matrix-description">
            Here's a complete overview of what each role can access and perform in the system.
          </p>

          <div className="matrix-grid">
            {/* Role cards */}
            {Object.entries(permissions).map(([roleKey, roleData]) => (
              <div key={roleKey} className="role-column">
                <div className="role-header">
                  <h3>{roleData.label}</h3>
                  <p className="role-description">{roleData.description}</p>
                </div>

                <div className="capabilities-list">
                  {allCapabilities.map((capability) => {
                    const hasPermission = roleData.capabilities[capability];
                    return (
                      <div
                        key={capability}
                        className={`capability-row ${hasPermission ? 'allowed' : 'denied'}`}
                      >
                        <div className="capability-icon">
                          {hasPermission ? (
                            <CheckCircle2 size={16} className="check-icon" />
                          ) : (
                            <XCircle size={16} className="x-icon" />
                          )}
                        </div>
                        <span className="capability-name">{capability}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="role-stats">
                  <span className="stat-label">
                    {Object.values(roleData.capabilities).filter(Boolean).length} of{' '}
                    {allCapabilities.length} capabilities
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="matrix-footer">
          <button className="btn-primary-premium" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default RolePermissionMatrix;
