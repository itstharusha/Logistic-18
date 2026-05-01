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
import StatBox from '../../components/StatBox.jsx';
import Layout from '../../components/Layout.jsx';

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

export default function KPIPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const kpiData = useSelector(selectKpiData);
  const loading = useSelector(selectKpiLoading);
  const apiError = useSelector(selectKpiError);

  const [metric, setMetric] = useState('risk');
  const [days, setDays] = useState(30);
  

  const activeMetric = useMemo(
    () => METRIC_OPTIONS.find((m) => m.value === metric) || METRIC_OPTIONS[0],
    [metric]
  );

  const load = useCallback(() => {
    dispatch(fetchKPI({ type: metric, days })).then((action) => {
      if (fetchKPI.rejected.match(action)) {
        
      } else {
        
      }
    });
  }, [dispatch, metric, days]);

  useEffect(() => {
    load();
    return () => dispatch(clearKpiData());
  }, [load, dispatch]);

  const chartData = useMemo(() => {
    if (kpiData?.trend?.length) return kpiData.trend;
    return Array.isArray(kpiData?.trend) ? kpiData.trend : [];
  }, [kpiData, days, metric]);

  const stats = useMemo(() => {
    if (kpiData?.stats) return kpiData.stats;
    return kpiData?.metrics || { current: 0, previous: 0, avg: 0, peak: 0, low: 0, unit: "" };
  }, [kpiData, metric]);

  const delta = useMemo(() => {
    if (stats?.current == null || stats?.previous == null) return null;
    if (stats.previous === 0) return stats.current > 0 ? 100 : 0;
    return Math.round(((stats.current - stats.previous) / stats.previous) * 100 * 10) / 10;
  }, [stats]);

  const barColors = ['#E85D2F', '#F5A623', '#2DB87A', '#C7253E', '#E85D2F'];

  return (
    <Layout>
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

        {apiError && (
          <div className="kp-banner kp-banner-error">
            <AlertCircle size={14} />
            {apiError}
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
    </Layout>
  );
}