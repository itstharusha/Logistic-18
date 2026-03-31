import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Package, Plus, Search, Filter, AlertTriangle, TrendingUp, TrendingDown,
  Archive, MoreVertical, Edit2, Trash2, Eye, ShoppingCart, RefreshCw,
  Warehouse, BarChart3, AlertCircle, CheckCircle, Clock, Box, ArrowUpRight,
  Activity, MapPin
} from 'lucide-react';
import {
  listInventory, getDashboard, getReorderList, getWarehouses,
  createInventoryItem, updateInventoryItem, updateStock, updatePendingOrder,
  deleteInventoryItem, getForecast, clearMessage, clearError
} from '../redux/inventorySlice.js';
import { getActiveWarehouses } from '../redux/warehouseSlice.js';
import { listSuppliers } from '../redux/suppliersSlice.js';
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
  const { suppliers } = useSelector((state) => state.suppliers);
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = user?.role === 'ORG_ADMIN' || user?.role === 'INVENTORY_MANAGER';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const shimmerTimer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(shimmerTimer);
  }, []);

  useEffect(() => {
    dispatch(getDashboard());
    dispatch(getWarehouses());
    dispatch(getActiveWarehouses());
    dispatch(listSuppliers({ limit: 100 }));
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
      {/* ═══ HERO BANNER ═══ */}
      <section className="dashboard-hero inventory-hero">
        <span className="hero-location"><Package size={14} style={{ marginRight: '6px' }} />Inventory Control Center</span>
        <h1 className="hero-title">Inventory<br />Management</h1>
        <div className="hero-actions">
          {canEdit && (
            <button className="hero-btn hero-btn--light" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus size={15} /> Add Item
            </button>
          )}
          <button className="hero-btn hero-btn--dark" onClick={() => handleTabChange('reorder')}>
            <AlertTriangle size={15} /> Reorder Alerts
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
        <div className="notification success" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(45, 184, 122, 0.15)', borderRadius: '8px', color: '#2DB87A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="notification error" style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* ═══ STATS ROW ═══ */}
      {dashboard && (
        <div className="dashboard-row-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
          {/* Card: Inventory Overview */}
          <div className={`dash-card card-overview anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.10s' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="status-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2DB87A', animation: 'pulse-live 2s infinite' }}></div>
                <h2 className="card-title">Inventory Overview</h2>
              </div>
              <a href="/inventory" className="card-expand-btn" aria-label="Expand">
                <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="overview-grid">
              <div className="overview-metric">
                <div className="metric-icon"><Package size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.summary?.totalItems || 0} /></div>
                  <div className="metric-label">Total SKUs</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><AlertTriangle size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.summary?.belowReorderPoint || 0} /></div>
                  <div className="metric-label">Need Reorder</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><Box size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.summary?.criticalItems || 0} /></div>
                  <div className="metric-label">Critical Items</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><Activity size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.summary?.stockoutRiskIndex || 0} suffix="%" /></div>
                  <div className="metric-label">Stockout Risk</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><Warehouse size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.warehouseStats?.active || 0} /></div>
                  <div className="metric-label">Warehouses</div>
                </div>
              </div>
              <div className="overview-metric">
                <div className="metric-icon"><TrendingUp size={18} /></div>
                <div className="metric-data">
                  <div className="metric-value"><Counter target={dashboard.summary?.totalStock || 0} /></div>
                  <div className="metric-label">Total Units</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Risk Distribution */}
          <div className={`dash-card card-breakdown anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.20s' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Risk Distribution</h2>
                <span className="card-subtitle">By inventory items</span>
              </div>
            </div>
            <span className="breakdown-overline">RISK BREAKDOWN</span>
            <div className="breakdown-rows">
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2DB87A', flexShrink: 0 }}></span>
                <span className="breakdown-label">Low Risk</span>
                <span className="breakdown-value">{dashboard.riskDistribution?.low || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B', flexShrink: 0 }}></span>
                <span className="breakdown-label">Medium Risk</span>
                <span className="breakdown-value">{dashboard.riskDistribution?.medium || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F97316', flexShrink: 0 }}></span>
                <span className="breakdown-label">High Risk</span>
                <span className="breakdown-value">{dashboard.riskDistribution?.high || 0}</span>
              </div>
              <div className="alert-divider"></div>
              <div className="breakdown-row">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444', flexShrink: 0 }}></span>
                <span className="breakdown-label">Critical Risk</span>
                <span className="breakdown-value">{dashboard.riskDistribution?.critical || 0}</span>
              </div>
            </div>
            {/* Risk Progress Bar */}
            {dashboard.summary?.totalItems > 0 && (
              <div style={{ height: '8px', background: '#E2E5E0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(dashboard.riskDistribution?.low / dashboard.summary.totalItems) * 100}%`, background: '#2DB87A' }}></div>
                <div style={{ width: `${(dashboard.riskDistribution?.medium / dashboard.summary.totalItems) * 100}%`, background: '#F59E0B' }}></div>
                <div style={{ width: `${(dashboard.riskDistribution?.high / dashboard.summary.totalItems) * 100}%`, background: '#F97316' }}></div>
                <div style={{ width: `${(dashboard.riskDistribution?.critical / dashboard.summary.totalItems) * 100}%`, background: '#EF4444' }}></div>
              </div>
            )}
          </div>

          {/* Card: Quick Actions */}
          <div className={`dash-card card-actions anim-card ${isLoading ? 'loading' : ''}`} style={{ animationDelay: '0.30s' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Quick Actions</h2>
                <span className="card-subtitle">Inventory operations</span>
              </div>
            </div>
            <div className="actions-grid">
              <div className="action-item" onClick={() => handleTabChange('all')}>
                <Archive size={18} className="action-icon" />
                <div className="action-text">
                  <span className="action-name">All Items</span>
                  <span className="action-desc">View all inventory</span>
                </div>
                <span className="action-badge">★ View</span>
              </div>
              <div className="action-item" onClick={() => handleTabChange('reorder')}>
                <ShoppingCart size={18} className="action-icon" />
                <div className="action-text">
                  <span className="action-name">Reorder</span>
                  <span className="action-desc">Items below threshold</span>
                </div>
                <span className="action-badge">★ Alert</span>
              </div>
              <div className="action-item" onClick={() => handleTabChange('critical')}>
                <AlertTriangle size={18} className="action-icon" />
                <div className="action-text">
                  <span className="action-name">Critical</span>
                  <span className="action-desc">High priority items</span>
                </div>
                <span className="action-badge">★ Urgent</span>
              </div>
              {canEdit && (
                <div className="action-item" onClick={() => setShowCreateForm(true)}>
                  <Plus size={18} className="action-icon" />
                  <div className="action-text">
                    <span className="action-name">Add New</span>
                    <span className="action-desc">Create inventory item</span>
                  </div>
                  <span className="action-badge">★ Create</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ WAREHOUSE STOCK OVERVIEW ═══ */}
      {dashboard?.itemsByWarehouse && dashboard.itemsByWarehouse.length > 0 && (
        <div className={`dash-card anim-card ${isLoading ? 'loading' : ''}`} style={{ marginBottom: '20px', animationDelay: '0.40s' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Stock by Warehouse</h2>
              <span className="card-subtitle">{dashboard.itemsByWarehouse.length} warehouses with stock</span>
            </div>
            <a href="/warehouses" className="card-expand-btn" aria-label="View all">
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {dashboard.itemsByWarehouse.map((wh) => (
              <div key={wh.warehouseId} style={{ padding: '16px', background: '#F5F7F5', borderRadius: '12px', border: '1px solid #E2E5E0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1A1C1A' }}>{wh.warehouseCode || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: '#5A5E5A' }}>{wh.warehouseName || 'N/A'}</div>
                  </div>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', textTransform: 'capitalize', fontWeight: '600' }}>{wh.warehouseType || 'storage'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#9A9E9A', fontSize: '11px' }}>Items</div>
                    <div style={{ fontWeight: '600', color: '#1A1C1A' }}>{wh.totalItems}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9A9E9A', fontSize: '11px' }}>Stock</div>
                    <div style={{ fontWeight: '600', color: '#1A1C1A' }}>{wh.totalStock?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9A9E9A', fontSize: '11px' }}>Critical</div>
                    <div style={{ fontWeight: '600', color: wh.criticalItems > 0 ? '#EF4444' : '#1A1C1A' }}>{wh.criticalItems}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9A9E9A', fontSize: '11px' }}>Reorder</div>
                    <div style={{ fontWeight: '600', color: wh.belowReorder > 0 ? '#F59E0B' : '#1A1C1A' }}>{wh.belowReorder}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && canEdit && (
        <div className="dash-card anim-card" style={{ marginBottom: '20px' }}>
          <form onSubmit={handleCreateSubmit}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="metric-icon"><Package size={18} /></div>
                <h2 className="card-title">Add New Inventory Item</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group-light">
                <label>SKU *</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleFormChange} placeholder="e.g., SKU-001" required />
              </div>
              <div className="form-group-light">
                <label>Product Name *</label>
                <input type="text" name="productName" value={formData.productName} onChange={handleFormChange} placeholder="Product name" required />
              </div>
              <div className="form-group-light">
                <label>Warehouse *</label>
                <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required>
                  <option value="">Select warehouse...</option>
                  {activeWarehouses && activeWarehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group-light">
                <label>Supplier (Optional)</label>
                <select name="supplierId" value={formData.supplierId} onChange={handleFormChange}>
                  <option value="">-- No Supplier --</option>
                  {suppliers && suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                  ))}
                </select>
              </div>
              <div className="form-group-light">
                <label>Current Stock *</label>
                <input type="number" name="currentStock" value={formData.currentStock} onChange={handleFormChange} min="0" required />
              </div>
              <div className="form-group-light">
                <label>Avg Daily Demand *</label>
                <input type="number" name="averageDailyDemand" value={formData.averageDailyDemand} onChange={handleFormChange} min="0" step="0.01" required />
              </div>
              <div className="form-group-light">
                <label>Lead Time (days) *</label>
                <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleFormChange} min="1" required />
              </div>
              <div className="form-group-light">
                <label>Demand Variance</label>
                <input type="number" name="demandVariance" value={formData.demandVariance} onChange={handleFormChange} min="0" step="0.01" />
              </div>
              <div className="form-group-light" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                <input type="checkbox" name="isCriticalItem" checked={formData.isCriticalItem} onChange={handleFormChange} id="critical-check" />
                <label htmlFor="critical-check" style={{ margin: 0, color: '#1A1C1A' }}>Critical Item</label>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="submit" className="hero-btn hero-btn--light" style={{ background: '#E85D2F', color: 'white' }}>Create Item</button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="hero-btn hero-btn--dark">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => handleTabChange('all')} className="tab-btn-light" style={{ background: activeTab === 'all' ? '#1A1C1A' : 'white' , color: activeTab === 'all' ? 'white' : '#1A1C1A' }}>
          <Archive size={16} style={{ marginRight: '6px' }} /> All Items
        </button>
        <button onClick={() => handleTabChange('reorder')} className="tab-btn-light" style={{ background: activeTab === 'reorder' ? '#1A1C1A' : 'white', color: activeTab === 'reorder' ? 'white' : '#1A1C1A' }}>
          <ShoppingCart size={16} style={{ marginRight: '6px' }} /> Reorder List
        </button>
        <button onClick={() => handleTabChange('critical')} className="tab-btn-light" style={{ background: activeTab === 'critical' ? '#1A1C1A' : 'white', color: activeTab === 'critical' ? 'white' : '#1A1C1A' }}>
          <AlertTriangle size={16} style={{ marginRight: '6px' }} /> Critical Items
        </button>
      </div>

      {/* Search & Filters */}
      {activeTab === 'all' && (
        <div className="dash-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '250px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9A9E9A' }} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by SKU or product name..." className="search-input-light" />
            </div>
            <button type="submit" className="hero-btn hero-btn--light" style={{ borderRadius: '8px', padding: '10px 16px' }}>Search</button>
          </form>
          <select value={filterRiskTier} onChange={(e) => setFilterRiskTier(e.target.value)} className="select-light">
            <option value="">All Risk Tiers</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="select-light">
            <option value="">All Warehouses</option>
            {activeWarehouses && activeWarehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>{wh.code} - {wh.name}</option>
            ))}
          </select>
          <button onClick={fetchItems} className="hero-btn hero-btn--dark" style={{ borderRadius: '8px', padding: '10px 16px' }}>
            <Filter size={16} /> Apply
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="dash-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E5E0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>SKU</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Product</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Warehouse</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Stock</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Reorder Pt</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Risk</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Critical</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#5A5E5A', fontSize: '13px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#9A9E9A' }}>
                    <RefreshCw size={24} className="spin" /> Loading...
                  </td>
                </tr>
              )}
              {!loading && displayItems.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#9A9E9A' }}>
                    No inventory items found
                  </td>
                </tr>
              )}
              {!loading && displayItems.map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid #E2E5E0' }} className="table-row-hover">
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1A1C1A' }}>{item.sku}</td>
                  <td style={{ padding: '14px 16px', color: '#1A1C1A' }}>{item.productName}</td>
                  <td style={{ padding: '14px 16px', color: '#1A1C1A' }}>
                    {item.warehouseId?.code || item.warehouseId || '—'}
                    {item.warehouseId?.name && <span style={{ fontSize: '12px', color: '#9A9E9A', display: 'block' }}>{item.warehouseId.name}</span>}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {stockUpdateId === item._id ? (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <input type="number" value={stockValue} onChange={(e) => setStockValue(Number(e.target.value))} min="0" style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
                        <button onClick={() => handleStockUpdate(item._id)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#2DB87A', color: 'white', border: 'none', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setStockUpdateId(null)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <span style={{ color: item.currentStock <= item.reorderPoint ? '#EF4444' : '#1A1C1A', fontWeight: item.currentStock <= item.reorderPoint ? '600' : '400' }}>
                        {item.currentStock}
                        {item.currentStock <= item.reorderPoint && (
                          <TrendingDown size={14} style={{ marginLeft: '4px', color: '#EF4444' }} />
                        )}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#1A1C1A' }}>{item.reorderPoint}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <RiskBadge tier={item.riskTier} score={item.riskScore} />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {item.isCriticalItem ? (
                      <span style={{ color: '#F59E0B' }}>★</span>
                    ) : (
                      <span style={{ color: '#9A9E9A' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleViewForecast(item._id)} title="View Forecast" style={{ padding: '6px', borderRadius: '6px', background: '#F5F7F5', border: '1px solid #E2E5E0', cursor: 'pointer', color: '#1A1C1A' }}>
                        <BarChart3 size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => { setStockUpdateId(item._id); setStockValue(item.currentStock); }} title="Update Stock" style={{ padding: '6px', borderRadius: '6px', background: '#F5F7F5', border: '1px solid #E2E5E0', cursor: 'pointer', color: '#1A1C1A' }}>
                            <RefreshCw size={16} />
                          </button>
                          <button onClick={() => handleEditClick(item)} title="Edit" style={{ padding: '6px', borderRadius: '6px', background: '#F5F7F5', border: '1px solid #E2E5E0', cursor: 'pointer', color: '#1A1C1A' }}>
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
        <div style={{ padding: '16px', borderTop: '1px solid #E2E5E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9A9E9A' }}>
            Showing {displayItems.length} of {activeTab === 'reorder' ? reorderList.length : total} items
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItemId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#1A1C1A', fontWeight: '700', fontSize: '18px' }}>Edit Inventory Item</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="form-group-light">
                  <label>SKU</label>
                  <input type="text" name="sku" value={formData.sku} onChange={handleFormChange} required />
                </div>
                <div className="form-group-light">
                  <label>Product Name</label>
                  <input type="text" name="productName" value={formData.productName} onChange={handleFormChange} required />
                </div>
                <div className="form-group-light">
                  <label>Warehouse</label>
                <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required>
                  <option value="">-- Select Warehouse --</option>
                  {activeWarehouses && activeWarehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.location?.country})</option>
                  ))}
                </select>
                </div>
                <div className="form-group-light">
                  <label>Current Stock</label>
                  <input type="number" name="currentStock" value={formData.currentStock} onChange={handleFormChange} min="0" required />
                </div>
                <div className="form-group-light">
                  <label>Avg Daily Demand</label>
                  <input type="number" name="averageDailyDemand" value={formData.averageDailyDemand} onChange={handleFormChange} min="0" step="0.01" required />
                </div>
                <div className="form-group-light">
                  <label>Lead Time (days)</label>
                  <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleFormChange} min="1" required />
                </div>
                <div className="form-group-light">
                  <label>Demand Variance</label>
                  <input type="number" name="demandVariance" value={formData.demandVariance} onChange={handleFormChange} min="0" step="0.01" />
                </div>
                <div className="form-group-light" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                  <input type="checkbox" name="isCriticalItem" checked={formData.isCriticalItem} onChange={handleFormChange} id="edit-critical" />
                  <label htmlFor="edit-critical" style={{ margin: 0, color: '#1A1C1A' }}>Critical Item</label>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingItemId(null)} className="hero-btn hero-btn--dark">Cancel</button>
                <button type="submit" className="hero-btn hero-btn--light" style={{ background: '#E85D2F', color: 'white' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forecast Modal */}
      {viewingForecast && forecast && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#1A1C1A', fontWeight: '700' }}>Demand Forecast</h3>
              <button onClick={() => setViewingForecast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1C1A', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#1A1C1A' }}>{forecast.sku} - {forecast.productName}</p>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5A5E5A' }}>Current Stock:</span>
                <strong style={{ color: '#1A1C1A' }}>{forecast.currentStock}</strong>
              </div>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5A5E5A' }}>Daily Demand:</span>
                <strong style={{ color: '#1A1C1A' }}>{forecast.averageDailyDemand}</strong>
              </div>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5A5E5A' }}>Days Until Stockout:</span>
                <strong style={{ color: forecast.daysUntilStockout < forecast.leadTimeDays ? '#EF4444' : '#2DB87A' }}>
                  {forecast.daysUntilStockout || '∞'}
                </strong>
              </div>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5A5E5A' }}>Reorder Point:</span>
                <strong style={{ color: '#1A1C1A' }}>{forecast.reorderPoint}</strong>
              </div>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5A5E5A' }}>Safety Stock:</span>
                <strong style={{ color: '#1A1C1A' }}>{forecast.safetyStock}</strong>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: '#1A1C1A' }}>Demand Forecast</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#5A5E5A' }}>30 Days</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>{forecast.forecast?.demand30Days}</p>
                </div>
                <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#5A5E5A' }}>60 Days</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#8B5CF6' }}>{forecast.forecast?.demand60Days}</p>
                </div>
                <div style={{ padding: '16px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#5A5E5A' }}>90 Days</p>
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
              <h4 style={{ marginBottom: '12px', color: '#1A1C1A' }}>Risk Assessment</h4>
              <div style={{ padding: '12px', background: '#F5F7F5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#5A5E5A' }}>Risk Score:</span>
                  <RiskBadge tier={forecast.riskAssessment?.riskTier} score={forecast.riskAssessment?.riskScore} />
                </div>
                {forecast.riskAssessment?.riskExplanation && (
                  <p style={{ fontSize: '13px', color: '#5A5E5A', marginTop: '8px' }}>
                    {forecast.riskAssessment.riskExplanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for light theme forms and interactions */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .form-group-light label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #5A5E5A;
        }
        .form-group-light input,
        .form-group-light select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #E2E5E0;
          background: #F5F7F5;
          font-size: 14px;
          color: #1A1C1A;
        }
        .form-group-light input:focus,
        .form-group-light select:focus {
          outline: none;
          border-color: #E85D2F;
        }
        .tab-btn-light {
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid #E2E5E0;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        .tab-btn-light:hover {
          border-color: #1A1C1A;
        }
        .search-input-light {
          width: 100%;
          padding: 10px 10px 10px 40px;
          border-radius: 8px;
          border: 1px solid #E2E5E0;
          background: #F5F7F5;
          color: #1A1C1A;
        }
        .search-input-light:focus {
          outline: none;
          border-color: #E85D2F;
        }
        .select-light {
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #E2E5E0;
          background: white;
          color: #1A1C1A;
        }
        .table-row-hover:hover {
          background: #F5F7F5;
        }
      `}</style>
    </Layout>
  );
}
