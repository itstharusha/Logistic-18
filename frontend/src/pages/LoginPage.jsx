import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login, clearError } from '../redux/authSlice.js';
import AuthBackground from '../components/AuthBackground.jsx';
import '../styles/auth.css';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(formData));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/');
    }
  };

  return (
    <AuthBackground>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: '12px' }}>
              <svg className="nav-logo-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#E85D2F" />
                <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10c2.39 0 4.59-.84 6.32-2.24" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M16 10c-3.314 0-6 2.686-6 6s2.686 6 6 6" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="16" cy="16" r="2.5" fill="white" />
              </svg>
              <h1 className="nav-brand" style={{ color: 'var(--text-primary)' }}>Logistic 18</h1>
            </div>
            <p>Smart Logistics & Supply Chain Management</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Login</h2>

            {error && (
              <div className="form-error">
                {error}
                <button
                  type="button"
                  onClick={() => dispatch(clearError())}
                  className="error-dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              aria-busy={loading}
              aria-label={loading ? "Signing in" : "Sign in"}
            >
              {loading && <span className="spinner" aria-hidden="true"></span>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="auth-footer">
              Don't have an account?{' '}
              <Link to="/register">Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </AuthBackground>
  );
}
