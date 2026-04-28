import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Warehouse, Plus, Search, Edit2, Trash2, MapPin, Users, Clock,
  CheckCircle, AlertCircle, Settings, Star, Package, TrendingUp,
  ArrowRightLeft, BarChart3, Activity, RefreshCw, Eye, ArrowUpRight
} from 'lucide-react';
import { ROLES } from '../config/rbac.constants.js';
import {
  listWarehouses, getWarehouseStats, createWarehouse, updateWarehouse,
  deleteWarehouse, setDefaultWarehouse, listTransfers, getTransferStats,
  createTransfer, approveTransfer, completeTransfer, cancelTransfer,
  getActiveWarehouses, clearMessage, clearError
} from '../redux/warehouseSlice.js';
import { listInventory, getWarehouses } from '../redux/inventorySlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

/* ─── Animated Counter Hook ─── */
function useAnimatedCounter(target, duration = 700, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(+(eased * target).toFixed(decimals));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

/* ─── Counter Component ─── */
function Counter({ target, decimals = 0, suffix = '' }) {
  const val = useAnimatedCounter(target, 700, decimals);
  return <>{val}{suffix}</>;
}

// Status badge component
function StatusBadge({ status }) {
  const colors = {
    active: { bg: 'rgba(45, 184, 122, 0.15)', color: '#2DB87A' },
    inactive: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF' },
    maintenance: { bg: 'rgba(251, 191, 36, 0.15)', color: '#F59E0B' },
  };
  const style = colors[status] || colors.inactive;
  return (
    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

// Transfer status badge
function TransferStatusBadge({ status }) {
  const colors = {
    pending: { bg: 'rgba(251, 191, 36, 0.15)', color: '#F59E0B' },
    'in-transit': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
    completed: { bg: 'rgba(45, 184, 122, 0.15)', color: '#2DB87A' },
    cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' },
  };
  const style = colors[status] || colors.pending;
  return (
    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

// Priority badge
function PriorityBadge({ priority }) {
  const colors = {
    low: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF' },
    normal: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
    high: { bg: 'rgba(249, 115, 22, 0.15)', color: '#F97316' },
    urgent: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' },
  };
  const style = colors[priority] || colors.normal;
  return (
    <span style={{ background: style.bg, color: style.color, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
      {priority}
    </span>
  );
}

export default function WarehousePage() {
  const dispatch = useDispatch();
  const { warehouses, activeWarehouses, warehouseStats, transfers, transferStats, total, transferTotal, loading, error, message } = useSelector((state) => state.warehouse);
  const { items: inventoryItems } = useSelector((state) => state.inventory);
  const user = useSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses', 'transfers', 'stats'
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTransferStatus, setFilterTransferStatus] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    type: 'storage',
    status: 'active',
    capacity: 0,
    location: { address: '', city: '', state: '', country: '', postalCode: '' },
    manager: { name: '', email: '', phone: '' },
    operatingHours: { open: '08:00', close: '18:00', timezone: 'UTC' },
  });

  const [transferForm, setTransferForm] = useState({
    inventoryItemId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: 1,
    priority: 'normal',
    reason: '',
    notes: '',
  });

  const canEdit = user?.role === ROLES.ORG_ADMIN || user?.role === ROLES.INVENTORY_MANAGER;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const shimmerTimer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(shimmerTimer);
  }, []);

  useEffect(() => {
    dispatch(listWarehouses({ limit: 50 }));
    dispatch(getWarehouseStats());
    dispatch(getActiveWarehouses());
    dispatch(listTransfers({ limit: 50 }));
    dispatch(getTransferStats());
    dispatch(listInventory({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => dispatch(clearMessage()), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleWarehouseFormChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setWarehouseForm((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setWarehouseForm((prev) => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
    }
  };

  const handleTransferFormChange = (e) => {
    const { name, value } = e.target;
    setTransferForm((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    await dispatch(createWarehouse(warehouseForm));
    setShowCreateWarehouse(false);
    resetWarehouseForm();
    dispatch(getWarehouseStats());
  };

  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    await dispatch(updateWarehouse({ warehouseId: editingWarehouse._id, data: warehouseForm }));
    setEditingWarehouse(null);
    resetWarehouseForm();
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (window.confirm('Are you sure you want to delete this warehouse? This cannot be undone.')) {
      await dispatch(deleteWarehouse(warehouseId));
      dispatch(getWarehouseStats());
    }
  };

  const handleSetDefault = async (warehouseId) => {
    await dispatch(setDefaultWarehouse(warehouseId));
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    await dispatch(createTransfer(transferForm));
    setShowCreateTransfer(false);
    resetTransferForm();
    dispatch(getTransferStats());
  };

  const handleApproveTransfer = async (transferId) => {
    await dispatch(approveTransfer(transferId));
    dispatch(getTransferStats());
  };

  const handleCompleteTransfer = async (transferId) => {
    await dispatch(completeTransfer(transferId));
    dispatch(getTransferStats());
    dispatch(listInventory({ limit: 100 }));
  };

  const handleCancelTransfer = async (transferId) => {
    const reason = prompt('Enter cancellation reason (optional):');
    await dispatch(cancelTransfer({ transferId, reason }));
    dispatch(getTransferStats());
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      code: '',
      name: '',
      type: 'storage',
      status: 'active',
      capacity: 0,
      location: { address: '', city: '', state: '', country: '', postalCode: '' },
      manager: { name: '', email: '', phone: '' },
      operatingHours: { open: '08:00', close: '18:00', timezone: 'UTC' },
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      inventoryItemId: '',
      fromWarehouseId: '',
      toWarehouseId: '',
      quantity: 1,
      priority: 'normal',
      reason: '',
      notes: '',
    });
  };

  const startEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type,
      status: warehouse.status,
      capacity: warehouse.capacity,
      location: warehouse.location || { address: '', city: '', state: '', country: '', postalCode: '' },
      manager: warehouse.manager || { name: '', email: '', phone: '' },
      operatingHours: warehouse.operatingHours || { open: '08:00', close: '18:00', timezone: 'UTC' },
    });
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchSearch = !searchTerm || 
      wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || wh.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredTransfers = transfers.filter((t) => {
    return !filterTransferStatus || t.status === filterTransferStatus;
  });

  return (
    <Layout>
      {/* ═══ HERO BANNER ═══ */}
      <section className="dashboard-hero warehouse-hero">
        <span className="hero-location"><Warehouse size={14} style={{ marginRight: '6px' }} />Warehouse Network Hub</span>
        <h1 className="hero-title">Warehouse<br />Management</h1>
        <div className="hero-actions">
          {canEdit && (
            <button className="hero-btn hero-btn--light" onClick={() => activeTab === 'warehouses' ? setShowCreateWarehouse(true) : setShowCreateTransfer(true)}>
              <Plus size={15} /> {activeTab === 'warehouses' ? 'Add Warehouse' : 'New Transfer'}
            </button>
          )}
          <button className="hero-btn hero-btn--dark" onClick={() => setActiveTab(activeTab === 'warehouses' ? 'transfers' : 'warehouses')}>
            <ArrowRightLeft size={15} /> {activeTab === 'warehouses' ? 'View Transfers' : 'View Warehouses'}
          </button>
        </div>
        <div className="hero-datetime">
          <div className="hero-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="hero-date">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </section>

      {/* Notifications */}
      {message && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(45, 184, 122, 0.15)', borderRadius: '12px', color: '#2DB87A', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(45, 184, 122, 0.3)' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* ═══ STATS ROW ═══ */}
      {warehouseStats && (
        <div className="dashboard-row-1" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '20px' }}>
          {/* Card: Warehouse Overview */}
          <div className={`dash-card card-overview anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.10s' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="status-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2DB87A', animation: 'pulse-live 2s infinite' }}></div>
                <h2 className="card-title">Warehouse Overview</h2>
              </div>
              <a href="/warehouses" className="card-expand-btn" aria-label="Expand">
                <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="overview-grid">
              <div className="overview-metric">
                <div className="metric-icon"><Warehouse size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={warehouseStats.total || 0} /></div>
                  <div className="metric-label">Total Warehouses</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><Activity size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={warehouseStats.active || 0} /></div>
                  <div className="metric-label">Active</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><BarChart3 size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={warehouseStats.avgUtilizationPercent || 0} suffix="%" /></div>
                  <div className="metric-label">Avg Utilization</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><Package size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={warehouseStats.totalCapacity || 0} /></div>
                  <div className="metric-label">Total Capacity</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Transfer Stats */}
          <div className={`dash-card card-breakdown anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.20s' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Transfer Activity</h2>
                <span className="card-subtitle">Current transfer status</span>
              </div>
            </div>
            <span className="breakdown-overline">TRANSFER STATUS</span>
            <div className="breakdown-rows">
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B', flexShrink: 0 }}></span>
                <span className="breakdown-label">Pending</span>
                <span className="breakdown-value">{transferStats?.pending || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3B82F6', flexShrink: 0 }}></span>
                <span className="breakdown-label">In Transit</span>
                <span className="breakdown-value">{transferStats?.inTransit || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A', flexShrink: 0 }}></span>
                <span className="breakdown-label">Completed</span>
                <span className="breakdown-value">{transferStats?.completed || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444', flexShrink: 0 }}></span>
                <span className="breakdown-label">Cancelled</span>
                <span className="breakdown-value">{transferStats?.cancelled || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('warehouses')} className="tab-btn-light" style={{ background: activeTab === 'warehouses' ? 'var(--text-primary)' : 'var(--surface-card)', color: activeTab === 'warehouses' ? 'var(--surface-card)' : 'var(--text-primary)' }}>
          <Warehouse size={16} style={{ marginRight: '6px' }} /> Warehouses
        </button>
        <button onClick={() => setActiveTab('transfers')} className="tab-btn-light" style={{ background: activeTab === 'transfers' ? 'var(--text-primary)' : 'var(--surface-card)', color: activeTab === 'transfers' ? 'var(--surface-card)' : 'var(--text-primary)' }}>
          <ArrowRightLeft size={16} style={{ marginRight: '6px' }} /> Transfers
        </button>
      </div>

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <>
          {/* Search & Filter */}
          <div className="dash-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search warehouses..." className="search-input-light" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select-light">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Warehouses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', gridColumn: '1/-1' }}><RefreshCw size={24} className="spin" /> Loading...</div>}
            {!loading && filteredWarehouses.length === 0 && (
              <div className="dash-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', gridColumn: '1/-1' }}>
                No warehouses found. Create your first warehouse to get started.
              </div>
            )}
            {filteredWarehouses.map((warehouse) => (
              <div key={warehouse._id} className="dash-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{warehouse.name}</h3>
                      {warehouse.isDefault && <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{warehouse.code}</p>
                  </div>
                  <StatusBadge status={warehouse.status} />
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Package size={16} style={{ color: '#E85D2F' }} />
                    <span>Type: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{warehouse.type}</strong></span>
                  </div>
                  {warehouse.location?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <MapPin size={16} style={{ color: '#E85D2F' }} />
                      <span>{warehouse.location.city}{warehouse.location.country ? `, ${warehouse.location.country}` : ''}</span>
                    </div>
                  )}
                  {warehouse.manager?.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <Users size={16} style={{ color: '#E85D2F' }} />
                      <span>{warehouse.manager.name}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Clock size={16} style={{ color: '#E85D2F' }} />
                    <span>{warehouse.operatingHours?.open || '08:00'} - {warehouse.operatingHours?.close || '18:00'}</span>
                  </div>
                </div>

                {warehouse.capacity > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Capacity</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{warehouse.currentUtilization || 0} / {warehouse.capacity}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${warehouse.utilizationPercent || 0}%`, background: warehouse.utilizationPercent > 90 ? '#EF4444' : warehouse.utilizationPercent > 70 ? '#F59E0B' : '#2DB87A', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E2E5E0' }}>
                    <button onClick={() => startEditWarehouse(warehouse)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #E2E5E0', background: 'var(--surface-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    {!warehouse.isDefault && (
                      <button onClick={() => handleSetDefault(warehouse._id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #E2E5E0', background: 'var(--surface-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Star size={14} /> Set Default
                      </button>
                    )}
                    <button onClick={() => handleDeleteWarehouse(warehouse._id)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <>
          {/* Transfer Stats Card */}
          {transferStats && (
            <div className="dash-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></span>
                <span>Pending: <strong>{transferStats.pending}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3B82F6' }}></span>
                <span>In Transit: <strong>{transferStats.inTransit}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A' }}></span>
                <span>Completed: <strong>{transferStats.completed}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444' }}></span>
                <span>Cancelled: <strong>{transferStats.cancelled}</strong></span>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="dash-card" style={{ padding: '16px', marginBottom: '20px' }}>
            <select value={filterTransferStatus} onChange={(e) => setFilterTransferStatus(e.target.value)} className="select-light">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Transfers Table */}
          <div className="dash-card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E5E0' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Transfer #</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Item</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>From</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>To</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Qty</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Priority</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}><RefreshCw size={24} className="spin" /></td></tr>
                  )}
                  {!loading && filteredTransfers.length === 0 && (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No transfers found</td></tr>
                  )}
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer._id} className="table-row-hover" style={{ borderBottom: '1px solid #E2E5E0' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{transfer.transferNumber}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: '500' }}>{transfer.inventoryItemId?.sku}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{transfer.inventoryItemId?.productName}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>{transfer.fromWarehouseId?.code || transfer.fromWarehouseId}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>{transfer.toWarehouseId?.code || transfer.toWarehouseId}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>{transfer.quantity}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><PriorityBadge priority={transfer.priority} /></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><TransferStatusBadge status={transfer.status} /></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {canEdit && transfer.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => handleApproveTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#2DB87A', color: 'var(--surface-card)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Approve</button>
                            <button onClick={() => handleCancelTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#EF4444', color: 'var(--surface-card)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Cancel</button>
                          </div>
                        )}
                        {canEdit && transfer.status === 'in-transit' && (
                          <button onClick={() => handleCompleteTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#3B82F6', color: 'var(--surface-card)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Complete</button>
                        )}
                        {(transfer.status === 'completed' || transfer.status === 'cancelled') && (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Warehouse Modal */}
      {showCreateWarehouse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>Create New Warehouse</h3>
              <button onClick={() => { setShowCreateWarehouse(false); resetWarehouseForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-light">
                  <label>Warehouse Code *</label>
                  <input type="text" name="code" value={warehouseForm.code} onChange={handleWarehouseFormChange} placeholder="WH-001" required />
                </div>
                <div className="form-group-light">
                  <label>Warehouse Name *</label>
                  <input type="text" name="name" value={warehouseForm.name} onChange={handleWarehouseFormChange} placeholder="Main Warehouse" required />
                </div>
                <div className="form-group-light">
                  <label>Type</label>
                  <select name="type" value={warehouseForm.type} onChange={handleWarehouseFormChange}>
                    <option value="storage">Storage</option>
                    <option value="distribution">Distribution</option>
                    <option value="cold-storage">Cold Storage</option>
                    <option value="cross-dock">Cross Dock</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
                <div className="form-group-light">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={warehouseForm.capacity} onChange={handleWarehouseFormChange} min="0" />
                </div>
                <div className="form-group-light" style={{ gridColumn: '1/-1' }}>
                  <label>Address</label>
                  <input type="text" name="location.address" value={warehouseForm.location.address} onChange={handleWarehouseFormChange} placeholder="Street address" />
                </div>
                <div className="form-group-light">
                  <label>City</label>
                  <input type="text" name="location.city" value={warehouseForm.location.city} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Country</label>
                  <input type="text" name="location.country" value={warehouseForm.location.country} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Manager Name</label>
                  <input type="text" name="manager.name" value={warehouseForm.manager.name} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Manager Email</label>
                  <input type="email" name="manager.email" value={warehouseForm.manager.email} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Opens At</label>
                  <input type="time" name="operatingHours.open" value={warehouseForm.operatingHours.open} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Closes At</label>
                  <input type="time" name="operatingHours.close" value={warehouseForm.operatingHours.close} onChange={handleWarehouseFormChange} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px 20px', background: '#E85D2F', color: 'var(--surface-card)', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Create Warehouse</button>
                <button type="button" onClick={() => { setShowCreateWarehouse(false); resetWarehouseForm(); }} style={{ flex: 1, padding: '12px 20px', background: 'var(--surface-card-alt)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: '500', border: '1px solid #E2E5E0', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>Edit Warehouse</h3>
              <button onClick={() => { setEditingWarehouse(null); resetWarehouseForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateWarehouse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-light">
                  <label>Warehouse Code *</label>
                  <input type="text" name="code" value={warehouseForm.code} onChange={handleWarehouseFormChange} required />
                </div>
                <div className="form-group-light">
                  <label>Warehouse Name *</label>
                  <input type="text" name="name" value={warehouseForm.name} onChange={handleWarehouseFormChange} required />
                </div>
                <div className="form-group-light">
                  <label>Type</label>
                  <select name="type" value={warehouseForm.type} onChange={handleWarehouseFormChange}>
                    <option value="storage">Storage</option>
                    <option value="distribution">Distribution</option>
                    <option value="cold-storage">Cold Storage</option>
                    <option value="cross-dock">Cross Dock</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
                <div className="form-group-light">
                  <label>Status</label>
                  <select name="status" value={warehouseForm.status} onChange={handleWarehouseFormChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group-light">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={warehouseForm.capacity} onChange={handleWarehouseFormChange} min="0" />
                </div>
                <div className="form-group-light" style={{ gridColumn: '1/-1' }}>
                  <label>Address</label>
                  <input type="text" name="location.address" value={warehouseForm.location.address} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>City</label>
                  <input type="text" name="location.city" value={warehouseForm.location.city} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-light">
                  <label>Country</label>
                  <input type="text" name="location.country" value={warehouseForm.location.country} onChange={handleWarehouseFormChange} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px 20px', background: '#E85D2F', color: 'var(--surface-card)', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Update Warehouse</button>
                <button type="button" onClick={() => { setEditingWarehouse(null); resetWarehouseForm(); }} style={{ flex: 1, padding: '12px 20px', background: 'var(--surface-card-alt)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: '500', border: '1px solid #E2E5E0', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {showCreateTransfer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>Create Warehouse Transfer</h3>
              <button onClick={() => { setShowCreateTransfer(false); resetTransferForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateTransfer}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group-light">
                  <label>Inventory Item *</label>
                  <select name="inventoryItemId" value={transferForm.inventoryItemId} onChange={handleTransferFormChange} required>
                    <option value="">Select item...</option>
                    {inventoryItems.map((item) => (
                      <option key={item._id} value={item._id}>{item.sku} - {item.productName} (Stock: {item.currentStock})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-light">
                  <label>From Warehouse *</label>
                  <select name="fromWarehouseId" value={transferForm.fromWarehouseId} onChange={handleTransferFormChange} required>
                    <option value="">Select source...</option>
                    {activeWarehouses.map((wh) => (
                      <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-light">
                  <label>To Warehouse *</label>
                  <select name="toWarehouseId" value={transferForm.toWarehouseId} onChange={handleTransferFormChange} required>
                    <option value="">Select destination...</option>
                    {activeWarehouses.filter(wh => wh._id !== transferForm.fromWarehouseId).map((wh) => (
                      <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-light">
                  <label>Quantity *</label>
                  <input type="number" name="quantity" value={transferForm.quantity} onChange={handleTransferFormChange} min="1" required />
                </div>
                <div className="form-group-light">
                  <label>Priority</label>
                  <select name="priority" value={transferForm.priority} onChange={handleTransferFormChange}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group-light">
                  <label>Reason</label>
                  <input type="text" name="reason" value={transferForm.reason} onChange={handleTransferFormChange} placeholder="e.g., Stock balancing" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px 20px', background: '#E85D2F', color: 'var(--surface-card)', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Create Transfer</button>
                <button type="button" onClick={() => { setShowCreateTransfer(false); resetTransferForm(); }} style={{ flex: 1, padding: '12px 20px', background: 'var(--surface-card-alt)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: '500', border: '1px solid #E2E5E0', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .form-group-light label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #5A5E5A; }
        .form-group-light input, .form-group-light select { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E5E0; background: #F5F7F5; font-size: 14px; color: #1A1C1A; }
        .form-group-light input:focus, .form-group-light select:focus { outline: none; border-color: #E85D2F; }
        .tab-btn-light { padding: 10px 20px; border-radius: 8px; border: 1px solid #E2E5E0; cursor: 'pointer'; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .search-input-light { width: 100%; padding: 10px 10px 10px 40px; border-radius: 8px; border: 1px solid #E2E5E0; background: #F5F7F5; color: #1A1C1A; font-size: 14px; }
        .search-input-light:focus { outline: none; border-color: #E85D2F; }
        .select-light { padding: 10px 16px; border-radius: 8px; border: 1px solid #E2E5E0; background: #F5F7F5; color: #1A1C1A; font-size: 14px; }
        .select-light:focus { outline: none; border-color: #E85D2F; }
        .table-row-hover:hover { background: #F5F7F5; }
      `}</style>
    </Layout>
  );
}


