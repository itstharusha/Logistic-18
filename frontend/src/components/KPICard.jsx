/**
 * KPICard.jsx — Reusable KPI metric card
 * Used in AnalyticsDashboard and KPIPage
 */
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ✅ FIXED PATH (CSS in src/styles/)
import '../styles/analytics-components.css';

function Skeleton({ width, height, borderRadius = 8 }) {
  return (
    <div
      className="an-skeleton"
      style={{ width: width || '100%', height: height || 16, borderRadius }}
    />
  );
}

/**
 * @param {object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - KPI label text
 * @param {number|string} props.value - KPI value
 * @param {string} [props.description] - Optional subtitle
 * @param {number} [props.delta] - % change (negative = decrease)
 * @param {boolean} [props.deltaPositiveIsGood] - if true, positive delta is shown in green
 * @param {string} [props.color] - Icon accent color CSS value
 * @param {boolean} [props.loading] - Skeleton state
 * @param {string} [props.unit] - Optional unit suffix (e.g. "%", "items")
 */
export default function KPICard({
  icon: Icon,
  label,
  value,
  description,
  delta,
  deltaPositiveIsGood = false,
  color = 'var(--brand-primary)',
  loading = false,
  unit = '',
  clickable = false,
  onClick,
}) {
  // deltaPositiveIsGood: green when positive (e.g. metrics you WANT to increase)
  // default false: green when negative (e.g. risk score going down is good)
  const isGoodChange = deltaPositiveIsGood ? delta > 0 : delta < 0;

  const formattedValue =
    value !== undefined && value !== null
      ? (typeof value === 'number' ? value.toLocaleString() : String(value))
      : '—';

  return (
    <div
      className={`an-kpi-card glass-card${clickable ? ' an-kpi-card--clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      {loading ? (
        <>
          <Skeleton width={44} height={44} borderRadius={12} />
          <Skeleton width={80} height={48} borderRadius={8} />
          <Skeleton width="60%" height={14} />
          <Skeleton width={64} height={20} borderRadius={20} />
        </>
      ) : (
        <>
          <div className="an-kpi-icon" style={{ '--icon-color': color }}>
            {Icon && <Icon size={22} strokeWidth={1.75} />}
          </div>

          <div className="an-kpi-value">
            {formattedValue}
            {unit && <span className="an-kpi-unit">{unit}</span>}
          </div>

          <div className="an-kpi-label">{label}</div>

          {description && <p className="an-kpi-desc">{description}</p>}

          {delta !== undefined && delta !== null && (
            <div className={`an-kpi-delta ${isGoodChange ? 'good' : 'bad'}`}>
              {isGoodChange ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {Math.abs(delta)}%
            </div>
          )}
        </>
      )}
    </div>
  );
}