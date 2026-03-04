import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Package, Plus, Search, Filter, AlertTriangle, TrendingUp, TrendingDown,
  Archive, MoreVertical, Edit2, Trash2, Eye, ShoppingCart, RefreshCw,
  Warehouse, BarChart3, AlertCircle, CheckCircle, Clock, Box
} from 'lucide-react';
import {
  listInventory, getDashboard, getReorderList, getWarehouses,
  createInventoryItem, updateInventoryItem, updateStock, updatePendingOrder,
  deleteInventoryItem, getForecast, clearMessage, clearError
} from '../redux/inventorySlice.js';
import { getActiveWarehouses } from '../redux/warehouseSlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

// Risk tier badge component
function RiskBadge({ tier, score }) {
  const colors = {
    low: { bg: 'rgba(45, 184, 122, 0.15)', color: '#2DB87A', border: '#2DB87A' },
    medium: { bg: 'rgba(251, 191, 36, 0.15)', color: '#F59E0B', border: '#F59E0B' },
    high: { bg: 'rgba(249, 115, 22, 0.15)', color: '#F97316', border: '#F97316' },
    critical: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '#EF4444' },
  };
  const style = colors[tier] || colors.low;

  return (
    <span
      className="risk-badge"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
      }}
    >
      {tier} {score !== undefined && `(${Math.round(score)})`}
    </span>
  );
}

export default function InventoryPage() {
  const dispatch = useDispatch();
  const { items, total, dashboard, reorderList, warehouses, loading, error, message, forecast } = useSelector((state) => state.inventory);
  const { activeWarehouses } = useSelector((state) => state.warehouse);
  const user = useSelector((state) => state.auth.user);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [viewingForecast, setViewingForecast] = useState(null);
  const [stockUpdateId, setStockUpdateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskTier, setFilterRiskTier] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterCritical, setFilterCritical] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'reorder', 'critical'

  const [formData, setFormData] = useState({
    sku: '',
    productName: '',
    supplierId: '',
    warehouseId: '',
    currentStock: 0,
    averageDailyDemand: 0,
    leadTimeDays: 7,
    demandVariance: 0,
    isCriticalItem: false,
  });

  const [stockValue, setStockValue] = useState(0);
  const [pendingOrderData, setPendingOrderData] = useState({ qty: 0, days: 0 });

  const canEdit = user?.role === 'ORG_ADMIN' || user?.role === 'INVENTORY_MANAGER';

  useEffect(() => {
    dispatch(getDashboard());
    dispatch(getWarehouses());
    dispatch(getActiveWarehouses());
    dispatch(listInventory({ limit: 20, skip: 0 }));
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

  const fetchItems = () => {
    const params = { limit: 20, skip: 0 };
    if (searchTerm) params.search = searchTerm;
    if (filterRiskTier) params.riskTier = filterRiskTier;
    if (filterWarehouse) params.warehouseId = filterWarehouse;
    if (filterCritical) params.isCriticalItem = filterCritical === 'true';
    dispatch(listInventory(params));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await dispatch(createInventoryItem(formData));
    setShowCreateForm(false);
    setFormData({
      sku: '',
      productName: '',
      supplierId: '',
      warehouseId: '',
      currentStock: 0,
      averageDailyDemand: 0,
      leadTimeDays: 7,
      demandVariance: 0,
      isCriticalItem: false,
    });
    dispatch(getDashboard());
  };

  const handleEditClick = (item) => {
    setEditingItemId(item._id);
    setFormData({
      sku: item.sku,
      productName: item.productName,
      supplierId: item.supplierId?._id || item.supplierId,
      warehouseId: item.warehouseId,
      currentStock: item.currentStock,
      averageDailyDemand: item.averageDailyDemand,
      leadTimeDays: item.leadTimeDays,
      demandVariance: item.demandVariance,
      isCriticalItem: item.isCriticalItem,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await dispatch(updateInventoryItem({ itemId: editingItemId, data: formData }));
    setEditingItemId(null);
    dispatch(getDashboard());
  };

  const handleStockUpdate = async (itemId) => {
    await dispatch(updateStock({ itemId, currentStock: stockValue }));
    setStockUpdateId(null);
    dispatch(getDashboard());
  };

  const handlePendingOrderUpdate = async (itemId) => {
    await dispatch(updatePendingOrder({
      itemId,
      pendingOrderQty: pendingOrderData.qty,
      incomingStockDays: pendingOrderData.days,
    }));
    setPendingOrderData({ qty: 0, days: 0 });
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      await dispatch(deleteInventoryItem(itemId));
      dispatch(getDashboard());
    }
  };

  const handleViewForecast = async (itemId) => {
    await dispatch(getForecast(itemId));
    setViewingForecast(itemId);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'reorder') {
      dispatch(getReorderList());
    } else if (tab === 'critical') {
      dispatch(listInventory({ limit: 20, skip: 0, isCriticalItem: 'true' }));
    } else {
      fetchItems();
    }
  };

  // Display items based on active tab
  const displayItems = activeTab === 'reorder' ? reorderList : items;

  return (
    <Layout>
      {/* Header */}
      <div className="page-header-premium anim-fade-in">
        <div className="header-content">
          <h1>Inventory Management</h1>
          <p>Track stock levels, forecasts, and manage reorder alerts</p>
        </div>
        <div className="header-actions">
          {canEdit && (
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="action-btn-premium">
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="notification success" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(45, 184, 122, 0.15)', borderRadius: '8px', color: '#2DB87A' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="notification error" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#EF4444' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Dashboard Stats */}
      {dashboard && (
        <>
          <div className="stats-grid">
            <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(232, 93, 47, 0.1)', color: 'var(--brand-primary)', border: 'none' }}>
                  <Package size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.summary?.totalItems || 0}</span>
                  <span className="metric-label">Total SKUs</span>
                </div>
              </div>
            </div>
            <div className="dash-card anim-card" style={{ '--delay': '0.2s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none' }}>
                  <AlertTriangle size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.summary?.belowReorderPoint || 0}</span>
                  <span className="metric-label">Need Reorder</span>
                </div>
              </div>
            </div>
            <div className="dash-card anim-card" style={{ '--delay': '0.3s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#F59E0B', border: 'none' }}>
                  <Box size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.summary?.criticalItems || 0}</span>
                  <span className="metric-label">Critical Items</span>
                </div>
              </div>
            </div>
            <div className="dash-card anim-card" style={{ '--delay': '0.4s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(45, 184, 122, 0.1)', color: '#2DB87A', border: 'none' }}>
                  <BarChart3 size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.summary?.stockoutRiskIndex || 0}%</span>
                  <span className="metric-label">Stockout Risk</span>
                </div>
              </div>
            </div>
            <div className="dash-card anim-card" style={{ '--delay': '0.5s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', border: 'none' }}>
                  <Warehouse size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.warehouseStats?.active || 0}</span>
                  <span className="metric-label">Active Warehouses</span>
                </div>
              </div>
            </div>
            <div className="dash-card anim-card" style={{ '--delay': '0.6s' }}>
              <div className="overview-metric">
                <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'none' }}>
                  <TrendingUp size={20} />
                </div>
                <div className="metric-data">
                  <span className="metric-value">{dashboard.summary?.totalStock?.toLocaleString() || 0}</span>
                  <span className="metric-label">Total Stock Units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Distribution & Warehouse Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Risk Distribution */}
            <div className="glass-panel anim-card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#fff' }}>Risk Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A' }}></span>
                    <span style={{ color: '#fff' }}>Low Risk</span>
                  </div>
                  <strong style={{ color: '#fff' }}>{dashboard.riskDistribution?.low || 0}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></span>
                    <span style={{ color: '#fff' }}>Medium Risk</span>
                  </div>
                  <strong style={{ color: '#fff' }}>{dashboard.riskDistribution?.medium || 0}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F97316' }}></span>
                    <span style={{ color: '#fff' }}>High Risk</span>
                  </div>
                  <strong style={{ color: '#fff' }}>{dashboard.riskDistribution?.high || 0}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444' }}></span>
                    <span style={{ color: '#fff' }}>Critical Risk</span>
                  </div>
                  <strong style={{ color: '#fff' }}>{dashboard.riskDistribution?.critical || 0}</strong>
                </div>
              </div>
              {/* Risk Progress Bars */}
              <div style={{ marginTop: '16px' }}>
                {dashboard.summary?.totalItems > 0 && (
                  <div style={{ height: '8px', background: 'var(--surface-elevated)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(dashboard.riskDistribution?.low / dashboard.summary.totalItems) * 100}%`, background: '#2DB87A' }}></div>
                    <div style={{ width: `${(dashboard.riskDistribution?.medium / dashboard.summary.totalItems) * 100}%`, background: '#F59E0B' }}></div>
                    <div style={{ width: `${(dashboard.riskDistribution?.high / dashboard.summary.totalItems) * 100}%`, background: '#F97316' }}></div>
                    <div style={{ width: `${(dashboard.riskDistribution?.critical / dashboard.summary.totalItems) * 100}%`, background: '#EF4444' }}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Status */}
            {dashboard.transferStats && (
              <div className="glass-panel anim-card" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#fff' }}>Transfer Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></span>
                      <span style={{ color: '#fff' }}>Pending</span>
                    </div>
                    <strong style={{ color: '#fff' }}>{dashboard.transferStats.pending || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3B82F6' }}></span>
                      <span style={{ color: '#fff' }}>In Transit</span>
                    </div>
                    <strong style={{ color: '#fff' }}>{dashboard.transferStats.inTransit || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A' }}></span>
                      <span style={{ color: '#fff' }}>Completed</span>
                    </div>
                    <strong style={{ color: '#fff' }}>{dashboard.transferStats.completed || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Last 30 Days</span>
                    <strong style={{ color: '#fff' }}>{dashboard.transferStats.recentTransfers || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items by Warehouse */}
          {dashboard.itemsByWarehouse && dashboard.itemsByWarehouse.length > 0 && (
            <div className="glass-panel anim-card" style={{ marginBottom: '20px', padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#fff' }}>Stock by Warehouse</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {dashboard.itemsByWarehouse.map((wh) => (
                  <div key={wh.warehouseId} style={{ padding: '16px', background: 'var(--surface-elevated)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff' }}>{wh.warehouseCode || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{wh.warehouseName || 'N/A'}</div>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', textTransform: 'capitalize' }}>{wh.warehouseType || 'storage'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Items</div>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{wh.totalItems}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Stock</div>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{wh.totalStock?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Critical</div>
                        <div style={{ fontWeight: '600', color: wh.criticalItems > 0 ? '#EF4444' : '#fff' }}>{wh.criticalItems}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Reorder</div>
                        <div style={{ fontWeight: '600', color: wh.belowReorder > 0 ? '#F59E0B' : '#fff' }}>{wh.belowReorder}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Form */}
      {showCreateForm && canEdit && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)' }}>
          <form onSubmit={handleCreateSubmit} className="invite-form-premium">
            <div className="form-header">
              <Package size={20} />
              <h3>Add New Inventory Item</h3>
            </div>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group-premium">
                <label>SKU *</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleFormChange} placeholder="e.g., SKU-001" required />
              </div>
              <div className="form-group-premium">
                <label>Product Name *</label>
                <input type="text" name="productName" value={formData.productName} onChange={handleFormChange} placeholder="Product name" required />
              </div>
              <div className="form-group-premium">
                <label>Warehouse *</label>
                <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)' }}>
                  <option value="">Select warehouse...</option>
                  {activeWarehouses && activeWarehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group-premium">
                <label>Supplier ID (Optional)</label>
                <input type="text" name="supplierId" value={formData.supplierId} onChange={handleFormChange} placeholder="Supplier ObjectId (if available)" />
              </div>
              <div className="form-group-premium">
                <label>Current Stock *</label>
                <input type="number" name="currentStock" value={formData.currentStock} onChange={handleFormChange} min="0" required />
              </div>
              <div className="form-group-premium">
                <label>Avg Daily Demand *</label>
                <input type="number" name="averageDailyDemand" value={formData.averageDailyDemand} onChange={handleFormChange} min="0" step="0.01" required />
              </div>
              <div className="form-group-premium">
                <label>Lead Time (days) *</label>
                <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleFormChange} min="1" required />
              </div>
              <div className="form-group-premium">
                <label>Demand Variance</label>
                <input type="number" name="demandVariance" value={formData.demandVariance} onChange={handleFormChange} min="0" step="0.01" />
              </div>
              <div className="form-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="isCriticalItem" checked={formData.isCriticalItem} onChange={handleFormChange} id="critical-check" />
                <label htmlFor="critical-check" style={{ margin: 0 }}>Critical Item</label>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button type="submit" className="action-btn-premium">Create Item</button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="action-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => handleTabChange('all')} className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '8px', background: activeTab === 'all' ? 'var(--brand-primary)' : 'var(--surface-elevated)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
          <Archive size={16} style={{ marginRight: '6px' }} /> All Items
        </button>
        <button onClick={() => handleTabChange('reorder')} className={`tab-btn ${activeTab === 'reorder' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '8px', background: activeTab === 'reorder' ? 'var(--brand-primary)' : 'var(--surface-elevated)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
          <ShoppingCart size={16} style={{ marginRight: '6px' }} /> Reorder List
        </button>
        <button onClick={() => handleTabChange('critical')} className={`tab-btn ${activeTab === 'critical' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '8px', background: activeTab === 'critical' ? 'var(--brand-primary)' : 'var(--surface-elevated)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
          <AlertTriangle size={16} style={{ marginRight: '6px' }} /> Critical Items
        </button>
      </div>

      {/* Search & Filters */}
      {activeTab === 'all' && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '250px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by SKU or product name..." style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }} />
            </div>
            <button type="submit" className="action-btn-premium">Search</button>
          </form>
          <select value={filterRiskTier} onChange={(e) => { setFilterRiskTier(e.target.value); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }}>
            <option value="">All Risk Tiers</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={filterWarehouse} onChange={(e) => { setFilterWarehouse(e.target.value); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-base)', color: '#fff' }}>
            <option value="">All Warehouses</option>
            {activeWarehouses && activeWarehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
            ))}
          </select>
          <button onClick={fetchItems} className="action-btn-secondary" style={{ padding: '10px 16px', color: '#fff' }}>
            <Filter size={16} /> Apply
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="glass-panel">
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>SKU</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Product</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Warehouse</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Stock</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Reorder Pt</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Risk</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Critical</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    <RefreshCw size={24} className="spin" /> Loading...
                  </td>
                </tr>
              )}
              {!loading && displayItems.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    No inventory items found
                  </td>
                </tr>
              )}
              {!loading && displayItems.map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#fff' }}>{item.sku}</td>
                  <td style={{ padding: '14px 16px', color: '#fff' }}>{item.productName}</td>
                  <td style={{ padding: '14px 16px', color: '#fff' }}>
                    {item.warehouseId?.code || item.warehouseId || '—'}
                    {item.warehouseId?.name && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>{item.warehouseId.name}</span>}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {stockUpdateId === item._id ? (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <input type="number" value={stockValue} onChange={(e) => setStockValue(Number(e.target.value))} min="0" style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
                        <button onClick={() => handleStockUpdate(item._id)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#2DB87A', color: 'white', border: 'none', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setStockUpdateId(null)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <span style={{ color: item.currentStock <= item.reorderPoint ? '#EF4444' : '#fff', fontWeight: item.currentStock <= item.reorderPoint ? '600' : '400' }}>
                        {item.currentStock}
                        {item.currentStock <= item.reorderPoint && (
                          <TrendingDown size={14} style={{ marginLeft: '4px', color: '#EF4444' }} />
                        )}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#fff' }}>{item.reorderPoint}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <RiskBadge tier={item.riskTier} score={item.riskScore} />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {item.isCriticalItem ? (
                      <span style={{ color: '#F59E0B' }}>★</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleViewForecast(item._id)} title="View Forecast" style={{ padding: '6px', borderRadius: '6px', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                        <BarChart3 size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => { setStockUpdateId(item._id); setStockValue(item.currentStock); }} title="Update Stock" style={{ padding: '6px', borderRadius: '6px', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                            <RefreshCw size={16} />
                          </button>
                          <button onClick={() => handleEditClick(item)} title="Edit" style={{ padding: '6px', borderRadius: '6px', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                            <Edit2 size={16} />
                          </button>
                          {user?.role === 'ORG_ADMIN' && (
                            <button onClick={() => handleDelete(item._id)} title="Delete" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                              <Trash2 size={16} />
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

        {/* Pagination info */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>
            Showing {displayItems.length} of {activeTab === 'reorder' ? reorderList.length : total} items
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItemId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#fff' }}>Edit Inventory Item</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="form-group-premium">
                  <label>SKU</label>
                  <input type="text" name="sku" value={formData.sku} onChange={handleFormChange} required />
                </div>
                <div className="form-group-premium">
                  <label>Product Name</label>
                  <input type="text" name="productName" value={formData.productName} onChange={handleFormChange} required />
                </div>
                <div className="form-group-premium">
                  <label>Warehouse ID</label>
                  <input type="text" name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required />
                </div>
                <div className="form-group-premium">
                  <label>Current Stock</label>
                  <input type="number" name="currentStock" value={formData.currentStock} onChange={handleFormChange} min="0" required />
                </div>
                <div className="form-group-premium">
                  <label>Avg Daily Demand</label>
                  <input type="number" name="averageDailyDemand" value={formData.averageDailyDemand} onChange={handleFormChange} min="0" step="0.01" required />
                </div>
                <div className="form-group-premium">
                  <label>Lead Time (days)</label>
                  <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleFormChange} min="1" required />
                </div>
                <div className="form-group-premium">
                  <label>Demand Variance</label>
                  <input type="number" name="demandVariance" value={formData.demandVariance} onChange={handleFormChange} min="0" step="0.01" />
                </div>
                <div className="form-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" name="isCriticalItem" checked={formData.isCriticalItem} onChange={handleFormChange} id="edit-critical" />
                  <label htmlFor="edit-critical" style={{ margin: 0 }}>Critical Item</label>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingItemId(null)} className="action-btn-secondary">Cancel</button>
                <button type="submit" className="action-btn-premium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forecast Modal */}
      {viewingForecast && forecast && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff' }}>Demand Forecast</h3>
              <button onClick={() => setViewingForecast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>✕</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>{forecast.sku} - {forecast.productName}</p>
            </div>
            <div className="forecast-stats" style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>Current Stock:</span>
                <strong style={{ color: '#fff' }}>{forecast.currentStock}</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>Daily Demand:</span>
                <strong style={{ color: '#fff' }}>{forecast.averageDailyDemand}</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>Days Until Stockout:</span>
                <strong style={{ color: forecast.daysUntilStockout < forecast.leadTimeDays ? '#EF4444' : '#2DB87A' }}>
                  {forecast.daysUntilStockout || '∞'}
                </strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>Reorder Point:</span>
                <strong style={{ color: '#fff' }}>{forecast.reorderPoint}</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>Safety Stock:</span>
                <strong style={{ color: '#fff' }}>{forecast.safetyStock}</strong>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: '#fff' }}>Demand Forecast</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>30 Days</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>{forecast.forecast?.demand30Days}</p>
                </div>
                <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>60 Days</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#8B5CF6' }}>{forecast.forecast?.demand60Days}</p>
                </div>
                <div style={{ padding: '16px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>90 Days</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#EC4899' }}>{forecast.forecast?.demand90Days}</p>
                </div>
              </div>
            </div>
            {forecast.needsReorder && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
                <AlertTriangle size={18} />
                <span>This item needs to be reordered!</span>
              </div>
            )}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: '#fff' }}>Risk Assessment</h4>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#fff' }}>Risk Score:</span>
                  <RiskBadge tier={forecast.riskAssessment?.riskTier} score={forecast.riskAssessment?.riskScore} />
                </div>
                {forecast.riskAssessment?.riskExplanation && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                    {forecast.riskAssessment.riskExplanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinning icon */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .action-btn-secondary {
          padding: 10px 20px;
          background: var(--surface-elevated);
          color: var(--text-primary);
          border-radius: 12px;
          font-weight: 600;
          border: 1px solid var(--border-light);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn-secondary:hover {
          background: var(--surface-hover);
        }
      `}</style>
    </Layout>
  );
}
