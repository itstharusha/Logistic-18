import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Plus, Search, AlertTriangle, CheckCircle2,
  Clock, Globe, ChevronRight, Edit2, X, Package,
  Navigation, BarChart2, Tag
} from 'lucide-react';
import {
  listShipments, createShipment, updateShipment,
  updateShipmentStatus, clearMessage, clearError,
} from '../redux/shipmentsSlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

const CARRIERS = [
  { value: 'FedEx',  label: 'FedEx' },
  { value: 'UPS',    label: 'UPS' },
  { value: 'DHL',    label: 'DHL' },
  { value: 'Other',  label: 'Other' },
];

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

const STATUSES = [
  { value: 'registered', label: 'Registered' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delayed',    label: 'Delayed' },
  { value: 'rerouted',   label: 'Rerouted' },
  { value: 'delivered',  label: 'Delivered' },
  { value: 'closed',     label: 'Closed' },
];

const EMPTY_FORM = {
  trackingNumber:     '',
  description:        '',
  carrier:            'FedEx',
  priority:           'standard',
  supplierId:         '',
  originCity:         '',
  originCountry:      '',
  destinationCity:    '',
  destinationCountry: '',
  estimatedDelivery:  '',
  weight:             '',
  weatherLevel:       'low',
  originGeoRisk:      0,
  destinationGeoRisk: 0,
};

function getRiskTierFromScore(score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

function RiskScoreBar({ score }) {
  const tier = getRiskTierFromScore(score ?? 0);
  return (
    <div className="risk-score-bar-wrap">
      <div className="risk-score-bar">
        <div className={`risk-score-fill tier-${tier}`} style={{ width: `${score ?? 0}%` }} />
      </div>
      <span className="risk-score-number">{score ?? '—'}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    registered: { label: 'Registered', cls: 'shipment-status-registered' },
    in_transit:  { label: 'In Transit', cls: 'shipment-status-in_transit' },
    delayed:     { label: 'Delayed',    cls: 'shipment-status-delayed' },
    rerouted:    { label: 'Rerouted',   cls: 'shipment-status-rerouted' },
    delivered:   { label: 'Delivered',  cls: 'shipment-status-delivered' },
    closed:      { label: 'Closed',     cls: 'shipment-status-closed' },
  };
  const info = map[status] || { label: status, cls: '' };
  return <span className={`shipment-status-pill ${info.cls}`}>{info.label}</span>;
}

function DelaySeverityChip({ severity }) {
  if (!severity) return <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>—</span>;
  return (
    <span className={`risk-tier-chip tier-${severity}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)} Delay
    </span>
  );
}

export default function ShipmentsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { shipments, total, loading, error, message } = useSelector(s => s.shipments);
  const user = useSelector(s => s.auth.user);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [editingId, setEditingId]     = useState(null);

  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');

  const [showStatusModal, setShowStatusModal] = useState(null);
  const [statusNotes, setStatusNotes]         = useState('');

  useEffect(() => {
    dispatch(listShipments({ limit: 50, skip: 0 }));
  }, [dispatch]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => dispatch(clearMessage()), 3000);
      return () => clearTimeout(t);
    }
  }, [message, dispatch]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      weight:             formData.weight      ? Number(formData.weight)      : 0,
      originGeoRisk:      Number(formData.originGeoRisk),
      destinationGeoRisk: Number(formData.destinationGeoRisk),
    };
    if (!payload.supplierId) delete payload.supplierId;
    const result = await dispatch(createShipment(payload));
    if (!result.error) {
      setFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
  };

  const handleEditClick = (shipment) => {
    setEditingId(shipment._id);
    setFormData({
      trackingNumber:      shipment.trackingNumber     || '',
      description:         shipment.description        || '',
      carrier:             shipment.carrier            || 'FedEx',
      priority:            shipment.priority           || 'standard',
      supplierId:          shipment.supplierId?._id    || shipment.supplierId || '',
      originCity:          shipment.originCity         || '',
      originCountry:       shipment.originCountry      || '',
      destinationCity:     shipment.destinationCity    || '',
      destinationCountry:  shipment.destinationCountry || '',
      estimatedDelivery:   shipment.estimatedDelivery
        ? new Date(shipment.estimatedDelivery).toISOString().slice(0, 16)
        : '',
      weight:              shipment.weight ?? '',
      weatherLevel:        shipment.weatherLevel       || 'low',
      originGeoRisk:       shipment.originGeoRisk      ?? 0,
      destinationGeoRisk:  shipment.destinationGeoRisk ?? 0,
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      weight:             formData.weight      ? Number(formData.weight)      : 0,
      originGeoRisk:      Number(formData.originGeoRisk),
      destinationGeoRisk: Number(formData.destinationGeoRisk),
    };
    if (!payload.supplierId) delete payload.supplierId;
    const result = await dispatch(updateShipment({ id: editingId, data: payload }));
    if (!result.error) {
      setEditingId(null);
      setFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleStatusChange = async (newStatus) => {
    if (!showStatusModal) return;
    await dispatch(updateShipmentStatus({
      id: showStatusModal._id,
      status: newStatus,
      notes: statusNotes,
    }));
    setShowStatusModal(null);
    setStatusNotes('');
  };

  const filtered = shipments.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q
      || s.shipmentNumber?.toLowerCase().includes(q)
      || s.trackingNumber?.toLowerCase().includes(q)
      || s.originCity?.toLowerCase().includes(q)
      || s.originCountry?.toLowerCase().includes(q)
      || s.destinationCity?.toLowerCase().includes(q)
      || s.destinationCountry?.toLowerCase().includes(q)
      || s.description?.toLowerCase().includes(q);
    const matchStatus  = statusFilter  === 'all' || s.status  === statusFilter;
    const matchCarrier = carrierFilter === 'all' || s.carrier === carrierFilter;
    return matchSearch && matchStatus && matchCarrier;
  });

  const inTransitCount = shipments.filter(s => s.status === 'in_transit').length;
  const delayedCount   = shipments.filter(s => ['delayed', 'rerouted'].includes(s.status)).length;
  const deliveredCount = shipments.filter(s => s.status === 'delivered').length;

  const canManage = user?.role === 'ORG_ADMIN' || user?.role === 'LOGISTICS_OPERATOR';

  const allowedNextStatuses = (current) => {
    const transitions = {
      registered:  ['in_transit', 'closed'],
      in_transit:  ['delayed', 'rerouted', 'delivered'],
      delayed:     ['in_transit', 'rerouted', 'delivered', 'closed'],
      rerouted:    ['in_transit', 'delayed', 'delivered', 'closed'],
      delivered:   ['closed'],
      closed:      [],
    };
    return transitions[current] || [];
  };

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header-premium anim-fade-in">
        <div className="header-content">
          <h1>Shipment Tracking</h1>
          <p>Register, track, and manage shipment lifecycle and delay exposure</p>
        </div>
        <div className="header-actions">
          {canManage && (
            <button
              onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setShowAddForm(!showAddForm); }}
              className="action-btn-premium"
            >
              <Plus size={18} />
              <span>{showAddForm && !editingId ? 'Cancel' : 'Register Shipment'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(232, 93, 47, 0.1)', color: 'var(--brand-primary)', border: 'none' }}>
              <Package size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{total}</span>
              <span className="metric-label">Total Shipments</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.2s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }}>
              <Truck size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{inTransitCount}</span>
              <span className="metric-label">In Transit</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.3s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(212, 138, 0, 0.1)', color: 'var(--risk-medium)', border: 'none' }}>
              <AlertTriangle size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{delayedCount}</span>
              <span className="metric-label">Delayed / Rerouted</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.4s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(45, 184, 122, 0.1)', color: 'var(--risk-low)', border: 'none' }}>
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{deliveredCount}</span>
              <span className="metric-label">Delivered</span>
            </div>
          </div>
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

      {/* ── Register / Edit Form ── */}
      {showAddForm && canManage && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={editingId ? handleEditSubmit : handleAddSubmit} className="invite-form-premium">
            <div className="form-header">
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
              <h3>{editingId ? 'Edit Shipment' : 'Register New Shipment'}</h3>
            </div>

            <div className="form-section-label">Carrier & Routing</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Carrier</label>
                <div className="input-wrapper">
                  <Truck size={18} className="input-icon" />
                  <select name="carrier" value={formData.carrier} onChange={handleFormChange}>
                    {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Tracking Number</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <input type="text" name="trackingNumber" placeholder="e.g. 794644790014" value={formData.trackingNumber} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Priority</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <select name="priority" value={formData.priority} onChange={handleFormChange}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group-premium">
                <label>Estimated Delivery (ETA)</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <input type="datetime-local" name="estimatedDelivery" value={formData.estimatedDelivery} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Weight (kg)</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="number" name="weight" placeholder="e.g. 50" min="0" step="0.1" value={formData.weight} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Description</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="text" name="description" placeholder="e.g. Electronic components Q2" value={formData.description} onChange={handleFormChange} />
                </div>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Origin</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Origin City</label>
                <div className="input-wrapper">
                  <Navigation size={18} className="input-icon" />
                  <input type="text" name="originCity" placeholder="e.g. Shanghai" value={formData.originCity} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Origin Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" name="originCountry" placeholder="e.g. China" value={formData.originCountry} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Origin Geopolitical Risk</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select
                    name="originGeoRisk"
                    value={formData.originGeoRisk}
                    onChange={e => setFormData({ ...formData, originGeoRisk: Number(e.target.value) })}
                  >
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
                  <input type="text" name="destinationCity" placeholder="e.g. New York" value={formData.destinationCity} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Destination Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" name="destinationCountry" placeholder="e.g. United States" value={formData.destinationCountry} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Destination Geopolitical Risk</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <select
                    name="destinationGeoRisk"
                    value={formData.destinationGeoRisk}
                    onChange={e => setFormData({ ...formData, destinationGeoRisk: Number(e.target.value) })}
                  >
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
                  <select name="weatherLevel" value={formData.weatherLevel} onChange={handleFormChange}>
                    {WEATHER_LEVELS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {editingId ? 'Save Changes' : 'Register Shipment'}
              </button>
              <button type="button" onClick={handleCancelForm} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Shipment Table ── */}
      <div className="dash-card table-section anim-card" style={{ '--delay': '0.5s' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3>Shipment Directory</h3>
            <span className="badge">{filtered.length} Shipments</span>
          </div>
          <div className="header-actions" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div className="search-box-premium">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search shipments..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs-row">
          <div className="filter-tabs">
            {[{ v: 'all', l: 'All' }, ...STATUSES.map(s => ({ v: s.value, l: s.label }))].map(f => (
              <button
                key={f.v}
                className={`filter-tab ${statusFilter === f.v ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
          <div className="filter-tabs">
            {[{ v: 'all', l: 'All Carriers' }, ...CARRIERS.map(c => ({ v: c.value, l: c.label }))].map(f => (
              <button
                key={f.v}
                className={`filter-tab ${carrierFilter === f.v ? 'active' : ''}`}
                onClick={() => setCarrierFilter(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="shimmer-container">
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer-row" />)}
          </div>
        ) : shipments.length === 0 ? (
          <div className="empty-canvas">
            <Truck size={48} className="empty-icon-lucide" />
            <h3>No shipments yet</h3>
            <p>Register your first shipment to begin tracking.</p>
            {canManage && (
              <button onClick={() => setShowAddForm(true)} className="btn-primary-premium">
                <Plus size={18} /> <span>Register First Shipment</span>
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-canvas" style={{ padding: 'var(--space-12) 0' }}>
            <Search size={48} className="empty-icon-lucide" />
            <h3>No results found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCarrierFilter('all'); }}
              className="btn-ghost"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="users-table-canvas">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Carrier</th>
                  <th>Route</th>
                  <th>ETA</th>
                  <th>Risk Score</th>
                  <th>Delay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div
                        className="user-identity"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/shipments/${s._id}`)}
                      >
                        <div className="user-avatar supplier-avatar"
                          style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
                        >
                          <Truck size={16} />
                        </div>
                        <div className="user-info">
                          <span className="user-name supplier-name-link">{s.shipmentNumber}</span>
                          <span className="user-email">{s.trackingNumber || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="role-chip">
                        <Truck size={13} />
                        <span>{s.carrier || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Globe size={12} />
                        <span>{s.originCity || s.originCountry || '—'}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                        <span>{s.destinationCity || s.destinationCountry || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {s.estimatedDelivery
                          ? new Date(s.estimatedDelivery).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                    <td><RiskScoreBar score={s.riskScore} /></td>
                    <td><DelaySeverityChip severity={s.delaySeverity} /></td>
                    <td><StatusPill status={s.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => navigate(`/shipments/${s._id}`)}
                          className="icon-btn-premium"
                          title="View Details"
                        >
                          <ChevronRight size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleEditClick(s)}
                              className="icon-btn-premium"
                              title="Edit Shipment"
                            >
                              <Edit2 size={16} />
                            </button>
                            {allowedNextStatuses(s.status).length > 0 && (
                              <button
                                onClick={() => { setShowStatusModal(s); setStatusNotes(''); }}
                                className="icon-btn-premium"
                                title="Change Status"
                              >
                                <Clock size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Status Change Modal ── */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Shipment Status</h3>
              <button onClick={() => setShowStatusModal(null)} className="modal-close"><X size={18} /></button>
            </div>
            <p className="modal-subtitle">
              Update status for <strong>{showStatusModal.shipmentNumber}</strong>
              &nbsp;— currently <StatusPill status={showStatusModal.status} />
            </p>

            <div className="form-group-premium" style={{ padding: '0 var(--space-4) var(--space-4)' }}>
              <label>Notes (optional)</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. Held at customs, weather delay..."
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  style={{ paddingLeft: 'var(--space-3)' }}
                />
              </div>
            </div>

            <div className="status-option-list">
              {allowedNextStatuses(showStatusModal.status).map(st => {
                const info = STATUSES.find(s => s.value === st);
                return (
                  <button
                    key={st}
                    className={`status-option-btn shipment-status-option-${st}`}
                    onClick={() => handleStatusChange(st)}
                    disabled={loading}
                  >
                    <StatusPill status={st} />
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                      {st === 'in_transit' && '→ Picked up and moving'}
                      {st === 'delayed'    && '→ ETA exceeded'}
                      {st === 'rerouted'   && '→ Alternate route taken'}
                      {st === 'delivered'  && '→ Delivered to recipient'}
                      {st === 'closed'     && '→ Case closed'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
