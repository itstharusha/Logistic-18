import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './redux/authSlice.js';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

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
    // Verify session on app load if token exists
    if (accessToken) {
      dispatch(getMe());
    } else {
      // No token, finish initialization immediately
      dispatch({ type: 'auth/getMe/rejected' });
    }
  }, [dispatch, accessToken]);

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

        {/* Placeholder routes */}
        <Route path="/suppliers" element={<div className="temp-page">Suppliers page - implemented by Rifshadh</div>} />
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
