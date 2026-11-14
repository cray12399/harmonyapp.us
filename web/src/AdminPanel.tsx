import React, { useState, useEffect } from 'react';

export interface ManagedUser {
  _id: string;
  username: string;
  email: string;
  status: number; // 0 = disabled, 1 = user, 2 = admin
  isVerified: boolean;
  createdAt: string;
}

export default function AdminPanel() {
  const [adminSection, setAdminSection] = useState<'users' | 'reports' | 'chat'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'admin'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch real users from backend API
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update user status via PATCH /api/admin/users/:id
  const handleUpdateStatus = async (id: string, newStatus: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setUsers(users.map(u => u._id === id ? data.user : u));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = user.username.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = user.status === 1;
    else if (statusFilter === 'disabled') matchesStatus = user.status === 0;
    else if (statusFilter === 'admin') matchesStatus = user.status === 2;
    return matchesQuery && matchesStatus;
  });

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #3f4147', paddingBottom: '12px' }}>
        <button onClick={() => setAdminSection('users')} style={{ backgroundColor: adminSection === 'users' ? '#5865F2' : '#2b2d31', color: '#fff', border: '1px solid #3f4147', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          👥 User Management ({users.length})
        </button>
      </div>

      {error && <div style={{ color: '#f23f43', backgroundColor: 'rgba(242,63,67,0.1)', padding: '10px', borderRadius: '4px' }}>{error}</div>}

      {adminSection === 'users' && (
        <div style={{ backgroundColor: '#2b2d31', borderRadius: '8px', border: '1px solid #3f4147', overflow: 'hidden' }}>
          <div style={{ padding: '16px', display: 'flex', gap: '12px', borderBottom: '1px solid #3f4147' }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by username or email..." style={{ flex: 2, padding: '8px', backgroundColor: '#1e1f22', border: '1px solid #111214', color: '#fff', borderRadius: '4px', outline: 'none' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ flex: 1, padding: '8px', backgroundColor: '#1e1f22', border: '1px solid #111214', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
              <option value="all">All Statuses</option>
              <option value="active">Active (1)</option>
              <option value="disabled">Disabled (0)</option>
              <option value="admin">Admin (2)</option>
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e1f22', color: '#949ba4', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #3f4147' }}>
                <th style={{ padding: '14px 16px' }}>Username</th>
                <th style={{ padding: '14px 16px' }}>Email</th>
                <th style={{ padding: '14px 16px' }}>Verified</th>
                <th style={{ padding: '14px 16px' }}>Status / Role</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#949ba4' }}>Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#949ba4' }}>No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.status === 2;
                  const isDisabled = user.status === 0;
                  return (
                    <tr key={user._id} style={{ borderBottom: '1px solid #35373c' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#f2f3f5' }}>
                        @{user.username} {isAdmin && <span style={{ backgroundColor: '#5865F2', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>ADMIN</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#dbdee1' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>{user.isVerified ? '✅ Yes' : '❌ No'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: isAdmin ? '#5865F2' : isDisabled ? '#f23f43' : '#23a55a', fontWeight: 'bold' }}>
                          {isAdmin ? 'Admin (2)' : isDisabled ? 'Disabled (0)' : 'Active (1)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {!isAdmin ? (
                          <button onClick={() => handleUpdateStatus(user._id, isDisabled ? 1 : 0)} style={{ backgroundColor: 'transparent', color: isDisabled ? '#23a55a' : '#f23f43', border: `1px solid ${isDisabled ? '#23a55a' : '#f23f43'}`, padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#949ba4' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}