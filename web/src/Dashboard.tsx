import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import { api, ApiError, type Account, type ChatMessage, type Conversation } from './api';
import './Dashboard.css';

type EligibleUser = Pick<Account, '_id' | 'username'>;

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export default function Dashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    sessionStorage.getItem('selectedConversationId')
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [view, setView] = useState<'chat' | 'admin'>('chat');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [busy, setBusy] = useState(false);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [dmUserId, setDmUserId] = useState('');
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('');

  const selected = conversations.find((conversation) => conversation._id === selectedId);
  const groups = conversations.filter((conversation) => conversation.type === 1);
  const directMessages = conversations.filter((conversation) => conversation.type === 0);

  const conversationName = (conversation: Conversation) => {
    if (conversation.type === 1) return conversation.name || 'Unnamed group';
    return conversation.members.find((member) => member && member._id !== account?._id)?.username || 'Direct message';
  };

  const handleError = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
      return;
    }
    setError(errorText(cause));
  };

  const reloadConversations = async () => {
    const data = await api<{ conversations: Conversation[] }>('/api/conversations');
    setConversations(data.conversations);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!localStorage.getItem('token')) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const me = await api<{ user: Account }>('/api/auth/me');
        const [conversationData, userData] = await Promise.all([
          api<{ conversations: Conversation[] }>('/api/conversations'),
          api<{ users: EligibleUser[] }>('/api/conversations/eligible-users'),
        ]);
        if (!active) return;
        setAccount(me.user);
        localStorage.setItem('user', JSON.stringify(me.user));
        setConversations(conversationData.conversations);
        if (selectedId && !conversationData.conversations.some((item) => item._id === selectedId)) {
          setSelectedId(null);
          sessionStorage.removeItem('selectedConversationId');
        }
        setEligibleUsers(userData.users);
      } catch (cause) {
        if (active) handleError(cause);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
    // This initial load runs when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (!selectedId || view !== 'chat') return;
    let active = true;
    setMessagesLoading(true);
    setMessages([]);
    api<{ messages: ChatMessage[] }>('/api/conversations/' + selectedId + '/messages')
      .then((data) => { if (active) setMessages(data.messages); })
      .catch((cause) => { if (active) handleError(cause); })
      .finally(() => { if (active) setMessagesLoading(false); });
    return () => { active = false; };
    // Reload after selecting a conversation or returning from moderation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, view]);

  const selectConversation = (conversation: Conversation) => {
    setError('');
    setNotice('');
    setSelectedId(conversation._id);
    sessionStorage.setItem('selectedConversationId', conversation._id);
    setView('chat');
  };

  const toggleMember = (id: string) => {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((member) => member !== id) : [...current, id]
    );
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (memberIds.length < 2 || memberIds.length > 9) {
      setError('Choose 2–9 other members for a group.');
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: { type: 1, name: groupName.trim(), memberIds },
      });
      await reloadConversations();
      setShowGroupForm(false);
      setGroupName('');
      setMemberIds([]);
      selectConversation(data.conversation);
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  };

  const startDirectMessage = async () => {
    if (!dmUserId) return;
    setError('');
    setBusy(true);
    try {
      const data = await api<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: { type: 0, memberIds: [dmUserId] },
      });
      await reloadConversations();
      setDmUserId('');
      selectConversation(data.conversation);
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !messageInput.trim()) return;
    setError('');
    setBusy(true);
    try {
      const data = await api<{ message: ChatMessage }>(
        '/api/conversations/' + selectedId + '/messages',
        { method: 'POST', body: { content: messageInput.trim() } },
      );
      setMessages((current) => [...current, data.message]);
      setMessageInput('');
      await reloadConversations();
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reportTarget) return;
    setError('');
    setBusy(true);
    try {
      await api(
        '/api/conversations/' + selectedId + '/messages/' + reportTarget._id + '/reports',
        { method: 'POST', body: { reason: reportReason.trim() } },
      );
      setReportTarget(null);
      setReportReason('');
      setNotice('The message was reported to the admins.');
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  };

  const removeMessage = async (message: ChatMessage) => {
    if (!window.confirm('Remove this message for everyone?')) return;
    setError('');
    setBusy(true);
    try {
      await api('/api/admin/messages/' + message._id, { method: 'DELETE' });
      setMessages((current) => current.map((item) =>
        item._id === message._id
          ? { ...item, content: 'Message removed by an admin', isRemoved: true }
          : item
      ));
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  };

  const logOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('selectedConversationId');
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <main className="h-loading">Loading your conversations…</main>;
  }

  return (
    <div className="h-shell">
      <aside className="h-sidebar">
        <div className="h-brand">Harmony</div>
        <div className="h-sidebar-heading">Groups</div>
        {groups.map((conversation) => (
          <button
            className={'h-nav-item' + (selectedId === conversation._id && view === 'chat' ? ' h-active' : '')}
            key={conversation._id}
            onClick={() => selectConversation(conversation)}
          >
            # {conversationName(conversation)}
          </button>
        ))}
        {groups.length === 0 && <p className="h-muted">No groups yet.</p>}
        <button className="h-button h-create" onClick={() => { setError(''); setShowGroupForm(true); }}>
          + Create group
        </button>

        <div className="h-sidebar-heading">Direct messages</div>
        {directMessages.map((conversation) => (
          <button
            className={'h-nav-item' + (selectedId === conversation._id && view === 'chat' ? ' h-active' : '')}
            key={conversation._id}
            onClick={() => selectConversation(conversation)}
          >
            @ {conversationName(conversation)}
          </button>
        ))}
        <div className="h-dm-create">
          <select value={dmUserId} onChange={(event) => setDmUserId(event.target.value)}>
            <option value="">Choose a user</option>
            {eligibleUsers.map((user) => (
              <option key={user._id} value={user._id}>{user.username}</option>
            ))}
          </select>
          <button className="h-button" disabled={!dmUserId || busy} onClick={startDirectMessage}>
            Start DM
          </button>
        </div>

        {account?.status === 2 && (
          <button
            className={'h-nav-item h-admin-link' + (view === 'admin' ? ' h-active' : '')}
            onClick={() => setView('admin')}
          >
            🛡 Admin panel
          </button>
        )}
        <div className="h-profile">
          <strong>@{account?.username}</strong>
          <button onClick={logOut}>Log out</button>
        </div>
      </aside>

      <main className="h-main">
        {error && <div className="h-alert h-error" role="alert">{error}</div>}
        {notice && <div className="h-alert h-notice" role="status">{notice}</div>}
        {view === 'admin' && account?.status === 2 ? (
          <AdminPanel />
        ) : selected ? (
          <>
            <header className="h-header">
              <div>
                <strong>{selected.type === 1 ? '# ' : '@ '}{conversationName(selected)}</strong>
                <span>{selected.members.length} members</span>
              </div>
            </header>
            <div className="h-messages">
              {messagesLoading && <p className="h-muted">Loading messages…</p>}
              {!messagesLoading && messages.length === 0 && (
                <p className="h-muted">This is the beginning of your conversation.</p>
              )}
              {messages.map((message) => (
                <article className="h-message" key={message._id}>
                  <div className="h-avatar">{(message.senderUsername || '?')[0].toUpperCase()}</div>
                  <div className="h-message-body">
                    <div className="h-message-head">
                      <strong>{message.senderUsername || 'Unknown user'}</strong>
                      <time>{new Date(message.createdAt).toLocaleString()}</time>
                    </div>
                    <p className={message.isRemoved ? 'h-removed' : ''}>{message.content}</p>
                    {!message.isRemoved && (
                      <div className="h-message-actions">
                        <button onClick={() => { setError(''); setReportTarget(message); setReportReason(''); }}>
                          Report
                        </button>
                        {account?.status === 2 && (
                          <button disabled={busy} onClick={() => removeMessage(message)}>Remove</button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <form className="h-compose" onSubmit={sendMessage}>
              <input
                aria-label="Message"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                maxLength={2000}
                placeholder={'Message ' + conversationName(selected)}
              />
              <button className="h-button" disabled={!messageInput.trim() || busy}>Send</button>
            </form>
          </>
        ) : (
          <div className="h-empty">
            <h1>Welcome to Harmony</h1>
            <p>Select a conversation or create a group to get started.</p>
          </div>
        )}
      </main>

      {view === 'chat' && selected && (
        <aside className="h-members">
          <h3>Members</h3>
          {selected.members.filter((member) => member !== null).map((member) => (
            <div key={member._id}>@{member.username}</div>
          ))}
        </aside>
      )}

      {showGroupForm && (
        <div className="h-overlay" role="dialog" aria-modal="true" aria-label="Create group">
          <form className="h-modal" onSubmit={createGroup}>
            <h2>Create a group</h2>
            {error && <div className="h-alert h-error" role="alert">{error}</div>}
            <label>
              Group name
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <p>Choose 2–9 other members.</p>
            <div className="h-user-options">
              {eligibleUsers.map((user) => (
                <label key={user._id}>
                  <input
                    type="checkbox"
                    checked={memberIds.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  @{user.username}
                </label>
              ))}
              {eligibleUsers.length < 2 && <p>At least two other active users are needed.</p>}
            </div>
            <div className="h-modal-actions">
              <button type="button" onClick={() => setShowGroupForm(false)}>Cancel</button>
              <button className="h-button" disabled={busy || memberIds.length < 2 || memberIds.length > 9}>
                Create group
              </button>
            </div>
          </form>
        </div>
      )}

      {reportTarget && (
        <div className="h-overlay" role="dialog" aria-modal="true" aria-label="Report message">
          <form className="h-modal" onSubmit={submitReport}>
            <h2>Report message</h2>
            {error && <div className="h-alert h-error" role="alert">{error}</div>}
            <p>Tell the admins why this message needs review.</p>
            <textarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              maxLength={500}
              required
            />
            <div className="h-modal-actions">
              <button type="button" onClick={() => setReportTarget(null)}>Cancel</button>
              <button className="h-button" disabled={busy || !reportReason.trim()}>Send report</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
