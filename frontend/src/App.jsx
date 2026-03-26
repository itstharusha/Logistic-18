import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './redux/authSlice.js';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import WarehousePage from './pages/WarehousePage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import SupplierDetailPage from './pages/SupplierDetailPage.jsx';
import ShipmentsPage from './pages/ShipmentsPage.jsx';
import ShipmentDetailPage from './pages/ShipmentDetailPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';

// Analytics Pages (Senadeera's module)
import AnalyticsDashboardPage from './pages/Analytics/AnalyticsDashboardPage.jsx';
import KPIPage from './pages/Analytics/KPI-page.jsx';
import ReportsPage from './pages/Analytics/ReportsPage.jsx';

// Protected Route Component
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const accessToken = localStorage.getItem('accessToken');

  if (!isInitialized) return null;

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

        {/* Inventory routes */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredRoles={['ORG_ADMIN', 'INVENTORY_MANAGER', 'VIEWER']}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouses"
          element={
            <ProtectedRoute requiredRoles={['ORG_ADMIN', 'INVENTORY_MANAGER', 'VIEWER']}>
              <WarehousePage />
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

        {/* Shipment Tracking routes */}
        <Route path="/shipments" element={<ProtectedRoute><ShipmentsPage /></ProtectedRoute>} />
        <Route path="/shipments/:id" element={<ProtectedRoute><ShipmentDetailPage /></ProtectedRoute>} />
        
        {/* Alerts route */}
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />

        {/* Analytics Routes (Senadeera's module) */}
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;