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
import apiClient from '../../utils/apiClient.js';
import Layout from '../../components/Layout.jsx';
import KpiCard from '../../components/KPICard.jsx';
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const InventoryRiskTable = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No inventory risk data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="pb-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">Product</th>
            <th className="pb-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">Stock</th>
            <th className="pb-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">Threshold</th>
            <th className="pb-3 font-semibold text-gray-600 dark:text-gray-400">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
              <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{item.name}</td>
              <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.stock}</td>
              <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.threshold}</td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.risk === 'high'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : item.risk === 'medium'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {item.risk}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px' }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
      }}
    />
  );
};

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
    const [filterError, setFilterError] = useState('');

    const data = useSelector(selectDashboard);
    const loading = useSelector(selectLoading);
    const reduxError = useSelector(selectError);

    

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
                        
                        setLastUpdated(new Date());
                    }
                })
                .catch(() => {
                    if (isMounted.current) {
                        
                        setLastUpdated(new Date());
                    }
                });
        },
        [appliedFilters, customDateStart, customDateEnd, dispatch]
    );

    const handleApply = useCallback(() => {
        setFilterError('');
        if (filters.dateRange === 'custom') {
            if (!customDateStart || !customDateEnd) {
                setFilterError('Please select both start and end dates.');
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startObj = new Date(customDateStart);
            const endObj = new Date(customDateEnd);

            if (startObj > today || endObj > today) {
                setFilterError('Custom date range cannot include future dates.');
                return;
            }

            if (startObj > endObj) {
                setFilterError('Start date cannot be after end date.');
                return;
            }
        }
        setAppliedFilters({ ...filters });
        fetchData(filters);
    }, [filters, customDateStart, customDateEnd, fetchData]);

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
        setFilterError('');
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

    const riskTrend = useMemo(() => data?.riskTrend ?? [], [data]);
    const alertsBySeverity = useMemo(
        () => data?.alertsBySeverity ?? [],
        [data]
    );
    const shipmentDelays = useMemo(
        () => data?.shipmentDelays ?? [],
        [data]
    );
    const inventoryRisk = useMemo(
        () => data?.inventoryRisk ?? [],
        [data]
    );
    const kpis = useMemo(() => data?.kpis ?? {}, [data]);

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
        <Layout>
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

                

                {reduxError && (
                    <div className="ad-banner ad-banner-error">
                        <X size={15} />
                        <span>{reduxError}</span>
                    </div>
                )}

                {filterError && (
                    <div className="ad-banner ad-banner-error">
                        <X size={15} />
                        <span>{filterError}</span>
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
        </Layout>
    );
}