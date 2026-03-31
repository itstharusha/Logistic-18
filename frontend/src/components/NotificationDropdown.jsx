import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, AlertCircle, Clock, Loader } from 'lucide-react';
import {
  fetchAlerts,
  closeNotificationDropdown,
  acknowledgeAlert,
} from '../redux/alertsSlice';
import '../styles/NotificationDropdown.css';

// Severity color mapping
const SEVERITY_COLORS = {
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

// Entity type to icon mapping
const ENTITY_ICONS = {
  shipment: '📦',
  inventory: '📊',
  supplier: '🏭',
  warehouse: '🏢',
  system: '⚙️',
  default: '🔔',
};

function NotificationDropdown() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { alerts, loading, showNotificationDropdown } = useSelector(
    (state) => state.alerts
  );

  // Fetch alerts when dropdown opens
  useEffect(() => {
    if (showNotificationDropdown && (!alerts || alerts.length === 0)) {
      dispatch(fetchAlerts({ limit: 8, sort: '-createdAt' }));
    }
  }, [showNotificationDropdown, dispatch, alerts]);

  if (!showNotificationDropdown) return null;

  // Get unread alerts (open or not acknowledged)
  const unreadAlerts = alerts?.filter(
    (alert) => alert.status === 'open' || !alert.status
  ) || [];

  // Get recent alerts for display (limit to 5)
  const displayAlerts = alerts?.slice(0, 5) || [];

  const handleAlertClick = (alertId) => {
    // Mark as read if it's unread
    const alert = alerts.find((a) => a._id === alertId);
    if (alert && (alert.status === 'open' || !alert.status)) {
      dispatch(acknowledgeAlert(alertId));
    }
    
    // Close dropdown and navigate
    dispatch(closeNotificationDropdown());
    navigate('/alerts');
  };

  const handleViewAll = () => {
    dispatch(closeNotificationDropdown());
    navigate('/alerts');
  };

  return (
    <div className="notification-dropdown-overlay">
      <div className="notification-dropdown-content">
        {/* Header */}
        <div className="notification-header">
          <h3 className="notification-title">Notifications</h3>
          {unreadAlerts.length > 0 && (
            <span className="notification-unread-badge">
              {unreadAlerts.length} new
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="notification-loading">
            <Loader size={20} className="spinner" />
            <span>Loading notifications...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && displayAlerts.length === 0 && (
          <div className="notification-empty">
            <AlertCircle size={32} strokeWidth={1.5} />
            <p>No notifications yet</p>
          </div>
        )}

        {/* Alert items */}
        {!loading && displayAlerts.length > 0 && (
          <div className="notification-items">
            {displayAlerts.map((alert) => {
              const isUnread = alert.status === 'open' || !alert.status;
              const severity = alert.severity || 'medium';

              return (
                <div
                  key={alert._id}
                  className={`notification-item ${isUnread ? 'unread' : 'read'}`}
                  style={{
                    borderLeftColor: SEVERITY_COLORS[severity],
                  }}
                  onClick={() => handleAlertClick(alert._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAlertClick(alert._id);
                  }}
                >
                  {/* Entity icon and entity type */}
                  <div className="notification-entity">
                    <span className="entity-icon">
                      {ENTITY_ICONS[alert.entity?.toLowerCase()] ||
                        ENTITY_ICONS.default}
                    </span>
                    <span className="entity-type">
                      {alert.entity || 'System'}
                    </span>
                  </div>

                  {/* Message */}
                  <div className="notification-message">
                    <p className="message-text">{alert.message}</p>
                    <span className="message-time">
                      {formatTimeAgo(alert.createdAt)}
                    </span>
                  </div>

                  {/* Status indicator */}
                  <div className="notification-status">
                    {isUnread ? (
                      <div className="unread-dot" />
                    ) : (
                      <CheckCircle2
                        size={14}
                        strokeWidth={2}
                        className="read-icon"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with view all button */}
        {displayAlerts.length > 0 && (
          <div className="notification-footer">
            <button className="view-all-btn" onClick={handleViewAll}>
              View all notifications →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format time
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'just now';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default NotificationDropdown;
