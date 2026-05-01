import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
    Bell, AlertTriangle, CheckCircle2, Clock, Shield, ShieldAlert,
    ArrowUpRight, Filter, Search, ChevronDown, X, User,
    Building2, Truck, Archive, Zap, TrendingUp, Eye,
    MessageSquare, Check, AlertCircle, BarChart3,
    Activity, Flame, Timer, Plus
} from 'lucide-react';
import {
    fetchAlerts, fetchAlertDashboard, fetchMyAlerts, fetchAlertHistory,
    acknowledgeAlert, resolveAlert, createAlert,
    setActiveFilter, clearActionSuccess, clearError
} from '../redux/alertsSlice.js';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import Layout from '../components/Layout.jsx';
import CreateAlertModal from '../components/CreateAlertModal.jsx';
import '../styles/pages.css';
import '../styles/alerts.css';
import '../styles/modals.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

/* ─── Severity Config ─── */
const SEVERITY_CONFIG = {
    critical: { label: 'Critical', color: '#C7253E', bg: 'rgba(199, 37, 62, 0.10)', icon: Flame },
    high: { label: 'High', color: '#E8572F', bg: 'rgba(232, 87, 47, 0.10)', icon: AlertTriangle },
    medium: { label: 'Medium', color: '#D48A00', bg: 'rgba(212, 138, 0, 0.10)', icon: AlertCircle },
    low: { label: 'Low', color: '#2DB87A', bg: 'rgba(45, 184, 122, 0.10)', icon: Shield },
};

const STATUS_CONFIG = {
    open: { label: 'Open', color: '#E8572F', bg: 'rgba(232, 87, 47, 0.10)' },
    acknowledged: { label: 'Acknowledged', color: '#D48A00', bg: 'rgba(212, 138, 0, 0.10)' },
    resolved: { label: 'Resolved', color: '#2DB87A', bg: 'rgba(45, 184, 122, 0.10)' },
    escalated: { label: 'Escalated', color: '#C7253E', bg: 'rgba(199, 37, 62, 0.10)' },
};

const ENTITY_ICONS = {
    supplier: Building2,
    shipment: Truck,
    inventory: Archive,
};

/* ─── Animated Counter ─── */
function useAnimatedCounter(target, duration = 700) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(eased * target));
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return value;
}

function StatCounter({ target }) {
    const val = useAnimatedCounter(target, 700);
    return <>{val}</>;
}

/* ─── Time Ago ─── */
function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function AlertsPage() {
    const dispatch = useDispatch();
    const location = useLocation();
    const user = useSelector((state) => state.auth.user);
    const {
        alerts: storeAlerts,
        dashboard,
        loading,
        error,
        actionSuccess,
        activeFilter,
    } = useSelector((state) => state.alerts);

    const trend = dashboard?.trend || [];

    const alerts = storeAlerts || [];

    // Calculate stats dynamically from current alerts
    const calculateStats = (alertsList) => {
        if (!alertsList || alertsList.length === 0) {
            return {total:0, open:0, acknowledged:0, resolved:0, escalated:0, low:0, medium:0, high:0, critical:0};
        }
        return {
            total: alertsList.length,
            open: alertsList.filter(a => a.status === 'open').length,
            acknowledged: alertsList.filter(a => a.status === 'acknowledged').length,
            resolved: alertsList.filter(a => a.status === 'resolved').length,
            escalated: alertsList.filter(a => a.status === 'escalated').length,
            low: alertsList.filter(a => a.severity === 'low').length,
            medium: alertsList.filter(a => a.severity === 'medium').length,
            high: alertsList.filter(a => a.severity === 'high').length,
            critical: alertsList.filter(a => a.severity === 'critical').length,
        };
    };

    const stats = calculateStats(alerts);

    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [expandedAlert, setExpandedAlert] = useState(null);
    const [resolveModalId, setResolveModalId] = useState(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [toast, setToast] = useState(null);
    const [viewMode, setViewMode] = useState(location.state?.viewMode || 'dashboard'); // dashboard | feed | history
    const [createAlertModalOpen, setCreateAlertModalOpen] = useState(false);
    
    // Get loading state from Redux
    const { actionLoading } = useSelector((state) => state.alerts);

    // Attempt to load from API
    useEffect(() => {
        dispatch(fetchAlerts());
        dispatch(fetchAlertDashboard());
    }, [dispatch]);

    // Handle viewMode change from navigation state
    useEffect(() => {
        if (location.state?.viewMode) {
            setViewMode(location.state.viewMode);
        }
    }, [location.state]);

    // Handle action success toast
    useEffect(() => {
        if (actionSuccess) {
            setToast(actionSuccess);
            const timer = setTimeout(() => {
                setToast(null);
                dispatch(clearActionSuccess());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [actionSuccess, dispatch]);

    // Filter alerts
    const filteredAlerts = alerts.filter((alert) => {
        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (
                !alert.title?.toLowerCase().includes(term) &&
                !alert.description?.toLowerCase().includes(term) &&
                !alert.assignedTo?.name?.toLowerCase().includes(term)
            ) return false;
        }
        // Severity
        if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
        // Entity type
        if (entityFilter !== 'all' && alert.entityType !== entityFilter) return false;
        // Tab filter
        if (activeFilter === 'open' && !['open', 'escalated'].includes(alert.status)) return false;
        if (activeFilter === 'escalated' && alert.status !== 'escalated') return false;
        if (activeFilter === 'mine' && alert.assignedTo?.email !== user?.email) return false;
        return true;
    });

    // Sort: critical first, then by date
    const sortedAlerts = [...filteredAlerts].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Handle acknowledge — dispatch to backend
    const handleAcknowledge = (alertId) => {
        dispatch(acknowledgeAlert(alertId)).then(() => {
            // Refetch dashboard to sync stats
            dispatch(fetchAlertDashboard());
            setToast('Alert acknowledged ✓');
            setTimeout(() => setToast(null), 3000);
        }).catch((error) => {
            setToast(`Failed to acknowledge: ${error}`);
            setTimeout(() => setToast(null), 3000);
        });
    };

    // Handle resolve — dispatch to backend
    const handleResolve = () => {
        if (!resolutionNote.trim()) return;
        const alertId = resolveModalId;
        
        dispatch(resolveAlert({ alertId, resolutionNote }))
            .then(() => {
                // Refetch dashboard to sync stats
                dispatch(fetchAlertDashboard());
                setResolveModalId(null);
                setResolutionNote('');
                setToast('Alert resolved ✓');
                setTimeout(() => setToast(null), 3000);
            })
            .catch((error) => {
                setToast(`Failed to resolve: ${error}`);
                setTimeout(() => setToast(null), 3000);
            });
    };

    // Handle create alert
    const handleCreateAlert = (formData) => {
        dispatch(createAlert(formData))
            .unwrap()
            .then((data) => {
                // Redux reducer already added alert to state, just close modal and show toast
                setCreateAlertModalOpen(false);
                setToast('Alert created successfully ✓');
                setTimeout(() => setToast(null), 3000);
                // Refetch dashboard to sync stats
                dispatch(fetchAlertDashboard());
            })
            .catch((error) => {
                setToast(`Failed to create alert: ${error}`);
                setTimeout(() => setToast(null), 4000);
            });
    };

    // Build chart data from trend (with safety checks)
    const validTrend = Array.isArray(trend) ? trend : [];
    
    const chartLabels = [...new Set(validTrend.map(t => t._id?.date || t.date))].map(d => {
        const date = new Date(d);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    const uniqueDates = [...new Set(validTrend.map(t => t._id?.date || t.date))];

    const buildDataset = (severity, label, color) => {
        return {
            label,
            data: uniqueDates.map(date => {
                const found = validTrend.find(t => (t._id?.date || t.date) === date && (t._id?.severity || t.severity) === severity);
                return found ? (found.count || found._count || 0) : 0;
            }),
            backgroundColor: color,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 12,
        };
    };

    const trendChartData = {
        labels: chartLabels,
        datasets: [
            buildDataset('critical', 'Critical', '#C7253E'),
            buildDataset('high', 'High', '#E8572F'),
            buildDataset('medium', 'Medium', '#D48A00'),
            buildDataset('low', 'Low', '#2DB87A'),
        ],
    };

    const trendChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 16,
                    font: { family: 'Inter', size: 11, weight: '600' },
                    color: '#5A5E5A',
                },
            },
            tooltip: {
                backgroundColor: '#1A1C1A',
                titleFont: { family: 'Inter', size: 12, weight: '600' },
                bodyFont: { family: 'Inter', size: 11 },
                padding: 10,
                cornerRadius: 8,
                displayColors: true,
            },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#9A9E9A' },
            },
            y: {
                stacked: true,
                grid: { color: 'rgba(90,94,90,0.08)' },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#9A9E9A', stepSize: 2 },
            },
        },
    };

    return (
        <Layout>
            {/* ═══ Toast Notification ═══ */}
            {toast && (
                <div className="alert-toast">
                    <CheckCircle2 size={16} />
                    <span>{toast}</span>
                </div>
            )}

            {/* ═══ HERO SECTION ═══ */}
            <section className="alerts-hero">
                <div className="alerts-hero-content">
                    <div className="alerts-hero-left">
                        <div className="alerts-hero-badge">
                            <Zap size={14} />
                            <span>Alert Engine Active</span>
                            <span className="hero-pulse-dot"></span>
                        </div>
                        <h1 className="alerts-hero-title">Risk Alerts &amp;<br />Notifications</h1>
                        <p className="alerts-hero-subtitle">
                            Real-time monitoring with ML-powered severity, auto-assignment, cooldown suppression &amp; SLA escalation
                        </p>
                    </div>
                    <div className="alerts-hero-stats">
                        <div className="hero-stat-item">
                            <span className="hero-stat-value hero-stat-critical"><StatCounter target={stats.critical + stats.high} /></span>
                            <span className="hero-stat-label">Urgent</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat-item">
                            <span className="hero-stat-value hero-stat-open"><StatCounter target={stats.open} /></span>
                            <span className="hero-stat-label">Open</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat-item">
                            <span className="hero-stat-value hero-stat-escalated"><StatCounter target={stats.escalated} /></span>
                            <span className="hero-stat-label">Escalated</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat-item">
                            <span className="hero-stat-value hero-stat-resolved"><StatCounter target={stats.resolved} /></span>
                            <span className="hero-stat-label">Resolved</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ VIEW TOGGLE & CREATE BUTTON ═══ */}
            <div className="alerts-controls">
                <div className="alerts-view-toggle">
                    <button
                        className={`view-toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setViewMode('dashboard')}
                    >
                        <BarChart3 size={16} /> Dashboard
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'feed' ? 'active' : ''}`}
                        onClick={() => setViewMode('feed')}
                    >
                        <Bell size={16} /> Alert Feed
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'history' ? 'active' : ''}`}
                        onClick={() => setViewMode('history')}
                    >
                        <Clock size={16} /> History
                    </button>
                </div>
                <button 
                    className="btn-create-alert"
                    onClick={() => setCreateAlertModalOpen(true)}
                    title="Create a new manual alert"
                >
                    <Plus size={18} />
                    <span>Create Alert</span>
                </button>
            </div>

            {/* ═══════════ DASHBOARD VIEW ═══════════ */}
            {viewMode === 'dashboard' && (
                <div className="alerts-dashboard">
                    {/* Stats Row */}
                    <div className="alerts-stats-row">
                        <div className="alert-stat-card anim-card" style={{ animationDelay: '0.10s' }}>
                            <div className="stat-card-icon stat-icon-total"><Bell size={20} /></div>
                            <div className="stat-card-data">
                                <span className="stat-card-value"><StatCounter target={stats.total} /></span>
                                <span className="stat-card-label">Total Alerts</span>
                            </div>
                        </div>
                        <div className="alert-stat-card anim-card" style={{ animationDelay: '0.15s' }}>
                            <div className="stat-card-icon stat-icon-open"><AlertCircle size={20} /></div>
                            <div className="stat-card-data">
                                <span className="stat-card-value"><StatCounter target={stats.open} /></span>
                                <span className="stat-card-label">Open</span>
                            </div>
                        </div>
                        <div className="alert-stat-card anim-card" style={{ animationDelay: '0.20s' }}>
                            <div className="stat-card-icon stat-icon-ack"><Check size={20} /></div>
                            <div className="stat-card-data">
                                <span className="stat-card-value"><StatCounter target={stats.acknowledged} /></span>
                                <span className="stat-card-label">Acknowledged</span>
                            </div>
                        </div>
                        <div className="alert-stat-card anim-card" style={{ animationDelay: '0.25s' }}>
                            <div className="stat-card-icon stat-icon-escalated"><ShieldAlert size={20} /></div>
                            <div className="stat-card-data">
                                <span className="stat-card-value"><StatCounter target={stats.escalated} /></span>
                                <span className="stat-card-label">Escalated</span>
                            </div>
                        </div>
                        <div className="alert-stat-card anim-card" style={{ animationDelay: '0.30s' }}>
                            <div className="stat-card-icon stat-icon-resolved"><CheckCircle2 size={20} /></div>
                            <div className="stat-card-data">
                                <span className="stat-card-value"><StatCounter target={stats.resolved} /></span>
                                <span className="stat-card-label">Resolved</span>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Cards Row */}
                    <div className="alerts-dashboard-row">
                        {/* Severity Distribution */}
                        <div className="dash-card anim-card" style={{ animationDelay: '0.35s' }}>
                            <div className="card-header">
                                <div>
                                    <h2 className="card-title">Severity Distribution</h2>
                                    <span className="card-subtitle">Active alerts by severity</span>
                                </div>
                            </div>
                            <div className="severity-bars">
                                {['critical', 'high', 'medium', 'low'].map((sev) => {
                                    const conf = SEVERITY_CONFIG[sev];
                                    const count = stats[sev] || 0;
                                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                                    return (
                                        <div key={sev} className="severity-bar-row">
                                            <div className="severity-bar-label">
                                                <span className="severity-dot" style={{ background: conf.color }}></span>
                                                <span>{conf.label}</span>
                                            </div>
                                            <div className="severity-bar-track">
                                                <div
                                                    className="severity-bar-fill"
                                                    style={{ width: `${pct}%`, background: conf.color }}
                                                ></div>
                                            </div>
                                            <span className="severity-bar-count">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Alert Trend Chart */}
                        <div className="dash-card anim-card" style={{ animationDelay: '0.40s' }}>
                            <div className="card-header">
                                <div>
                                    <h2 className="card-title">Alert Volume Trend</h2>
                                    <span className="card-subtitle">Last 7 days by severity</span>
                                </div>
                            </div>
                            <div className="alerts-chart-wrapper">
                                <Bar data={trendChartData} options={trendChartOptions} />
                            </div>
                        </div>

                        {/* Assignment Overview */}
                        <div className="dash-card anim-card" style={{ animationDelay: '0.45s' }}>
                            <div className="card-header">
                                <div>
                                    <h2 className="card-title">Auto-Assignment</h2>
                                    <span className="card-subtitle">By role mapping</span>
                                </div>
                            </div>
                            <div className="assignment-list">
                                <div className="assignment-row">
                                    <div className="assignment-icon" style={{ background: 'linear-gradient(135deg, #7C5A8C, #4E2E5E)' }}>
                                        <Building2 size={16} />
                                    </div>
                                    <div className="assignment-info">
                                        <span className="assignment-entity">Supplier Alerts</span>
                                        <span className="assignment-role">→ Risk Analyst</span>
                                    </div>
                                    <span className="assignment-count">{alerts.filter(a => a.entityType === 'supplier' && a.status !== 'resolved').length}</span>
                                </div>
                                <div className="alert-divider"></div>
                                <div className="assignment-row">
                                    <div className="assignment-icon" style={{ background: 'linear-gradient(135deg, #4A8C6B, #2D5E45)' }}>
                                        <Truck size={16} />
                                    </div>
                                    <div className="assignment-info">
                                        <span className="assignment-entity">Shipment Alerts</span>
                                        <span className="assignment-role">→ Logistics Operator</span>
                                    </div>
                                    <span className="assignment-count">{alerts.filter(a => a.entityType === 'shipment' && a.status !== 'resolved').length}</span>
                                </div>
                                <div className="alert-divider"></div>
                                <div className="assignment-row">
                                    <div className="assignment-icon" style={{ background: 'linear-gradient(135deg, #8C7040, #5E4A20)' }}>
                                        <Archive size={16} />
                                    </div>
                                    <div className="assignment-info">
                                        <span className="assignment-entity">Inventory Alerts</span>
                                        <span className="assignment-role">→ Inventory Manager</span>
                                    </div>
                                    <span className="assignment-count">{alerts.filter(a => a.entityType === 'inventory' && a.status !== 'resolved').length}</span>
                                </div>
                            </div>

                            <div className="sla-info-section">
                                <h3 className="sla-title"><Timer size={14} /> SLA Escalation Rules</h3>
                                <div className="sla-rules">
                                    <div className="sla-rule">
                                        <span className="severity-dot" style={{ background: '#C7253E' }}></span>
                                        <span>Critical: 1 hour</span>
                                    </div>
                                    <div className="sla-rule">
                                        <span className="severity-dot" style={{ background: '#E8572F' }}></span>
                                        <span>High: 2 hours</span>
                                    </div>
                                    <div className="sla-rule">
                                        <span className="severity-dot" style={{ background: '#D48A00' }}></span>
                                        <span>Medium: 4 hours</span>
                                    </div>
                                    <div className="sla-rule">
                                        <span className="severity-dot" style={{ background: '#2DB87A' }}></span>
                                        <span>Low: 8 hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick view: Recent Critical/High alerts */}
                    <div className="dash-card alerts-recent-card anim-card" style={{ animationDelay: '0.50s' }}>
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">
                                    <Flame size={18} style={{ color: '#E8572F' }} /> Urgent Alerts
                                </h2>
                                <span className="card-subtitle">Critical &amp; High severity — requires immediate action</span>
                            </div>
                            <button className="hero-btn hero-btn--light hero-btn-sm" onClick={() => setViewMode('feed')}>
                                View All <ArrowUpRight size={14} />
                            </button>
                        </div>
                        <div className="urgent-alerts-grid">
                            {sortedAlerts
                                .filter(a => ['critical', 'high'].includes(a.severity) && a.status !== 'resolved')
                                .slice(0, 4)
                                .map((alert) => {
                                    const sevConf = SEVERITY_CONFIG[alert.severity];
                                    const statusConf = STATUS_CONFIG[alert.status];
                                    const EntityIcon = ENTITY_ICONS[alert.entityType] || Bell;
                                    return (
                                        <div key={alert._id} className="urgent-alert-card">
                                            <div className="urgent-alert-header">
                                                <span className="alert-severity-chip" style={{ background: sevConf.bg, color: sevConf.color }}>
                                                    {sevConf.label}
                                                </span>
                                                <span className="alert-status-chip" style={{ background: statusConf.bg, color: statusConf.color }}>
                                                    {statusConf.label}
                                                </span>
                                            </div>
                                            <div className="urgent-alert-body">
                                                <div className="urgent-alert-entity">
                                                    <EntityIcon size={14} />
                                                    <span>{alert.entityType}</span>
                                                </div>
                                                <h3 className="urgent-alert-title">{alert.title}</h3>
                                                <p className="urgent-alert-desc">{alert.description}</p>
                                            </div>
                                            <div className="urgent-alert-footer">
                                                <div className="urgent-alert-meta">
                                                    <Clock size={12} />
                                                    <span>{timeAgo(alert.createdAt)}</span>
                                                </div>
                                                {alert.status === 'open' && (
                                                    <button className="ack-btn-sm" onClick={() => handleAcknowledge(alert._id)}>
                                                        <Check size={14} /> Acknowledge
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ALERT FEED VIEW ═══════════ */}
            {viewMode === 'feed' && (
                <div className="alerts-feed">
                    {/* Filter Bar */}
                    <div className="alerts-filter-bar">
                        <div className="filter-tabs">
                            {['all', 'open', 'mine', 'escalated'].map((f) => (
                                <button
                                    key={f}
                                    className={`filter-tab ${activeFilter === f ? 'active' : ''}`}
                                    onClick={() => dispatch(setActiveFilter(f))}
                                >
                                    {f === 'all' ? 'All' : f === 'mine' ? 'My Alerts' : f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="filter-controls">
                            <div className="search-box-premium">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search alerts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                className="filter-select"
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                            >
                                <option value="all">All Severity</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                            <select
                                className="filter-select"
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="supplier">Supplier</option>
                                <option value="shipment">Shipment</option>
                                <option value="inventory">Inventory</option>
                            </select>
                        </div>
                    </div>

                    {/* Alert List */}
                    <div className="alerts-list">
                        {sortedAlerts.length === 0 ? (
                            <div className="empty-canvas">
                                <Bell size={48} className="empty-icon-lucide" />
                                <h3>No alerts found</h3>
                                <p>Try adjusting your filters or check back later.</p>
                            </div>
                        ) : (
                            sortedAlerts.map((alert) => {
                                const sevConf = SEVERITY_CONFIG[alert.severity];
                                const statusConf = STATUS_CONFIG[alert.status];
                                const EntityIcon = ENTITY_ICONS[alert.entityType] || Bell;
                                const isExpanded = expandedAlert === alert._id;

                                return (
                                    <div
                                        key={alert._id}
                                        className={`alert-feed-card ${isExpanded ? 'expanded' : ''}`}
                                        style={{ borderLeftColor: sevConf.color }}
                                    >
                                        <div className="feed-card-main" onClick={() => setExpandedAlert(isExpanded ? null : alert._id)}>
                                            <div className="feed-card-left">
                                                <div className="feed-severity-icon" style={{ background: sevConf.bg, color: sevConf.color }}>
                                                    <EntityIcon size={18} />
                                                </div>
                                                <div className="feed-card-content">
                                                    <div className="feed-card-top">
                                                        <span className="alert-severity-chip" style={{ background: sevConf.bg, color: sevConf.color }}>
                                                            {sevConf.label}
                                                        </span>
                                                        <span className="alert-status-chip" style={{ background: statusConf.bg, color: statusConf.color }}>
                                                            {statusConf.label}
                                                        </span>
                                                        <span className="feed-entity-badge">
                                                            {alert.entityType}
                                                        </span>
                                                    </div>
                                                    <h3 className="feed-card-title">{alert.title}</h3>
                                                    <p className="feed-card-desc">{alert.description}</p>
                                                </div>
                                            </div>
                                            <div className="feed-card-right">
                                                <div className="feed-card-meta">
                                                    <Clock size={12} />
                                                    <span>{timeAgo(alert.createdAt)}</span>
                                                </div>
                                                {alert.assignedTo && (
                                                    <div className="feed-card-assigned">
                                                        <User size={12} />
                                                        <span>{alert.assignedTo.name}</span>
                                                    </div>
                                                )}
                                                <ChevronDown size={16} className={`feed-chevron ${isExpanded ? 'rotated' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Detail */}
                                        {isExpanded && (
                                            <div className="feed-card-expanded">
                                                {alert.mitigationRecommendation && (
                                                    <div className="mitigation-box">
                                                        <h4><Shield size={14} /> Mitigation Recommendation</h4>
                                                        <p>{alert.mitigationRecommendation}</p>
                                                    </div>
                                                )}

                                                <div className="expanded-details-grid">
                                                    <div className="detail-item">
                                                        <span className="detail-label">Entity Type</span>
                                                        <span className="detail-value">{alert.entityType}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Severity</span>
                                                        <span className="detail-value" style={{ color: sevConf.color }}>{sevConf.label}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Status</span>
                                                        <span className="detail-value" style={{ color: statusConf.color }}>{statusConf.label}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Assigned To</span>
                                                        <span className="detail-value">{alert.assignedTo?.name || 'Unassigned'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Created</span>
                                                        <span className="detail-value">{new Date(alert.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {alert.escalatedAt && (
                                                        <div className="detail-item">
                                                            <span className="detail-label">Escalated At</span>
                                                            <span className="detail-value" style={{ color: '#C7253E' }}>{new Date(alert.escalatedAt).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {alert.resolvedAt && (
                                                        <>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Resolved At</span>
                                                                <span className="detail-value">{new Date(alert.resolvedAt).toLocaleString()}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Resolved By</span>
                                                                <span className="detail-value">{alert.resolvedBy?.name || '—'}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    {alert.resolutionNote && (
                                                        <div className="detail-item detail-item-full">
                                                            <span className="detail-label">Resolution Note</span>
                                                            <span className="detail-value">{alert.resolutionNote}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                {alert.status !== 'resolved' && (
                                                    <div className="expanded-actions">
                                                        {alert.status === 'open' || alert.status === 'escalated' ? (
                                                            <button className="action-btn-ack" onClick={() => handleAcknowledge(alert._id)}>
                                                                <Check size={16} /> Acknowledge
                                                            </button>
                                                        ) : null}
                                                        <button className="action-btn-resolve" onClick={() => { setResolveModalId(alert._id); setResolutionNote(''); }}>
                                                            <CheckCircle2 size={16} /> Resolve
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════ HISTORY VIEW ═══════════ */}
            {viewMode === 'history' && (
                <div className="alerts-history">
                    <div className="dash-card">
                        <div className="card-header-premium">
                            <div className="header-info">
                                <h3>Resolved Alerts History</h3>
                                <span className="badge">
                                    {alerts.filter(a => a.status === 'resolved').length} resolved alerts
                                </span>
                            </div>
                            <div className="search-box-premium">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search history..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="users-table-canvas">
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Alert</th>
                                        <th>Severity</th>
                                        <th>Type</th>
                                        <th>Resolved By</th>
                                        <th>Resolved At</th>
                                        <th>Resolution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts
                                        .filter(a => a.status === 'resolved')
                                        .filter(a => {
                                            if (!searchTerm) return true;
                                            return a.title?.toLowerCase().includes(searchTerm.toLowerCase());
                                        })
                                        .map((alert) => {
                                            const sevConf = SEVERITY_CONFIG[alert.severity];
                                            return (
                                                <tr key={alert._id}>
                                                    <td>
                                                        <div className="user-identity">
                                                            <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${sevConf.color}, ${sevConf.color}88)` }}>
                                                                {React.createElement(ENTITY_ICONS[alert.entityType] || Bell, { size: 16 })}
                                                            </div>
                                                            <div className="user-info">
                                                                <span className="user-name">{alert.title}</span>
                                                                <span className="user-email">{alert.description?.substring(0, 60)}...</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="alert-severity-chip" style={{ background: sevConf.bg, color: sevConf.color }}>
                                                            {sevConf.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="role-chip">
                                                            {React.createElement(ENTITY_ICONS[alert.entityType] || Bell, { size: 12 })}
                                                            {alert.entityType}
                                                        </span>
                                                    </td>
                                                    <td>{alert.resolvedBy?.name || '—'}</td>
                                                    <td>{alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : '—'}</td>
                                                    <td>
                                                        <span className="resolution-note-cell">{alert.resolutionNote || '—'}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {alerts.filter(a => a.status === 'resolved').length === 0 && (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="empty-canvas">
                                                    <CheckCircle2 size={48} className="empty-icon-lucide" />
                                                    <h3>No resolved alerts yet</h3>
                                                    <p>Resolved alerts will appear here with full resolution details.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Resolve Modal ═══ */}
            {resolveModalId && (
                <div className="resolve-modal-overlay" onClick={() => setResolveModalId(null)}>
                    <div className="resolve-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="resolve-modal-header">
                            <h3><MessageSquare size={18} /> Resolve Alert</h3>
                            <button className="modal-close-btn" onClick={() => setResolveModalId(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="resolve-modal-body">
                            <label className="resolve-label">Resolution Note *</label>
                            <textarea
                                className="resolve-textarea"
                                placeholder="Describe how this alert was resolved... (who, what, when)"
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                rows={4}
                            />
                            <p className="resolve-hint">
                                This will be tracked for audit purposes. Include details about who resolved the issue, what actions were taken, and when.
                            </p>
                        </div>
                        <div className="resolve-modal-actions">
                            <button className="btn-ghost" onClick={() => setResolveModalId(null)}>Cancel</button>
                            <button
                                className="btn-primary-premium"
                                disabled={!resolutionNote.trim()}
                                onClick={handleResolve}
                            >
                                <CheckCircle2 size={16} /> Resolve Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CREATE ALERT MODAL ═══ */}
            <CreateAlertModal 
                isOpen={createAlertModalOpen}
                onClose={() => setCreateAlertModalOpen(false)}
                onSubmit={handleCreateAlert}
                isLoading={actionLoading}
            />
        </Layout>
    );
}
