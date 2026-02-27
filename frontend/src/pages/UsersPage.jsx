import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, UserPlus, Shield, UserCheck, UserX,
  Search, Mail, ShieldCheck, MoreVertical,
  Edit2, Trash2, Power, UserCircle
} from 'lucide-react';
import { listUsers, assignRole, deactivateUser, activateUser, inviteUser, updateUser } from '../redux/usersSlice.js';
import Layout from '../components/Layout.jsx';
import '../styles/pages.css';

export default function UsersPage() {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.users);
  const user = useSelector((state) => state.auth.user);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'VIEWER' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', role: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(listUsers({ limit: 20, skip: 0 }));
  }, [dispatch]);

  const handleInviteChange = (e) => {
    setInviteData({
      ...inviteData,
      [e.target.name]: e.target.value,
    });
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    await dispatch(inviteUser(inviteData));
    setInviteData({ name: '', email: '', role: 'VIEWER' });
    setShowInviteForm(false);
    dispatch(listUsers({ limit: 20, skip: 0 }));
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

  const handleDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      await dispatch(deactivateUser(userId));
    }
  };

  const handleActivate = async (userId) => {
    await dispatch(activateUser(userId));
  };

  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'ORG_ADMIN').length;

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header-premium anim-fade-in">
        <div className="header-content">
          <h1>User Management</h1>
          <p>Manage team members, roles, and system access permissions</p>
        </div>
        <div className="header-actions">
          {user?.role === 'ORG_ADMIN' && (
            <button onClick={() => setShowInviteForm(!showInviteForm)} className="action-btn-premium">
              <UserPlus size={18} />
              <span>Invite User</span>
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="dash-card anim-card" style={{ '--delay': '0.1s' }}>
          <div className="overview-metric">
            <div className="metric-icon" style={{ background: 'rgba(232, 93, 47, 0.1)', color: 'var(--brand-primary)', border: 'none' }}>
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
            <div className="metric-icon" style={{ background: 'rgba(45, 184, 122, 0.1)', color: 'var(--risk-low)', border: 'none' }}>
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
            <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }}>
              <Shield size={20} />
            </div>
            <div className="metric-data">
              <span className="metric-value">{adminUsers}</span>
              <span className="metric-label">Administrators</span>
            </div>
          </div>
        </div>
      </div>

      {showInviteForm && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)' }}>
          <form onSubmit={handleInviteSubmit} className="invite-form-premium">
            <div className="form-header">
              <UserPlus size={20} />
              <h3>Invite New Team Member</h3>
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
                    value={inviteData.name}
                    onChange={handleInviteChange}
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
                    value={inviteData.email}
                    onChange={handleInviteChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-premium">
                <label>System Role</label>
                <div className="input-wrapper">
                  <ShieldCheck size={18} className="input-icon" />
                  <select name="role" value={inviteData.role} onChange={handleInviteChange}>
                    <option value="VIEWER">Viewer (Read Only)</option>
                    <option value="LOGISTICS_OPERATOR">Logistics Operator</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="RISK_ANALYST">Risk Analyst</option>
                    <option value="ORG_ADMIN">Organization Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions-premium">
              <button type="submit" className="btn-primary-premium">Send Invitation</button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUserId && (
        <div className="glass-panel anim-card" style={{ marginBottom: 'var(--space-6)' }}>
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
                    <option value="VIEWER">Viewer</option>
                    <option value="LOGISTICS_OPERATOR">Logistics Operator</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="RISK_ANALYST">Risk Analyst</option>
                    <option value="ORG_ADMIN">Organization Admin</option>
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
          <div className="shimmer-container">
            {[1, 2, 3].map(i => <div key={i} className="shimmer-row"></div>)}
          </div>
        ) : users && users.length > 0 ? (
          <div className="users-table-canvas">
            {filteredUsers.length > 0 ? (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>System Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="user-identity">
                          <div className="user-avatar">{u.name.charAt(0)}</div>
                          <div className="user-info">
                            <span className="user-name">{u.name}</span>
                            <span className="user-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="role-chip">
                          <Shield size={14} />
                          <span>{u.role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${u.isActive ? 'active' : 'inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {user?.role === 'ORG_ADMIN' && (
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
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-canvas" style={{ padding: 'var(--space-12) 0' }}>
                <Search size={48} className="empty-icon-lucide" />
                <h3>No members found</h3>
                <p>We couldn't find any results for "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="btn-ghost" style={{ marginTop: 'var(--space-4)' }}>
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
            {user?.role === 'ORG_ADMIN' && (
              <button onClick={() => setShowInviteForm(true)} className="btn-primary-premium">
                <UserPlus size={18} />
                <span>Invite First User</span>
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
