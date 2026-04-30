import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
  ArrowLeft, Truck, Globe, Tag, Clock, AlertTriangle,
  BarChart2, CheckCircle2, Edit2, X, TrendingUp,
  Package, Navigation, MapPin, Calendar, History
} from 'lucide-react';
import { ROLES } from '../config/rbac.constants.js';
import {
  getShipment, getTrackingEvents, updateShipment,
  updateShipmentStatus, clearError, clearMessage, clearSelectedShipment,
} from '../redux/shipmentsSlice.js';
import { validateShipmentForm } from '../utils/validation.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CARRIERS   = ['FedEx', 'UPS', 'DHL', 'Other'];
const PRIORITIES = [
  { value: 'standard',  label: 'Standard' },
  { value: 'express',   label: 'Express' },
  { value: 'overnight', label: 'Overnight' },
];
const WEATHER_LEVELS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
];

const TIER_COLORS = {
  low:      '#2DB87A',
  medium:   '#D48A00',
  high:     '#E8572F',
  critical: '#C7253E',
};

const STATUS_COLORS = {
  registered: '#9ca3af',
  in_transit:  '#3b82f6',
  delayed:     '#D48A00',
  rerouted:    '#8b5cf6',
  delivered:   '#2DB87A',
  closed:      '#6b7280',
};

const VALID_TRANSITIONS = {
  registered:  ['in_transit', 'closed'],
  in_transit:  ['delayed', 'rerouted', 'delivered'],
  delayed:     ['in_transit', 'rerouted', 'delivered', 'closed'],
  rerouted:    ['in_transit', 'delayed', 'delivered', 'closed'],
  delivered:   ['closed'],
  closed:      [],
};

const STATUS_LABELS = {
  registered: 'Registered',
  in_transit:  'In Transit',
  delayed:     'Delayed',
  rerouted:    'Rerouted',
  delivered:   'Delivered',
  closed:      'Closed',
};

function RiskGauge({ score, tier }) {
  const safeScore = score ?? 0;
  const color     = TIER_COLORS[tier] || '#9A9E9A';
  const radius    = 54;
  const circ      = 2 * Math.PI * radius;

  return (
    <div className="risk-gauge-wrap">
      <svg width="160" height="120" viewBox="0 0 160 120" className="risk-gauge-svg">
        <circle
          cx="80" cy="88" r={radius}
          fill="none" stroke="var(--border-light)" strokeWidth="12"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125} strokeLinecap="round"
          transform="rotate(180 80 88)"
        />
        <circle
          cx="80" cy="88" r={radius}
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${circ * 0.75 * (safeScore / 100)} ${circ - circ * 0.75 * (safeScore / 100)}`}
          strokeDashoffset={circ * 0.125} strokeLinecap="round"
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

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || '#9ca3af';
  return (
    <span className={`shipment-status-pill shipment-status-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function DelaySeverityChip({ severity }) {
  if (!severity) return null;
  return (
    <span className={`risk-tier-chip tier-${severity}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)} Delay
    </span>
  );
}

export default function ShipmentDetailPage() {
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const { selectedShipment: shipment, trackingEvents, detailLoading, loading, error, message } = useSelector(s => s.shipments);
  const user = useSelector(s => s.auth.user);

  const [activeForm, setActiveForm] = useState(null);
  const openForm  = (name) => setActiveForm(prev => prev === name ? null : name);
  const closeForm = ()     => setActiveForm(null);

  const showEditForm   = activeForm === 'edit';
  const showStatusForm = activeForm === 'status';

  const [editData, setEditData]       = useState({});
  const [formErrors, setFormErrors]   = useState({});
  const [newStatus, setNewStatus]     = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const isValidObjectId = (val) => /^[a-f\d]{24}$/i.test(val);

  useEffect(() => {
    if (!isValidObjectId(id)) {
      navigate('/shipments', { replace: true });
      return;
    }
    dispatch(getShipment(id));
    dispatch(getTrackingEvents(id));
    return () => dispatch(clearSelectedShipment());
  }, [dispatch, id, navigate]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => dispatch(clearMessage()), 3000);
      return () => clearTimeout(t);
    }
  }, [message, dispatch]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateShipmentForm(editData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    
    const payload = {
      ...editData,
      weight:             editData.weight             ? Number(editData.weight)             : 0,
      shipmentValueUSD:   Number(editData.shipmentValueUSD) || 0,
      originGeoRisk:      Number(editData.originGeoRisk      ?? 0),
      destinationGeoRisk: Number(editData.destinationGeoRisk ?? 0),
    };
    if (!payload.supplierId) delete payload.supplierId;
    const result = await dispatch(updateShipment({ id, data: payload }));
    if (!result.error) {
      closeForm();
      setFormErrors({});
      dispatch(getShipment(id));
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    const result = await dispatch(updateShipmentStatus({ id, status: newStatus, notes: statusNotes }));
    if (!result.error) {
      closeForm();
      setNewStatus('');
      setStatusNotes('');
      dispatch(getShipment(id));
      dispatch(getTrackingEvents(id));
    }
  };

  const canManage  = user?.role === ROLES.ORG_ADMIN || user?.role === ROLES.LOGISTICS_OPERATOR;
  const allowedNext = VALID_TRANSITIONS[shipment?.status] || [];

  if (detailLoading && !shipment) {
    return (
      <Layout>
        <div className="shimmer-container" style={{ marginTop: 'var(--space-6)' }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer-row" style={{ height: 80, marginBottom: 12 }} />)}
        </div>
      </Layout>
    );
  }

  if (!shipment && !detailLoading) {
    return (
      <Layout>
        <div className="empty-canvas" style={{ marginTop: 'var(--space-8)' }}>
          <AlertTriangle size={48} className="empty-icon-lucide" />
          <h3>Shipment not found</h3>
          <p>This shipment may have been removed or you don't have access.</p>
          <button onClick={() => navigate('/shipments')} className="btn-primary-premium" style={{ marginTop: 'var(--space-4)' }}>
            <ArrowLeft size={18} /> Back to Shipments
          </button>
        </div>
      </Layout>
    );
  }

  const tier = shipment?.riskTier || 'low';

  // Chart data — risk score history
  const riskHistory = shipment?.riskHistory || [];
  const chartData = {
    labels: riskHistory.map(h => {
      const d = new Date(h.scoredAt);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }),
    datasets: [{
      label: 'Risk Score',
      data: riskHistory.map(h => h.riskScore),
      backgroundColor: riskHistory.map(h => `${TIER_COLORS[h.riskTier] || '#9ca3af'}CC`),
      borderColor:     riskHistory.map(h => TIER_COLORS[h.riskTier] || '#9ca3af'),
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
    }],
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
          label: ctx => {
            const entry = riskHistory[ctx.dataIndex];
            const tierLabel = entry?.riskTier ? ` (${entry.riskTier})` : '';
            return `Risk Score: ${ctx.parsed.y}${tierLabel}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: 'var(--text-tertiary)', font: { size: 10 } } },
      y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: 'var(--text-tertiary)', font: { size: 11 }, stepSize: 20 } },
    },
  };

  const trackingEventIcon = (status) => {
    const icons = {
      registered: '📋',
      in_transit:  '🚛',
      delayed:     '⚠️',
      rerouted:    '🔀',
      delivered:   '✅',
      closed:      '🔒',
    };
    return icons[status] || '📍';
  };

  return (
    <Layout>
      {/* ── Breadcrumb ── */}
      <div className="detail-breadcrumb anim-fade-in">
        <button onClick={() => navigate('/shipments')} className="back-btn">
          <ArrowLeft size={16} /> Shipments
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{shipment?.shipmentNumber}</span>
      </div>

      {/* ── Hero Header ── */}
      <div className="page-header-premium anim-fade-in" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              className="user-avatar supplier-avatar"
              style={{ width: 52, height: 52, fontSize: 22, flexShrink: 0, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
            >
              <Truck size={24} />
            </div>
            <div>
                <h1 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {shipment?.shipmentNumber}
                  {shipment?.shipmentType === 'internal_transfer' && (
                    <span className="role-chip" style={{ fontSize: '13px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 600 }}>
                      <Package size={13} />
                      <span style={{ fontWeight: 600 }}>Internal Transfer</span>
                    </span>
                  )}
                </h1>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill status={shipment?.status} />
                {shipment?.delaySeverity && <DelaySeverityChip severity={shipment.delaySeverity} />}
                <span className={`risk-tier-chip tier-${tier}`}>{tier.charAt(0).toUpperCase() + tier.slice(1)} Risk</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={13} /> {shipment?.carrier}
                </span>
                {shipment?.trackingNumber && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={13} /> {shipment.trackingNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {canManage && allowedNext.length > 0 && (
            <button
              onClick={() => { setNewStatus(allowedNext[0]); openForm('status'); }}
              className="action-btn-premium"
              style={{ background: STATUS_COLORS[shipment?.status] || 'var(--brand-primary)' }}
            >
              <Clock size={18} />
              <span>Update Status</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => { setEditData({ ...shipment, estimatedDelivery: shipment?.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().slice(0, 16) : '' }); openForm('edit'); }}
              className="action-btn-premium"
            >
              <Edit2 size={18} />
              <span>Edit Shipment</span>
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
              <Edit2 size={20} /><h3>Edit Shipment</h3>
            </div>

            <div className="form-section-label">Carrier & Routing</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Carrier</label>
                <div className="input-wrapper">
                  <Truck size={18} className="input-icon" />
                  <select value={editData.carrier || 'FedEx'} onChange={e => setEditData({ ...editData, carrier: e.target.value })}>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Tracking Number</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <input type="text" value={editData.trackingNumber || ''} onChange={e => setEditData({ ...editData, trackingNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Priority</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <select value={editData.priority || 'standard'} onChange={e => setEditData({ ...editData, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Estimated Delivery (ETA)</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <input
                    type="datetime-local"
                    value={editData.estimatedDelivery || ''}
                    onChange={e => setEditData({ ...editData, estimatedDelivery: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Weight (kg)</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="number" min="0" step="0.1" value={editData.weight ?? ''} onChange={e => setEditData({ ...editData, weight: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Shipment Value (USD) *</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="number" min="0" step="0.01" value={editData.shipmentValueUSD ?? 0} onChange={e => setEditData({ ...editData, shipmentValueUSD: e.target.value })} required />
                </div>
                {formErrors.shipmentValueUSD && <span style={{ color: '#EF4444', fontSize: '12px' }}>{formErrors.shipmentValueUSD}</span>}
              </div>
              <div className="form-group-premium">
                <label>Description</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="text" value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Origin</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Origin City</label>
                <div className="input-wrapper">
                  <Navigation size={18} className="input-icon" />
                  <input type="text" value={editData.originCity || ''} onChange={e => setEditData({ ...editData, originCity: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Origin Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" value={editData.originCountry || ''} onChange={e => setEditData({ ...editData, originCountry: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Origin Geopolitical Risk</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select value={editData.originGeoRisk ?? 0} onChange={e => setEditData({ ...editData, originGeoRisk: Number(e.target.value) })}>
                    <option value={0}>Stable — No geopolitical risk</option>
                    <option value={1}>At-Risk — Geopolitical risk flagged</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Destination</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Destination City</label>
                <div className="input-wrapper">
                  <Navigation size={18} className="input-icon" />
                  <input type="text" value={editData.destinationCity || ''} onChange={e => setEditData({ ...editData, destinationCity: e.target.value })} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Destination Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" value={editData.destinationCountry || ''} onChange={e => setEditData({ ...editData, destinationCountry: e.target.value })} />
                </div>
                {formErrors.destinationCountry && <span style={{ color: '#EF4444', fontSize: '12px' }}>{formErrors.destinationCountry}</span>}
              </div>
              <div className="form-group-premium">
                <label>Destination Geopolitical Risk</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select value={editData.destinationGeoRisk ?? 0} onChange={e => setEditData({ ...editData, destinationGeoRisk: Number(e.target.value) })}>
                    <option value={0}>Stable — No geopolitical risk</option>
                    <option value={1}>At-Risk — Geopolitical risk flagged</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Risk Factors</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Weather Exposure</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select value={editData.weatherLevel || 'low'} onChange={e => setEditData({ ...editData, weatherLevel: e.target.value })}>
                    {WEATHER_LEVELS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
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

      {/* ── Status Update Form ── */}
      {showStatusForm && canManage && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={handleStatusSubmit} className="invite-form-premium">
            <div className="form-header">
              <Clock size={20} /><h3>Update Shipment Status</h3>
            </div>
            <p className="form-subtitle">
              Current status: <StatusPill status={shipment?.status} />&nbsp;&nbsp;
              Allowed transitions: {allowedNext.map(s => STATUS_LABELS[s]).join(', ')}
            </p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="form-group-premium">
                <label>New Status</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} required>
                    <option value="">Select new status</option>
                    {allowedNext.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Notes (optional)</label>
                <div className="input-wrapper">
                  <History size={18} className="input-icon" style={{ top: 14 }} />
                  <textarea
                    placeholder="e.g. Held at customs, weather delay at origin..."
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    rows={2}
                    style={{ paddingTop: 10, paddingLeft: 40, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading || !newStatus}>
                {loading ? <span className="spinner" /> : null} Apply Status Change
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Risk Gauge + Metrics ── */}
      <div className="detail-top-grid">
        <div className="dash-card anim-card gauge-card" style={{ '--delay': '0.1s' }}>
          <div className="card-header-premium">
            <div className="header-info">
              <h3>Risk Score</h3>
              <span className="badge">
                {shipment?.lastScoredAt
                  ? `Scored ${new Date(shipment.lastScoredAt).toLocaleDateString()}`
                  : 'Not scored yet'}
              </span>
            </div>
          </div>
          <RiskGauge score={shipment?.riskScore} tier={tier} />
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            <span className={`risk-tier-chip tier-${tier}`} style={{ fontSize: 13, padding: '5px 16px' }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Risk Tier
            </span>
          </div>
          {shipment?.delaySeverity && (
            <div className="geo-risk-flag" style={{ marginTop: 'var(--space-4)' }}>
              <AlertTriangle size={14} />
              <span>
                <strong>{shipment.delayHours?.toFixed(1)}h</strong> past ETA &mdash; {shipment.delaySeverity} severity
              </span>
            </div>
          )}
        </div>

        <div className="metrics-mini-grid">
          <MetricCard
            icon={Clock}
            label="Delay Hours"
            value={shipment?.delayHours > 0 ? shipment.delayHours?.toFixed(1) : 'On Time'}
            unit={shipment?.delayHours > 0 ? 'h' : ''}
            color={shipment?.delayHours > 0 ? '#D48A00' : '#2DB87A'}
            delay="0.15s"
          />
          <MetricCard
            icon={Calendar}
            label="Est. Delivery"
            value={shipment?.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : null}
            unit=""
            color="#3b82f6"
            delay="0.2s"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Actual Delivery"
            value={shipment?.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString() : null}
            unit=""
            color="#2DB87A"
            delay="0.25s"
          />
          <MetricCard icon={Truck}     label="Carrier"   value={shipment?.carrier}   unit="" color="#8b5cf6" delay="0.3s" />
          <MetricCard icon={BarChart2} label="Priority"  value={shipment?.priority ? shipment.priority.charAt(0).toUpperCase() + shipment.priority.slice(1) : null}  unit="" color="#E8572F" delay="0.35s" />
          <MetricCard icon={Package}   label="Weight"    value={shipment?.weight}    unit=" kg" color="#9ca3af" delay="0.4s" />
        </div>
      </div>

      {/* ── Route Info ── */}
      <div className="dash-card anim-card" style={{ '--delay': '0.4s', marginBottom: 'var(--space-6)' }}>
        <div className="card-header-premium">
          <div className="header-info"><h3>Route Details</h3></div>
        </div>
        <div className="profile-details-grid">
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Navigation size={14} /> Origin</span>
            <span className="profile-detail-value">
              {[shipment?.originCity, shipment?.originCountry].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><MapPin size={14} /> Destination</span>
            <span className="profile-detail-value">
              {[shipment?.destinationCity, shipment?.destinationCountry].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><AlertTriangle size={14} /> Origin Geo Risk</span>
            <span className="profile-detail-value">
              {shipment?.originGeoRisk === 1
                ? <span className="risk-tier-chip tier-high" style={{ fontSize: 12 }}>At-Risk Country</span>
                : <span className="risk-tier-chip tier-low"  style={{ fontSize: 12 }}>Stable Country</span>}
            </span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><AlertTriangle size={14} /> Dest. Geo Risk</span>
            <span className="profile-detail-value">
              {shipment?.destinationGeoRisk === 1
                ? <span className="risk-tier-chip tier-high" style={{ fontSize: 12 }}>At-Risk Country</span>
                : <span className="risk-tier-chip tier-low"  style={{ fontSize: 12 }}>Stable Country</span>}
            </span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Globe size={14} /> Weather Exposure</span>
            <span className="profile-detail-value" style={{ textTransform: 'capitalize' }}>{shipment?.weatherLevel || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Tag size={14} /> Description</span>
            <span className="profile-detail-value">{shipment?.description || '—'}</span>
          </div>
          {shipment?.supplierId && (
            <div className="profile-detail-row">
              <span className="profile-detail-label"><Package size={14} /> Linked Supplier</span>
              <span className="profile-detail-value">
                {typeof shipment.supplierId === 'object'
                  ? shipment.supplierId.name
                  : shipment.supplierId}
              </span>
            </div>
          )}
          {shipment?.shipmentType === 'internal_transfer' && shipment?.warehouseTransferId && (
            <div className="profile-detail-row">
              <span className="profile-detail-label"><Package size={14} /> Linked Transfer</span>
              <span className="profile-detail-value">
                {typeof shipment.warehouseTransferId === 'object'
                  ? shipment.warehouseTransferId.transferNumber || shipment.warehouseTransferId._id
                  : shipment.warehouseTransferId}
              </span>
            </div>
          )}
          <div className="profile-detail-row">
            <span className="profile-detail-label"><Calendar size={14} /> Registered</span>
            <span className="profile-detail-value">{shipment?.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Risk Score History Chart ── */}
      <div className="dash-card anim-card" style={{ '--delay': '0.45s', marginBottom: 'var(--space-6)', borderLeft: '3px solid #2DB87A' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3><TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> Risk Score per Status Event</h3>
            <span className="badge">{riskHistory.length} snapshots</span>
          </div>
        </div>
        {riskHistory.length === 0 ? (
          <div className="empty-canvas" style={{ padding: 'var(--space-8) 0' }}>
            <TrendingUp size={40} className="empty-icon-lucide" />
            <h3>No history yet</h3>
            <p>Risk score snapshots will appear here once tracking begins.</p>
          </div>
        ) : (
          <div style={{ height: 250, padding: '0 var(--space-4) var(--space-4)' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      {/* ── Tracking Events Timeline ── */}
      <div className="dash-card anim-card" style={{ '--delay': '0.5s', marginBottom: 'var(--space-6)' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3>Tracking Timeline</h3>
            <span className="badge">{trackingEvents.length} events</span>
          </div>
        </div>
        {trackingEvents.length === 0 ? (
          <div className="empty-canvas" style={{ padding: 'var(--space-8) 0' }}>
            <MapPin size={40} className="empty-icon-lucide" />
            <h3>No tracking events yet</h3>
            <p>Carrier updates will appear here as the shipment progresses.</p>
          </div>
        ) : (
          <div className="tracking-timeline">
            {trackingEvents.map((ev, i) => (
              <div key={i} className={`tracking-event ${i === 0 ? 'tracking-event-latest' : ''}`}>
                <div className="tracking-event-dot" style={{ background: STATUS_COLORS[ev.status] || '#9ca3af' }}>
                  <span style={{ fontSize: 14 }}>{trackingEventIcon(ev.status)}</span>
                </div>
                <div className="tracking-event-content">
                  <div className="tracking-event-header">
                    <span className={`shipment-status-pill shipment-status-${ev.status}`}>
                      {STATUS_LABELS[ev.status] || ev.status}
                    </span>
                    {ev.location && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={11} /> {ev.location}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {new Date(ev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {ev.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{ev.description}</p>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                    Source: {ev.source?.replace('_', ' ') || 'system'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Status History Table ── */}
      {(shipment?.statusHistory?.length ?? 0) > 0 && (
        <div className="dash-card table-section anim-card" style={{ '--delay': '0.55s', marginBottom: 'var(--space-6)' }}>
          <div className="card-header-premium">
            <div className="header-info">
              <h3>Status Change History</h3>
              <span className="badge">{shipment.statusHistory.length} entries</span>
            </div>
          </div>
          <div className="users-table-canvas">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Changed By</th>
                  <th>Notes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...shipment.statusHistory].reverse().map((h, i) => (
                  <tr key={i}>
                    <td><span className={`shipment-status-pill shipment-status-${h.status}`}>{STATUS_LABELS[h.status] || h.status}</span></td>
                    <td>
                      <div className="user-identity">
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                          {h.changedByName?.charAt(0) || 'S'}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{h.changedByName || 'System'}</span>
                          {h.changedByEmail && <span className="user-email">{h.changedByEmail}</span>}
                          {h.changedByRole && (
                            <span className="role-chip" style={{ marginTop: 2, fontSize: 11 }}>
                              {h.changedByRole.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{h.notes || '—'}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                        {h.changedAt ? (
                          <>
                            <span>{new Date(h.changedAt).toLocaleDateString()}</span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </Layout>
  );
}
