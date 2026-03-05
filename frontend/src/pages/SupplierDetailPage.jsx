import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  updateSupplierStatus, updateSupplierMetrics, clearError, clearMessage, clearSelectedSupplier
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
  const location = useLocation();

  const { selectedSupplier: supplier, riskHistory, detailLoading, loading, error, message } = useSelector(s => s.suppliers);
  const user = useSelector(s => s.auth.user);

  // Only one form is open at a time: 'edit' | 'override' | 'metrics' | null
  const [activeForm, setActiveForm] = useState(null);
  const openForm  = (name) => setActiveForm(prev => prev === name ? null : name);
  const closeForm = ()     => setActiveForm(null);

  const showEditForm     = activeForm === 'edit';
  const showOverrideForm = activeForm === 'override';
  const showMetricsForm  = activeForm === 'metrics';

  const setShowEditForm     = (v) => setActiveForm(v ? 'edit'     : null);
  const setShowOverrideForm = (v) => setActiveForm(v ? 'override' : null);
  const setShowMetricsForm  = (v) => setActiveForm(v ? 'metrics'  : null);

  const [overrideData, setOverrideData] = useState({ newScore: '', justification: '' });
  const [editData, setEditData] = useState({});
  const [metricsData, setMetricsData] = useState({
    onTimeDeliveryRate: '', defectRate: '', disputeFrequency: '',
    avgDelayDays: '', financialScore: '', yearsInBusiness: '', contractValue: '',
    reason: '',
  });

  const isValidObjectId = (val) => /^[a-f\d]{24}$/i.test(val);

  useEffect(() => {
    if (!isValidObjectId(id)) {
      navigate('/suppliers', { replace: true });
      return;
    }
    dispatch(getSupplier(id));
    dispatch(getRiskHistory(id));
    return () => dispatch(clearSelectedSupplier());
  }, [dispatch, id, navigate]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => dispatch(clearMessage()), 3000);
      return () => clearTimeout(t);
    }
  }, [message, dispatch]);

  // Auto-open edit form when navigated from the suppliers list edit button
  useEffect(() => {
    if (location.state?.openEdit && supplier) {
      setEditData({ ...supplier });
      openForm('edit');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openEdit, supplier]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(overrideScore({
      id,
      data: { newScore: Number(overrideData.newScore), justification: overrideData.justification }
    }));
    if (!result.error) {
      closeForm();
      setOverrideData({ newScore: '', justification: '' });
      dispatch(getRiskHistory(id));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(updateSupplier({ id, data: editData }));
    if (!result.error) closeForm();
  };

  const handleStatusChange = async (newStatus) => {
    await dispatch(updateSupplierStatus({ id, status: newStatus }));
  };

  const handleMetricsSubmit = async (e) => {
    e.preventDefault();
    const payload = { reason: metricsData.reason, source: 'manual' };
    if (metricsData.onTimeDeliveryRate !== '') payload.onTimeDeliveryRate = Number(metricsData.onTimeDeliveryRate);
    if (metricsData.defectRate !== '')         payload.defectRate         = Number(metricsData.defectRate);
    if (metricsData.disputeFrequency !== '')   payload.disputeFrequency   = Number(metricsData.disputeFrequency);
    if (metricsData.avgDelayDays !== '')       payload.avgDelayDays       = Number(metricsData.avgDelayDays);
    if (metricsData.financialScore !== '')     payload.financialScore     = Number(metricsData.financialScore);
    if (metricsData.yearsInBusiness !== '')    payload.yearsInBusiness    = Number(metricsData.yearsInBusiness);
    if (metricsData.contractValue !== '')      payload.contractValue      = Number(metricsData.contractValue);
    const result = await dispatch(updateSupplierMetrics({ id, data: payload }));
    if (!result.error) {
      closeForm();
      setMetricsData({
        onTimeDeliveryRate: '', defectRate: '', disputeFrequency: '',
        avgDelayDays: '', financialScore: '', yearsInBusiness: '', contractValue: '',
        reason: '',
      });
      dispatch(getRiskHistory(id));
    }
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
            <button onClick={() => openForm('metrics')} className="action-btn-premium" style={{ background: '#3b82f6' }}>
              <BarChart2 size={18} />
              <span>Update Metrics</span>
            </button>
          )}
          {canOverride && (
            <button onClick={() => openForm('override')} className="action-btn-premium" style={{ background: TIER_COLORS[tier] }}>
              <ShieldCheck size={18} />
              <span>Override Score</span>
            </button>
          )}
          {canManage && (
            <button onClick={() => { setEditData({ ...supplier }); openForm('edit'); }} className="action-btn-premium">
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

            {/* ── Basic Information ── */}
            <div className="form-section-label">Basic Information</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Supplier Name</label>
                <div className="input-wrapper">
                  <Building2 size={18} className="input-icon" />
                  <input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Contact Email</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="email" value={editData.contactEmail || ''} onChange={e => setEditData({ ...editData, contactEmail: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Contact Phone</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="text" value={editData.contactPhone || ''} onChange={e => setEditData({ ...editData, contactPhone: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" value={editData.country || ''} onChange={e => setEditData({ ...editData, country: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Category</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <select value={editData.category || 'raw_materials'} onChange={e => setEditData({ ...editData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Weather Exposure</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select value={editData.weatherLevel || 'low'} onChange={e => setEditData({ ...editData, weatherLevel: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Geopolitical Risk Flag</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <select value={editData.geopoliticalRiskFlag ?? 0} onChange={e => setEditData({ ...editData, geopoliticalRiskFlag: Number(e.target.value) })}>
                    <option value={0}>Stable — No geopolitical risk</option>
                    <option value={1}>At-Risk — Geopolitical risk flagged</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null} Save Changes
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
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
              <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Update Metrics Form ── */}
      {showMetricsForm && canOverride && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={handleMetricsSubmit} className="invite-form-premium">
            <div className="form-header">
              <BarChart2 size={20} /><h3>Update Performance Metrics</h3>
            </div>
            <p className="form-subtitle">
              Update supplier performance data after a shipment delivery or based on new information.
              Leave fields blank to keep existing values. Changes are permanently logged.
            </p>
            <div className="form-section-label">Metric Values</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>On-Time Delivery Rate (%)</label>
                <div className="input-wrapper">
                  <CheckCircle2 size={18} className="input-icon" />
                  <input type="number" min="0" max="100" step="0.1"
                    placeholder={`Current: ${supplier?.onTimeDeliveryRate ?? '—'}%`}
                    value={metricsData.onTimeDeliveryRate}
                    onChange={e => setMetricsData({ ...metricsData, onTimeDeliveryRate: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Defect Rate (%)</label>
                <div className="input-wrapper">
                  <ShieldAlert size={18} className="input-icon" />
                  <input type="number" min="0" max="100" step="0.01"
                    placeholder={`Current: ${supplier?.defectRate ?? '—'}%`}
                    value={metricsData.defectRate}
                    onChange={e => setMetricsData({ ...metricsData, defectRate: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Dispute Frequency (per period)</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <input type="number" min="0" max="20" step="0.1"
                    placeholder={`Current: ${supplier?.disputeFrequency ?? '—'}`}
                    value={metricsData.disputeFrequency}
                    onChange={e => setMetricsData({ ...metricsData, disputeFrequency: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Avg Delay Days</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <input type="number" min="0" step="0.1"
                    placeholder={`Current: ${supplier?.avgDelayDays ?? '—'} days`}
                    value={metricsData.avgDelayDays}
                    onChange={e => setMetricsData({ ...metricsData, avgDelayDays: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Financial Health Score (0–100)</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <input type="number" min="0" max="100"
                    placeholder={`Current: ${supplier?.financialScore ?? '—'}`}
                    value={metricsData.financialScore}
                    onChange={e => setMetricsData({ ...metricsData, financialScore: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Years in Business</label>
                <div className="input-wrapper">
                  <TrendingUp size={18} className="input-icon" />
                  <input type="number" min="0" step="1"
                    placeholder={`Current: ${supplier?.yearsInBusiness ?? '—'} yrs`}
                    value={metricsData.yearsInBusiness}
                    onChange={e => setMetricsData({ ...metricsData, yearsInBusiness: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Annual Contract Value ($)</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="number" min="0"
                    placeholder={`Current: $${supplier?.contractValue != null ? Number(supplier.contractValue).toLocaleString() : '—'}`}
                    value={metricsData.contractValue}
                    onChange={e => setMetricsData({ ...metricsData, contractValue: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
                <label>Reason for Update <span style={{ color: 'var(--risk-high)' }}>*</span></label>
                <div className="input-wrapper">
                  <History size={18} className="input-icon" style={{ top: 14 }} />
                  <textarea
                    placeholder="e.g. Updated after delivery of Shipment #SHP-2024-001 — 2 day delay recorded"
                    value={metricsData.reason}
                    onChange={e => setMetricsData({ ...metricsData, reason: e.target.value })}
                    required rows={2}
                    style={{ paddingTop: 10, paddingLeft: 40, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null} Save Metrics
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
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
          {supplier?.geopoliticalRiskFlag === 1 && (
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
          <MetricCard icon={ShieldAlert} label="Dispute Frequency" value={supplier?.disputeFrequency} unit=" /period" color="#C7253E" delay="0.45s" />
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
                        <div className="user-info">
                          <span className="user-name">{h.analystName || 'Analyst'}</span>
                          {h.analystEmail && <span className="user-email">{h.analystEmail}</span>}
                          {h.analystRole && (
                            <span className="role-chip" style={{ marginTop: 2, fontSize: 11 }}>
                              {h.analystRole.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
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
                        {h.overriddenAt ? (
                          <>
                            <span>{new Date(h.overriddenAt).toLocaleDateString()}</span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {new Date(h.overriddenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Metrics Adjustment Log (manual only) ── */}
      {supplier?.metricsAdjustmentHistory?.filter(e => e.source === 'manual').length > 0 && (
        <div className="dash-card table-section anim-card" style={{ '--delay': '0.55s', marginBottom: 'var(--space-6)' }}>
          <div className="card-header-premium">
            <div className="header-info">
              <h3>Manual Metrics Adjustments</h3>
              <span className="badge">{supplier.metricsAdjustmentHistory.filter(e => e.source === 'manual').length} entries</span>
            </div>
          </div>
          <div className="users-table-canvas">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Adjusted By</th>
                  <th>Changes</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...supplier.metricsAdjustmentHistory].filter(e => e.source === 'manual').reverse().map((entry, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-identity">
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                          {entry.adjustedByName?.charAt(0) || '?'}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{entry.adjustedByName || 'Unknown'}</span>
                          {entry.adjustedByEmail && <span className="user-email">{entry.adjustedByEmail}</span>}
                          {entry.adjustedByRole && (
                            <span className="role-chip" style={{ marginTop: 2, fontSize: 11 }}>
                              {entry.adjustedByRole.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                        {entry.changes?.onTimeDeliveryRate && (
                          <span>On-Time: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.onTimeDeliveryRate.old}%</span><span className="score-arrow"> → </span><strong style={{ color: 'var(--risk-low)' }}>{entry.changes.onTimeDeliveryRate.new}%</strong></span>
                        )}
                        {entry.changes?.defectRate && (
                          <span>Defect Rate: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.defectRate.old}%</span><span className="score-arrow"> → </span><strong style={{ color: 'var(--risk-high)' }}>{entry.changes.defectRate.new}%</strong></span>
                        )}
                        {entry.changes?.disputeFrequency && (
                          <span>Disputes: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.disputeFrequency.old}</span><span className="score-arrow"> → </span><strong style={{ color: 'var(--risk-medium)' }}>{entry.changes.disputeFrequency.new}</strong></span>
                        )}
                        {entry.changes?.avgDelayDays && (
                          <span>Avg Delay: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.avgDelayDays.old}d</span><span className="score-arrow"> → </span><strong>{entry.changes.avgDelayDays.new}d</strong></span>
                        )}
                        {entry.changes?.financialScore && (
                          <span>Financial: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.financialScore.old}</span><span className="score-arrow"> → </span><strong style={{ color: '#3b82f6' }}>{entry.changes.financialScore.new}</strong></span>
                        )}
                        {entry.changes?.yearsInBusiness && (
                          <span>Years: <span style={{ color: 'var(--text-tertiary)' }}>{entry.changes.yearsInBusiness.old}</span><span className="score-arrow"> → </span><strong>{entry.changes.yearsInBusiness.new}</strong></span>
                        )}
                        {entry.changes?.contractValue && (
                          <span>Contract: <span style={{ color: 'var(--text-tertiary)' }}>${Number(entry.changes.contractValue.old).toLocaleString()}</span><span className="score-arrow"> → </span><strong>${Number(entry.changes.contractValue.new).toLocaleString()}</strong></span>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{entry.reason}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                        {entry.adjustedAt ? (
                          <>
                            <span>{new Date(entry.adjustedAt).toLocaleDateString()}</span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {new Date(entry.adjustedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : '—'}
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
            <span className="profile-detail-label"><Globe size={14} /> Geopolitical Risk</span>
            <span className="profile-detail-value">
              {supplier?.geopoliticalRiskFlag === 1
                ? <span className="risk-tier-chip tier-high" style={{ fontSize: 12 }}>At-Risk Country</span>
                : <span className="risk-tier-chip tier-low" style={{ fontSize: 12 }}>Stable Country</span>
              }
            </span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><ShieldAlert size={14} /> Dispute Frequency</span>
            <span className="profile-detail-value">
              {supplier?.disputeFrequency != null ? `${supplier.disputeFrequency} per period` : '—'}
            </span>
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
