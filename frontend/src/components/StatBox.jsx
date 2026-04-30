/**
 * StatBox.jsx — Simple stat display component
 * Used in KPI pages to show label-value pairs
 */
import React from 'react';

export default function StatBox({ label, value }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
