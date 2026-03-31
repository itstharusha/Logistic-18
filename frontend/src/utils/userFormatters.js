/**
 * userFormatters.js - Utility functions for user display formatting
 */

/**
 * Calculate duration since last activity
 * Returns human-readable format like "Active for 3 days" or "Inactive for 2 hours"
 */
export const getStatusDuration = (lastActiveAt, isActive) => {
  if (!lastActiveAt) {
    return isActive ? 'Active now' : 'Never active';
  }

  const date = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return `${isActive ? 'Active' : 'Inactive'} just now`;
  if (diffMins < 60) return `${isActive ? 'Active' : 'Inactive'} for ${diffMins}m`;
  if (diffHours < 24) return `${isActive ? 'Active' : 'Inactive'} for ${diffHours}h`;
  if (diffDays < 7) return `${isActive ? 'Active' : 'Inactive'} for ${diffDays}d`;
  if (diffWeeks < 4) return `${isActive ? 'Active' : 'Inactive'} for ${diffWeeks}w`;
  
  // Format date for longer durations
  return `${isActive ? 'Active' : 'Inactive'} since ${date.toLocaleDateString()}`;
};

/**
 * Get the color status for timeline
 */
export const getStatusColor = (isActive) => {
  return isActive 
    ? { bg: 'rgba(45, 184, 122, 0.2)', text: '#2DB87A', label: 'Active' }
    : { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Inactive' };
};

/**
 * Determine presence status (online/offline/away)
 * Can be enhanced with real WebSocket data
 */
export const getPresenceStatus = (lastActiveAt, isActive) => {
  if (!isActive) return 'offline';
  
  if (!lastActiveAt) return 'online';
  
  const diffMs = new Date() - new Date(lastActiveAt);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 5) return 'online';
  if (diffMins < 30) return 'away';
  return 'offline';
};

/**
 * Get color for presence status
 */
export const getPresenceColor = (status) => {
  switch (status) {
    case 'online':
      return '#10b981';
    case 'away':
      return '#f59e0b';
    case 'offline':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};
