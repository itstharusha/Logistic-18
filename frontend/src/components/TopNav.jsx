import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, User, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice.js';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import '../styles/layout.css';

export default function TopNav() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const themeMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false);
      }
    };
    if (showThemeMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu]);

  const themeIcon = theme === 'night' ? <Moon size={18} strokeWidth={1.8} />
    : theme === 'day' ? <Sun size={18} strokeWidth={1.8} />
    : <Monitor size={18} strokeWidth={1.8} />;

  const themeOptions = [
    { id: 'default', label: 'Default', icon: <Monitor size={15} strokeWidth={1.8} /> },
    { id: 'day',     label: 'Day',     icon: <Sun  size={15} strokeWidth={1.8} /> },
    { id: 'night',   label: 'Night',   icon: <Moon size={15} strokeWidth={1.8} /> },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const [magnetic, setMagnetic] = useState({});

  const handleMagnetic = (e, index) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.15;
    const y = (e.clientY - (top + height / 2)) * 0.15;
    setMagnetic({ [index]: { transform: `translate(${x}px, ${y}px)` } });
  };

  const resetMagnetic = () => setMagnetic({});

  return (
    <nav className="topnav" role="navigation" aria-label="Main navigation">
      <div className="nav-logo">
        {/* Orange swirl logo mark */}
        <svg className="nav-logo-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#E85D2F" />
          <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10c2.39 0 4.59-.84 6.32-2.24" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M16 10c-3.314 0-6 2.686-6 6s2.686 6 6 6" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="2.5" fill="white" />
        </svg>
        <h1 className="nav-brand">Logistic 18</h1>
      </div>

      <div className="nav-tabs" role="tablist">
        {['/', '/suppliers', '/shipments', '/inventory', '/alerts', '/analytics', '/users'].map((path, i) => {
          if (path === '/users' && user?.role !== 'ORG_ADMIN') return null;
          const label = path === '/' ? 'Overview' : path.slice(1).charAt(0).toUpperCase() + path.slice(2);
          return (
            <Link
              key={path}
              to={path}
              className={`nav-tab ${isActive(path) ? 'active' : ''}`}
              style={magnetic[i] || {}}
              onMouseMove={(e) => handleMagnetic(e, i)}
              onMouseLeave={resetMagnetic}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div className="nav-actions">
        <button className="nav-icon-btn" title="Notifications" aria-label="Notifications" aria-describedby="notification-badge">
          <Bell size={20} strokeWidth={1.8} />
          <span id="notification-badge" className="notification-badge" aria-live="polite" aria-atomic="true">3</span>
        </button>

        <div className="nav-theme-menu" ref={themeMenuRef}>
          <button
            className="nav-icon-btn"
            title="Switch theme"
            aria-label="Switch theme"
            aria-haspopup="true"
            aria-expanded={showThemeMenu}
            onClick={() => setShowThemeMenu(!showThemeMenu)}
          >
            {themeIcon}
          </button>
          {showThemeMenu && (
            <div className="nav-theme-dropdown">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  className={`theme-option${theme === t.id ? ' active' : ''}`}
                  onClick={() => { setTheme(t.id); setShowThemeMenu(false); }}
                >
                  {t.icon}
                  <span className="theme-option-label">{t.label}</span>
                  {theme === t.id && <span className="theme-option-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-user-menu">
          <button className="nav-user-btn" title="User menu" aria-haspopup="true" aria-expanded={showUserMenu} onClick={() => setShowUserMenu(!showUserMenu)} aria-label={`User menu for ${user?.email || 'User'}`}>
            <div className="nav-avatar" aria-hidden="true">{user?.name?.[0] || 'A'}</div>
          </button>

          <div className="nav-user-dropdown" style={{ display: showUserMenu ? 'block' : 'none' }}>
            <Link to="/profile" className="dropdown-item">
              <User size={18} /> Profile
            </Link>
            <Link to="/settings" className="dropdown-item">
              <Settings size={18} /> Settings
            </Link>
            <button onClick={() => { setShowUserMenu(false); handleLogout(); }} className="dropdown-item logout">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
