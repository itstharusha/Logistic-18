/**
 * Sidebar.jsx — Navigation Sidebar Component
 *
 * Responsibility:
 *   Renders a secondary left-hand navigation panel with links grouped by area:
 *   - Platform:   Dashboard overview
 *   - Operations: Suppliers, Shipments, Inventory
 *   - Management: Alerts, Analytics/Reports
 *   - Admin:      Users, Settings
 *
 *   Note: This sidebar component is currently not used in the main app —
 *   the TopNav bar handles all navigation instead. It is kept for potential
 *   future use or alternative layouts.
 *
 *   Styling is provided by styles/layout.css (.sidebar, .sidebar-nav, etc.)
 */

import React from 'react';
import '../styles/layout.css';

/**
 * Sidebar
 * Left-hand navigation panel. Links use plain <a> tags (not React Router's <Link>)
 * which means clicking them causes a full page reload — acceptable for a sidebar
 * but could be updated to <Link> for SPA behavior if integrated into the layout.
 */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">

        {/* Platform section — top-level overview */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Platform</h3>
          <a href="/dashboard" className="sidebar-link active">
            Dashboard
          </a>
        </div>

        {/* Operations section — day-to-day supply chain management */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Operations</h3>
          <a href="/suppliers" className="sidebar-link">Suppliers</a>
          <a href="/shipments" className="sidebar-link">Shipments</a>
          <a href="/inventory" className="sidebar-link">Inventory</a>
          <a href="/warehouses" className="sidebar-link">Warehouses</a>
        </div>

        {/* Management section — monitoring and reporting tools */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Management</h3>
          <a href="/alerts" className="sidebar-link">Alerts</a>
          <a href="/analytics" className="sidebar-link">Reports</a>
        </div>

        {/* Admin section — user and system configuration */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Admin</h3>
          <a href="/users" className="sidebar-link">Users</a>
          <a href="/settings" className="sidebar-link">Settings</a>
        </div>

      </nav>
    </aside>
  );
}
