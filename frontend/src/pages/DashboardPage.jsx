import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, Bell, BarChart3, MapPin, AlertTriangle,
  ArrowUpRight, Building2, Truck, Archive, CheckCircle2, Star,
  BarChart2, Activity
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import Layout from '../components/Layout.jsx';
import {
  fetchDashboard,
  selectDashboard,
  selectLoading,
  selectError,
} from '../redux/analyticsSlice.js';
import '../styles/pages.css';



ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

/* ─── Animated Counter Hook ─── */
function useAnimatedCounter(target, duration = 700, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(+(eased * target).toFixed(decimals));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

/* ─── Counter Component ─── */
function Counter({ target, decimals = 0, suffix = '' }) {
  const val = useAnimatedCounter(target, 700, decimals);
  return <>{val}{suffix}</>;
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get data from Redux
  const dashboardData = useSelector(selectDashboard);
  const isLoading = useSelector(selectLoading);
  const apiError = useSelector(selectError);

  // Fetch dashboard data on mount + auto-refresh every 30s (Audit Fix W2)
  useEffect(() => {
    dispatch(fetchDashboard());
    const pollInterval = setInterval(() => dispatch(fetchDashboard()), 30000);
    return () => clearInterval(pollInterval);
  }, [dispatch]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Trigger callout after chart animation completes
    if (!isLoading) {
      const chartTimer = setTimeout(() => setChartReady(true), 1100);
      return () => clearTimeout(chartTimer);
    }
  }, [isLoading]);

  /* ─── Chart.js Config ─── */
  // Use real data from Redux if available, with fallback to empty
  const trendData = dashboardData?.trendChart?.data || [];
  const trendLabels = dashboardData?.trendChart?.labels || [];

  const chartData = {
    labels: trendLabels.length > 0 ? trendLabels : ['Loading...'],
    datasets: [{
      data: trendData.length > 0 ? trendData : [0],
      borderColor: '#E85D2F',
      borderWidth: 2.5,
      pointBackgroundColor: '#1A1C1A',
      pointBorderColor: '#E85D2F',
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.45,
      fill: true,
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
        gradient.addColorStop(0, 'rgba(232,93,47,0.20)');
        gradient.addColorStop(1, 'rgba(232,93,47,0)');
        return gradient;
      },
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#1A1C1A',
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => `Risk: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#9A9E9A' } },
      y: { min: 0, max: 100, grid: { color: 'rgba(90,94,90,0.12)' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#9A9E9A' } },
    },
  };

  // Audit Fix W1: Quick Actions navigate to the correct page
  const actionRoutes = {
    users: '/users',
    suppliers: '/suppliers',
    alerts: '/alerts',
    reports: '/reports',
  };

  const triggerAction = (id) => {
    const route = actionRoutes[id];
    if (route) {
      navigate(route);
    }
  };

  return (
    <Layout>
      {/* Error Banner */}
      {apiError && (
        <div className="error-banner" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b' }}>
          ⚠️ {apiError}
        </div>
      )}

      {/* ═══ HERO BANNER ═══ */}
      <section className="dashboard-hero">
        <span className="hero-location">Location : Colombo, Sri Lanka</span>
        <h1 className="hero-title">Logistic 18<br />Overview Dashboard</h1>
        <div className="hero-actions">
          <button className="hero-btn hero-btn--dark" onClick={() => { }}>
            <AlertTriangle size={15} /> Risk Alerts
          </button>
        </div>
        <div className="hero-datetime">
          <div className="hero-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="hero-date">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </section>

      {/* ═══ CARD ROW 1 ═══ */}
      <div className="dashboard-row-1">

        {/* CARD A — Today's Risk Alerts */}
        <div className={`dash-card card-alerts anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.10s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Today's Risk Alerts</h2>
              <span className="card-subtitle">{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
            <a href="/alerts" className="card-expand-btn" aria-label="Expand alerts">
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="alert-rows">
            {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
              dashboardData.alerts.slice(0, 3).map((alert, index) => (
                <React.Fragment key={alert._id || index}>
                  <div className="alert-row">
                    <span className={`alert-pill alert-pill--${alert.severity.toLowerCase()}`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                    <div className="alert-info">
                      <span className="alert-name">{alert.entityName || 'Unknown'}</span>
                      <span className="alert-desc">{alert.description || 'No description'}</span>
                    </div>
                    <span className="alert-code">{alert.alertId || 'N/A'}</span>
                  </div>
                  {index < Math.min(2, dashboardData.alerts.length - 1) && <div className="alert-divider"></div>}
                </React.Fragment>
              ))
            ) : (
              <div className="alert-row">
                <span className="alert-pill alert-pill--low">INFO</span>
                <div className="alert-info">
                  <span className="alert-name">No Active Alerts</span>
                  <span className="alert-desc">System operating normally</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD B — System Overview */}
        <div className={`dash-card card-overview anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.20s' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2DB87A', animation: 'pulse-live 2s infinite' }}></div>
              <h2 className="card-title">System Overview</h2>
            </div>
            <div>
              <span className="card-subtitle">Hub ID: LG-CMB-0018</span>
            </div>
            <a href="/analytics" className="card-expand-btn" aria-label="Expand overview">
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="overview-grid">
            <div className="overview-metric">
              <div className="metric-icon"><Activity size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.riskScore || 0} decimals={1} suffix="%" /></div>
                <div className="metric-label">Risk Score</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Bell size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.activeAlerts || 0} /></div>
                <div className="metric-label">Active Alerts</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Truck size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.delayedShipments || 0} /></div>
                <div className="metric-label">Delayed Ship</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Archive size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.atRiskInventory || 0} /></div>
                <div className="metric-label">At-Risk Inv</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Users size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.registeredUsers || 0} /></div>
                <div className="metric-label">Reg Users</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><CheckCircle2 size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={dashboardData?.overview?.onTimeRate || 0} decimals={1} suffix="%" /></div>
                <div className="metric-label">On-Time Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD C — Risk Score Trend */}
        <div className={`dash-card card-trend anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.30s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Risk Score Trend</h2>
              <span className="card-subtitle">Aggregated View</span>
            </div>
            <a href="/analytics" className="card-expand-btn" aria-label="Expand trend">
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="chart-container">
            <Line ref={chartRef} data={chartData} options={chartOptions} />
            <div className={`chart-callout ${chartReady ? 'visible' : ''}`}>
              <div className="callout-dot"></div>
              <span>Trend {dashboardData?.trendDirection === 'up' ? '↑' : '↓'} {dashboardData?.trendChange || '+0'}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CARD ROW 2 ═══ */}
      <div className="dashboard-row-2">

        {/* CARD D — Quick Actions */}
        <div className={`dash-card card-actions anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.40s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Quick Actions</h2>
              <span className="card-subtitle">One-tap utilities</span>
            </div>
          </div>
          <div className="actions-grid">
            <div className="action-item" onClick={() => triggerAction('users')}>
              <Users size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Users</span>
                <span className="action-desc">Manage organization users</span>
              </div>
              <span className="action-badge">★ Admin</span>
            </div>
            <div className="action-item" onClick={() => triggerAction('suppliers')}>
              <Briefcase size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Suppliers</span>
                <span className="action-desc">Supplier risk profiles</span>
              </div>
              <span className="action-badge">★ Risk</span>
            </div>
            <div className="action-item" onClick={() => triggerAction('alerts')}>
              <Bell size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Alerts</span>
                <span className="action-desc">Urgent system notifications</span>
              </div>
              <span className="action-badge">★ Urgent</span>
            </div>
            <div className="action-item" onClick={() => triggerAction('reports')}>
              <BarChart3 size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Reports</span>
                <span className="action-desc">Analytics and insights</span>
              </div>
              <span className="action-badge">★ Analytics</span>
            </div>
          </div>
        </div>

        {/* CARD E — Risk Breakdown */}
        <div className={`dash-card card-breakdown anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.50s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Risk Breakdown</h2>
              <span className="card-subtitle">Current period</span>
            </div>
          </div>
          <span className="breakdown-overline">HIGHEST RISK ENTITY</span>

          <div className="breakdown-rows">
            <div className="breakdown-row">
              <Building2 size={16} className="breakdown-icon" />
              <span className="breakdown-label">Supplier Risk:</span>
              <span className="breakdown-value">{dashboardData?.breakdown?.supplierRisk || 'N/A'}</span>
            </div>
            <div className="alert-divider"></div>
            <div className="breakdown-row">
              <Truck size={16} className="breakdown-icon" />
              <span className="breakdown-label">Shipment Risk:</span>
              <span className="breakdown-value">{dashboardData?.breakdown?.shipmentRisk || 'N/A'}</span>
            </div>
            <div className="alert-divider"></div>
            <div className="breakdown-row">
              <Archive size={16} className="breakdown-icon" />
              <span className="breakdown-label">Inventory Risk:</span>
              <span className="breakdown-value">{dashboardData?.breakdown?.inventoryRisk || 'N/A'}</span>
            </div>
          </div>

          <a href="/analytics" className="breakdown-cta">
            <BarChart2 size={16} /> View Full Analytics
          </a>
        </div>

        {/* CARD F — Active Users */}
        <div className={`dash-card card-users anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.60s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Active Users</h2>
              <span className="card-subtitle">{dashboardData?.activeUsers?.length || 0} users {dashboardData?.activeUsers?.length > 0 ? 'online' : 'offline'}</span>
            </div>
            <a href="/users" className="card-expand-btn" aria-label="Expand users">
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="user-rows">
            {dashboardData?.activeUsers && dashboardData.activeUsers.length > 0 ? (
              dashboardData.activeUsers.slice(0, 3).map((user, index) => (
                <React.Fragment key={user._id || index}>
                  <div className="user-row">
                    <div className="user-avatar" style={{ backgroundColor: user.avatarColor || '#E85D2F' }}>
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.name || 'Unknown User'}</span>
                      <span className="user-role">{user.role || 'No role'}</span>
                    </div>
                    {user.rating && (
                      <div className="user-rating">
                        <Star size={12} className="star-icon" fill="#E85D2F" stroke="#E85D2F" /> 
                        <span>{user.rating}</span>
                      </div>
                    )}
                    <span className="user-badge">{user.roleCode || 'USER'}</span>
                  </div>
                  {index < Math.min(2, dashboardData.activeUsers.length - 1) && <div className="alert-divider"></div>}
                </React.Fragment>
              ))
            ) : (
              <div className="user-row">
                <span style={{ padding: '8px' }}>No active users at this time</span>
              </div>
            )}
          </div>
        </div>
      </div >
    </Layout >
  );
}
