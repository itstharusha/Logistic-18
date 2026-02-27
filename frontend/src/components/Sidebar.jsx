import React from 'react';
import '../styles/layout.css';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <h3 className="sidebar-title">Platform</h3>
          <a href="/dashboard" className="sidebar-link active">
            Dashboard
          </a>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Operations</h3>
          <a href="/suppliers" className="sidebar-link">Suppliers</a>
          <a href="/shipments" className="sidebar-link">Shipments</a>
          <a href="/inventory" className="sidebar-link">Inventory</a>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Management</h3>
          <a href="/alerts" className="sidebar-link">Alerts</a>
          <a href="/analytics" className="sidebar-link">Reports</a>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Admin</h3>
          <a href="/users" className="sidebar-link">Users</a>
          <a href="/settings" className="sidebar-link">Settings</a>
        </div>
      </nav>
    </aside>
  );
}
