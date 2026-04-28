/**
 * TopNav.jsx — Top Navigation Bar Component
 *
 * Responsibility:
 *   Renders the persistent horizontal navigation bar shown on every authenticated page.
 *   Contains three sections:
 *
 *   LEFT  — Brand logo (SVG icon + "Logistic 18" text)
 *   CENTER — Navigation tabs for each main section of the app.
 *            The "Users" tab is only shown to ORG_ADMIN users.
 *            Each tab has a subtle magnetic hover effect (follows mouse cursor slightly).
 *   RIGHT  — Notification bell (with badge) and user avatar dropdown menu
 *            (Profile, Settings, Logout).
 *
 *   The active tab is highlighted based on the current React Router URL path.
 *   Logout dispatches the Redux `logout` action and redirects to /login.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, Moon, Sun, Shield } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice.js';
import {
  toggleNotificationDropdown,
  closeNotificationDropdown,
  selectNotificationDropdownOpen,
  selectAlerts,
} from '../redux/alertsSlice.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ROLES, getRoleLabel, getRoleColor } from '../config/rbac.constants.js';
import NotificationDropdown from './NotificationDropdown';
import UserProfileDrawer from './UsersPage/UserProfileDrawer';
import '../styles/layout.css';

/**
 * TopNav
 * Main navigation bar component. Reads user state from Redux to determine
 * which nav items to show and to display the user's initial in the avatar circle.
 */
export default function TopNav() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Current authenticated user from Redux auth state
  const user = useSelector((state) => state.auth.user);

  // Notification state from Redux
  const notificationDropdownOpen = useSelector(selectNotificationDropdownOpen);
  const alerts = useSelector(selectAlerts);

  // Controls whether the user dropdown menu is visible
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { theme, setTheme } = useTheme();

  // Controls whether the user profile drawer is visible
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // Tracks per-tab magnetic transform offsets for the hover animation
  const [magnetic, setMagnetic] = useState({});

  // Ref for detecting outside clicks
  const notificationRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        dispatch(closeNotificationDropdown());
      }
    };

    if (notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notificationDropdownOpen, dispatch]);

  /**
   * isActive
   * Returns true if the current URL path exactly matches the given path.
   * Used to add the 'active' CSS class to the correct navigation tab.
   */
  const isActive = (path) => location.pathname === path;

  /**
   * handleLogout
   * Dispatches the async logout thunk (invalidates the refresh token on the server),
   * then navigates to the login page regardless of the result.
   */
  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  /**
   * handleMagnetic
   * On mouse move over a nav tab, calculates a subtle X/Y offset
   * proportional to the cursor's distance from the tab's centre.
   * Creates a "magnetic" pull effect that makes the tab feel alive.
   */
  const handleMagnetic = (e, index) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.15;  // 15% of offset
    const y = (e.clientY - (top + height / 2)) * 0.15;
    setMagnetic({ [index]: { transform: `translate(${x}px, ${y}px)` } });
  };

  /**
   * resetMagnetic
   * Resets all tab transforms to zero when the mouse leaves a tab.
   */
  const resetMagnetic = () => setMagnetic({});

  // Navigation paths in display order; labels are derived from the path string
  const navPaths = ['/', '/suppliers', '/shipments', '/inventory', '/warehouses', '/alerts', '/analytics', '/users'];

  return (
    <nav className="topnav" role="navigation" aria-label="Main navigation">

      {/* ── Brand Logo ─────────────────────────────── */}
      <div className="nav-logo">
        {/* Orange circular swirl SVG logo mark */}
        <svg className="nav-logo-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#E85D2F" />
          <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10c2.39 0 4.59-.84 6.32-2.24" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M16 10c-3.314 0-6 2.686-6 6s2.686 6 6 6" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="2.5" fill="white" />
        </svg>
        <h1 className="nav-brand">Logistic 18</h1>
      </div>

      {/* ── Navigation Tabs ─────────────────────────── */}
      <div className="nav-tabs" role="tablist">
        {navPaths.map((path, i) => {
          // VIEWER role: only allow access to Overview tab (/)
          if (user?.role === ROLES.VIEWER && path !== '/') return null;

          // Hide the Users tab from non-admin users (RBAC enforcement in UI)
          if (path === '/users' && user?.role !== ROLES.ORG_ADMIN) return null;

          // Capitalise the path segment for use as label (e.g. "/suppliers" → "Suppliers")
          const label = path === '/'
            ? 'Overview'
            : path.slice(1).charAt(0).toUpperCase() + path.slice(2);

          return (
            <Link
              key={path}
              to={path}
              className={`nav-tab ${isActive(path) ? 'active' : ''}`}
              style={magnetic[i] || {}}             // Apply magnetic offset if hovering
              onMouseMove={(e) => handleMagnetic(e, i)}
              onMouseLeave={resetMagnetic}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── Actions (Theme Toggle + Notifications + User Menu) ─────── */}
      <div className="nav-actions">

        {/* Theme Toggle Button */}
        <button
          className="nav-icon-btn"
          title={`Switch to ${theme === 'night' ? 'light' : 'dark'} mode`}
          onClick={() => setTheme(theme === 'night' ? 'default' : 'night')}
        >
          {theme === 'night' ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
        </button>

        {/* Notification Bell with badge showing unread count */}
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            className="nav-icon-btn"
            title="Notifications"
            aria-label="Notifications"
            aria-describedby="notification-badge"
            onClick={() => dispatch(toggleNotificationDropdown())}
          >
            <Bell size={20} strokeWidth={1.8} />
            {alerts && alerts.length > 0 && (
              <span
                id="notification-badge"
                className="notification-badge"
                aria-live="polite"
                aria-atomic="true"
              >
                {alerts.length}
              </span>
            )}
          </button>
          {notificationDropdownOpen && <NotificationDropdown />}
        </div>

        {/* User Avatar and Dropdown Menu */}
        <div className="nav-user-menu">
          {/* Avatar button — shows the user's first name initial */}
          <button
            className="nav-user-btn"
            title="User menu"
            aria-haspopup="true"
            aria-expanded={showUserMenu}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label={`User menu for ${user?.email || 'User'}`}
          >
            <div className="nav-avatar" aria-hidden="true">{user?.name?.[0] || 'A'}</div>
          </button>

          {/* Dropdown — shown when avatar is clicked */}
          <div className="nav-user-dropdown" style={{ display: showUserMenu ? 'block' : 'none' }}>
            {/* User role badge */}
            {user?.role && (
              <div className="nav-dropdown-role-badge">
                <Shield size={14} />
                <span>{getRoleLabel(user.role)}</span>
              </div>
            )}
            
            <button
              onClick={() => { setShowProfileDrawer(true); setShowUserMenu(false); }}
              className="dropdown-item"
            >
              <User size={18} /> Profile
            </button>
            <button
              onClick={() => { setShowUserMenu(false); handleLogout(); }}
              className="dropdown-item logout"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

      </div>

      {/* ── User Profile Drawer ────────────────────── */}
      {showProfileDrawer && (
        <UserProfileDrawer
          user={user}
          onClose={() => setShowProfileDrawer(false)}
          readOnly
        />
      )}
    </nav>
  );
}
