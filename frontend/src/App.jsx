import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './redux/authSlice.js';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

// Analytics Pages (YOUR MODULE)
import AnalyticsDashboardPage from './pages/Analytics/AnalyticsDashboardPage.jsx';
import KPIPage from './pages/Analytics/KPI-page.jsx';
import ReportsPage from './pages/Analytics/ReportsPage.jsx';

// Protected Route Component
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, accessToken, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) return null;

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const dispatch = useDispatch();
  const { isInitialized, accessToken } = useSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken && !isInitialized) {
      dispatch(getMe());
    }
  }, [dispatch, accessToken, isInitialized]);

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

        {/* Main Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Users Management */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRoles={['ORG_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Other modules (group members) */}
        <Route path="/suppliers" element={<div className="temp-page">Suppliers page - implemented by Rifshadh</div>} />
        <Route path="/shipments" element={<div className="temp-page">Shipments page - implemented by Umayanthi</div>} />
        <Route path="/inventory" element={<div className="temp-page">Inventory page - implemented by Wijemanna</div>} />
        <Route path="/alerts" element={<div className="temp-page">Alerts page - implemented by Kulatunga</div>} />

        {/* ANALYTICS MODULE (YOUR PART) */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics/kpi"
          element={
            <ProtectedRoute>
              <KPIPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;