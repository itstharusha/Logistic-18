/**
 * TrendChart.jsx — Reusable trend chart (Line or Bar)
 */
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ✅ FIXED: correct file name (plural)
import '../styles/analytics-components.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      <p className="an-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

function Skeleton({ height = 220 }) {
  return (
    <div
      className="an-skeleton an-chart-skeleton"
      style={{ height, borderRadius: 12 }}
    />
  );
}

/**
 * @param {object} props
 * @param {'line'|'bar'} [props.type='line']
 * @param {Array}  props.data - chart data array
 * @param {string} props.dataKey - key for the value
 * @param {string} props.xKey - key for x-axis labels
 * @param {string} [props.name] - Series label shown in tooltip
 * @param {string} [props.color='#E85D2F']
 * @param {number} [props.height=220]
 * @param {boolean} [props.loading]
 * @param {number[]} [props.domain] - YAxis domain [min, max]
 * @param {string[]} [props.barColors] - Per-bar colors array
 */
export default function TrendChart({
  type = 'line',
  data = [],
  dataKey,
  xKey = 'date',
  name = 'Value',
  color = '#E85D2F',
  height = 220,
  loading = false,
  domain,
  barColors,
}) {
  if (loading) return <Skeleton height={height} />;

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 };

  const commonProps = {
    data,
    margin: { top: 8, right: 16, left: -20, bottom: 0 },
  };

  const commonGrid = (
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
  );

  const commonXAxis = (
    <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
  );

  const commonYAxis = (
    <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={domain} />
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'bar' ? (
        <BarChart {...commonProps}>
          {commonGrid}
          {commonXAxis}
          {commonYAxis}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey={dataKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={56}>
            {barColors
              ? data.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))
              : null}
          </Bar>
        </BarChart>
      ) : (
        <LineChart {...commonProps}>
          {commonGrid}
          {commonXAxis}
          {commonYAxis}
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fff', stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}