/**
 * KPIPage.jsx — KPI Drilldown page
 * Route: /analytics/kpi
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  Truck,
  Package,
  ShieldAlert,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import TrendChart from '../../components/TrendChart.jsx';
import KPICard from '../../components/KPICard.jsx';

import {
  fetchKPI,
  selectKpiData,
  selectKpiLoading,
  selectKpiError,
  clearKpiData,
} from '../../redux/analyticsSlice.js';

// ✅ FIXED CSS PATH
import './KPI-page.css';

const METRIC_OPTIONS = [
  { value: 'risk', label: 'Risk Score', icon: ShieldAlert, color: 'var(--risk-high)' },
  { value: 'alerts', label: 'Active Alerts', icon: BellRing, color: 'var(--risk-critical)' },
  { value: 'shipments', label: 'Shipments', icon: Truck, color: 'var(--risk-medium)' },
  { value: 'inventory', label: 'Inventory Risk', icon: Package, color: 'var(--risk-low)' },
];

const DAY_OPTIONS = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
];

function generateMockTrend(days, metricType) {
  const points = Math.min(days, 12);
  return Array.from({ length: points }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (points - 1 - i) * Math.ceil(days / points));
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const baseVal = metricType === 'risk' ? 60 : metricType === 'alerts' ? 20 : 10;
    const noise = Math.round((Math.random() - 0.5) * baseVal * 0.4);
    return { date: label, value: Math.max(1, baseVal + noise) };
  });
}

function buildMockKPI(type) {
  const bases = {
    risk: { current: 72, previous: 76, avg: 71, peak: 88, low: 58, unit: '' },
    alerts: { current: 38, previous: 42, avg: 35, peak: 61, low: 18, unit: '' },
    shipments: { current: 14, previous: 11, avg: 12, peak: 22, low: 6, unit: '' },
    inventory: { current: 23, previous: 20, avg: 21, peak: 35, low: 12, unit: '' },
  };
  return bases[type] || bases.risk;
}

function StatBox({ label, value, unit = '' }) {
  return (
    <div className="kp-stat-box glass-card">
      <span className="kp-stat-label">{label}</span>
      <span className="kp-stat-value">
        {value !== undefined ? value.toLocaleString() : '—'}
        {unit && <span className="kp-stat-unit">{unit}</span>}
      </span>
    </div>
  );
}

export default function KPIPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const kpiData = useSelector(selectKpiData);
  const loading = useSelector(selectKpiLoading);
  const apiError = useSelector(selectKpiError);

  const [metric, setMetric] = useState('risk');
  const [days, setDays] = useState(30);
  const [usingMock, setUsingMock] = useState(false);

  const activeMetric = useMemo(
    () => METRIC_OPTIONS.find((m) => m.value === metric) || METRIC_OPTIONS[0],
    [metric]
  );

  const load = useCallback(() => {
    dispatch(fetchKPI({ type: metric, days })).then((action) => {
      if (fetchKPI.rejected.match(action)) {
        setUsingMock(true);
      } else {
        setUsingMock(false);
      }
    });
  }, [dispatch, metric, days]);

  useEffect(() => {
    load();
    return () => dispatch(clearKpiData());
  }, [load, dispatch]);

  const chartData = useMemo(() => {
    if (kpiData?.trend?.length) return kpiData.trend;
    return generateMockTrend(days, metric);
  }, [kpiData, days, metric]);

  const stats = useMemo(() => {
    if (kpiData?.stats) return kpiData.stats;
    return buildMockKPI(metric);
  }, [kpiData, metric]);

  const delta = useMemo(() => {
    if (!stats?.current || !stats?.previous) return null;
    return Math.round(((stats.current - stats.previous) / stats.previous) * 100 * 10) / 10;
  }, [stats]);

  const barColors = ['#E85D2F', '#F5A623', '#2DB87A', '#C7253E', '#E85D2F'];

  return (
    <div className="kp-root">
      <div className="kp-page">
        <header className="kp-header">
          <div className="kp-header-left">
            <div className="kp-breadcrumb">
              <span>Analytics</span>
              <span className="kp-breadcrumb-sep">›</span>
              <span className="kp-breadcrumb-cur">KPI Drilldown</span>
            </div>
            <h1 className="kp-title">KPI Drilldown</h1>
            <p className="kp-subtitle">Deep-dive trend analysis by metric</p>
          </div>

          <div className="kp-header-actions">
            <button
              className="kp-btn kp-btn-outline"
              onClick={() => navigate('/analytics')}
              title="Back to Analytics Dashboard"
            >
              ← Back to Analytics
            </button>

            <button className="kp-btn kp-btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'kp-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {(usingMock || apiError) && (
          <div className={`kp-banner ${apiError && !usingMock ? 'kp-banner-error' : 'kp-banner-warn'}`}>
            <AlertCircle size={14} />
            {usingMock ? 'Showing mock data — backend unavailable' : apiError}
          </div>
        )}

        <div className="kp-controls glass-card">
          <div className="kp-control-group">
            <label className="kp-control-label">Metric</label>
            <div className="kp-metric-btns">
              {METRIC_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`kp-metric-btn ${metric === value ? 'active' : ''}`}
                  onClick={() => setMetric(value)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="kp-control-group">
            <label className="kp-control-label">Period</label>
            <div className="kp-day-btns">
              {DAY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`kp-day-btn ${days === value ? 'active' : ''}`}
                  onClick={() => setDays(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="kp-stats-grid">
          <KPICard
            icon={activeMetric.icon}
            label={activeMetric.label}
            value={stats.current}
            description={`Current period (last ${days} days)`}
            delta={delta}
            loading={loading}
            color={activeMetric.color}
          />

          <StatBox label="Previous Period" value={stats.previous} />
          <StatBox label="Period Average" value={stats.avg} />
          <StatBox label="Peak Value" value={stats.peak} />
          <StatBox label="Lowest Value" value={stats.low} />
        </div>

        <div className="kp-chart-card glass-card">
          <TrendChart
            type={metric === 'shipments' ? 'bar' : 'line'}
            data={chartData}
            dataKey="value"
            xKey="date"
            name={activeMetric.label}
            color={activeMetric.color}
            height={280}
            loading={loading}
            barColors={barColors}
          />
        </div>
      </div>
    </div>
  );
}