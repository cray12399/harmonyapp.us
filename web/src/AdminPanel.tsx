import { useEffect, useState } from 'react';
import { api, type MessageReport, type UserSummary } from './api';

type Section = 'users' | 'reports';
type UserFilter = 'all' | 'active' | 'disabled' | 'admin';
type ReportFilter = 'all' | 'pending' | 'kept' | 'deleted';

export default function AdminPanel() {
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [userData, reportData] = await Promise.all([
      api<{ users: UserSummary[] }>('/api/admin/users'),
      api<{ reports: MessageReport[] }>('/api/admin/reports'),
    ]);
    setUsers(userData.users);
    setReports(reportData.reports);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ users: UserSummary[] }>('/api/admin/users'),
      api<{ reports: MessageReport[] }>('/api/admin/reports'),
    ])
      .then(([userData, reportData]) => {
        if (!active) return;
        setUsers(userData.users);
        setReports(reportData.reports);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load admin data');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setError('');
    setLoading(true);
    try {
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh admin data');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (user: UserSummary, status: 0 | 1 | 2) => {
    setBusyId(user._id);
    setError('');
    setNotice('');
    try {
      const data = await api<{ user: UserSummary }>('/api/admin/users/' + user._id, {
        method: 'PATCH',
        body: { status },
      });
      setUsers((current) => current.map((item) =>
        item._id === user._id ? data.user : item
      ));
      setNotice('@' + user.username + ' was updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update user');
    } finally {
      setBusyId(null);
    }
  };

  const decideReport = async (report: MessageReport, decision: 'kept' | 'deleted') => {
    if (decision === 'deleted' && !window.confirm('Remove this message for everyone?')) {
      return;
    }
    setBusyId(report._id);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/reports/' + report._id, {
        method: 'PATCH',
        body: { decision },
      });
      const data = await api<{ reports: MessageReport[] }>('/api/admin/reports');
      setReports(data.reports);
      setNotice(decision === 'deleted' ? 'Message removed.' : 'Report closed; message kept.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review report');
    } finally {
      setBusyId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleUsers = users.filter((user) => {
    const matchesSearch =
      !query ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user._id.toLowerCase().includes(query);
    const matchesStatus =
      userFilter === 'all' ||
      (userFilter === 'active' && user.status === 1) ||
      (userFilter === 'disabled' && user.status === 0) ||
      (userFilter === 'admin' && user.status === 2);
    return matchesSearch && matchesStatus;
  });
  const visibleReports = reports.filter((report) => {
    const matchesStatus = reportFilter === 'all' || report.status === reportFilter;
    const haystack = [
      report.message?.content,
      report.message?.sender?.username,
      report.message?.conversation?.name,
      report.reportedBy?.username,
      report.reason,
    ].join(' ').toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
  const pendingCount = reports.filter((report) => report.status === 'pending').length;

  return (
    <div className="h-admin">
      {error && <div className="h-alert h-error" role="alert">{error}</div>}
      {notice && <div className="h-alert h-notice" role="status">{notice}</div>}

      <div className="h-tabs">
        <button className={section === 'users' ? 'h-active' : ''} onClick={() => setSection('users')}>
          👥 User Management ({users.length})
        </button>
        <button className={section === 'reports' ? 'h-active' : ''} onClick={() => setSection('reports')}>
          🚩 Reported Messages {pendingCount > 0 && '(' + pendingCount + ' Pending)'}
        </button>
        <button className="h-refresh" onClick={refresh} disabled={loading}>Refresh</button>
      </div>

      <div className="h-admin-filters">
        <input
          aria-label="Search admin data"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={section === 'users' ? 'Search username, email, or ID' : 'Search reports'}
        />
        {section === 'users' ? (
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value as UserFilter)}>
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="admin">Admins</option>
          </select>
        ) : (
          <select value={reportFilter} onChange={(event) => setReportFilter(event.target.value as ReportFilter)}>
            <option value="pending">Pending</option>
            <option value="all">All reports</option>
            <option value="kept">Kept</option>
            <option value="deleted">Removed</option>
          </select>
        )}
      </div>

      {loading && <p className="h-muted">Loading admin data…</p>}
      {!loading && section === 'users' && (
        <div className="h-table-wrap">
          <table className="h-table">
            <thead><tr>
              <th>ID</th><th>Username</th><th>Email</th><th>Verified</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user._id}>
                  <td className="h-muted">{user._id.slice(-6)}</td>
                  <td>@{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.isVerified ? 'Yes' : 'No'}</td>
                  <td>
                    <span className={'h-status h-status-' + user.status}>
                      {user.status === 2 ? 'Admin' : user.status === 1 ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    {user.status === 2 ? (
                      <span className="h-muted">Protected admin</span>
                    ) : (
                      <div className="h-row-actions">
                        <button
                          disabled={busyId === user._id}
                          onClick={() => changeStatus(user, user.status === 0 ? 1 : 0)}
                        >
                          {user.status === 0 ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          disabled={busyId === user._id}
                          onClick={() => changeStatus(user, 2)}
                        >
                          Promote
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleUsers.length === 0 && <p className="h-muted">No users match this filter.</p>}
        </div>
      )}

      {!loading && section === 'reports' && (
        <div className="h-report-list">
          {visibleReports.length === 0 && <p className="h-muted">No reports match this filter.</p>}
          {visibleReports.map((report) => (
            <article className="h-report" key={report._id}>
              <div className="h-report-head">
                <strong>{report.message?.sender?.username
                  ? '@' + report.message.sender.username
                  : 'Unknown sender'}</strong>
                <span>{report.status}</span>
              </div>
              <p className="h-muted">
                Reported by @{report.reportedBy?.username || 'unknown'} ·
                {' '}{report.message?.conversation?.name || 'Direct message'} ·
                {' '}{new Date(report.createdAt).toLocaleString()}
              </p>
              <p><strong>Reason:</strong> {report.reason}</p>
              <blockquote>{report.message?.isRemoved
                ? 'Message removed by an admin'
                : report.message?.content || 'Message unavailable'}</blockquote>
              {report.status === 'pending' && (
                <div className="h-row-actions">
                  <button disabled={busyId === report._id} onClick={() => decideReport(report, 'kept')}>
                    Keep message
                  </button>
                  <button
                    className="h-danger"
                    disabled={busyId === report._id}
                    onClick={() => decideReport(report, 'deleted')}
                  >
                    Remove message
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
