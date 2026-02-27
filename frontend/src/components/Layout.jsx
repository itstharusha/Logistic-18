import React from 'react';
import TopNav from './TopNav.jsx';
import '../styles/layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <TopNav />
      <div className="layout-content">
        {children}
      </div>
    </div>
  );
}
