import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, UserPlus, Shield, UserCheck, UserX,
  Search, Mail, ShieldCheck, MoreVertical, Info,
  Edit2, Trash2, Power, UserCircle, Activity, Download, Grid, List, CheckSquare, Lock
} from 'lucide-react';
import { listUsers, assignRole, deactivateUser, activateUser, createUser, updateUser, bulkAssignRole, bulkDeactivateUsers, bulkActivateUsers } from '../redux/usersSlice.js';
import Layout from '../components/Layout.jsx';
import UserAvatar from '../components/UsersPage/UserAvatar.jsx';
import UserActivitySidebar from '../components/UsersPage/UserActivitySidebar.jsx';
import RolePermissionMatrix from '../components/UsersPage/RolePermissionMatrix.jsx';
import UserProfileDrawer from '../components/UsersPage/UserProfileDrawer.jsx';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';
import { getStatusDuration, getStatusColor } from '../utils/userFormatters.js';
import { ROLES, getRoleLabel, getRoleColor } from '../config/rbac.constants.js';
import '../styles/pages.css';

export default function UsersPage() {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.users);
  const user = useSelector((state) => state.auth.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', password: '', role: ROLES.VIEWER });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', role: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // New states for enhancements
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [activeUserForSidebar, setActiveUserForSidebar] = useState(null);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [activeProfileDrawer, setActiveProfileDrawer] = useState(null);

  useEffect(() => {
    dispatch(listUsers({ limit: 20, skip: 0 }));
  }, [dispatch]);

  const handleCreateChange = (e) => {
    setCreateData({
      ...createData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create users');
      return;
    }
    
    if (user.role !== ROLES.ORG_ADMIN) {
      alert('Only organization admins can create users');
      return;
    }
    
    // Validate password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$/;
    if (!passwordRegex.test(createData.password)) {
      alert('Password must be at least 8 characters with 1 uppercase letter, 1 lowercase letter, and 1 number');
      return;
    }
    try {
      const result = await dispatch(createUser(createData)).unwrap();
      alert('User created successfully!');
      setCreateData({ name: '', email: '', password: '', role: ROLES.VIEWER });
      setShowCreateForm(false);
      dispatch(listUsers({ limit: 20, skip: 0 }));
    } catch (err) {
      console.error('Create user error:', err);
      alert(`Error creating user: ${err || 'Unknown error'}`);
    }
  };

  const handleEditClick = (u) => {
    setEditingUserId(u._id);
    setEditData({ name: u.name, email: u.email, role: u.role });
  };

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await dispatch(updateUser({ userId: editingUserId, data: editData }));
    setEditingUserId(null);
  };

  const handleRoleChange = async (userId, newRole) => {
    await dispatch(assignRole({ userId, role: newRole }));
  };

  // Bulk Operations
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(filteredUsers.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectOne = (e, userId) => {
    if (e.target.checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkRoleChange = async (newRole) => {
    if (selectedUsers.length === 0) return;
    await dispatch(bulkAssignRole({ userIds: selectedUsers, role: newRole }));
    setSelectedUsers([]);
    dispatch(listUsers({ limit: 20, skip: 0 }));
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.length === 0) return;
    await dispatch(bulkDeactivateUsers({ userIds: selectedUsers }));
    setSelectedUsers([]);
    dispatch(listUsers({ limit: 20, skip: 0 }));
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return;
    await dispatch(bulkActivateUsers({ userIds: selectedUsers }));
    setSelectedUsers([]);
    dispatch(listUsers({ limit: 20, skip: 0 }));
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Timezone', 'Shift Status', 'Impact Score', 'Last Active'];
    const rows = filteredUsers.map(u => [
      `"${u.name}"`, 
      `"${u.email}"`, 
      `"${u.role}"`, 
      u.isActive ? 'Active' : 'Inactive',
      u.timezone || 'UTC',
      u.shiftStatus || 'OFF_DUTY',
      u.systemImpactScore || 0,
      u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'N/A'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logistics_users_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      await dispatch(deactivateUser(userId));
    }
  };

  const handleActivate = async (userId) => {
    await dispatch(activateUser(userId));
  };

  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === ROLES.ORG_ADMIN).length;

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header-premium anim-fade-in page-header-flex">
        <div className="header-content">
          <h1>User Management</h1>
          <p>Manage team members, roles, and system access permissions</p>
        </div>
        <div className="header-actions header-actions-flex">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')} className="action-btn-premium">
            {viewMode === 'list' ? <Grid size={18} /> : <List size={18} />}
            <span>{viewMode === 'list' ? 'Kanban View' : 'Table View'}</span>
          </button>
          <button onClick={handleExportCSV} className="action-btn-premium">
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          {user?.role === ROLES.ORG_ADMIN && (
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="action-btn-premium">
              <UserPlus size={18} />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
          <div className="overview-metric">
            <div className="metric-icon metric-icon-primary">
              <Users size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{users.length}</span>
              <span className="metric-label">Total Users</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.2s' }}>
          <div className="overview-metric">
            <div className="metric-icon metric-icon-success">
              <UserCheck size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{activeUsers}</span>
              <span className="metric-label">Active Now</span>
            </div>
          </div>
        </div>
        <div className="dash-card anim-card" style={{ '--delay': '0.3s' }}>
          <div className="overview-metric">
            <div className="metric-icon metric-icon-info">
              <Shield size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{adminUsers}</span>
              <span className="metric-label">Administrators</span>
            </div>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="glass-panel anim-card glass-panel-margin">
          <form onSubmit={handleCreateSubmit} className="invite-form-premium">
            <div className="form-header">
              <UserPlus size={20} />
              <h3>Create New User Account</h3>
            </div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <UserCircle size={18} className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    value={createData.name}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="name@organization.com"
                    value={createData.email}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Password (min 8 chars: 1 uppercase, 1 lowercase, 1 number)</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    name="password"
                    placeholder="e.g., SecurePass123"
                    value={createData.password}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>System Role</label>
                <div className="input-wrapper">
                  <ShieldCheck size={18} className="input-icon" />
                  <select name="role" value={createData.role} onChange={handleCreateChange}>
                    <option value={ROLES.VIEWER}>Viewer (Read Only)</option>
                    <option value={ROLES.LOGISTICS_OPERATOR}>Logistics Operator</option>
                    <option value={ROLES.INVENTORY_MANAGER}>Inventory Manager</option>
                    <option value={ROLES.RISK_ANALYST}>Risk Analyst</option>
                    <option value={ROLES.ORG_ADMIN}>Organization Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium">Create User</button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUserId && (
        <div className="glass-panel anim-card glass-panel-margin">
          <form onSubmit={handleEditSubmit} className="invite-form-premium">
            <div className="form-header">
              <Edit2 size={20} />
              <h3>Update User Permissions</h3>
            </div>
            <div className="form-grid">
              <div className="form-group-premium">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <UserCircle size={18} className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>System Role</label>
                <div className="input-wrapper">
                  <ShieldCheck size={18} className="input-icon" />
                  <select name="role" value={editData.role} onChange={handleEditChange}>
                    <option value={ROLES.VIEWER}>Viewer</option>
                    <option value={ROLES.LOGISTICS_OPERATOR}>Logistics Operator</option>
                    <option value={ROLES.INVENTORY_MANAGER}>Inventory Manager</option>
                    <option value={ROLES.RISK_ANALYST}>Risk Analyst</option>
                    <option value={ROLES.ORG_ADMIN}>Organization Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium">Update User</button>
              <button
                type="button"
                onClick={() => setEditingUserId(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="error-card anim-shake">{error}</div>}

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-text">{selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected</span>
          <button onClick={() => handleBulkRoleChange(ROLES.ORG_ADMIN)} className="btn-secondary-small bulk-action-admin">Assign Admin</button>
          <button onClick={() => handleBulkRoleChange(ROLES.RISK_ANALYST)} className="btn-secondary-small bulk-action-analyst">Assign Analyst</button>
          <button onClick={handleBulkActivate} className="btn-secondary-small bulk-action-activate">Activate</button>
          <button onClick={handleBulkDeactivate} className="btn-secondary-small bulk-action-deactivate">Deactivate</button>
          <button onClick={() => setSelectedUsers([])} className="btn-secondary-small">Clear</button>
        </div>
      )}

      <div className="dash-card table-section anim-card" style={{ '--delay': '0.4s' }}>
        <div className="card-header-premium">
          <div className="header-info">
            <h3>Organization Directory</h3>
            <span className="badge">{users.length} Active Profiles</span>
          </div>
          <div className="header-actions">
            <div className="search-box-premium">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          viewMode === 'list' ? (
            <div className="shimmer-container">
              {[1, 2, 3].map(i => <div key={i} className="shimmer-row"></div>)}
            </div>
          ) : (
            <SkeletonGrid count={6} />
          )
        ) : users && users.length > 0 ? (
          <div className="users-table-canvas">
            {filteredUsers.length > 0 ? (
              viewMode === 'list' ? (
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="table-th-checkbox">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          className="cursor-pointer"
                        />
                      </th>
                      <th>Identity</th>
                      <th>System Role</th>
                      <th>Status</th>
                      <th>Last Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id} style={{ background: selectedUsers.includes(u._id) ? 'rgba(232, 93, 47, 0.1)' : 'transparent' }}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedUsers.includes(u._id)}
                            onChange={(e) => handleSelectOne(e, u._id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td>
                          <div className="user-identity">
                            <UserAvatar user={u} size="36px" />
                            <div className="user-info">
                              <span className="user-name">{u.name}</span>
                              <span className="user-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="role-chip cursor-pointer" onClick={() => setShowPermissionMatrix(true)}>
                              <Shield size={14} />
                              <span>{u.role.replace('_', ' ')}</span>
                              <Info size={14} className="role-info-icon" />
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${u.isActive ? 'active' : 'inactive'}`}>
                            {getStatusDuration(u.lastActiveAt, u.isActive)}
                          </span>
                        </td>
                        <td>
                          <span className="kanban-user-email">
                            {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'Never'}
                          </span>
                        </td>
                        <td>
                          {user?.role === ROLES.ORG_ADMIN && (
                            <div className="row-actions">
                              <button
                                onClick={() => handleEditClick(u)}
                                className="icon-btn-premium"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              {u.isActive ? (
                                <button
                                  onClick={() => handleDeactivate(u._id)}
                                  className="icon-btn-premium danger"
                                  title="Deactivate"
                                >
                                  <UserX size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(u._id)}
                                  className="icon-btn-premium success"
                                  title="Activate"
                                >
                                  <Power size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => setActiveProfileDrawer(u)}
                                className="icon-btn-premium"
                                title="View Profile"
                              >
                                <UserCircle size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="kanban-grid">
                  {filteredUsers.map((u) => (
                    <div
                      key={u._id}
                      className={`kanban-card ${selectedUsers.includes(u._id) ? 'selected' : ''}`}
                      onClick={() => handleSelectOne({ target: { checked: !selectedUsers.includes(u._id) } }, u._id)}
                    >
                      <div className="kanban-card-header">
                        <UserAvatar user={u} size="48px" />
                        <div className="kanban-card-info">
                          <div className="kanban-card-name">{u.name}</div>
                          <div className="kanban-card-email">{u.email}</div>
                        </div>
                      </div>
                      <div className="kanban-card-tags">
                        <div className="role-chip-kanban" onClick={() => setShowPermissionMatrix(true)} title="View role permissions">
                          {u.role.replace('_', ' ')}
                          <Info size={12} />
                        </div>
                        <div className="status-pill-kanban" style={{ background: getStatusColor(u.isActive).bg, color: getStatusColor(u.isActive).text }}>
                          {getStatusDuration(u.lastActiveAt, u.isActive)}
                        </div>
                      </div>
                      <div className="kanban-card-actions">
                        <button onClick={(e) => { e.stopPropagation(); setActiveProfileDrawer(u); }} className="btn-secondary-small">Profile</button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(u); }} className="btn-secondary-small">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="empty-canvas empty-canvas-search">
                <Search size={48} className="empty-icon-lucide" />
                <h3>No members found</h3>
                <p>We couldn't find any results for "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="btn-ghost btn-ghost-margin">
                  Clear Search
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-canvas">
            <Users size={48} className="empty-icon-lucide" />
            <h3>No users discovered</h3>
            <p>Your organization directory is currently empty. Start by inviting team members.</p>
            {user?.role === ROLES.ORG_ADMIN && (
              <button onClick={() => setShowInviteForm(true)} className="btn-primary-premium">
                <UserPlus size={18} />
                <span>Invite First User</span>
              </button>
            )}
          </div>
        )}
      </div>

        {/* Activity Sidebar overlay */}
        {activeUserForSidebar && (
          <UserActivitySidebar 
            user={activeUserForSidebar} 
            onClose={() => setActiveUserForSidebar(null)} 
          />
        )}

        {/* Role Permission Matrix Modal */}
        <RolePermissionMatrix 
          isOpen={showPermissionMatrix}
          onClose={() => setShowPermissionMatrix(false)}
        />

        {/* User Profile Drawer */}
        {activeProfileDrawer && (
          <UserProfileDrawer
            user={activeProfileDrawer}
            onClose={() => setActiveProfileDrawer(null)}
            onEdit={handleEditClick}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
          />
        )}
      </Layout>
    );
}


