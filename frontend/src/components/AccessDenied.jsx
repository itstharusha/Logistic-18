import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { getRoleLabel } from '../config/rbac.constants.js';
import '../styles/accessDenied.css';

export default function AccessDenied({ requiredRoles = [], userRole = null }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const displayUserRole = userRole || user?.role;

  const roleLabels = {
    ORG_ADMIN: 'Organization Administrator',
    RISK_ANALYST: 'Risk Analyst',
    LOGISTICS_OPERATOR: 'Logistics Operator',
    INVENTORY_MANAGER: 'Inventory Manager',
    VIEWER: 'Viewer (Read-Only)',
  };

  const formatRoles = (roles) => {
    return roles
      .map(role => getRoleLabel(role))
      .join(' or ');
  };

  return (
    <div className="access-denied-container">
      <div className="access-denied-wrapper">
        <div className="access-denied-content">
          {/* Icon */}
          <div className="access-denied-icon">
            <ShieldAlert size={64} strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h1 className="access-denied-title">Access Denied</h1>

          {/* Description */}
          <p className="access-denied-description">
            You do not have permission to access this page.
          </p>

          {/* Role Info */}
          <div className="access-denied-info">
            <div className="info-item">
              <span className="info-label">Your Current Role:</span>
              <span className="info-value">{getRoleLabel(displayUserRole) || 'Unknown'}</span>
            </div>

            {requiredRoles.length > 0 && (
              <div className="info-item">
                <span className="info-label">Required Role(s):</span>
                <span className="info-value">{formatRoles(requiredRoles)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="access-denied-actions">
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              <Home size={18} />
              <span>Go to Dashboard</span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              <ArrowLeft size={18} />
              <span>Go Back</span>
            </button>
          </div>

          {/* Footer Note */}
          <p className="access-denied-note">
            If you believe you should have access to this page, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
