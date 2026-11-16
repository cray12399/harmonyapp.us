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
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true);
  const [dmSearch, setDmSearch] = useState('');
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
  const filteredDirectMessages = directMessages.filter((conversation) =>
    (conversation.members.find((member) => member && member._id !== account?._id)?.username || '')
      .toLowerCase().includes(dmSearch.toLowerCase())
  );

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

  const startDirectMessageFor = async (userId: string) => {
    if (!userId) return;
    setError('');
    setBusy(true);
    try {
      const data = await api<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: { type: 0, memberIds: [userId] },
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

  const startDirectMessage = () => { void startDirectMessageFor(dmUserId); };

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
      <aside className={'h-servers' + (leftSidebarExpanded ? '' : ' h-collapsed')}>
        <button className="h-collapse" onClick={() => setLeftSidebarExpanded(!leftSidebarExpanded)}>
          {leftSidebarExpanded ? '◄ Collapse' : '►'}
        </button>
        <button
          className={'h-server-home' + (!selected && view === 'chat' ? ' h-active' : '')}
          onClick={() => {
            setSelectedId(null);
            sessionStorage.removeItem('selectedConversationId');
            setView('chat');
          }}
        >
          <span className="h-server-icon">H</span>
          {leftSidebarExpanded && <strong>Home</strong>}
        </button>
        <div className="h-server-separator" />
        {groups.map((conversation) => (
          <button
            className={'h-server-group' + (selectedId === conversation._id && view === 'chat' ? ' h-active' : '')}
            key={conversation._id}
            onClick={() => selectConversation(conversation)}
            title={conversationName(conversation)}
          >
            <span className="h-server-icon">{conversationName(conversation)[0].toUpperCase()}</span>
            {leftSidebarExpanded && <span>{conversationName(conversation)}</span>}
          </button>
        ))}
        {groups.length === 0 && leftSidebarExpanded && <p className="h-muted">No groups yet.</p>}
        <div className="h-server-separator" />
        <button className="h-server-group h-new-group" onClick={() => { setError(''); setShowGroupForm(true); }}>
          <span className="h-server-icon">+</span>
          {leftSidebarExpanded && <span>New Group</span>}
        </button>
      </aside>

      <aside className="h-sidebar">
        <div className="h-nav-top">
          {selected?.type === 1 && view === 'chat'
            ? <strong>{conversationName(selected)}</strong>
            : <input
                aria-label="Search direct messages"
                value={dmSearch}
                onChange={(event) => setDmSearch(event.target.value)}
                placeholder="Search through your conversations..."
              />}
        </div>
        <div className="h-sidebar-scroll">
          {selected?.type === 1 && view === 'chat' ? (
            <>
              <div className="h-sidebar-heading">Text Channels</div>
              <div className="h-nav-item h-active">💬 general</div>
            </>
          ) : (
            <>
              <button
                className={'h-nav-item h-friends-link' + (!selected && view === 'chat' ? ' h-active' : '')}
                onClick={() => {
                  setSelectedId(null);
                  sessionStorage.removeItem('selectedConversationId');
                  setView('chat');
                }}
              >
                👥 People
              </button>
              {account?.status === 2 && (
                <button
                  className={'h-nav-item h-admin-link' + (view === 'admin' ? ' h-active' : '')}
                  onClick={() => setView('admin')}
                >
                  🛡️ Admin Panel
                </button>
              )}
              <div className="h-sidebar-heading">Direct Messages</div>
              {filteredDirectMessages.map((conversation) => (
                <button
                  className={'h-nav-item h-dm-item' + (selectedId === conversation._id && view === 'chat' ? ' h-active' : '')}
                  key={conversation._id}
                  onClick={() => selectConversation(conversation)}
                >
                  <span className="h-small-avatar">{conversationName(conversation)[0].toUpperCase()}</span>
                  {conversationName(conversation)}
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
            </>
          )}
        </div>
        <div className="h-profile">
          <span className="h-small-avatar">{account?.username?.[0].toUpperCase() || '?'}</span>
          <div><strong>@{account?.username}</strong><small>Online</small></div>
        </div>
      </aside>

      <main className="h-main">
        <header className="h-header">
          <div className="h-header-title">
            <strong>
              {view === 'admin'
                ? '🛡️ Admin Dashboard'
                : selected?.type === 1
                  ? '💬 #general'
                  : selected
                    ? '💬 @' + conversationName(selected)
                    : '👥 People'}
            </strong>
            {view === 'admin' && <span className="h-admin-badge">Admin Mode</span>}
          </div>
          <button onClick={logOut}>Log Out</button>
        </header>
        {error && <div className="h-alert h-error" role="alert">{error}</div>}
        {notice && <div className="h-alert h-notice" role="status">{notice}</div>}
        {view === 'admin' && account?.status === 2 ? (
          <AdminPanel />
        ) : selected ? (
          <>
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
          <div className="h-people">
            <h3>People — {eligibleUsers.length}</h3>
            {eligibleUsers.map((user) => (
              <div className="h-person" key={user._id}>
                <span className="h-small-avatar">{user.username[0].toUpperCase()}</span>
                <strong>@{user.username}</strong>
                <button onClick={() => { setDmUserId(user._id); void startDirectMessageFor(user._id); }}>
                  💬 Message
                </button>
              </div>
            ))}
            {eligibleUsers.length === 0 && <p className="h-muted">No other users are available yet.</p>}
          </div>
        )}
      </main>

      <aside className={'h-members' + (rightSidebarExpanded ? '' : ' h-collapsed')}>
        <div className="h-members-heading">
          {rightSidebarExpanded && <h3>{selected?.type === 1 ? 'Members' : 'People'}</h3>}
          <button onClick={() => setRightSidebarExpanded(!rightSidebarExpanded)}>
            {rightSidebarExpanded ? '►' : '◄'}
          </button>
        </div>
        {(selected?.members.filter((member) => member !== null) ?? eligibleUsers).map((member) => (
          <div className="h-member" key={member._id} title={member.username}>
            <span className="h-small-avatar">{member.username[0].toUpperCase()}</span>
            {rightSidebarExpanded && <span>@{member.username}</span>}
          </div>
        ))}
      </aside>

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
