import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Search, AlertTriangle, ShieldAlert,
  CheckCircle2, Clock, Globe, Tag, Edit2, ChevronRight,
  BarChart2, GitCompare, X, Package
} from 'lucide-react';
import {
  listSuppliers, createSupplier, updateSupplier,
  updateSupplierStatus, compareSuppliers, clearMessage,
  clearError, clearComparisonData
} from '../redux/suppliersSlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

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

const WEATHER_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const EMPTY_FORM = {
  name: '', contactEmail: '', contactPhone: '', country: '',
  category: 'raw_materials', weatherLevel: 'low',
  onTimeDeliveryRate: '', avgDelayDays: '', defectRate: '',
  financialScore: '', yearsInBusiness: '', contractValue: '',
  geopoliticalRiskFlag: 0, disputeFrequency: '',
};

function getTierFromScore(score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

function RiskScoreBar({ score }) {
  const tier = getTierFromScore(score ?? 0);
  return (
    <div className="risk-score-bar-wrap">
      <div className="risk-score-bar">
        <div className={`risk-score-fill tier-${tier}`} style={{ width: `${score ?? 0}%` }} />
      </div>
      <span className="risk-score-number">{score ?? '—'}</span>
    </div>
  );
}

export default function SuppliersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { suppliers, total, loading, error, message, comparisonData } = useSelector(s => s.suppliers);
  const user = useSelector(s => s.auth.user);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null);

  useEffect(() => {
    dispatch(listSuppliers({ limit: 50, skip: 0 }));
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
    const result = await dispatch(createSupplier(formData));
    if (!result.error) {
      setFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
  };

  const handleEditClick = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      name: supplier.name || '',
      contactEmail: supplier.contactEmail || '',
      contactPhone: supplier.contactPhone || '',
      country: supplier.country || '',
      category: supplier.category || 'raw_materials',
      weatherLevel: supplier.weatherLevel || 'low',
      onTimeDeliveryRate: supplier.onTimeDeliveryRate ?? '',
      avgDelayDays: supplier.avgDelayDays ?? '',
      defectRate: supplier.defectRate ?? '',
      financialScore: supplier.financialScore ?? '',
      yearsInBusiness: supplier.yearsInBusiness ?? '',
      contractValue: supplier.contractValue ?? '',
      geopoliticalRiskFlag: supplier.geopoliticalRiskFlag ?? 0,
      disputeFrequency: supplier.disputeFrequency ?? '',
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(updateSupplier({ id: editingId, data: formData }));
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

  const handleStatusChange = async (supplierId, newStatus) => {
    await dispatch(updateSupplierStatus({ id: supplierId, status: newStatus }));
    setShowStatusModal(null);
  };

  const handleCompareToggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    await dispatch(compareSuppliers(selectedIds));
    setShowCompare(true);
  };

  const handleCloseCompare = () => {
    setShowCompare(false);
    setSelectedIds([]);
    dispatch(clearComparisonData());
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchTier = tierFilter === 'all' || s.riskTier === tierFilter;
    return matchSearch && matchStatus && matchTier;
  });

  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const atRiskCount = suppliers.filter(s => ['under_watch', 'high_risk', 'suspended'].includes(s.status)).length;
  const avgScore = suppliers.length
    ? Math.round(suppliers.reduce((sum, s) => sum + (s.riskScore || 0), 0) / suppliers.length)
    : 0;

  const canManage = user?.role === 'ORG_ADMIN';
  const canOverride = user?.role === 'ORG_ADMIN' || user?.role === 'RISK_ANALYST';

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header-premium anim-fade-in">
        <div className="header-content">
          <h1>Supplier Risk Management</h1>
          <p>Monitor, score, and manage your supplier network risk exposure</p>
        </div>
        <div className="header-actions">
          {selectedIds.length >= 2 && (
            <button onClick={handleCompare} className="action-btn-premium" style={{ background: '#3b82f6' }}>
              <GitCompare size={18} />
              <span>Compare ({selectedIds.length})</span>
            </button>
          )}
          {canManage && (
            <button onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setShowAddForm(!showAddForm); }} className="action-btn-premium">
              <Plus size={18} />
              <span>{showAddForm && !editingId ? 'Cancel' : 'Add Supplier'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(232, 93, 47, 0.1)', color: 'var(--brand-primary)', border: 'none' }}>
              <Building2 size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{total}</span>
              <span className="metric-label">Total Suppliers</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.2s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(45, 184, 122, 0.1)', color: 'var(--risk-low)', border: 'none' }}>
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{activeCount}</span>
              <span className="metric-label">Active Suppliers</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.3s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(232, 87, 47, 0.1)', color: 'var(--risk-high)', border: 'none' }}>
              <AlertTriangle size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{atRiskCount}</span>
              <span className="metric-label">At Risk</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.4s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(212, 138, 0, 0.1)', color: 'var(--risk-medium)', border: 'none' }}>
              <BarChart2 size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{avgScore}</span>
              <span className="metric-label">Avg Risk Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback banners ── */}
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

      {/* ── Add / Edit Form ── */}
      {showAddForm && canManage && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)', '--delay': '0s' }}>
          <form onSubmit={editingId ? handleEditSubmit : handleAddSubmit} className="invite-form-premium">
            <div className="form-header">
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
              <h3>{editingId ? 'Edit Supplier Profile' : 'Register New Supplier'}</h3>
            </div>

            <div className="form-section-label">Basic Information</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Supplier Name</label>
                <div className="input-wrapper">
                  <Building2 size={18} className="input-icon" />
                  <input type="text" name="name" placeholder="Company name" value={formData.name} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Contact Email</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="email" name="contactEmail" placeholder="contact@supplier.com" value={formData.contactEmail} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Contact Phone</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="text" name="contactPhone" placeholder="+1 555 000 0000" value={formData.contactPhone} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Country</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input type="text" name="country" placeholder="e.g. United States" value={formData.country} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Category</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <select name="category" value={formData.category} onChange={handleFormChange}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
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

            <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Performance Metrics</div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>On-Time Delivery Rate (%)</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <input type="number" name="onTimeDeliveryRate" placeholder="0–100" min="0" max="100" step="0.1" value={formData.onTimeDeliveryRate} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Avg Delay Days</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <input type="number" name="avgDelayDays" placeholder="e.g. 3" min="0" step="0.1" value={formData.avgDelayDays} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Defect Rate (%)</label>
                <div className="input-wrapper">
                  <ShieldAlert size={18} className="input-icon" />
                  <input type="number" name="defectRate" placeholder="0–100" min="0" max="100" step="0.01" value={formData.defectRate} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Financial Health Score (0–100)</label>
                <div className="input-wrapper">
                  <BarChart2 size={18} className="input-icon" />
                  <input type="number" name="financialScore" placeholder="0–100" min="0" max="100" value={formData.financialScore} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Years in Business</label>
                <div className="input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <input type="number" name="yearsInBusiness" placeholder="e.g. 5" min="0" step="1" value={formData.yearsInBusiness} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Annual Contract Value ($)</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input type="number" name="contractValue" placeholder="e.g. 500000" min="0" value={formData.contractValue} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Dispute Frequency (per period)</label>
                <div className="input-wrapper">
                  <AlertTriangle size={18} className="input-icon" />
                  <input type="number" name="disputeFrequency" placeholder="0–20" min="0" max="20" step="0.1" value={formData.disputeFrequency} onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Geopolitical Risk Flag</label>
                <div className="input-wrapper" style={{ alignItems: 'center', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)' }}>
                  <Globe size={18} className="input-icon" />
                  <select
                    name="geopoliticalRiskFlag"
                    value={formData.geopoliticalRiskFlag}
                    onChange={e => setFormData({ ...formData, geopoliticalRiskFlag: Number(e.target.value) })}
                  >
                    <option value={0}>0 — Stable country (no flag)</option>
                    <option value={1}>1 — At-risk country (flagged)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {editingId ? 'Save Changes' : 'Register Supplier'}
              </button>
              <button type="button" onClick={handleCancelForm} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Supplier Table ── */}
      <div className="dash-card table-section anim-card" style={{ '--delay': '0.5s' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3>Supplier Directory</h3>
            <span className="badge">{filtered.length} Suppliers</span>
          </div>
          <div className="header-actions" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div className="search-box-premium">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search suppliers..."
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
            {[{ v: 'all', l: 'All Tiers' }, { v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }, { v: 'critical', l: 'Critical' }].map(f => (
              <button
                key={f.v}
                className={`filter-tab tier-filter ${tierFilter === f.v ? 'active' : ''} ${f.v !== 'all' ? `tier-${f.v}` : ''}`}
                onClick={() => setTierFilter(f.v)}
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
        ) : suppliers.length === 0 ? (
          <div className="empty-canvas">
            <Building2 size={48} className="empty-icon-lucide" />
            <h3>No suppliers yet</h3>
            <p>Register your first supplier to begin tracking risk exposure.</p>
            {canManage && (
              <button onClick={() => setShowAddForm(true)} className="btn-primary-premium">
                <Plus size={18} /> <span>Add First Supplier</span>
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-canvas" style={{ padding: 'var(--space-12) 0' }}>
            <Search size={48} className="empty-icon-lucide" />
            <h3>No results found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTierFilter('all'); }} className="btn-ghost" style={{ marginTop: 'var(--space-4)' }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="users-table-canvas">
            <table className="premium-table">
              <thead>
                <tr>
                  {(canManage || canOverride) && <th style={{ width: 36 }}></th>}
                  <th>Supplier</th>
                  <th>Category</th>
                  <th>Risk Score</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const tier = s.riskTier || getTierFromScore(s.riskScore ?? 0);
                  const isSelected = selectedIds.includes(s._id);
                  return (
                    <tr key={s._id} className={isSelected ? 'row-selected' : ''}>
                      {(canManage || canOverride) && (
                        <td>
                          <input
                            type="checkbox"
                            className="compare-checkbox"
                            checked={isSelected}
                            onChange={() => handleCompareToggle(s._id)}
                            title={selectedIds.length >= 3 && !isSelected ? 'Max 3 suppliers for comparison' : 'Select for comparison'}
                            disabled={selectedIds.length >= 3 && !isSelected}
                          />
                        </td>
                      )}
                      <td>
                        <div className="user-identity">
                          <div className="user-avatar supplier-avatar">{s.name?.charAt(0) || '?'}</div>
                          <div className="user-info">
                            <span className="user-name">{s.name}</span>
                            <span className="user-email">
                              <Globe size={11} style={{ marginRight: 3 }} />
                              {s.country || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="role-chip">
                          <Tag size={13} />
                          <span>{CATEGORIES.find(c => c.value === s.category)?.label || s.category || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <RiskScoreBar score={s.riskScore} />
                      </td>
                      <td>
                        <span className={`risk-tier-chip tier-${tier}`}>
                          {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`supplier-status-pill status-${s.status || 'active'}`}>
                          {STATUSES.find(st => st.value === s.status)?.label || s.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => navigate(`/suppliers/${s._id}`)}
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
                                title="Edit Supplier"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setShowStatusModal(s)}
                                className="icon-btn-premium"
                                title="Change Status"
                              >
                                <Clock size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <h3>Change Supplier Status</h3>
              <button onClick={() => setShowStatusModal(null)} className="modal-close"><X size={18} /></button>
            </div>
            <p className="modal-subtitle">
              Update status for <strong>{showStatusModal.name}</strong>
            </p>
            <div className="status-option-list">
              {STATUSES.map(st => (
                <button
                  key={st.value}
                  className={`status-option-btn status-${st.value} ${showStatusModal.status === st.value ? 'current' : ''}`}
                  onClick={() => handleStatusChange(showStatusModal._id, st.value)}
                  disabled={showStatusModal.status === st.value}
                >
                  <span className={`supplier-status-pill status-${st.value}`}>{st.label}</span>
                  {showStatusModal.status === st.value && <span className="current-label">Current</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison Panel ── */}
      {showCompare && comparisonData && (
        <div className="modal-overlay" onClick={handleCloseCompare}>
          <div className="modal-panel comparison-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Supplier Comparison</h3>
              <button onClick={handleCloseCompare} className="modal-close"><X size={18} /></button>
            </div>
            <div className="comparison-grid">
              {comparisonData.map(s => {
                const tier = s.riskTier || getTierFromScore(s.riskScore ?? 0);
                return (
                  <div key={s._id} className="comparison-card">
                    <div className="comparison-header">
                      <div className="user-avatar supplier-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="user-name">{s.name}</div>
                        <div className="user-email">{s.country}</div>
                      </div>
                    </div>
                    <div className={`comparison-score tier-${tier}`}>{s.riskScore ?? '—'}</div>
                    <div className="comparison-label">Risk Score</div>
                    <span className={`risk-tier-chip tier-${tier}`} style={{ marginTop: 8 }}>
                      {tier?.charAt(0).toUpperCase() + tier?.slice(1)}
                    </span>
                    <div className="comparison-metrics">
                      <div className="comparison-metric-row">
                        <span>On-Time Rate</span>
                        <strong>{s.onTimeDeliveryRate != null ? `${s.onTimeDeliveryRate}%` : '—'}</strong>
                      </div>
                      <div className="comparison-metric-row">
                        <span>Avg Delay</span>
                        <strong>{s.avgDelayDays != null ? `${s.avgDelayDays} days` : '—'}</strong>
                      </div>
                      <div className="comparison-metric-row">
                        <span>Defect Rate</span>
                        <strong>{s.defectRate != null ? `${s.defectRate}%` : '—'}</strong>
                      </div>
                      <div className="comparison-metric-row">
                        <span>Financial Score</span>
                        <strong>{s.financialScore ?? '—'}</strong>
                      </div>
                      <div className="comparison-metric-row">
                        <span>Status</span>
                        <span className={`supplier-status-pill status-${s.status}`}>
                          {STATUSES.find(st => st.value === s.status)?.label || s.status}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => { handleCloseCompare(); navigate(`/suppliers/${s._id}`); }} className="btn-ghost" style={{ width: '100%', marginTop: 'var(--space-4)', justifyContent: 'center' }}>
                      View Full Profile
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
