import React, { useEffect, useRef, useState } from 'react';
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
  const chartRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Initial loading shimmer duration
    const shimmerTimer = setTimeout(() => setIsLoading(false), 800);
    // Trigger callout after chart animation completes
    const chartTimer = setTimeout(() => setChartReady(true), 1100);
    return () => {
      clearTimeout(shimmerTimer);
      clearTimeout(chartTimer);
    };
  }, []);

  /* ─── Chart.js Config ─── */
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [28, 35, 52, 42.5, 38, 42.5],
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

  const [actionFeedback, setActionFeedback] = useState(null);

  const triggerAction = (id) => {
    setActionFeedback(id);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  return (
    <Layout>
      {/* ═══ HERO BANNER ═══ */}
      <section className="dashboard-hero">
        <span className="hero-location">Location : Colombo, Sri Lanka</span>
        <h1 className="hero-title">Logistic 18<br />Overview Dashboard</h1>
        <div className="hero-actions">
          <button className="hero-btn hero-btn--light" onClick={() => { }}>
            <MapPin size={15} /> Live Map
          </button>
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
              <span className="card-subtitle">June 20</span>
            </div>
            <a href="/alerts" className="card-expand-btn" aria-label="Expand alerts">
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="alert-rows">
            <div className="alert-row">
              <span className="alert-pill alert-pill--high">HIGH</span>
              <div className="alert-info">
                <span className="alert-name">Supplier Alpha</span>
                <span className="alert-desc">Financial Score Drop</span>
              </div>
              <span className="alert-code">SUP-001</span>
            </div>
            <div className="alert-divider"></div>
            <div className="alert-row">
              <span className="alert-pill alert-pill--med">MED</span>
              <div className="alert-info">
                <span className="alert-name">Shipment #SH-042</span>
                <span className="alert-desc">ETA Exceeded 3h</span>
              </div>
              <span className="alert-code">SHP-042</span>
            </div>
            <div className="alert-divider"></div>
            <div className="alert-row">
              <span className="alert-pill alert-pill--low">LOW</span>
              <div className="alert-info">
                <span className="alert-name">Inventory SKU-881</span>
                <span className="alert-desc">Below Reorder Point</span>
              </div>
              <span className="alert-code">INV-881</span>
            </div>
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
                <div className="metric-value"><Counter target={42.5} decimals={1} suffix="%" /></div>
                <div className="metric-label">Risk Score</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Bell size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={12} /></div>
                <div className="metric-label">Active Alerts</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Truck size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={3} /></div>
                <div className="metric-label">Delayed Ship</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Archive size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={18} /></div>
                <div className="metric-label">At-Risk Inv</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><Users size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={7} /></div>
                <div className="metric-label">Reg Users</div>
              </div>
            </div>
            <div className="overview-metric">
              <div className="metric-icon"><CheckCircle2 size={18} /></div>
              <div className="metric-data">
                <div className="metric-value"><Counter target={94.2} decimals={1} suffix="%" /></div>
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
              <span>Trend Up +4.2%</span>
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
              {actionFeedback === 'users' ? (
                <CheckCircle2 size={14} color="#2DB87A" style={{ marginLeft: 'auto' }} />
              ) : (
                <span className="action-badge">★ Admin</span>
              )}
            </div>
            <div className="action-item" onClick={() => triggerAction('suppliers')}>
              <Briefcase size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Suppliers</span>
                <span className="action-desc">Supplier risk profiles</span>
              </div>
              {actionFeedback === 'suppliers' ? (
                <CheckCircle2 size={14} color="#2DB87A" style={{ marginLeft: 'auto' }} />
              ) : (
                <span className="action-badge">★ Risk</span>
              )}
            </div>
            <div className="action-item" onClick={() => triggerAction('alerts')}>
              <Bell size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Alerts</span>
                <span className="action-desc">Urgent system notifications</span>
              </div>
              {actionFeedback === 'alerts' ? (
                <CheckCircle2 size={14} color="#2DB87A" style={{ marginLeft: 'auto' }} />
              ) : (
                <span className="action-badge">★ Urgent</span>
              )}
            </div>
            <div className="action-item" onClick={() => triggerAction('reports')}>
              <BarChart3 size={18} className="action-icon" />
              <div className="action-text">
                <span className="action-name">Reports</span>
                <span className="action-desc">Analytics and insights</span>
              </div>
              {actionFeedback === 'reports' ? (
                <CheckCircle2 size={14} color="#2DB87A" style={{ marginLeft: 'auto' }} />
              ) : (
                <span className="action-badge">★ Analytics</span>
              )}
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
              <span className="breakdown-value">63.2 / High</span>
            </div>
            <div className="alert-divider"></div>
            <div className="breakdown-row">
              <Truck size={16} className="breakdown-icon" />
              <span className="breakdown-label">Shipment Risk:</span>
              <span className="breakdown-value">47.8 / Medium</span>
            </div>
            <div className="alert-divider"></div>
            <div className="breakdown-row">
              <Archive size={16} className="breakdown-icon" />
              <span className="breakdown-label">Inventory Risk:</span>
              <span className="breakdown-value">38.1 / Medium</span>
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
              <span className="card-subtitle">7 users online</span>
            </div>
            <a href="/users" className="card-expand-btn" aria-label="Expand users">
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="user-rows">
            <div className="user-row">
              <div className="user-avatar user-avatar--green">A</div>
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Org Administrator</span>
              </div>
              <div className="user-rating">
                <Star size={12} className="star-icon" fill="#E85D2F" stroke="#E85D2F" /> <span>5.0</span>
              </div>
              <span className="user-badge">ORG-ADMIN</span>
            </div>
            <div className="alert-divider"></div>
            <div className="user-row">
              <div className="user-avatar user-avatar--purple">R</div>
              <div className="user-info">
                <span className="user-name">Risk Analyst</span>
                <span className="user-role">Risk Management</span>
              </div>
              <div className="user-rating">
                <Star size={12} className="star-icon" fill="#E85D2F" stroke="#E85D2F" /> <span>4.9</span>
              </div>
              <span className="user-badge">RISK-ANA</span>
            </div>
            <div className="alert-divider"></div>
            <div className="user-row">
              <div className="user-avatar user-avatar--amber">I</div>
              <div className="user-info">
                <span className="user-name">Inv. Manager</span>
                <span className="user-role">Inventory Control</span>
              </div>
              <div className="user-rating">
                <Star size={12} className="star-icon" fill="#E85D2F" stroke="#E85D2F" /> <span>4.8</span>
              </div>
              <span className="user-badge">INV-MGR</span>
            </div>
          </div>
        </div>
      </div >
    </Layout >
  );
}
