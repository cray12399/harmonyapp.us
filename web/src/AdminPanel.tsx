import React, { useEffect, useState } from 'react';
import { api } from './api';

export interface ManagedUser {
  id: number | string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 1 | 2; // 1 = Regular User, 2 = Admin
  enabled: boolean;
}

export interface ReportedMessage {
  id: number | string;
  senderUsername: string;
  reportedBy: string;
  location: string;
  reason: string;
  messageContent: string;
  timestamp: string;
  status: 'pending' | 'kept' | 'deleted';
}

export interface AdminChatMessage {
  id: number | string;
  sender: string;
  roleTitle: string;
  avatarText: string;
  color: string;
  text: string;
  timestamp: string;
}

const INITIAL_MOCK_USERS: ManagedUser[] = [
  { id: 1001, username: 'TestUser', firstName: 'Test', lastName: 'User', email: 'testuser@harmonyapp.us', role: 2, enabled: true },
  { id: 1002, username: 'SecondUser', firstName: 'Second', lastName: 'User', email: 'second@harmonyapp.us', role: 1, enabled: true },
  { id: 1003, username: 'TheHulk', firstName: 'Bruce', lastName: 'Banner', email: 'hulk@harmonyapp.us', role: 1, enabled: true },
  { id: 1004, username: 'Janke', firstName: 'Matthew', lastName: 'Janke', email: 'matthew@harmonyapp.us', role: 2, enabled: true },
  { id: 1005, username: 'InactiveDev', firstName: 'Alex', lastName: 'Smith', email: 'alex@harmonyapp.us', role: 1, enabled: false },
];

const INITIAL_REPORTED_MESSAGES: ReportedMessage[] = [
  {
    id: 501,
    senderUsername: 'InactiveDev',
    reportedBy: 'SecondUser',
    location: '#general (Dev Team)',
    reason: 'Spam / Unsolicited Links',
    messageContent: 'Click here for free nitro codes!! http://suspicious-link.example.com',
    timestamp: 'Today at 2:14 PM',
    status: 'pending',
  },
  {
    id: 502,
    senderUsername: 'TheHulk',
    reportedBy: 'TestUser',
    location: '#homework-help (Dev Team)',
    reason: 'Off-topic / Caps Spam',
    messageContent: 'HULK SMASH BUGS IN PRODUCTION SERVER RIGHT NOW!!!',
    timestamp: 'Today at 1:05 PM',
    status: 'pending',
  },
  {
    id: 503,
    senderUsername: 'SecondUser',
    reportedBy: 'Janke',
    location: 'DM (@SecondUser)',
    reason: 'Harassment / False Alarm',
    messageContent: 'Hey can you review my pull request before tonight?',
    timestamp: 'Yesterday at 8:42 PM',
    status: 'kept',
  },
];

const INITIAL_ADMIN_MESSAGES: AdminChatMessage[] = [
  {
    id: 1,
    sender: 'Janke',
    roleTitle: 'Lead Admin',
    avatarText: 'J',
    color: '#f23f43',
    text: 'Welcome to the private Admin Chat! Use this channel to coordinate user reports and server moderation.',
    timestamp: 'Today at 10:30 AM',
  },
  {
    id: 2,
    sender: 'TestUser',
    roleTitle: 'System Admin',
    avatarText: 'T',
    color: '#5865F2',
    text: 'Heads up — InactiveDev posted a suspicious link in #general earlier. I flagged it for review.',
    timestamp: 'Today at 2:15 PM',
  },
];

export default function AdminPanel() {
  const normalizeUser = (user: any): ManagedUser => {
    const username = user.username || 'unknown';
    const displayName = username.split(/[_\s-]+/).filter(Boolean);
    const firstName = displayName[0] ? displayName[0].replace(/^[a-z]/, c => c.toUpperCase()) : 'User';
    const lastName = displayName[1] ? displayName[1].replace(/^[a-z]/, c => c.toUpperCase()) : 'Account';

    return {
      id: user._id || user.id,
      username,
      firstName,
      lastName,
      email: user.email || `${username}@harmonyapp.us`,
      role: user.status === 2 ? 2 : 1,
      enabled: user.status !== 0,
    };
  };

  const normalizeReport = (report: any): ReportedMessage => ({
    id: report._id || report.id,
    senderUsername: report.message?.sender?.username || 'unknown',
    reportedBy: report.reportedBy?.username || 'unknown',
    location: report.message?.conversation ? `${report.message.conversation.name || 'Conversation'} (${report.message.conversation.type === 0 ? 'DM' : 'Group'})` : 'Unknown chat',
    reason: report.reason || 'No reason provided',
    messageContent: report.message?.content || 'Message unavailable',
    timestamp: report.createdAt ? new Date(report.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown time',
    status: report.status || 'pending',
  });

  // Top-level Admin Section Tab
  const [adminSection, setAdminSection] = useState<'users' | 'reports' | 'chat'>('users');

  // --- USER MANAGEMENT STATE ---
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'admin'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ username: '', firstName: '', lastName: '', email: '', role: 1 as 1 | 2 });
  const [editError, setEditError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassText, setShowNewPassText] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState('');

  // Add Admin Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [addAdminError, setAddAdminError] = useState('');
  const [showAddPassText, setShowAddPassText] = useState(false);

  // --- REPORTED MESSAGES STATE ---
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'all' | 'kept' | 'deleted'>('pending');
  const [reportSearch, setReportSearch] = useState('');
  const [inspectingReport, setInspectingReport] = useState<ReportedMessage | null>(null);

  const loadAdminData = async (showFeedback = false) => {
    if (showFeedback) {
      setIsRefreshing(true);
      setRefreshMessage('');
    }

    const [usersResult, reportsResult] = await Promise.all([
      api<any>('/api/admin/users')
        .then((data) => ({ data, error: null as string | null }))
        .catch((error: unknown) => ({
          data: null,
          error: error instanceof Error ? error.message : 'Could not load users.',
        })),
      api<any>('/api/admin/reports')
        .then((data) => ({ data, error: null as string | null }))
        .catch((error: unknown) => ({
          data: null,
          error: error instanceof Error ? error.message : 'Could not load reports.',
        })),
    ]);

    const errors: string[] = [];

    if (Array.isArray(usersResult.data?.users)) {
      setUsers(usersResult.data.users.map(normalizeUser));
    } else {
      errors.push(`Users: ${usersResult.error || 'Unexpected response from the API.'}`);
    }

    if (Array.isArray(reportsResult.data?.reports)) {
      setReports(reportsResult.data.reports.map(normalizeReport));
    } else {
      errors.push(`Reports: ${reportsResult.error || 'Unexpected response from the API.'}`);
    }

    if (errors.length > 0) {
      console.warn('Could not refresh all admin data:', errors.join(' '));
      if (showFeedback) setRefreshMessage(errors.join(' '));
    } else if (showFeedback) {
      setRefreshMessage('User management and reported messages are up to date.');
    }

    if (showFeedback) setIsRefreshing(false);
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  // --- ADMIN CHAT STATE ---
  const [adminMessages, setAdminMessages] = useState<AdminChatMessage[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');

  // Prefix & Multi-Field Filtering for Users
  const filteredUsers = users.filter((user) => {
    const rawQuery = searchQuery.trim();
    let searchPrefix = '';
    let searchTerm = rawQuery.toLowerCase();

    const colonIndex = rawQuery.indexOf(':');
    if (colonIndex !== -1) {
      const prefixCandidate = rawQuery.substring(0, colonIndex).trim().toLowerCase();
      const termCandidate = rawQuery.substring(colonIndex + 1).trim().toLowerCase();

      if (['userid', 'id'].includes(prefixCandidate)) searchPrefix = 'userid';
      else if (['username', 'user'].includes(prefixCandidate)) searchPrefix = 'username';
      else if (['firstname', 'first'].includes(prefixCandidate)) searchPrefix = 'firstname';
      else if (['lastname', 'last'].includes(prefixCandidate)) searchPrefix = 'lastname';
      else if (['email'].includes(prefixCandidate)) searchPrefix = 'email';

      if (searchPrefix !== '') searchTerm = termCandidate;
    }

    const fName = user.firstName.toLowerCase();
    const lName = user.lastName.toLowerCase();
    const fullName = `${fName} ${lName}`.trim();
    const uName = user.username.toLowerCase();
    const email = user.email.toLowerCase();
    const idStr = String(user.id);

    let matchesQuery = true;
    if (rawQuery) {
      if (searchPrefix === 'userid') matchesQuery = idStr.includes(searchTerm);
      else if (searchPrefix === 'username') matchesQuery = uName.includes(searchTerm);
      else if (searchPrefix === 'firstname') matchesQuery = fName.includes(searchTerm);
      else if (searchPrefix === 'lastname') matchesQuery = lName.includes(searchTerm);
      else if (searchPrefix === 'email') matchesQuery = email.includes(searchTerm);
      else {
        matchesQuery =
          fName.includes(searchTerm) ||
          lName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          uName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          idStr.includes(searchTerm);
      }
    }

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = user.enabled;
    else if (statusFilter === 'disabled') matchesStatus = !user.enabled;
    else if (statusFilter === 'admin') matchesStatus = user.role === 2;

    return matchesQuery && matchesStatus;
  });

  // Pagination calculations
  const totalEntries = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);
  const pageItems = filteredUsers.slice(startIndex, endIndex);

  // Global Enable / Disable All regular users
  const regularUsers = users.filter((u) => u.role !== 2);
  const allRegularDisabled = regularUsers.length > 0 && regularUsers.every((u) => !u.enabled);

  const handleToggleAllUsers = () => {
    const targetState = allRegularDisabled;
    setUsers(users.map((u) => (u.role === 2 ? u : { ...u, enabled: targetState })));
  };

  const handleToggleSingleUser = async (id: number | string) => {
    const user = users.find((u) => u.id === id);
    if (!user || user.role === 2) return;

    const nextStatus = user.enabled ? 0 : 1;
    try {
      await api(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      setUsers(users.map((u) => (u.id === id ? { ...u, enabled: nextStatus === 1 } : u)));
    } catch (error) {
      console.warn('Could not update user status via API:', error);
      setUsers(users.map((u) => (u.id === id ? { ...u, enabled: !u.enabled } : u)));
    }
  };

  // Open Edit Modal
  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
    setEditError('');
    setShowPasswordReset(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordBanner('');
  };

  const handleSaveUserEdits = () => {
    if (!editingUser) return;
    if (editForm.username.trim().length <= 3) {
      setEditError('Username must be longer than 3 characters.');
      return;
    }
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError('First name, last name, and email are required.');
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: editForm.username.trim(),
              firstName: editForm.firstName.trim(),
              lastName: editForm.lastName.trim(),
              email: editForm.email.trim(),
              role: editForm.role,
            }
          : u
      )
    );
    setEditingUser(null);
  };

  const handleConfirmPasswordReset = () => {
    if (newPassword.length < 6) {
      setPasswordBanner('Error: Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordBanner('Error: Passwords do not match.');
      return;
    }
    setPasswordBanner('User password updated successfully! (UI Mock)');
    setShowPasswordReset(false);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleCreateAdmin = () => {
    if (newAdminForm.username.trim().length <= 3) {
      setAddAdminError('Username must be longer than 3 characters.');
      return;
    }
    if (!newAdminForm.firstName.trim() || !newAdminForm.lastName.trim() || !newAdminForm.email.trim()) {
      setAddAdminError('All name and email fields are required.');
      return;
    }
    if (newAdminForm.password.length < 6) {
      setAddAdminError('Password must be at least 6 characters.');
      return;
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      setAddAdminError('Passwords do not match.');
      return;
    }

    const nextId = users.length > 0 ? Math.max(...users.map((u) => Number(u.id))) + 1 : 1001;
    const created: ManagedUser = {
      id: nextId,
      username: newAdminForm.username.trim(),
      firstName: newAdminForm.firstName.trim(),
      lastName: newAdminForm.lastName.trim(),
      email: newAdminForm.email.trim(),
      role: 2,
      enabled: true,
    };

    setUsers([...users, created]);
    setShowAddAdminModal(false);
    setNewAdminForm({ username: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    setAddAdminError('');
  };

  // --- REPORTED MESSAGES HANDLERS ---
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const filteredReports = reports.filter((r) => {
    const matchesStatus = reportFilter === 'all' ? true : r.status === reportFilter;
    const q = reportSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.senderUsername.toLowerCase().includes(q) ||
      r.reportedBy.toLowerCase().includes(q) ||
      r.messageContent.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleReportDecision = async (reportId: number | string, decision: 'kept' | 'deleted') => {
    try {
      await api(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: { decision },
      });
    } catch (error) {
      console.warn('Could not resolve the report via API:', error);
      return;
    }

    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: decision } : r)));
    if (inspectingReport?.id === reportId) {
      setInspectingReport(null);
    }
  };

  // --- ADMIN CHAT HANDLER ---
  const handleSendAdminMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: AdminChatMessage = {
      id: Date.now(),
      sender: 'TestUser (You)',
      roleTitle: 'Admin',
      avatarText: 'T',
      color: '#5865F2',
      text: adminChatInput.trim(),
      timestamp: `Today at ${timeStr}`,
    };

    setAdminMessages([...adminMessages, newMsg]);
    setAdminChatInput('');
  };

  const activeAdminsList = users.filter((u) => u.role === 2);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1e1f22',
    border: '1px solid #111214',
    borderRadius: '4px',
    padding: '9px 12px',
    color: '#f2f3f5',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Admin Sub-Navigation Switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #3f4147', paddingBottom: '12px', alignItems: 'center' }}>
        <button
          onClick={() => setAdminSection('users')}
          style={{
            backgroundColor: adminSection === 'users' ? '#5865F2' : '#2b2d31',
            color: adminSection === 'users' ? '#ffffff' : '#b5bac1',
            border: '1px solid #3f4147',
            padding: '10px 18px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>👥 User Management</span>
          <span style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setAdminSection('reports')}
          style={{
            backgroundColor: adminSection === 'reports' ? '#5865F2' : '#2b2d31',
            color: adminSection === 'reports' ? '#ffffff' : '#b5bac1',
            border: '1px solid #3f4147',
            padding: '10px 18px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🚩 Reported Messages</span>
          {pendingReportsCount > 0 && (
            <span style={{ backgroundColor: '#f23f43', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {pendingReportsCount} Pending
            </span>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => void loadAdminData(true)}
            disabled={isRefreshing}
            style={{
              backgroundColor: isRefreshing ? '#3f4147' : '#2b2d31',
              color: '#f2f3f5',
              border: '1px solid #3f4147',
              padding: '10px 14px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
          >
            {isRefreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>

          <button
            onClick={() => setAdminSection('chat')}
            style={{
              backgroundColor: adminSection === 'chat' ? '#5865F2' : '#2b2d31',
              color: adminSection === 'chat' ? '#ffffff' : '#b5bac1',
              border: '1px solid #3f4147',
              padding: '10px 18px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>💬 Admin Chat</span>
            <span style={{ backgroundColor: 'rgba(35, 165, 90, 0.25)', color: '#23a55a', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {activeAdminsList.length} Admins
            </span>
          </button>
        </div>
      </div>

      {refreshMessage && (
        <div
          role="status"
          style={{
            color: refreshMessage.startsWith('User management') ? '#23a55a' : '#f23f43',
            fontSize: '13px',
          }}
        >
          {refreshMessage}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: USER MANAGEMENT                                                */}
      {/* ===================================================================== */}
      {adminSection === 'users' && (
        <>
          {/* Top Action & Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2b2d31', padding: '16px', borderRadius: '8px', border: '1px solid #3f4147' }}>
            <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search (e.g. userID:1001, lastName:Janke, email:test@...)"
                style={{ ...inputStyle, flex: 2, minWidth: '240px' }}
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                style={{ ...inputStyle, flex: 1, minWidth: '150px', cursor: 'pointer' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleToggleAllUsers}
                style={{
                  backgroundColor: allRegularDisabled ? '#23a55a' : '#f23f43',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {allRegularDisabled ? '⚡ Enable All' : '⏻ Disable All'}
              </button>

              <button
                onClick={() => {
                  setAddAdminError('');
                  setShowAddAdminModal(true);
                }}
                style={{
                  backgroundColor: '#5865F2',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                + Add Admin
              </button>
            </div>
          </div>

          {/* Users Table Card */}
          <div style={{ backgroundColor: '#2b2d31', borderRadius: '8px', border: '1px solid #3f4147', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e1f22', color: '#949ba4', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #3f4147' }}>
                    <th style={{ padding: '14px 16px' }}>ID</th>
                    <th style={{ padding: '14px 16px' }}>Name</th>
                    <th style={{ padding: '14px 16px' }}>Username</th>
                    <th style={{ padding: '14px 16px' }}>Email</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#949ba4' }}>
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((user) => {
                      const isAdmin = user.role === 2;
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid #35373c' }}>
                          <td style={{ padding: '12px 16px', color: '#949ba4' }}>{user.id}</td>
                          <td style={{ padding: '12px 16px', color: '#f2f3f5' }}>
                            {user.firstName} {user.lastName}
                            {isAdmin && (
                              <span style={{ marginLeft: '8px', backgroundColor: '#5865F2', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                ADMIN
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#f2f3f5' }}>@{user.username}</td>
                          <td style={{ padding: '12px 16px', color: '#dbdee1' }}>{user.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                backgroundColor: user.enabled ? 'rgba(35, 165, 90, 0.2)' : 'rgba(242, 63, 67, 0.2)',
                                color: user.enabled ? '#23a55a' : '#f23f43',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
                              {user.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => openEditModal(user)}
                              style={{
                                backgroundColor: '#3f4147',
                                color: '#f2f3f5',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginRight: '8px',
                              }}
                            >
                              Edit
                            </button>
                            {!isAdmin ? (
                              <button
                                onClick={() => handleToggleSingleUser(user.id)}
                                style={{
                                  backgroundColor: 'transparent',
                                  color: user.enabled ? '#f23f43' : '#23a55a',
                                  border: `1px solid ${user.enabled ? '#f23f43' : '#23a55a'}`,
                                  padding: '5px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                }}
                              >
                                {user.enabled ? 'Disable' : 'Enable'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#949ba4', padding: '5px 8px' }}>System Admin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: '#232428', fontSize: '13px', color: '#949ba4' }}>
              <span>
                Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    style={{ backgroundColor: '#313338', color: safePage === 1 ? '#5c5e66' : '#f2f3f5', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        backgroundColor: page === safePage ? '#5865F2' : '#313338',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: page === safePage ? 'bold' : 'normal',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    style={{ backgroundColor: '#313338', color: safePage === totalPages ? '#5c5e66' : '#f2f3f5', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: REPORTED MESSAGES MODERATION QUEUE                             */}
      {/* ===================================================================== */}
      {adminSection === 'reports' && (
        <>
          {/* Filter & Search Bar for Reports */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2b2d31', padding: '16px', borderRadius: '8px', border: '1px solid #3f4147' }}>
            <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search reported messages by user, keyword, channel, or reason..."
                style={{ ...inputStyle, flex: 2, minWidth: '240px' }}
              />
              <select
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value as any)}
                style={{ ...inputStyle, flex: 1, minWidth: '170px', cursor: 'pointer' }}
              >
                <option value="pending">Pending Review ({pendingReportsCount})</option>
                <option value="all">All Reports ({reports.length})</option>
                <option value="kept">Kept Messages</option>
                <option value="deleted">Deleted Messages</option>
              </select>
            </div>
          </div>

          {/* Reported Messages List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredReports.length === 0 ? (
              <div style={{ backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#949ba4' }}>
                No reported messages found in this category.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    backgroundColor: '#2b2d31',
                    border: report.status === 'pending' ? '1px solid #f0b232' : '1px solid #3f4147',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Card Top Metadata Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>
                        @{report.senderUsername}
                      </span>
                      <span style={{ fontSize: '12px', color: '#949ba4' }}>
                        in <strong style={{ color: '#dbdee1' }}>{report.location}</strong> • {report.timestamp}
                      </span>
                      <span style={{ backgroundColor: 'rgba(242, 63, 67, 0.18)', color: '#f23f43', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        Reason: {report.reason}
                      </span>
                    </div>

                    <div>
                      {report.status === 'pending' && (
                        <span style={{ backgroundColor: 'rgba(240, 178, 50, 0.2)', color: '#f0b232', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          Pending Review
                        </span>
                      )}
                      {report.status === 'kept' && (
                        <span style={{ backgroundColor: 'rgba(35, 165, 90, 0.2)', color: '#23a55a', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          ✓ Kept (Dismissed)
                        </span>
                      )}
                      {report.status === 'deleted' && (
                        <span style={{ backgroundColor: 'rgba(242, 63, 67, 0.2)', color: '#f23f43', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          ✕ Message Removed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reported Message Quote Box */}
                  <div
                    style={{
                      backgroundColor: '#1e1f22',
                      borderLeft: `4px solid ${report.status === 'deleted' ? '#f23f43' : '#5865F2'}`,
                      padding: '12px 14px',
                      borderRadius: '4px',
                      color: report.status === 'deleted' ? '#949ba4' : '#f2f3f5',
                      fontStyle: report.status === 'deleted' ? 'italic' : 'normal',
                      fontSize: '14px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {report.status === 'deleted' ? '[Message removed by administrator]' : report.messageContent}
                  </div>

                  {/* Card Footer: Reporter Info + Moderation Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#949ba4' }}>
                      Reported by <strong style={{ color: '#dbdee1' }}>@{report.reportedBy}</strong> (Report #{report.id})
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setInspectingReport(report)}
                        style={{
                          backgroundColor: '#3f4147',
                          color: '#f2f3f5',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Review Details
                      </button>

                      <button
                        onClick={() => handleReportDecision(report.id, 'kept')}
                        style={{
                          backgroundColor: report.status === 'kept' ? '#23a55a' : 'transparent',
                          color: report.status === 'kept' ? '#fff' : '#23a55a',
                          border: '1px solid #23a55a',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Keep Message
                      </button>

                      <button
                        onClick={() => handleReportDecision(report.id, 'deleted')}
                        style={{
                          backgroundColor: report.status === 'deleted' ? '#f23f43' : 'transparent',
                          color: report.status === 'deleted' ? '#fff' : '#f23f43',
                          border: '1px solid #f23f43',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Remove Message
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PRIVATE ADMIN CHAT ROOM                                        */}
      {/* ===================================================================== */}
      {adminSection === 'chat' && (
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: '460px' }}>
          
          {/* Main Chat Feed & Input */}
          <div style={{ flex: 1, backgroundColor: '#2b2d31', borderRadius: '8px', border: '1px solid #3f4147', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Channel Banner */}
            <div style={{ padding: '14px 18px', backgroundColor: '#232428', borderBottom: '1px solid #1f2023', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>🔒 #admin-lounge</div>
                <div style={{ fontSize: '12px', color: '#949ba4' }}>Private staff channel visible only to administrators</div>
              </div>
              <span style={{ backgroundColor: 'rgba(242, 63, 67, 0.15)', color: '#f23f43', border: '1px solid rgba(242, 63, 67, 0.35)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Admins Only
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {adminMessages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      backgroundColor: msg.color,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {msg.avatarText}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px' }}>{msg.sender}</span>
                      <span style={{ backgroundColor: '#5865F2', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {msg.roleTitle}
                      </span>
                      <span style={{ fontSize: '11px', color: '#949ba4' }}>{msg.timestamp}</span>
                    </div>
                    <div style={{ color: '#dbdee1', fontSize: '14px', marginTop: '4px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Bar */}
            <form onSubmit={handleSendAdminMessage} style={{ padding: '14px 18px', backgroundColor: '#232428', borderTop: '1px solid #1f2023', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={adminChatInput}
                onChange={(e) => setAdminChatInput(e.target.value)}
                placeholder="Message #admin-lounge..."
                style={{ ...inputStyle, flex: 1, backgroundColor: '#383a40', border: 'none', padding: '11px 14px' }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#5865F2',
                  color: '#fff',
                  border: 'none',
                  padding: '0 18px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </form>
          </div>

          {/* Right-Side Admin Roster Sidebar */}
          <div style={{ width: '220px', backgroundColor: '#2b2d31', borderRadius: '8px', border: '1px solid #3f4147', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', textTransform: 'uppercase' }}>
              Admins — {activeAdminsList.length}
            </div>
            {activeAdminsList.map((admin) => (
              <div key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#f23f43', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                    {admin.username[0].toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: '9px', height: '9px', backgroundColor: '#23a55a', borderRadius: '50%', border: '2px solid #2b2d31' }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f2f3f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    @{admin.username}
                  </div>
                  <div style={{ fontSize: '11px', color: '#949ba4' }}>Administrator</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Inspect Reported Message                                       */}
      {/* ===================================================================== */}
      {inspectingReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 130 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '480px', maxWidth: '92vw', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginTop: 0, marginBottom: '12px' }}>🚩 Review Report #{inspectingReport.id}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#dbdee1', marginBottom: '16px' }}>
              <div><strong>Author:</strong> @{inspectingReport.senderUsername}</div>
              <div><strong>Reported By:</strong> @{inspectingReport.reportedBy}</div>
              <div><strong>Channel / Location:</strong> {inspectingReport.location}</div>
              <div><strong>Timestamp:</strong> {inspectingReport.timestamp}</div>
              <div><strong>Flag Reason:</strong> <span style={{ color: '#f23f43' }}>{inspectingReport.reason}</span></div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', marginBottom: '6px', textTransform: 'uppercase' }}>
              Message Content
            </div>
            <div style={{ backgroundColor: '#1e1f22', padding: '14px', borderRadius: '6px', border: '1px solid #111214', color: '#f2f3f5', fontSize: '14px', marginBottom: '20px', wordBreak: 'break-word' }}>
              {inspectingReport.messageContent}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => setInspectingReport(null)}
                style={{ backgroundColor: 'transparent', color: '#dbdee1', border: 'none', cursor: 'pointer', padding: '8px 12px' }}
              >
                Close
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleReportDecision(inspectingReport.id, 'kept')}
                  style={{ backgroundColor: '#23a55a', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  ✓ Keep Message
                </button>
                <button
                  onClick={() => handleReportDecision(inspectingReport.id, 'deleted')}
                  style={{ backgroundColor: '#f23f43', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  🗑️ Get Rid of Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Edit Managed User & Reset Password                             */}
      {/* ===================================================================== */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginTop: 0, marginBottom: '16px' }}>Edit User (ID: {editingUser.id})</h3>

            {editError && <div style={{ color: '#f23f43', fontSize: '13px', marginBottom: '12px' }}>{editError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>USERNAME</label>
                <input style={inputStyle} value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>FIRST NAME</label>
                  <input style={inputStyle} value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>LAST NAME</label>
                  <input style={inputStyle} value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input style={inputStyle} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>PRIVILEGE LEVEL / ROLE</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: Number(e.target.value) as 1 | 2 })}
                >
                  <option value={1}>Regular User</option>
                  <option value={2}>Admin Privilege</option>
                </select>
              </div>

              {/* Password Controls Divider */}
              <div style={{ borderTop: '1px solid #3f4147', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#b5bac1' }}>Password Controls</span>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(!showPasswordReset)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #f0b232', color: '#f0b232', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {showPasswordReset ? 'Hide Reset' : 'Reset Password'}
                </button>
              </div>

              {passwordBanner && (
                <div style={{ fontSize: '12px', color: passwordBanner.startsWith('Error') ? '#f23f43' : '#23a55a', backgroundColor: '#2b2d31', padding: '8px', borderRadius: '4px' }}>
                  {passwordBanner}
                </div>
              )}

              {showPasswordReset && (
                <div style={{ backgroundColor: '#2b2d31', padding: '12px', borderRadius: '6px', border: '1px solid #3f4147', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>NEW PASSWORD</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type={showNewPassText ? 'text' : 'password'}
                        style={inputStyle}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowNewPassText(!showNewPassText)} style={{ backgroundColor: '#1e1f22', color: '#b5bac1', border: '1px solid #111214', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}>
                        👁
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
                    <input
                      type={showNewPassText ? 'text' : 'password'}
                      style={inputStyle}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmPasswordReset}
                    style={{ backgroundColor: '#f0b232', color: '#111214', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Confirm Password Reset
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditingUser(null)} style={{ backgroundColor: 'transparent', color: '#dbdee1', border: 'none', cursor: 'pointer', padding: '8px 14px' }}>
                Cancel
              </button>
              <button onClick={handleSaveUserEdits} style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Add New Admin                                                  */}
      {/* ===================================================================== */}
      {showAddAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginTop: 0, marginBottom: '16px' }}>🛡️ Add New Admin</h3>

            {addAdminError && <div style={{ color: '#f23f43', fontSize: '13px', marginBottom: '12px' }}>{addAdminError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>USERNAME</label>
                <input style={inputStyle} value={newAdminForm.username} onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>FIRST NAME</label>
                  <input style={inputStyle} value={newAdminForm.firstName} onChange={(e) => setNewAdminForm({ ...newAdminForm, firstName: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>LAST NAME</label>
                  <input style={inputStyle} value={newAdminForm.lastName} onChange={(e) => setNewAdminForm({ ...newAdminForm, lastName: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input style={inputStyle} value={newAdminForm.email} onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type={showAddPassText ? 'text' : 'password'}
                    style={inputStyle}
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  />
                  <button type="button" onClick={() => setShowAddPassText(!showAddPassText)} style={{ backgroundColor: '#1e1f22', color: '#b5bac1', border: '1px solid #111214', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}>
                    👁
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>CONFIRM PASSWORD</label>
                <input
                  type={showAddPassText ? 'text' : 'password'}
                  style={inputStyle}
                  value={newAdminForm.confirmPassword}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowAddAdminModal(false)} style={{ backgroundColor: 'transparent', color: '#dbdee1', border: 'none', cursor: 'pointer', padding: '8px 14px' }}>
                Cancel
              </button>
              <button onClick={handleCreateAdmin} style={{ backgroundColor: '#23a55a', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}