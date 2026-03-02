import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Line
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
  ArrowLeft, Building2, Globe, Tag, Clock, ShieldAlert,
  BarChart2, CheckCircle2, AlertTriangle, Edit2, X,
  TrendingUp, Calendar, Package, History, ShieldCheck
} from 'lucide-react';
import {
  getSupplier, getRiskHistory, overrideScore, updateSupplier,
  updateSupplierStatus, clearError, clearMessage, clearSelectedSupplier
} from '../redux/suppliersSlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CATEGORIES = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'components', label: 'Components' },
  { value: 'finished_goods', label: 'Finished Goods' },
  { value: 'services', label: 'Services' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'under_watch', label: 'Under Watch' },
  { value: 'high_risk', label: 'High Risk' },
  { value: 'suspended', label: 'Suspended' },
];

function getTierFromScore(score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

const TIER_COLORS = {
  low: '#2DB87A',
  medium: '#D48A00',
  high: '#E8572F',
  critical: '#C7253E',
};

function RiskGauge({ score, tier }) {
  const safeScore = score ?? 0;
  const color = TIER_COLORS[tier] || '#9A9E9A';
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (safeScore / 100) * circ * 0.75;

  return (
    <div className="risk-gauge-wrap">
      <svg width="160" height="120" viewBox="0 0 160 120" className="risk-gauge-svg">
        <circle
          cx="80" cy="88"
          r={radius}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth="12"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          transform="rotate(180 80 88)"
        />
        <circle
          cx="80" cy="88"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${circ * 0.75 * (safeScore / 100)} ${circ - circ * 0.75 * (safeScore / 100)}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          transform="rotate(180 80 88)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text x="80" y="82" textAnchor="middle" fontSize="28" fontWeight="800" fill={color} fontFamily="Inter, sans-serif">
          {safeScore}
        </text>
        <text x="80" y="100" textAnchor="middle" fontSize="11" fill="var(--text-tertiary)" fontFamily="Inter, sans-serif">
          RISK SCORE
        </text>
      </svg>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color, delay }) {
  return (
    <div className="dash-card anim-card" style={{ '--delay': delay }}>
      <div className="overview-metric">
        <div className="metric-icon" style={{ background: `${color}18`, color, border: 'none' }}>
          <Icon size={20} />
        </div>
        <div className="metric-data">
          <span className="metric-value">{value != null ? `${value}${unit || ''}` : '—'}</span>
          <span className="metric-label">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selectedSupplier: supplier, riskHistory, detailLoading, loading, error, message } = useSelector(s => s.suppliers);
  const user = useSelector(s => s.auth.user);

  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideData, setOverrideData] = useState({ newScore: '', justification: '' });

  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    dispatch(getSupplier(id));
    dispatch(getRiskHistory(id));
    return () => dispatch(clearSelectedSupplier());
  }, [dispatch, id]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => dispatch(clearMessage()), 3000);
      return () => clearTimeout(t);
    }
  }, [message, dispatch]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(overrideScore({
      id,
      data: { newScore: Number(overrideData.newScore), justification: overrideData.justification }
    }));
    if (!result.error) {
      setShowOverrideForm(false);
      setOverrideData({ newScore: '', justification: '' });
      dispatch(getRiskHistory(id));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(updateSupplier({ id, data: editData }));
    if (!result.error) setShowEditForm(false);
  };

  const handleStatusChange = async (newStatus) => {
    await dispatch(updateSupplierStatus({ id, status: newStatus }));
  };

  const canManage = user?.role === 'ORG_ADMIN';
  const canOverride = user?.role === 'ORG_ADMIN' || user?.role === 'RISK_ANALYST';

  if (detailLoading && !supplier) {
    return (
      <Layout>
        <div className="shimmer-container" style={{ marginTop: 'var(--space-6)' }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer-row" style={{ height: 80, marginBottom: 12 }} />)}
        </div>
      </Layout>
    );
  }

  if (!supplier && !detailLoading) {
    return (
      <Layout>
        <div className="empty-canvas" style={{ marginTop: 'var(--space-8)' }}>
          <AlertTriangle size={48} className="empty-icon-lucide" />
          <h3>Supplier not found</h3>
          <p>This supplier may have been removed or you don't have access.</p>
          <button onClick={() => navigate('/suppliers')} className="btn-primary-premium" style={{ marginTop: 'var(--space-4)' }}>
            <ArrowLeft size={18} /> Back to Suppliers
          </button>
        </div>
      </Layout>
    );
  }

  const tier = supplier ? (supplier.riskTier || getTierFromScore(supplier.riskScore ?? 0)) : 'low';
  const categoryLabel = CATEGORIES.find(c => c.value === supplier?.category)?.label || supplier?.category;
  const statusLabel = STATUSES.find(s => s.value === supplier?.status)?.label || supplier?.status;

  // Chart data
  const chartData = {
    labels: riskHistory.map(h => {
      const d = new Date(h.scoredAt);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Risk Score',
        data: riskHistory.map(h => h.riskScore),
        borderColor: TIER_COLORS[tier] || '#E85D2F',
        backgroundColor: `${TIER_COLORS[tier] || '#E85D2F'}18`,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: TIER_COLORS[tier] || '#E85D2F',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(20,22,20,0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.7)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: ctx => `Risk Score: ${ctx.parsed.y}`
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 }, stepSize: 20 },
      },
    },
  };

  return (
    <Layout>
      {/* ── Breadcrumb / Back ── */}
      <div className="detail-breadcrumb anim-fade-in">
        <button onClick={() => navigate('/suppliers')} className="back-btn">
          <ArrowLeft size={16} /> Suppliers
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{supplier?.name}</span>
      </div>

      {/* ── Hero header ── */}
      <div className="page-header-premium anim-fade-in" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="user-avatar supplier-avatar" style={{ width: 52, height: 52, fontSize: 22, flexShrink: 0 }}>
              {supplier?.name?.charAt(0)}
            </div>
            <div>
              <h1 style={{ marginBottom: 4 }}>{supplier?.name}</h1>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`supplier-status-pill status-${supplier?.status || 'active'}`}>{statusLabel}</span>
                <span className={`risk-tier-chip tier-${tier}`}>{tier.charAt(0).toUpperCase() + tier.slice(1)} Risk</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={13} /> {supplier?.country || '—'}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={13} /> {categoryLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {canOverride && (
            <button onClick={() => setShowOverrideForm(!showOverrideForm)} className="action-btn-premium" style={{ background: TIER_COLORS[tier] }}>
              <ShieldCheck size={18} />
              <span>Override Score</span>
            </button>
          )}
          {canManage && (
            <button onClick={() => { setEditData({ ...supplier }); setShowEditForm(!showEditForm); }} className="action-btn-premium">
              <Edit2 size={18} />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Feedback ── */}
      {error && (
        <div className="error-card anim-shake" style={{ marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => dispatch(clearError())} className="error-dismiss"><X size={14} /></button>
        </div>
      )}
      {message && (
        <div className="success-card anim-card" style={{ marginBottom: 'var(--space-4)', '--delay': '0s' }}>
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* ── Edit Form ── */}
      {showEditForm && canManage && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={handleEditSubmit} className="invite-form-premium">
            <div className="form-header">
              <Edit2 size={20} /><h3>Edit Supplier Profile</h3>
            </div>
            <div className="form-grid">
              {[
                { name: 'name', label: 'Supplier Name', type: 'text', icon: Building2 },
                { name: 'contactEmail', label: 'Contact Email', type: 'email', icon: Package },
                { name: 'contactPhone', label: 'Phone', type: 'text', icon: Package },
                { name: 'country', label: 'Country', type: 'text', icon: Globe },
              ].map(f => (
                <div key={f.name} className="form-group-premium">
                  <label>{f.label}</label>
                  <div className="input-wrapper">
                    <f.icon size={18} className="input-icon" />
                    <input
                      type={f.type}
                      value={editData[f.name] || ''}
                      onChange={e => setEditData({ ...editData, [f.name]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              <div className="form-group-premium">
                <label>Category</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <select value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Status</label>
                <div className="input-wrapper">
                  <ShieldAlert size={18} className="input-icon" />
                  <select value={editData.status || 'active'} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null} Save Changes
              </button>
              <button type="button" onClick={() => setShowEditForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Override Form ── */}
      {showOverrideForm && canOverride && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={handleOverrideSubmit} className="invite-form-premium">
            <div className="form-header">
              <ShieldCheck size={20} /><h3>Manual Risk Score Override</h3>
            </div>
            <p className="form-subtitle">
              Current score: <strong style={{ color: TIER_COLORS[tier] }}>{supplier?.riskScore ?? '—'}</strong>.
              Overrides are permanently logged to the audit trail.
            </p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="form-group-premium">
                <label>New Risk Score (0–100)</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <input
                    type="number"
                    min="0" max="100"
                    placeholder="e.g. 45"
                    value={overrideData.newScore}
                    onChange={e => setOverrideData({ ...overrideData, newScore: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Justification</label>
                <div className="input-wrapper">
                  <ShieldAlert size={18} className="input-icon" style={{ top: 14 }} />
                  <textarea
                    name="justification"
                    placeholder="Provide a clear reason for this override..."
                    value={overrideData.justification}
                    onChange={e => setOverrideData({ ...overrideData, justification: e.target.value })}
                    required
                    rows={3}
                    style={{ paddingTop: 10, paddingLeft: 40, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null} Apply Override
              </button>
              <button type="button" onClick={() => setShowOverrideForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Risk Score Gauge + Metrics ── */}
      <div className="detail-top-grid">
        <div className="dash-card anim-card gauge-card" style={{ '--delay': '0.1s' }}>
          <div className="card-header-premium">
            <div className="header-info">
              <h3>Risk Score</h3>
              <span className="badge">{supplier?.lastScoredAt ? `Scored ${new Date(supplier.lastScoredAt).toLocaleDateString()}` : 'Not scored yet'}</span>
            </div>
          </div>
          <RiskGauge score={supplier?.riskScore} tier={tier} />
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            <span className={`risk-tier-chip tier-${tier}`} style={{ fontSize: 13, padding: '5px 16px' }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Risk Tier
            </span>
          </div>
          {supplier?.geopoliticalRisk && (
            <div className="geo-risk-flag">
              <Globe size={14} />
              <span>Geopolitical risk flagged for <strong>{supplier.country}</strong></span>
            </div>
          )}
        </div>

        <div className="metrics-mini-grid">
          <MetricCard icon={CheckCircle2} label="On-Time Delivery" value={supplier?.onTimeDeliveryRate} unit="%" color="#2DB87A" delay="0.15s" />
          <MetricCard icon={Clock} label="Avg Delay Days" value={supplier?.avgDelayDays} unit=" days" color="#D48A00" delay="0.2s" />
          <MetricCard icon={ShieldAlert} label="Defect Rate" value={supplier?.defectRate} unit="%" color="#E8572F" delay="0.25s" />
          <MetricCard icon={BarChart2} label="Financial Score" value={supplier?.financialScore} unit="" color="#3b82f6" delay="0.3s" />
          <MetricCard icon={TrendingUp} label="Years in Business" value={supplier?.yearsInBusiness} unit=" yrs" color="#8b5cf6" delay="0.35s" />
          <MetricCard icon={Package} label="Contract Value" value={supplier?.contractValue != null ? `$${Number(supplier.contractValue).toLocaleString()}` : null} unit="" color="#E85D2F" delay="0.4s" />
        </div>
      </div>

      {/* ── Risk History Chart ── */}
      <div className="dash-card anim-card" style={{ '--delay': '0.45s', marginBottom: 'var(--space-6)' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3>Risk Score History</h3>
            <span className="badge">{riskHistory.length} data points</span>
          </div>
        </div>
        {riskHistory.length === 0 ? (
          <div className="empty-canvas" style={{ padding: 'var(--space-8) 0' }}>
            <TrendingUp size={40} className="empty-icon-lucide" />
            <h3>No history yet</h3>
            <p>Risk score snapshots will appear here once scoring begins.</p>
          </div>
        ) : (
          <div style={{ height: 220, padding: '0 var(--space-4) var(--space-4)' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      {/* ── Override History ── */}
      {supplier?.overrideHistory?.length > 0 && (
        <div className="dash-card table-section anim-card" style={{ '--delay': '0.5s', marginBottom: 'var(--space-6)' }}>
          <div className="card-header-premium">
            <div className="header-info">
              <h3>Override History</h3>
              <span className="badge">{supplier.overrideHistory.length} entries</span>
            </div>
          </div>
          <div className="users-table-canvas">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Analyst</th>
                  <th>Score Change</th>
                  <th>Justification</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {supplier.overrideHistory.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-identity">
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                          {h.analystName?.charAt(0) || 'A'}
                        </div>
                        <span className="user-name">{h.analystName || 'Analyst'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="score-change">
                        <span className="score-old">{h.oldScore}</span>
                        <span className="score-arrow">→</span>
                        <span className="score-new" style={{ color: TIER_COLORS[getTierFromScore(h.newScore)] }}>{h.newScore}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{h.justification}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                        {h.overriddenAt ? new Date(h.overriddenAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Contact / Profile info ── */}
      <div className="dash-card anim-card" style={{ '--delay': '0.55s' }}>
        <div className="card-header-premium">
          <div className="header-info"><h3>Profile Details</h3></div>
        </div>
        <div className="profile-details-grid">
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Package size={14} /> Contact Email</span>
            <span className="profile-detail-value">{supplier?.contactEmail || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Package size={14} /> Phone</span>
            <span className="profile-detail-value">{supplier?.contactPhone || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Globe size={14} /> Country</span>
            <span className="profile-detail-value">{supplier?.country || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Tag size={14} /> Category</span>
            <span className="profile-detail-value">{categoryLabel || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><AlertTriangle size={14} /> Weather Exposure</span>
            <span className="profile-detail-value" style={{ textTransform: 'capitalize' }}>{supplier?.weatherLevel || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Calendar size={14} /> Registered</span>
            <span className="profile-detail-value">{supplier?.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
