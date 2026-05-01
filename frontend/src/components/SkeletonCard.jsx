import React from 'react';
import '../styles/SkeletonLoader.css';

/**
 * SkeletonLoader - Loading skeleton for Kanban user cards
 * Matches the layout of actual user cards
 */
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-text-group">
          <div className="skeleton-text skeleton-name" />
          <div className="skeleton-text skeleton-email" />
        </div>
      </div>

      <div className="skeleton-badges">
        <div className="skeleton-badge" />
        <div className="skeleton-badge" />
      </div>

      <div className="skeleton-footer">
        <div className="skeleton-text skeleton-last-active" />
      </div>

      <div className="skeleton-actions">
        <div className="skeleton-button" />
        <div className="skeleton-button" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;
