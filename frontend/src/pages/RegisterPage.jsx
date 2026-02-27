import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register, clearError } from '../redux/authSlice.js';
import AuthBackground from '../components/AuthBackground.jsx';
import '../styles/auth.css';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgId: '',
  });
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Validate password strength
    if (name === 'password') {
      setPasswordValidation({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    const result = await dispatch(register(registerData));

    if (result.meta.requestStatus === 'fulfilled') {
      setTimeout(() => navigate('/login'), 2000);
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
            <h2>Create Account</h2>

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

            {message && (
              <div className="form-success">
                {message}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                disabled={loading}
              />
            </div>

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
              <div className="password-validation">
                <p className={passwordValidation.length ? 'valid' : ''}>
                  ✓ At least 8 characters
                </p>
                <p className={passwordValidation.uppercase ? 'valid' : ''}>
                  ✓ At least one uppercase letter
                </p>
                <p className={passwordValidation.lowercase ? 'valid' : ''}>
                  ✓ At least one lowercase letter
                </p>
                <p className={passwordValidation.number ? 'valid' : ''}>
                  ✓ At least one number
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="orgId">Organization ID</label>
              <input
                id="orgId"
                name="orgId"
                type="text"
                value={formData.orgId}
                onChange={handleChange}
                placeholder="Your organization ID"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              aria-busy={loading}
              aria-label={loading ? "Creating account" : "Create account"}
            >
              {loading && <span className="spinner" aria-hidden="true"></span>}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="auth-footer">
              Already have an account?{' '}
              <Link to="/login">Login here</Link>
            </p>
          </form>
        </div>
      </div>
    </AuthBackground>
  );
}
