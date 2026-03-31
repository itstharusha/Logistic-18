import React, { useState } from 'react';
import {
  X,
  Mail,
  Shield,
  Clock,
  Activity,
  Calendar,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';
import { getStatusDuration, getStatusColor } from '../../utils/userFormatters';
import UserAvatar from './UserAvatar';
import '../../styles/UserProfileDrawer.css';

/**
 * UserProfileDrawer - Right-side sliding drawer with full user profile
 * Shows complete user information, activity history, and permissions
 */
function UserProfileDrawer({ user, onClose, onEdit, onDeactivate, onActivate }) {
  const [expanded, setExpanded] = useState({
    basics: true,
    activity: true,
    permissions: true,
  });

  if (!user) return null;

  const statusColor = getStatusColor(user.isActive);
  const statusDuration = getStatusDuration(user.lastActiveAt, user.isActive);

  const toggleSection = (section) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="profile-drawer-overlay" onClick={onClose}>
      <div className="profile-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <h2>User Profile</h2>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">
          {/* Profile Banner */}
          <div className="profile-banner">
            <UserAvatar user={user} size="80px" />
            <div className="profile-basic-info">
              <h3 className="profile-name">{user.name}</h3>
              <p className="profile-email">{user.email}</p>
              <div className="profile-status-row">
                <span
                  className="profile-status-badge"
                  style={{
                    background: statusColor.bg,
                    color: statusColor.text,
                  }}
                >
                  {statusDuration}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <section className="profile-section">
            <button
              className="section-header"
              onClick={() => toggleSection('basics')}
            >
              <div className="section-title">
                <AlertCircle size={16} />
                <span>Basic Information</span>
              </div>
              <span className={`chevron ${expanded.basics ? 'open' : ''}`}>▼</span>
            </button>

            {expanded.basics && (
              <div className="section-content">
                <div className="info-row">
                  <label>Full Name</label>
                  <span className="info-value">{user.name}</span>
                </div>
                <div className="info-row">
                  <label>
                    <Mail size={14} /> Email
                  </label>
                  <span className="info-value">{user.email}</span>
                </div>
                <div className="info-row">
                  <label>Status</label>
                  <span
                    className="info-value status"
                    style={{
                      background: statusColor.bg,
                      color: statusColor.text,
                    }}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="info-row">
                  <label>
                    <Calendar size={14} /> Created Date
                  </label>
                  <span className="info-value">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Role & Permissions Section */}
          <section className="profile-section">
            <button
              className="section-header"
              onClick={() => toggleSection('permissions')}
            >
              <div className="section-title">
                <Shield size={16} />
                <span>Role & Permissions</span>
              </div>
              <span className={`chevron ${expanded.permissions ? 'open' : ''}`}>
                ▼
              </span>
            </button>

            {expanded.permissions && (
              <div className="section-content">
                <div className="info-row">
                  <label>System Role</label>
                  <span className="role-badge">{user.role.replace(/_/g, ' ')}</span>
                </div>

                {/* Role capabilities preview */}
                <div className="capabilities-preview">
                  <p className="capabilities-title">Key Capabilities:</p>
                  <RoleCapabilityList role={user.role} />
                </div>
              </div>
            )}
          </section>

          {/* Activity Section */}
          <section className="profile-section">
            <button
              className="section-header"
              onClick={() => toggleSection('activity')}
            >
              <div className="section-title">
                <Activity size={16} />
                <span>Activity</span>
              </div>
              <span className={`chevron ${expanded.activity ? 'open' : ''}`}>▼</span>
            </button>

            {expanded.activity && (
              <div className="section-content">
                <div className="info-row">
                  <label>
                    <Clock size={14} /> Last Active
                  </label>
                  <span className="info-value">
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleString()
                      : 'Never'}
                  </span>
                </div>

                {/* Activity Timeline */}
                <div className="activity-timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <p className="timeline-event">Account Created</p>
                      <p className="timeline-date">
                        {new Date(user.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {user.lastActiveAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <p className="timeline-event">Last Activity</p>
                        <p className="timeline-date">
                          {new Date(user.lastActiveAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className="drawer-footer">
          <button
            className="btn-secondary-small"
            onClick={() => {
              onEdit(user);
              onClose();
            }}
          >
            Edit User
          </button>

          {user.isActive ? (
            <button
              className="btn-danger-small"
              onClick={() => {
                onDeactivate(user._id);
                onClose();
              }}
            >
              Deactivate
            </button>
          ) : (
            <button
              className="btn-success-small"
              onClick={() => {
                onActivate(user._id);
                onClose();
              }}
            >
              Activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * RoleCapabilityList - Shows preview of role capabilities
 */
function RoleCapabilityList({ role }) {
  const capabilities = {
    VIEWER: ['View Dashboard', 'View Reports', 'View Alerts'],
    LOGISTICS_OPERATOR: ['Create Shipments', 'Edit Shipments', 'View Dashboard'],
    INVENTORY_MANAGER: ['Create Inventory', 'Edit Inventory', 'View Reports'],
    RISK_ANALYST: ['View Alerts', 'View Audit Logs', 'View Dashboard'],
    ORG_ADMIN: [
      'Full System Access',
      'Manage Users',
      'System Settings',
      'View Audit Logs',
    ],
  };

  const roleCaps = capabilities[role] || [];

  return (
    <ul className="capabilities-list">
      {roleCaps.map((cap, i) => (
        <li key={i}>
          <CheckCircle2 size={12} className="cap-icon" />
          {cap}
        </li>
      ))}
    </ul>
  );
}

export default UserProfileDrawer;
