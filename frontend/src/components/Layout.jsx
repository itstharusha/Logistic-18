/**
 * Layout.jsx — Application Shell / Page Wrapper Component
 *
 * Responsibility:
 *   Provides the consistent visual frame for every authenticated page.
 *   Renders the TopNav at the top and wraps the specific page content
 *   (passed as children) inside a padded content area below it.
 *
 *   Every protected page in App.jsx is wrapped in this component:
 *     <Layout>
 *       <DashboardPage />
 *     </Layout>
 *
 *   The actual CSS for .layout and .layout-content is in styles/layout.css.
 */

import React from 'react';
import TopNav from './TopNav.jsx';
import '../styles/layout.css';

/**
 * Layout
 * Shell component that composes the top navigation bar with the page body.
 *
 * @param {React.ReactNode} children - The page component to render in the body area
 */
export default function Layout({ children }) {
  return (
    <div className="layout">
      {/* Persistent top navigation bar with branding, nav links, and user menu */}
      <TopNav />

      {/* Page-specific content rendered below the nav */}
      <div className="layout-content">
        {children}
      </div>
    </div>
  );
}
