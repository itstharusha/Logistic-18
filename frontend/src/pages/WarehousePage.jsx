import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Warehouse, Plus, Search, Edit2, Trash2, MapPin, Users, Clock,
  CheckCircle, AlertCircle, Settings, Star, Package, TrendingUp,
  ArrowRightLeft, BarChart3, Activity, RefreshCw, Eye
} from 'lucide-react';
import {
  listWarehouses, getWarehouseStats, createWarehouse, updateWarehouse,
  deleteWarehouse, setDefaultWarehouse, listTransfers, getTransferStats,
  createTransfer, approveTransfer, completeTransfer, cancelTransfer,
  getActiveWarehouses, clearMessage, clearError
} from '../redux/warehouseSlice.js';
import { listInventory, getWarehouses } from '../redux/inventorySlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

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

  const canEdit = user?.role === 'ORG_ADMIN' || user?.role === 'INVENTORY_MANAGER';

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
      {/* Header */}
      <div className="page-header-premium anim-fade-in">
        <div className="header-content">
          <h1>Warehouse Management</h1>
          <p>Manage warehouses and internal transfers</p>
        </div>
        <div className="header-actions">
          {canEdit && activeTab === 'warehouses' && (
            <button onClick={() => setShowCreateWarehouse(true)} className="action-btn-premium">
              <Plus size={18} />
              <span>Add Warehouse</span>
            </button>
          )}
          {canEdit && activeTab === 'transfers' && (
            <button onClick={() => setShowCreateTransfer(true)} className="action-btn-premium">
              <Plus size={18} />
              <span>New Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="notification success" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(45, 184, 122, 0.15)', borderRadius: '8px', color: '#2DB87A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="notification error" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Stats Overview */}
      {warehouseStats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
            <div className="overview-metric">
              <div className="metric-icon" style={{ background: 'rgba(232, 93, 47, 0.1)', color: 'var(--brand-primary)' }}>
                <Warehouse size={20} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{warehouseStats.total || 0}</span>
                <span className="metric-label">Total Warehouses</span>
              </div>
            </div>
          </div>
          <div className="dash-card anim-card" style={{ '--delay': '0.2s' }}>
            <div className="overview-metric">
              <div className="metric-icon" style={{ background: 'rgba(45, 184, 122, 0.1)', color: '#2DB87A' }}>
                <Activity size={20} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{warehouseStats.active || 0}</span>
                <span className="metric-label">Active</span>
              </div>
            </div>
          </div>
          <div className="dash-card anim-card" style={{ '--delay': '0.3s' }}>
            <div className="overview-metric">
              <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                <BarChart3 size={20} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{warehouseStats.avgUtilizationPercent || 0}%</span>
                <span className="metric-label">Avg Utilization</span>
              </div>
            </div>
          </div>
          <div className="dash-card anim-card" style={{ '--delay': '0.4s' }}>
            <div className="overview-metric">
              <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                <ArrowRightLeft size={20} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{transferStats?.pending || 0}</span>
                <span className="metric-label">Pending Transfers</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('warehouses')} style={{ padding: '10px 20px', borderRadius: '8px', background: activeTab === 'warehouses' ? 'var(--brand-primary)' : 'var(--surface-elevated)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Warehouse size={16} /> Warehouses
        </button>
        <button onClick={() => setActiveTab('transfers')} style={{ padding: '10px 20px', borderRadius: '8px', background: activeTab === 'transfers' ? 'var(--brand-primary)' : 'var(--surface-elevated)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowRightLeft size={16} /> Transfers
        </button>
      </div>

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <>
          {/* Search & Filter */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search warehouses..." style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }} />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Warehouses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}><RefreshCw size={24} className="spin" /> Loading...</div>}
            {!loading && filteredWarehouses.length === 0 && (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', gridColumn: '1/-1' }}>
                No warehouses found. Create your first warehouse to get started.
              </div>
            )}
            {filteredWarehouses.map((warehouse) => (
              <div key={warehouse._id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>{warehouse.name}</h3>
                      {warehouse.isDefault && <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />}
                    </div>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{warehouse.code}</p>
                  </div>
                  <StatusBadge status={warehouse.status} />
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    <Package size={16} />
                    <span>Type: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{warehouse.type}</strong></span>
                  </div>
                  {warehouse.location?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                      <MapPin size={16} />
                      <span>{warehouse.location.city}{warehouse.location.country ? `, ${warehouse.location.country}` : ''}</span>
                    </div>
                  )}
                  {warehouse.manager?.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                      <Users size={16} />
                      <span>{warehouse.manager.name}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    <Clock size={16} />
                    <span>{warehouse.operatingHours?.open || '08:00'} - {warehouse.operatingHours?.close || '18:00'}</span>
                  </div>
                </div>

                {warehouse.capacity > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>Capacity</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{warehouse.currentUtilization || 0} / {warehouse.capacity}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${warehouse.utilizationPercent || 0}%`, background: warehouse.utilizationPercent > 90 ? '#EF4444' : warehouse.utilizationPercent > 70 ? '#F59E0B' : '#2DB87A', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                    <button onClick={() => startEditWarehouse(warehouse)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px', color: '#fff' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    {!warehouse.isDefault && (
                      <button onClick={() => handleSetDefault(warehouse._id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '13px', color: '#fff' }}>
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
          {/* Transfer Stats */}
          {transferStats && (
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></span>
                <span>Pending: <strong>{transferStats.pending}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3B82F6' }}></span>
                <span>In Transit: <strong>{transferStats.inTransit}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A' }}></span>
                <span>Completed: <strong>{transferStats.completed}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444' }}></span>
                <span>Cancelled: <strong>{transferStats.cancelled}</strong></span>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
            <select value={filterTransferStatus} onChange={(e) => setFilterTransferStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Transfers Table */}
          <div className="glass-panel">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Transfer #</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Item</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>From</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>To</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Qty</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Priority</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}><RefreshCw size={24} className="spin" /></td></tr>
                  )}
                  {!loading && filteredTransfers.length === 0 && (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>No transfers found</td></tr>
                  )}
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#fff' }}>{transfer.transferNumber}</td>
                      <td style={{ padding: '14px 16px', color: '#fff' }}>
                        <div>{transfer.inventoryItemId?.sku}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{transfer.inventoryItemId?.productName}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#fff' }}>{transfer.fromWarehouseId?.code || transfer.fromWarehouseId}</td>
                      <td style={{ padding: '14px 16px', color: '#fff' }}>{transfer.toWarehouseId?.code || transfer.toWarehouseId}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: '#fff' }}>{transfer.quantity}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><PriorityBadge priority={transfer.priority} /></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><TransferStatusBadge status={transfer.status} /></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {canEdit && transfer.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => handleApproveTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#2DB87A', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Approve</button>
                            <button onClick={() => handleCancelTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                          </div>
                        )}
                        {canEdit && transfer.status === 'in-transit' && (
                          <button onClick={() => handleCompleteTransfer(transfer._id)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#3B82F6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Complete</button>
                        )}
                        {(transfer.status === 'completed' || transfer.status === 'cancelled') && (
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>—</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff' }}>Create New Warehouse</h3>
              <button onClick={() => { setShowCreateWarehouse(false); resetWarehouseForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-premium">
                  <label>Warehouse Code *</label>
                  <input type="text" name="code" value={warehouseForm.code} onChange={handleWarehouseFormChange} placeholder="WH-001" required />
                </div>
                <div className="form-group-premium">
                  <label>Warehouse Name *</label>
                  <input type="text" name="name" value={warehouseForm.name} onChange={handleWarehouseFormChange} placeholder="Main Warehouse" required />
                </div>
                <div className="form-group-premium">
                  <label>Type</label>
                  <select name="type" value={warehouseForm.type} onChange={handleWarehouseFormChange}>
                    <option value="storage">Storage</option>
                    <option value="distribution">Distribution</option>
                    <option value="cold-storage">Cold Storage</option>
                    <option value="cross-dock">Cross Dock</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={warehouseForm.capacity} onChange={handleWarehouseFormChange} min="0" />
                </div>
                <div className="form-group-premium" style={{ gridColumn: '1/-1' }}>
                  <label>Address</label>
                  <input type="text" name="location.address" value={warehouseForm.location.address} onChange={handleWarehouseFormChange} placeholder="Street address" />
                </div>
                <div className="form-group-premium">
                  <label>City</label>
                  <input type="text" name="location.city" value={warehouseForm.location.city} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Country</label>
                  <input type="text" name="location.country" value={warehouseForm.location.country} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Manager Name</label>
                  <input type="text" name="manager.name" value={warehouseForm.manager.name} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Manager Email</label>
                  <input type="email" name="manager.email" value={warehouseForm.manager.email} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Opens At</label>
                  <input type="time" name="operatingHours.open" value={warehouseForm.operatingHours.open} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Closes At</label>
                  <input type="time" name="operatingHours.close" value={warehouseForm.operatingHours.close} onChange={handleWarehouseFormChange} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="action-btn-premium" style={{ flex: 1 }}>Create Warehouse</button>
                <button type="button" onClick={() => { setShowCreateWarehouse(false); resetWarehouseForm(); }} className="action-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff' }}>Edit Warehouse</h3>
              <button onClick={() => { setEditingWarehouse(null); resetWarehouseForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateWarehouse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-premium">
                  <label>Warehouse Code *</label>
                  <input type="text" name="code" value={warehouseForm.code} onChange={handleWarehouseFormChange} required />
                </div>
                <div className="form-group-premium">
                  <label>Warehouse Name *</label>
                  <input type="text" name="name" value={warehouseForm.name} onChange={handleWarehouseFormChange} required />
                </div>
                <div className="form-group-premium">
                  <label>Type</label>
                  <select name="type" value={warehouseForm.type} onChange={handleWarehouseFormChange}>
                    <option value="storage">Storage</option>
                    <option value="distribution">Distribution</option>
                    <option value="cold-storage">Cold Storage</option>
                    <option value="cross-dock">Cross Dock</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>Status</label>
                  <select name="status" value={warehouseForm.status} onChange={handleWarehouseFormChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={warehouseForm.capacity} onChange={handleWarehouseFormChange} min="0" />
                </div>
                <div className="form-group-premium" style={{ gridColumn: '1/-1' }}>
                  <label>Address</label>
                  <input type="text" name="location.address" value={warehouseForm.location.address} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>City</label>
                  <input type="text" name="location.city" value={warehouseForm.location.city} onChange={handleWarehouseFormChange} />
                </div>
                <div className="form-group-premium">
                  <label>Country</label>
                  <input type="text" name="location.country" value={warehouseForm.location.country} onChange={handleWarehouseFormChange} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="action-btn-premium" style={{ flex: 1 }}>Update Warehouse</button>
                <button type="button" onClick={() => { setEditingWarehouse(null); resetWarehouseForm(); }} className="action-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {showCreateTransfer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff' }}>Create Warehouse Transfer</h3>
              <button onClick={() => { setShowCreateTransfer(false); resetTransferForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateTransfer}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group-premium">
                  <label>Inventory Item *</label>
                  <select name="inventoryItemId" value={transferForm.inventoryItemId} onChange={handleTransferFormChange} required>
                    <option value="">Select item...</option>
                    {inventoryItems.map((item) => (
                      <option key={item._id} value={item._id}>{item.sku} - {item.productName} (Stock: {item.currentStock})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>From Warehouse *</label>
                  <select name="fromWarehouseId" value={transferForm.fromWarehouseId} onChange={handleTransferFormChange} required>
                    <option value="">Select source...</option>
                    {activeWarehouses.map((wh) => (
                      <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>To Warehouse *</label>
                  <select name="toWarehouseId" value={transferForm.toWarehouseId} onChange={handleTransferFormChange} required>
                    <option value="">Select destination...</option>
                    {activeWarehouses.filter(wh => wh._id !== transferForm.fromWarehouseId).map((wh) => (
                      <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>Quantity *</label>
                  <input type="number" name="quantity" value={transferForm.quantity} onChange={handleTransferFormChange} min="1" required />
                </div>
                <div className="form-group-premium">
                  <label>Priority</label>
                  <select name="priority" value={transferForm.priority} onChange={handleTransferFormChange}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group-premium">
                  <label>Reason</label>
                  <input type="text" name="reason" value={transferForm.reason} onChange={handleTransferFormChange} placeholder="e.g., Stock balancing" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="action-btn-premium" style={{ flex: 1 }}>Create Transfer</button>
                <button type="button" onClick={() => { setShowCreateTransfer(false); resetTransferForm(); }} className="action-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .form-group-premium label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.8); }
        .form-group-premium input, .form-group-premium select { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-light); background: var(--surface-base); font-size: 14px; color: #fff; }
        .form-group-premium input:focus, .form-group-premium select:focus { outline: none; border-color: var(--brand-primary); }
        .action-btn-secondary { padding: 10px 20px; background: var(--surface-elevated); color: #fff; border-radius: 8px; font-weight: 600; border: 1px solid var(--border-light); cursor: pointer; }
      `}</style>
    </Layout>
  );
}
