import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './redux/authSlice.js';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import SupplierDetailPage from './pages/SupplierDetailPage.jsx';

// Protected Route Component
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const accessToken = localStorage.getItem('accessToken');

  if (!isInitialized) return null; // Wait for auth check

  if (!accessToken || !user) {
    return <Navigate to="/login" />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  const dispatch = useDispatch();
  const { isInitialized, accessToken } = useSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken) {
      dispatch(getMe());
    } else {
      dispatch({ type: 'auth/getMe/rejected' });
    }
  }, [dispatch, accessToken]);

  // Failsafe: if a token exists but auth never resolves within 8s, force clear and continue
  useEffect(() => {
    if (!accessToken || isInitialized) return;
    const timer = setTimeout(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'auth/getMe/rejected' });
    }, 8000);
    return () => clearTimeout(timer);
  }, [accessToken, isInitialized, dispatch]);

  if (accessToken && !isInitialized) {
    return (
      <div className="initial-loading">
        <div className="spinner"></div>
        <p>Verifying session...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRoles={['ORG_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Supplier routes */}
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers/:id"
          element={
            <ProtectedRoute>
              <SupplierDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/shipments" element={<div className="temp-page">Shipments page - implemented by Umayanthi</div>} />
        <Route path="/inventory" element={<div className="temp-page">Inventory page - implemented by Wijemanna</div>} />
        <Route path="/alerts" element={<div className="temp-page">Alerts page - implemented by Kulatunga</div>} />
        <Route path="/analytics" element={<div className="temp-page">Analytics page - implemented by Senadeera</div>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
