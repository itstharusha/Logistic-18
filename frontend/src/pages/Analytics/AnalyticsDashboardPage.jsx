import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar,
} from 'recharts';
import {
    ShieldAlert,
    BellRing,
    Truck,
    Package,
    RefreshCw,
    PauseCircle,
    PlayCircle,
    Activity,
    Search,
    Filter,
    X,
    ChevronUp,
    ChevronDown,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDashboard,
    selectDashboard,
    selectLoading,
    selectError,
} from '../../redux/analyticsSlice.js';
import apiClient from '../../utils/apiClient';
import '../../styles/analyticsDashboard.css';

// ─── RBAC ───────────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ['ORG_ADMIN', 'RISK_ANALYST', 'VIEWER'];

function getStoredUserRole() {
    try {
        const raw = localStorage.getItem('userRole');
        return raw || null;
    } catch {
        return null;
    }
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_DATA = {
    kpis: {
        overallRiskScore: { value: 72, delta: -4.2 },
        activeAlerts: { value: 38, delta: 12.5 },
        delayedShipments: { value: 14, delta: -7.8 },
        atRiskInventory: { value: 23, delta: 3.1 },
    },
    riskTrend: [
        { date: 'Jan 20', score: 68 },
        { date: 'Jan 27', score: 74 },
        { date: 'Feb 03', score: 71 },
        { date: 'Feb 10', score: 82 },
        { date: 'Feb 17', score: 77 },
        { date: 'Feb 24', score: 69 },
        { date: 'Mar 02', score: 72 },
    ],
    alertsBySeverity: [
        { name: 'Low', value: 12 },
        { name: 'Medium', value: 18 },
        { name: 'High', value: 6 },
        { name: 'Critical', value: 2 },
    ],
    shipmentDelays: [
        { carrier: 'FedEx', delays: 5 },
        { carrier: 'UPS', delays: 7 },
        { carrier: 'DHL', delays: 2 },
    ],
    inventoryRisk: [
        { sku: 'SKU-1042', name: 'Hydraulic Seal Kit', daysOfCover: 4, status: 'critical' },
        { sku: 'SKU-2310', name: 'Conveyor Belt V2', daysOfCover: 9, status: 'high' },
        { sku: 'SKU-0871', name: 'Alloy Fasteners M8', daysOfCover: 18, status: 'medium' },
        { sku: 'SKU-3314', name: 'Control PCB Unit', daysOfCover: 32, status: 'low' },
        { sku: 'SKU-1190', name: 'Pneumatic Valve', daysOfCover: 3, status: 'critical' },
        { sku: 'SKU-4421', name: 'Bearing Assembly', daysOfCover: 14, status: 'medium' },
    ],
};

const SEVERITY_COLORS = {
    Low: '#2DB87A',
    Medium: '#F5A623',
    High: '#E8572F',
    Critical: '#C7253E',
};

// ─── SKELETON ────────────────────────────────────────────────────────────────
function Skeleton({ width, height, borderRadius = 8 }) {
    return (
        <div
            className="ad-skeleton"
            style={{
                width: width || '100%',
                height: height || 16,
                borderRadius,
            }}
        />
    );
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({
    icon: Icon,
    label,
    value,
    description,
    delta,
    loading,
    color,
    improvementWhenDown = true,
    onClick,
    clickable = false,
}) {
    const isPositive = delta !== undefined
        ? (improvementWhenDown ? delta < 0 : delta > 0)
        : false;

    const cardClassName = `ad-kpi-card glass-card ${clickable ? 'ad-kpi-card-clickable' : ''}`;

    return (
        <div
            className={cardClassName}
            onClick={clickable ? onClick : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
                clickable
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick?.();
                          }
                      }
                    : undefined
            }
            title={clickable ? `Go to ${label} KPI page` : undefined}
        >
            {loading ? (
                <>
                    <Skeleton width={44} height={44} borderRadius={12} />
                    <Skeleton width={100} height={48} borderRadius={8} />
                    <Skeleton width="65%" height={14} />
                    <Skeleton width="80%" height={12} />
                    <Skeleton width={70} height={22} borderRadius={20} />
                </>
            ) : (
                <>
                    <div className="ad-kpi-icon" style={{ ['--icon-color']: color }}>
                        <Icon size={22} strokeWidth={1.75} />
                    </div>

                    <div className="ad-kpi-value">
                        {value?.toLocaleString() ?? '—'}
                    </div>

                    <div className="ad-kpi-label">{label}</div>

                    <p className="ad-kpi-desc">{description}</p>

                    {delta !== undefined && (
                        <div className={`ad-kpi-delta ${isPositive ? 'positive' : 'negative'}`}>
                            {isPositive ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                            {Math.abs(delta)}%
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── INVENTORY TABLE ─────────────────────────────────────────────────────────
function InventoryRiskTable({ data, loading }) {
    return (
        <div className="ad-chart-card glass-card">
            <h3 className="ad-chart-title">Inventory Risk Summary</h3>

            {loading ? (
                <div className="ad-table-skeleton">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} height={40} borderRadius={8} />
                    ))}
                </div>
            ) : (
                <div className="ad-table-wrapper">
                    <table className="ad-inv-table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Item Name</th>
                                <th>Days of Cover</th>
                                <th>Risk Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row) => (
                                <tr key={row.sku}>
                                    <td className="ad-sku">{row.sku}</td>
                                    <td>{row.name}</td>
                                    <td className="ad-days">{row.daysOfCover}d</td>
                                    <td>
                                        <span className={`ad-badge ad-badge-${row.status}`}>
                                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="ad-chart-tooltip">
            {label && <p className="ad-tooltip-label">{label}</p>}
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color || '#fff' }}>
                    {entry.name}: <strong>{entry.value}</strong>
                </p>
            ))}
        </div>
    );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function AnalyticsDashboardPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const authUser = useSelector((state) => state.auth?.user);
    const role = authUser?.role || getStoredUserRole();
    const isAuthorized = !role || ALLOWED_ROLES.includes(role);

    const [filters, setFilters] = useState({
        dateRange: 'last30',
        module: 'all',
        severity: 'all',
        search: '',
    });

    const [appliedFilters, setAppliedFilters] = useState({
        dateRange: 'last30',
        module: 'all',
        severity: 'all',
        search: '',
    });

    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');

    const data = useSelector(selectDashboard);
    const loading = useSelector(selectLoading);
    const reduxError = useSelector(selectError);

    const [usingMock, setUsingMock] = useState(false);

    const [paused, setPaused] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [apiHealthy, setApiHealthy] = useState(null);

    const intervalRef = useRef(null);
    const isMounted = useRef(true);

    const checkHealth = useCallback(async () => {
        try {
            const res = await apiClient.get('/health');
            if (isMounted.current) {
                setApiHealthy(res.status === 200 || res.status === 201);
            }
        } catch {
            if (isMounted.current) {
                setApiHealthy(false);
            }
        }
    }, []);

    const fetchData = useCallback(
        async (currentFilters = appliedFilters) => {
            if (!isMounted.current) return;

            const params = {
                dateRange: currentFilters.dateRange,
                module: currentFilters.module !== 'all' ? currentFilters.module : undefined,
                severity: currentFilters.severity !== 'all' ? currentFilters.severity : undefined,
                search: currentFilters.search || undefined,
                ...(currentFilters.dateRange === 'custom'
                    ? {
                          startDate: customDateStart || undefined,
                          endDate: customDateEnd || undefined,
                      }
                    : {}),
            };

            dispatch(fetchDashboard(params))
                .unwrap()
                .then(() => {
                    if (isMounted.current) {
                        setUsingMock(false);
                        setLastUpdated(new Date());
                    }
                })
                .catch(() => {
                    if (isMounted.current) {
                        setUsingMock(true);
                        setLastUpdated(new Date());
                    }
                });
        },
        [appliedFilters, customDateStart, customDateEnd, dispatch]
    );

    const handleApply = useCallback(() => {
        setAppliedFilters({ ...filters });
        fetchData(filters);
    }, [filters, fetchData]);

    const handleReset = useCallback(() => {
        const defaultFilters = {
            dateRange: 'last30',
            module: 'all',
            severity: 'all',
            search: '',
        };

        setFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setCustomDateStart('');
        setCustomDateEnd('');
        fetchData(defaultFilters);
    }, [fetchData]);

    useEffect(() => {
        isMounted.current = true;
        checkHealth();
        fetchData(appliedFilters);

        return () => {
            isMounted.current = false;
            clearInterval(intervalRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        clearInterval(intervalRef.current);

        if (paused) return;

        intervalRef.current = setInterval(() => {
            checkHealth();
            fetchData(appliedFilters);
        }, 30000);

        return () => clearInterval(intervalRef.current);
    }, [paused, appliedFilters, fetchData, checkHealth]);

    const riskTrend = useMemo(() => data?.riskTrend ?? MOCK_DATA.riskTrend, [data]);
    const alertsBySeverity = useMemo(
        () => data?.alertsBySeverity ?? MOCK_DATA.alertsBySeverity,
        [data]
    );
    const shipmentDelays = useMemo(
        () => data?.shipmentDelays ?? MOCK_DATA.shipmentDelays,
        [data]
    );
    const inventoryRisk = useMemo(
        () => data?.inventoryRisk ?? MOCK_DATA.inventoryRisk,
        [data]
    );
    const kpis = useMemo(() => data?.kpis ?? MOCK_DATA.kpis, [data]);

    const alertsTotal = useMemo(() => {
        return alertsBySeverity.reduce((acc, item) => acc + item.value, 0);
    }, [alertsBySeverity]);

    const formattedLastUpdated = useMemo(() => {
        if (!lastUpdated) return '—';

        return lastUpdated.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }, [lastUpdated]);

    if (!isAuthorized) {
        return (
            <div className="ad-access-denied">
                <div className="ad-access-denied-inner glass-card">
                    <ShieldAlert size={56} strokeWidth={1.5} className="ad-access-icon" />
                    <h2>Access Denied</h2>
                    <p>You do not have permission to view the Analytics Dashboard.</p>
                    <p className="ad-role-hint">
                        Required roles: <code>ORG_ADMIN</code>, <code>RISK_ANALYST</code>,{' '}
                        <code>VIEWER</code>
                    </p>
                    <p className="ad-current-role">
                        Your current role: <code>{role ?? 'None'}</code>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="ad-root">
            <div className="ad-page">
                <header className="ad-header">
                    <div className="ad-header-left">
                        <h1 className="ad-title">Analytics Dashboard</h1>
                        <p className="ad-subtitle">
                            Organization-level risk insights &amp; KPIs
                        </p>
                    </div>

                    <div className="ad-header-right">
                        <button
                            className="ad-btn ad-btn-ghost"
                            onClick={() => navigate('/dashboard')}
                            title="Go to main dashboard"
                        >
                            ← Dashboard
                        </button>

                        <button
                            className="ad-btn ad-btn-outline"
                            onClick={() => navigate('/analytics/kpi')}
                            title="Go to KPI page"
                        >
                            KPI Page
                        </button>

                        <button
                            className="ad-btn ad-btn-outline"
                            onClick={() => navigate('/reports')}
                            title="Go to reports page"
                        >
                            Reports
                        </button>

                        <div
                            className={`ad-health-pill ${
                                apiHealthy === true
                                    ? 'healthy'
                                    : apiHealthy === false
                                    ? 'unhealthy'
                                    : 'unknown'
                            }`}
                        >
                            {apiHealthy === true ? <Wifi size={14} /> : <WifiOff size={14} />}
                            <span>
                                {apiHealthy === true
                                    ? 'API Online'
                                    : apiHealthy === false
                                    ? 'API Offline'
                                    : 'Checking…'}
                            </span>
                        </div>

                        <div className="ad-last-updated">
                            <Activity size={13} />
                            <span>Updated {formattedLastUpdated}</span>
                        </div>

                        <button
                            className={`ad-btn ${paused ? 'ad-btn-outline' : 'ad-btn-ghost'}`}
                            onClick={() => setPaused((prev) => !prev)}
                            title={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
                        >
                            {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                            <span>{paused ? 'Resume' : 'Pause'}</span>
                        </button>

                        <button
                            className="ad-btn ad-btn-primary"
                            onClick={() => {
                                checkHealth();
                                fetchData(appliedFilters);
                            }}
                            disabled={loading}
                            title="Refresh now"
                        >
                            <RefreshCw size={15} className={loading ? 'ad-spin' : ''} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </header>

                {usingMock && (
                    <div className="ad-banner ad-banner-warn">
                        <Filter size={15} />
                        <span>Displaying mock data — API unavailable</span>
                    </div>
                )}

                {reduxError && !usingMock && (
                    <div className="ad-banner ad-banner-error">
                        <X size={15} />
                        <span>{reduxError}</span>
                    </div>
                )}

                <div className="ad-filters glass-card">
                    <div className="ad-filters-row">
                        <div className="ad-filter-group">
                            <label>Date Range</label>
                            <select
                                value={filters.dateRange}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        dateRange: e.target.value,
                                    }))
                                }
                            >
                                <option value="last7">Last 7 Days</option>
                                <option value="last30">Last 30 Days</option>
                                <option value="last90">Last 90 Days</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {filters.dateRange === 'custom' && (
                            <>
                                <div className="ad-filter-group">
                                    <label>From</label>
                                    <input
                                        type="date"
                                        value={customDateStart}
                                        onChange={(e) => setCustomDateStart(e.target.value)}
                                    />
                                </div>

                                <div className="ad-filter-group">
                                    <label>To</label>
                                    <input
                                        type="date"
                                        value={customDateEnd}
                                        onChange={(e) => setCustomDateEnd(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <div className="ad-filter-group">
                            <label>Module</label>
                            <select
                                value={filters.module}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        module: e.target.value,
                                    }))
                                }
                            >
                                <option value="all">All Modules</option>
                                <option value="supplier_risk">Supplier Risk</option>
                                <option value="shipment_tracking">Shipment Tracking</option>
                                <option value="inventory">Inventory</option>
                                <option value="alerts">Alerts</option>
                            </select>
                        </div>

                        <div className="ad-filter-group">
                            <label>Severity</label>
                            <select
                                value={filters.severity}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        severity: e.target.value,
                                    }))
                                }
                            >
                                <option value="all">All Severities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <div className="ad-filter-group ad-filter-search">
                            <label>Search</label>
                            <div className="ad-search-wrap">
                                <Search size={14} className="ad-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Supplier / Shipment ID / SKU…"
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            search: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleApply();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="ad-filter-actions">
                            <button className="ad-btn ad-btn-primary" onClick={handleApply}>
                                Apply
                            </button>

                            <button className="ad-btn ad-btn-ghost" onClick={handleReset}>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div className="ad-kpi-grid">
                    <KpiCard
                        icon={ShieldAlert}
                        label="Overall Risk Score"
                        value={kpis.overallRiskScore?.value}
                        delta={kpis.overallRiskScore?.delta}
                        description="Composite risk index across all modules"
                        loading={loading}
                        color="var(--risk-high)"
                        improvementWhenDown={true}
                        clickable={true}
                        onClick={() => navigate('/analytics/kpi')}
                    />

                    <KpiCard
                        icon={BellRing}
                        label="Active Alerts"
                        value={kpis.activeAlerts?.value}
                        delta={kpis.activeAlerts?.delta}
                        description="Open unresolved alerts requiring attention"
                        loading={loading}
                        color="var(--risk-critical)"
                        improvementWhenDown={true}
                        clickable={true}
                        onClick={() => navigate('/analytics/kpi')}
                    />

                    <KpiCard
                        icon={Truck}
                        label="Delayed Shipments"
                        value={kpis.delayedShipments?.value}
                        delta={kpis.delayedShipments?.delta}
                        description="In-transit shipments past expected delivery"
                        loading={loading}
                        color="var(--risk-medium)"
                        improvementWhenDown={true}
                        clickable={true}
                        onClick={() => navigate('/analytics/kpi')}
                    />

                    <KpiCard
                        icon={Package}
                        label="At-Risk Inventory"
                        value={kpis.atRiskInventory?.value}
                        delta={kpis.atRiskInventory?.delta}
                        description="SKUs with less than 10 days cover or critical status"
                        loading={loading}
                        color="var(--risk-low)"
                        improvementWhenDown={true}
                        clickable={true}
                        onClick={() => navigate('/analytics/kpi')}
                    />
                </div>

                <div className="ad-charts-row">
                    <div className="ad-chart-card glass-card ad-chart-wide">
                        <h3 className="ad-chart-title">Risk Score Trend</h3>

                        {loading ? (
                            <Skeleton height={220} borderRadius={12} />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart
                                    data={riskTrend}
                                    margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.07)"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[40, 100]}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        name="Risk Score"
                                        stroke="var(--brand-primary)"
                                        strokeWidth={2.5}
                                        dot={{
                                            r: 4,
                                            fill: 'var(--brand-primary)',
                                            strokeWidth: 0,
                                        }}
                                        activeDot={{
                                            r: 6,
                                            fill: '#fff',
                                            stroke: 'var(--brand-primary)',
                                            strokeWidth: 2,
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ad-chart-card glass-card ad-chart-narrow">
                        <h3 className="ad-chart-title">Alerts by Severity</h3>

                        {loading ? (
                            <div className="ad-donut-skeleton-wrap">
                                <Skeleton width={160} height={160} borderRadius={80} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={alertsBySeverity}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={62}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {alertsBySeverity.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={SEVERITY_COLORS[entry.name] || '#888'}
                                            />
                                        ))}
                                    </Pie>

                                    <text
                                        x="50%"
                                        y="46%"
                                        textAnchor="middle"
                                        className="donut-total-label"
                                    >
                                        {alertsTotal}
                                    </text>
                                    <text
                                        x="50%"
                                        y="54%"
                                        textAnchor="middle"
                                        className="donut-sub-label"
                                    >
                                        Total
                                    </text>

                                    <Legend
                                        iconType="circle"
                                        iconSize={9}
                                        wrapperStyle={{
                                            fontSize: 12,
                                            color: 'var(--text-muted)',
                                        }}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(20,20,30,0.92)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10,
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="ad-charts-row">
                    <div className="ad-chart-card glass-card ad-chart-wide">
                        <h3 className="ad-chart-title">Shipment Delays by Carrier</h3>

                        {loading ? (
                            <Skeleton height={220} borderRadius={12} />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={shipmentDelays}
                                    margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.07)"
                                    />
                                    <XAxis
                                        dataKey="carrier"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="delays"
                                        name="Delays"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={56}
                                    >
                                        {shipmentDelays.map((entry, i) => {
                                            const colors = ['#E85D2F', '#F5A623', '#2DB87A'];
                                            return (
                                                <Cell
                                                    key={`${entry.carrier}-${i}`}
                                                    fill={colors[i % colors.length]}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <InventoryRiskTable data={inventoryRisk} loading={loading} />
                </div>
            </div>
        </div>
    );
}