import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Clock } from 'lucide-react';
import { getUserActivityLog } from '../../redux/usersSlice';

export default function UserActivitySidebar({ user, onClose }) {
  const dispatch = useDispatch();
  
  // Create local state to store this user's logs directly, or map from Redux if you have a place for it
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      // Calls the thunk we added
      dispatch(getUserActivityLog({ userId: user._id, params: { limit: 20 } }))
        .unwrap()
        .then(res => {
          setLogs(res.data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user, dispatch]);

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
      backgroundColor: 'white', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Activity Log: {user.name}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading activity...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No recent activity found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {logs.map(log => (
              <div key={log._id} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ marginTop: '2px', color: '#3b82f6' }}><Clock size={16} /></div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500' }}>
                    {log.action}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    Entity: {log.entityType} ({log.entityId})
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}