import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

  return (
    <Layout>
      <div className="page-header">
        <h1>User Management</h1>
        {user?.role === 'ORG_ADMIN' && (
          <button onClick={() => setShowInviteForm(!showInviteForm)} className="btn-primary">
            + Invite User
          </button>
        )}
      </div>

      {showInviteForm && (
        <div className="invite-form-container">
          <form onSubmit={handleInviteSubmit} className="invite-form">
            <h3>Invite New User</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={inviteData.name}
                onChange={handleInviteChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={inviteData.email}
                onChange={handleInviteChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={inviteData.role} onChange={handleInviteChange}>
                <option value="VIEWER">Viewer</option>
                <option value="LOGISTICS_OPERATOR">Logistics Operator</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="RISK_ANALYST">Risk Analyst</option>
                <option value="ORG_ADMIN">Organization Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Send Invite</button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUserId && (
        <div className="invite-form-container edit-mode">
          <form onSubmit={handleEditSubmit} className="invite-form">
            <h3>Edit User</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={editData.email}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={editData.role} onChange={handleEditChange}>
                <option value="VIEWER">Viewer</option>
                <option value="LOGISTICS_OPERATOR">Logistics Operator</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="RISK_ANALYST">Risk Analyst</option>
                <option value="ORG_ADMIN">Organization Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Update User</button>
              <button
                type="button"
                onClick={() => setEditingUserId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : users && users.length > 0 ? (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user?.role === 'ORG_ADMIN' && (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        {u.isActive ? (
                          <button
                            onClick={() => handleDeactivate(u._id)}
                            className="btn-danger btn-sm"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u._id)}
                            className="btn-success btn-sm"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No users yet</h3>
          <p>Invite your team members to get started.</p>
          {user?.role === 'ORG_ADMIN' && (
            <button onClick={() => setShowInviteForm(true)} className="btn-primary">
              Invite Your First User
            </button>
          )}
        </div>
      )}
    </Layout>
  );
}
