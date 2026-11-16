import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import { api } from './api';

// TypeScript Interfaces for strict type safety
interface Message {
  _id?: string;
  sender: string;
  text?: string;
  content?: string;
  isRemoved?: boolean;
  createdAt?: string;
}

interface GroupChat {
  id: number;
  _id?: string;
  name: string;
  avatarText: string;
  color: string;
  channels: string[];
  messages: Record<string, Message[]>;
}

interface EligibleGroupMember {
  _id: string;
  username: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'requests'>('online');
  
  // Admin Mode State dynamically set based on user status (status 2 = admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        if (user.status === 2) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Failed to parse user session', err);
        setCurrentUser(null);
        setIsAdmin(false);
      }
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
    }
  }, []);

  // Navigation State (supports 'admin' view mode)
  const [currentView, setCurrentView] = useState<{ type: 'friends' | 'dm' | 'group' | 'admin'; data?: any; channel?: string }>({ type: 'friends' });

  // Sidebar Collapse States
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true);

  // Modals state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendRequestSubmitting, setFriendRequestSubmitting] = useState(false);
  const [friendRequestMessage, setFriendRequestMessage] = useState('');
  const [friendActionMessage, setFriendActionMessage] = useState('');
  const [friendActionHasError, setFriendActionHasError] = useState(false);
  const [friendActionLoadingId, setFriendActionLoadingId] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [viewProfileUser, setViewProfileUser] = useState<any | null>(null);
  const [activeMenuFriendId, setActiveMenuFriendId] = useState<number | null>(null);

  // Settings Field Privacy Toggles
  const [showEmail, setShowEmail] = useState(false);

  // Search & Inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const [eligibleGroupMembers, setEligibleGroupMembers] = useState<EligibleGroupMember[]>([]);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupCreating, setGroupCreating] = useState(false);
  const [groupCreateError, setGroupCreateError] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Password edit state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileEditField, setProfileEditField] = useState<null | 'nickname' | 'username'>(null);
  const [profileDraft, setProfileDraft] = useState({ nickname: '', username: '' });
  const [profileMessage, setProfileMessage] = useState('');

  const renderPasswordEye = (isOpen: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      {isOpen ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      )}
    </svg>
  );

  const fallbackFriends = [
    { id: 1, name: 'TestUser', status: 'Online', avatarText: 'T', avatarUrl: '', color: '#5865F2', isBlocked: false, mutualFriends: ['SecondUser'], mutualGroups: ['Dev Team'], messages: [{ sender: 'TestUser', text: 'Hey there!' }] },
    { id: 2, name: 'SecondUser', status: 'Online', avatarText: 'S', avatarUrl: '', color: '#b6a544', isBlocked: false, mutualFriends: ['TestUser', 'TheHulk'], mutualGroups: ['Dev Team', 'Project Alpha'], messages: [{ sender: 'SecondUser', text: 'Working on the MERN project!' }] },
    { id: 3, name: 'TheHulk', status: 'Online', avatarText: 'H', avatarUrl: '', color: '#23a55a', isBlocked: false, mutualFriends: ['SecondUser'], mutualGroups: ['Project Alpha'], messages: [] },
  ];

  const fallbackGroupChats: GroupChat[] = [
    { 
      id: 1, 
      name: 'Dev Team', 
      avatarText: 'D', 
      color: '#5865F2', 
      channels: ['general', 'announcements', 'homework-help'],
      messages: { 
        general: [{ sender: 'Dev Team', text: 'Welcome to Dev Team general!' }],
        announcements: [{ sender: 'Dev Team', text: 'Project due Nov 13!' }],
        'homework-help': [] 
      } 
    },
    { 
      id: 2, 
      name: 'Project Alpha', 
      avatarText: 'P', 
      color: '#23a55a', 
      channels: ['main-chat', 'resources'],
      messages: { 
        'main-chat': [{ sender: 'Project Alpha', text: 'Meeting scheduled for tomorrow.' }],
        resources: [] 
      } 
    },
  ];

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [reportTarget, setReportTarget] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const [friends, setFriends] = useState<any[]>([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<any[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);

  const normalizeFriend = (friend: any) => ({
    friendshipId: friend.friendshipId ?? friend._id ?? null,
    id: friend.user?._id ?? friend._id ?? friend.id ?? Date.now(),
    name: friend.user?.username ?? friend.username ?? friend.name ?? 'Unknown User',
    status: 'Online',
    avatarText: (friend.user?.username ?? friend.username ?? 'U').charAt(0).toUpperCase(),
    avatarUrl: friend.user?.avatar ?? '',
    color: '#5865F2',
    isBlocked: false,
    mutualFriends: [],
    mutualGroups: [],
    messages: [],
  });

  const applyFriendData = (friendPayload: any) => {
    setFriends((friendPayload?.friends ?? []).map(normalizeFriend));
    setIncomingFriendRequests((friendPayload?.pending?.incoming ?? []).map(normalizeFriend));
    setOutgoingFriendRequests((friendPayload?.pending?.outgoing ?? []).map(normalizeFriend));
  };

  const refreshFriendData = async () => {
    const friendPayload = await api<any>('/api/friends');
    applyFriendData(friendPayload);
  };

  const normalizeConversation = (conversation: any): GroupChat => ({
    id: conversation._id,
    name: conversation.name || 'Group Chat',
    avatarText: (conversation.name || 'G').charAt(0).toUpperCase(),
    color: '#5865F2',
    channels: ['general'],
    messages: {
      general: [],
    },
  });

  const loadConversationMessages = async (conversationId: string) => {
    if (!conversationId) return;

    try {
      const payload = await api<any>(`/api/conversations/${conversationId}/messages`);
      const mapped = (payload.messages || []).map((message: any) => ({
        _id: message._id,
        sender: message.senderUsername || 'Unknown',
        text: message.content || '',
        content: message.content || '',
        isRemoved: message.isRemoved === true,
        createdAt: message.createdAt,
      }));
      setLiveMessages(mapped);
    } catch (error) {
      console.warn('Failed to load conversation messages:', error);
      setLiveMessages([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [profile, friendPayload, conversationPayload] = await Promise.all([
        api<any>('/api/auth/me'),
        api<any>('/api/friends'),
        api<any>('/api/conversations'),
      ]);

      if (profile?.user) {
        setCurrentUser(profile.user);
        setProfileDraft({
          nickname: profile.user.nickname ?? profile.user.username ?? '',
          username: profile.user.username ?? '',
        });
        localStorage.setItem('user', JSON.stringify(profile.user));
      }

      if (profile?.user?.status === 2) {
        setIsAdmin(true);
      }

      applyFriendData(friendPayload);

      const groupConversations = (conversationPayload?.conversations ?? []).filter(
        (conversation: any) => conversation.type === 1
      );
      setGroupChats(groupConversations.map(normalizeConversation));
    } catch (error) {
      console.warn('Using local dashboard fallback data because the backend is unavailable:', error);
      setFriends(fallbackFriends);
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);
      setGroupChats(fallbackGroupChats);
    }
  };

  const handleFriendshipAction = async (
    request: any,
    action: 'accept' | 'remove',
    successMessage: string,
  ) => {
    const friendshipId = request?.friendshipId;
    if (!friendshipId) {
      setFriendActionMessage('This request is missing its friendship ID. Refresh and try again.');
      setFriendActionHasError(true);
      return;
    }

    setFriendActionLoadingId(String(friendshipId));
    setFriendActionMessage('');
    setFriendActionHasError(false);
    try {
      if (action === 'accept') {
        await api(`/api/friends/requests/${friendshipId}/accept`, { method: 'PATCH' });
      } else {
        await api(`/api/friends/${friendshipId}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.warn('Could not update friend relationship:', error);
      setFriendActionMessage(error instanceof Error ? error.message : 'Could not update this friend relationship.');
      setFriendActionHasError(true);
      setFriendActionLoadingId(null);
      return;
    }

    setFriendActionMessage(successMessage);
    setFriendActionHasError(false);
    try {
      await refreshFriendData();
    } catch (error) {
      console.warn('Friend relationship updated, but refreshing the list failed:', error);
      setFriendActionMessage(`${successMessage} The list could not be refreshed.`);
      setFriendActionHasError(true);
    } finally {
      setFriendActionLoadingId(null);
    }
  };

  const openCreateGroupModal = async () => {
    setShowCreateGroupModal(true);
    setGroupMembersLoading(true);
    setGroupCreateError('');
    setSelectedGroupMemberIds([]);

    try {
      const payload = await api<{ users: EligibleGroupMember[] }>('/api/conversations/eligible-users');
      setEligibleGroupMembers(payload.users);
    } catch (error) {
      console.warn('Could not load eligible group members:', error);
      setEligibleGroupMembers([]);
      setGroupCreateError(error instanceof Error ? error.message : 'Could not load users for the group.');
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupInput.trim();
    if (!name) {
      setGroupCreateError('Enter a group name.');
      return;
    }
    if (selectedGroupMemberIds.length < 2 || selectedGroupMemberIds.length > 9) {
      setGroupCreateError('Select 2–9 other members to create a group.');
      return;
    }

    setGroupCreating(true);
    setGroupCreateError('');
    try {
      const payload = await api<any>('/api/conversations', {
        method: 'POST',
        body: {
          type: 1,
          name,
          memberIds: selectedGroupMemberIds,
        },
      });

      if (!payload.conversation?._id) {
        throw new Error('The server did not return the created group.');
      }

      const createdGroup: GroupChat = {
        id: payload.conversation._id,
        name: payload.conversation.name || name,
        avatarText: (payload.conversation.name || name)[0]?.toUpperCase() || 'G',
        color: '#23a55a',
        channels: ['general'],
        messages: { general: [] },
      };

      setGroupChats((prev) => [createdGroup, ...prev]);
      setGroupInput('');
      setSelectedGroupMemberIds([]);
      setShowCreateGroupModal(false);
      setCurrentView({ type: 'group', data: createdGroup, channel: 'general' });
    } catch (error) {
      console.warn('Could not create group via API:', error);
      setGroupCreateError(error instanceof Error ? error.message : 'Could not create the group. Please try again.');
    } finally {
      setGroupCreating(false);
    }
  };

  const saveProfileField = async (field: 'nickname' | 'username') => {
    const value = (profileDraft[field] ?? '').trim();

    if (field === 'username' && (value.length < 3 || value.length > 32 || !/^[a-zA-Z0-9_]+$/.test(value))) {
      setProfileMessage('Username must be 3-32 characters using letters, numbers, or underscores.');
      return;
    }

    if (field === 'nickname' && (value.length < 1 || value.length > 32)) {
      setProfileMessage('Nickname must be 1-32 characters.');
      return;
    }

    try {
      const response = await api<any>('/api/auth/me', {
        method: 'PATCH',
        body: { [field]: value },
      });

      const nextUser = response.user ?? { ...currentUser, [field]: value };
      setCurrentUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setProfileDraft({
        nickname: nextUser.nickname ?? nextUser.username ?? '',
        username: nextUser.username ?? '',
      });
      setProfileEditField(null);
      setProfileMessage(`${field === 'username' ? 'Username' : 'Nickname'} updated successfully.`);
    } catch (error: any) {
      const message = error?.message || 'Could not update your profile right now.';
      setProfileMessage(message);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Helper renderer for avatars
  const renderAvatar = (item: { avatarUrl?: string; avatarText: string; color: string }, size: number = 32) => {
    if (item.avatarUrl) {
      return (
        <img 
          src={item.avatarUrl} 
          alt="Avatar" 
          style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover' }} 
        />
      );
    }
    return (
      <div style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        backgroundColor: item.color, 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white', 
        fontWeight: 'bold',
        fontSize: `${size * 0.45}px`
      }}>
        {item.avatarText}
      </div>
    );
  };

  const userDisplayName = currentUser?.nickname || currentUser?.username || 'User';
  const userAvatarLetter = (currentUser?.nickname || currentUser?.username || 'U').charAt(0).toUpperCase();
  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const pendingFriendRequestsCount = incomingFriendRequests.length + outgoingFriendRequests.length;

  const isMessageFromCurrentUser = (message: any) => {
    const senderName = String(message?.sender || '').toLowerCase();
    const currentUserName = String(currentUser?.username || '').toLowerCase();
    const currentNick = String(currentUser?.nickname || '').toLowerCase();
    return senderName === currentUserName || senderName === currentNick;
  };

  const handleReportMessage = async () => {
    if (!reportTarget || !reportReason.trim()) return;

    try {
      const conversationId = currentView.data?._id || currentView.data?.id;
      await api(`/api/conversations/${conversationId}/messages/${reportTarget._id}/reports`, {
        method: 'POST',
        body: { reason: reportReason.trim() },
      });
      setReportTarget(null);
      setReportReason('');
      setReportNotice('Report sent successfully.');
    } catch (error) {
      console.warn('Could not report message via API:', error);
      setReportNotice('This report could not be sent right now.');
    }
  };

  const handleRemoveMessage = async (message: any) => {
    if (!message?._id) return;

    if (!isAdmin) {
      setReportNotice('Removing your own messages is not supported by the current backend API.');
      return;
    }

    try {
      await api(`/api/admin/messages/${message._id}`, { method: 'DELETE' });
      setLiveMessages((prev) => prev.map((item) => item._id === message._id ? { ...item, isRemoved: true, text: 'Message removed by an admin', content: 'Message removed by an admin' } : item));
      setReportNotice('Message removed by admin.');
    } catch (error) {
      console.warn('Could not remove message via API:', error);
      setReportNotice('This message could not be removed right now.');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      setPasswordMessage('Error: Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('Error: Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Error: New passwords do not match.');
      return;
    }

    setPasswordChanging(true);
    setPasswordMessage('');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: oldPassword, newPassword },
      });
      setPasswordMessage('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.warn('Could not change password:', error);
      setPasswordMessage(`Error: ${error instanceof Error ? error.message : 'Could not change password.'}`);
    } finally {
      setPasswordChanging(false);
    }
  };

  // Send message handler integrated with local fallback state (API commented out)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    const conversationId = currentView.data?._id;
    if (conversationId && (currentView.type === 'dm' || currentView.type === 'group')) {
      try {
        const payload = await api<any>(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: { content: trimmedMessage },
        });

        if (payload.message) {
          setLiveMessages((prev) => [
            ...prev,
            {
              _id: payload.message._id,
              sender: payload.message.senderUsername || 'You',
              text: payload.message.content || trimmedMessage,
              content: payload.message.content || trimmedMessage,
              createdAt: payload.message.createdAt,
            },
          ]);
          setMessageInput('');
          return;
        }
      } catch (err) {
        console.warn('API send error, falling back to local state:', err);
      }
    }

    // Fallback local UI state update
    if (currentView.type === 'dm') {
      const updatedFriends = friends.map(f => {
        if (f.id === currentView.data.id) {
          return { ...f, messages: [...f.messages, { sender: 'You', text: messageInput }] };
        }
        return f;
      });
      setFriends(updatedFriends);
      setCurrentView({ ...currentView, data: updatedFriends.find(f => f.id === currentView.data.id) });
    } else if (currentView.type === 'group') {
      const activeChannel = currentView.channel || currentView.data.channels[0];
      const updatedGroups = groupChats.map(g => {
        if (g.id === currentView.data.id) {
          const currentChannelMessages = g.messages[activeChannel] || [];
          return { 
            ...g, 
            messages: { 
              ...g.messages, 
              [activeChannel]: [...currentChannelMessages, { sender: 'You', text: messageInput }] 
            } 
          };
        }
        return g;
      });
      setGroupChats(updatedGroups);
      const freshGroup = updatedGroups.find(g => g.id === currentView.data.id);
      setCurrentView({ ...currentView, data: freshGroup });
    }
    setMessageInput('');
  };

  return (
    <div style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#313338', 
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif', 
      color: '#dbdee1', 
      overflow: 'hidden',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0
    }}>
      
      {/* 1. Far Left Collapsible Server & Group Chats Column */}
      <div style={{ width: leftSidebarExpanded ? '180px' : '72px', backgroundColor: '#1e1f22', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', gap: '8px', flexShrink: 0, overflowY: 'auto', transition: 'width 0.2s', boxSizing: 'border-box' }}>
        
        {/* Toggle Expand / Collapse Button */}
        <div 
          onClick={() => setLeftSidebarExpanded(!leftSidebarExpanded)}
          style={{ width: '100%', height: '28px', backgroundColor: '#2b2d31', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b5bac1', cursor: 'pointer', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}
          title={leftSidebarExpanded ? 'Collapse Left Bar' : 'Expand Left Bar'}
        >
          {leftSidebarExpanded ? '◄ Collapse' : '►'}
        </div>

        {/* Home / Direct Messages Button */}
        <div 
          onClick={() => { setCurrentView({ type: 'friends' }); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: currentView.type === 'friends' ? '#5865F2' : '#2b2d31', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', boxSizing: 'border-box' }} 
          title="Direct Messages (Harmony Home)"
        >
          <div style={{ width: '32px', height: '32px', backgroundColor: '#5865F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: "4px", color: 'white', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}>
            H
          </div>
          {leftSidebarExpanded && <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Home</span>}
        </div>

        <div style={{ width: '100%', height: '2px', backgroundColor: '#35363c', margin: '4px 0' }}></div>

        {/* Group Chats List */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {groupChats.map(group => {
            const isSelected = currentView.type === 'group' && currentView.data?.id === group.id;
            return (
              <div 
                key={group.id} 
                onClick={async () => {
                  const nextView = { type: 'group' as const, data: group, channel: group.channels[0] };
                  setCurrentView(nextView);
                  await loadConversationMessages(String(group.id));
                }}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '6px', 
                  backgroundColor: isSelected ? '#404249' : 'transparent', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  boxSizing: 'border-box',
                  border: isSelected ? '1px solid #5865F2' : '1px solid transparent'
                }} 
                title={group.name}
              >
                <div style={{ width: '32px', height: '32px', backgroundColor: group.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: "4px", color: 'white', fontWeight: 'bold', fontSize: '15px', flexShrink: 0 }}>
                  {group.avatarText}
                </div>
                {leftSidebarExpanded && (
                  <span style={{ color: '#f2f3f5', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {group.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ width: '100%', height: '2px', backgroundColor: '#35363c', margin: '4px 0' }}></div>

        {/* Plus Icon to Create Group Chat */}
        <div 
          onClick={() => void openCreateGroupModal()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', backgroundColor: '#2b2d31', borderRadius: '8px', cursor: 'pointer', boxSizing: 'border-box', border: '1px dashed #5865F2' }} 
          title="Create Group Chat"
        >
          <div style={{ width: '32px', height: '32px', backgroundColor: 'transparent', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: "5px", color: '#5865F2', fontWeight: 'bold', fontSize: '18px', flexShrink: 0 }}>
            +
          </div>
          {leftSidebarExpanded && <span style={{ color: '#5865F2', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>New Group</span>}
        </div>
      </div>

      {/* 2. Left-Center Navigation Sidebar */}
      <div style={{ width: '240px', backgroundColor: '#2b2d31', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid #1f2023' }}>
        
        {/* Top Header / Search */}
        <div style={{ height: '48px', borderBottom: '1px solid #1f2023', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box' }}>
          {currentView.type === 'group' ? (
            <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentView.data.name}
            </div>
          ) : (
            <input 
              type="text" 
              placeholder="Search through your friends..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1e1f22', border: 'none', borderRadius: '4px', padding: '6px 8px', color: '#f2f3f5', fontSize: '13px', outline: 'none' }}
            />
          )}
        </div>

        {/* Sidebar Content Switcher */}
        <div style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          {currentView.type === 'group' ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase' }}>
                Text Channels
              </div>
              {currentView.data.channels.map((ch: string) => {
                const activeCh = currentView.channel || currentView.data.channels[0];
                const isActive = activeCh === ch;
                return (
                  <div 
                    key={ch}
                    onClick={() => setCurrentView({ ...currentView, channel: ch })}
                    style={{ padding: '8px 10px', backgroundColor: isActive ? '#404249' : 'transparent', color: isActive ? '#f2f3f5' : '#949ba4', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={ch}
                  >
                    💬 {ch}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div 
                onClick={() => setCurrentView({ type: 'friends' })}
                style={{ padding: '10px 12px', backgroundColor: currentView.type === 'friends' ? '#5865F2' : 'transparent', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
              >
                👥 Friends
              </div>

              {/* Admin Panel Nav Button */}
              {isAdmin && (
                <div 
                  onClick={() => setCurrentView({ type: 'admin' })}
                  style={{ 
                    padding: '10px 12px', 
                    backgroundColor: currentView.type === 'admin' ? '#f23f43' : 'rgba(242, 63, 67, 0.12)', 
                    color: currentView.type === 'admin' ? '#ffffff' : '#f23f43', 
                    border: '1px solid rgba(242, 63, 67, 0.35)',
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px' 
                  }}
                >
                  🛡️ Admin Panel
                </div>
              )}
              
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase' }}>
                Direct Messages
              </div>

              {filteredFriends.map(f => (
                <div 
                  key={f.id} 
                  onClick={async () => {
                    try {
                      const payload = await api<any>('/api/conversations/dm', {
                        method: 'POST',
                        body: { recipientId: f.id },
                      });
                      const conversation = payload.conversation || { _id: f.id };
                      setCurrentView({ type: 'dm', data: { ...f, _id: conversation._id } });
                      await loadConversationMessages(conversation._id);
                    } catch (error) {
                      console.warn('Could not open DM via API:', error);
                      setCurrentView({ type: 'dm', data: f });
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: currentView.type === 'dm' && currentView.data?.id === f.id ? '#3f4147' : 'transparent', borderRadius: '4px', cursor: 'pointer', marginBottom: '2px' }}
                >
                  <div style={{ position: 'relative' }}>
                    {renderAvatar(f, 32)}
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px', backgroundColor: f.isBlocked ? '#f23f43' : '#23a55a', borderRadius: '50%', border: '2px solid #2b2d31' }}></div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: '14px', color: f.isBlocked ? '#949ba4' : '#dbdee1', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '160px' }}>{f.name}</span>
                    {f.isBlocked && <div style={{ fontSize: '10px', color: '#f23f43' }}>Blocked</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom User Profile Dock */}
        <div style={{ height: '56px', backgroundColor: '#232428', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <div style={{ position: 'relative' }}>
              {renderAvatar({ avatarText: userAvatarLetter, avatarUrl: currentUser?.avatar || '', color: '#5865F2' }, 32)}
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px', backgroundColor: '#23a55a', borderRadius: '50%', border: '2px solid #232428' }}></div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f2f3f5', lineHeight: '18px' }}>{userDisplayName}</div>
              <div style={{ fontSize: '12px', color: '#949ba4', lineHeight: '14px' }}>Online</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', color: '#b5bac1' }}>
            <span onClick={() => setShowSettingsModal(true)} style={{ cursor: 'pointer', padding: '6px', borderRadius: '4px' }} title="User Settings">⚙️</span>
          </div>
        </div>
      </div>

      {/* 3. Center Main Content Panel */}
      <div style={{ flex: 1, backgroundColor: '#313338', display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        
        {/* Top Header with Logout Button */}
        <div style={{ height: '48px', borderBottom: '1px solid #1f2023', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {currentView.type === 'friends' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>👥 Friends</div>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#3f4147' }}></div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '14px', fontWeight: '500', alignItems: 'center' }}>
                <span onClick={() => setActiveTab('online')} style={{ cursor: 'pointer', color: activeTab === 'online' ? '#f2f3f5' : '#949ba4', backgroundColor: activeTab === 'online' ? '#3f4147' : 'transparent', padding: '4px 8px', borderRadius: '4px' }}>Online</span>
                <span onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', color: activeTab === 'all' ? '#f2f3f5' : '#949ba4', backgroundColor: activeTab === 'all' ? '#3f4147' : 'transparent', padding: '4px 8px', borderRadius: '4px' }}>All</span>
                <span
                  onClick={() => { setActiveTab('requests'); setFriendActionMessage(''); }}
                  style={{ cursor: 'pointer', color: activeTab === 'requests' ? '#f2f3f5' : '#949ba4', backgroundColor: activeTab === 'requests' ? '#3f4147' : 'transparent', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  Requests
                  {pendingFriendRequestsCount > 0 && <span style={{ backgroundColor: '#f23f43', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>{pendingFriendRequestsCount}</span>}
                </span>
                <span
                  onClick={() => { setFriendRequestMessage(''); setFriendInput(''); setShowAddFriendModal(true); }}
                  style={{ cursor: 'pointer', color: '#ffffff', backgroundColor: '#5865F2', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}
                >
                  Add Friend
                </span>
              </div>
            </div>
          )}

          {currentView.type === 'admin' && (
            <div style={{ fontWeight: 'bold', color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}>
              <span>🛡️ Admin Dashboard</span>
              <span style={{ backgroundColor: '#f23f43', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Admin Mode
              </span>
            </div>
          )}

          {currentView.type === 'dm' && (
            <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>
              💬 @{currentView.data.name} {currentView.data.isBlocked && <span style={{ color: '#f23f43', fontSize: '12px' }}>(Blocked)</span>}
            </div>
          )}

          {currentView.type === 'group' && (
            <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px' }}>
              💬 #{currentView.channel || currentView.data.channels[0]}
            </div>
          )}

          {/* Top Right Logout Button */}
          <button 
            onClick={async () => {
              try {
                await api('/api/auth/logout', { method: 'POST' });
              } catch (error) {
                console.warn('Logout API request failed:', error);
              } finally {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
              }
            }}
            style={{ backgroundColor: '#f23f43', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            Log Out
          </button>
        </div>
        
        {/* Main Workspace Area */}
        {currentView.type === 'admin' && isAdmin && <AdminPanel />}

        {currentView.type === 'friends' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {activeTab === 'requests' ? (
              <>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '16px', textTransform: 'uppercase' }}>
                  Friend Requests — {pendingFriendRequestsCount}
                </div>
                {friendActionMessage && (
                  <div style={{ color: friendActionHasError ? '#f23f43' : '#23a55a', fontSize: '13px', marginBottom: '16px' }}>
                    {friendActionMessage}
                  </div>
                )}

                <section style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Incoming — {incomingFriendRequests.length}
                  </div>
                  {incomingFriendRequests.length === 0 ? (
                    <div style={{ color: '#949ba4', padding: '16px', backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px' }}>
                      No incoming friend requests.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {incomingFriendRequests.map((request) => (
                        <div key={request.friendshipId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 16px', backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {renderAvatar(request, 36)}
                            <span style={{ color: '#f2f3f5', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                              type="button"
                              disabled={friendActionLoadingId === String(request.friendshipId)}
                              onClick={() => void handleFriendshipAction(request, 'accept', 'Friend request accepted.')}
                              style={{ backgroundColor: '#23a55a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: friendActionLoadingId === String(request.friendshipId) ? 'wait' : 'pointer' }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={friendActionLoadingId === String(request.friendshipId)}
                              onClick={() => void handleFriendshipAction(request, 'remove', 'Friend request declined.')}
                              style={{ backgroundColor: 'transparent', color: '#f23f43', border: '1px solid #f23f43', padding: '7px 11px', borderRadius: '4px', fontWeight: 'bold', cursor: friendActionLoadingId === String(request.friendshipId) ? 'wait' : 'pointer' }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Outgoing — {outgoingFriendRequests.length}
                  </div>
                  {outgoingFriendRequests.length === 0 ? (
                    <div style={{ color: '#949ba4', padding: '16px', backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px' }}>
                      No outgoing friend requests.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {outgoingFriendRequests.map((request) => (
                        <div key={request.friendshipId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 16px', backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {renderAvatar(request, 36)}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#f2f3f5', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.name}</div>
                              <div style={{ color: '#949ba4', fontSize: '12px' }}>Request pending</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={friendActionLoadingId === String(request.friendshipId)}
                            onClick={() => void handleFriendshipAction(request, 'remove', 'Friend request canceled.')}
                            style={{ backgroundColor: 'transparent', color: '#b5bac1', border: '1px solid #4b4d52', padding: '7px 11px', borderRadius: '4px', fontWeight: 'bold', cursor: friendActionLoadingId === String(request.friendshipId) ? 'wait' : 'pointer', flexShrink: 0 }}
                          >
                            Cancel Request
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '16px', textTransform: 'uppercase' }}>
              {activeTab === 'online' ? `Online — ${friends.length}` : `All Friends — ${friends.length}`}
            </div>
            {friendActionMessage && (
              <div style={{ color: friendActionHasError ? '#f23f43' : '#23a55a', fontSize: '13px', marginBottom: '16px' }}>
                {friendActionMessage}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friends.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#2b2d31', border: '1px solid #3f4147', borderRadius: '8px' }}>
                  
                  {/* Left Side */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', minWidth: 0 }}>
                    <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                      {renderAvatar(f, 36)}
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px', backgroundColor: f.isBlocked ? '#f23f43' : '#23a55a', borderRadius: '50%', border: '2px solid #2b2d31' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
                      <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '15px', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{f.name}</div>
                      <div style={{ fontSize: '13px', color: f.isBlocked ? '#f23f43' : '#b5bac1', marginTop: '2px', lineHeight: '1.2' }}>
                        {f.isBlocked ? 'Blocked User' : 'Active Now'}
                      </div>
                    </div>
                  </div>

                  {/* Right Side Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0, position: 'relative' }}>
                    <div 
                      onClick={async () => {
                        try {
                          const payload = await api<any>('/api/conversations/dm', {
                            method: 'POST',
                            body: { recipientId: f.id },
                          });
                          const conversation = payload.conversation || { _id: f.id };
                          setCurrentView({ type: 'dm', data: { ...f, _id: conversation._id } });
                          await loadConversationMessages(conversation._id);
                        } catch (error) {
                          console.warn('Could not open DM via API:', error);
                          setCurrentView({ type: 'dm', data: f });
                        }
                      }}
                      style={{ width: '36px', height: '36px', backgroundColor: '#1e1f22', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dbdee1' }} 
                      title="Send Message"
                    >
                      💬
                    </div>
                    <div 
                      onClick={() => setActiveMenuFriendId(activeMenuFriendId === f.id ? null : f.id)}
                      style={{ width: '36px', height: '36px', backgroundColor: '#1e1f22', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dbdee1' }}
                      title="More Options"
                    >
                      ⋮
                    </div>

                    {/* Three Dots Popup Menu */}
                    {activeMenuFriendId === f.id && (
                      <div style={{ position: 'absolute', right: 0, top: '45px', backgroundColor: '#111214', border: '1px solid #222', borderRadius: '6px', padding: '6px', width: '150px', zIndex: 10, boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}>
                        <div onClick={async () => {
                          await handleFriendshipAction(f, 'remove', 'Friend removed.');
                          setActiveMenuFriendId(null);
                        }} style={{ padding: '8px', color: '#f23f43', fontSize: '13px', borderRadius: '4px', cursor: 'pointer' }}>Remove Friend</div>
                        
                        <div onClick={() => { 
                          setFriends(friends.map(item => item.id === f.id ? { ...item, isBlocked: !item.isBlocked } : item)); 
                          setActiveMenuFriendId(null); 
                        }} style={{ padding: '8px', color: '#dbdee1', fontSize: '13px', borderRadius: '4px', cursor: 'pointer' }}>
                          {f.isBlocked ? 'Unblock User' : 'Block User'}
                        </div>

                        <div onClick={() => { setViewProfileUser(f); setActiveMenuFriendId(null); }} style={{ padding: '8px', color: '#dbdee1', fontSize: '13px', borderRadius: '4px', cursor: 'pointer' }}>View Profile</div>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
              </>
            )}
          </div>
        )}

        {(currentView.type === 'dm' || currentView.type === 'group') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#313338' }}>
            
            {/* Messages Feed */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentView.type === 'dm' && currentView.data.isBlocked && (
                <div style={{ backgroundColor: '#2b2d31', border: '1px solid #f23f43', padding: '12px', borderRadius: '8px', color: '#f23f43', textAlign: 'center', marginBottom: '10px' }}>
                  You have blocked this user. Messages cannot be sent or received.
                </div>
              )}

              {(() => {
                const activeMessages = liveMessages.length > 0 ? liveMessages : (currentView.type === 'dm' 
                  ? currentView.data.messages 
                  : (currentView.data.messages[currentView.channel || currentView.data.channels[0]] || []));

                if (activeMessages.length === 0) {
                  return <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '40px' }}>This is the beginning of your chat history.</div>;
                }

                return activeMessages.map((m: any, idx: number) => {
                  const isRemoved = m.isRemoved === true;

                  return (
                    <div key={m._id || idx} style={{ display: 'flex', gap: '12px', flexDirection: 'column', width: '100%', alignItems: 'flex-start', textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-start', textAlign: 'left' }}>
                        <div style={{ width: '36px', height: '36px', backgroundColor: '#5865F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                          {(m.sender || 'U')[0]}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', color: '#f2f3f5' }}>{m.sender || 'User'}</span>
                            <span style={{ fontSize: '12px', color: '#949ba4' }}>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today at 3:15 PM'}</span>
                          </div>
                          <div style={{
                            color: isRemoved ? '#f23f43' : '#dbdee1',
                            fontSize: '14px',
                            marginTop: '4px',
                            wordBreak: 'break-word',
                            fontStyle: isRemoved ? 'italic' : 'normal',
                            textAlign: 'left',
                          }}>
                            {isRemoved ? 'Message removed by an admin' : (m.text || m.content || 'Empty message')}
                          </div>
                        </div>
                      </div>

                      {!isRemoved && (
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '48px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setReportTarget(m);
                              setReportNotice('');
                            }}
                            style={{ background: 'transparent', border: '1px solid #3f4147', color: '#b5bac1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Report
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMessage(m)}
                              disabled={!isAdmin}
                              style={{
                                background: isAdmin ? 'transparent' : '#2b2d31',
                                border: isAdmin ? '1px solid #f23f43' : '1px solid #4b4d52',
                                color: isAdmin ? '#f23f43' : '#949ba4',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: isAdmin ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                              }}
                              title={isAdmin ? 'Remove this message' : 'Self-removal is not supported by the current backend API'}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Message Input Box */}
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  disabled={currentView.type === 'dm' && currentView.data.isBlocked}
                  placeholder={currentView.type === 'dm' && currentView.data.isBlocked ? "Cannot send messages to a blocked user" : `Message ${currentView.type === 'dm' ? '@' + currentView.data.name : '#' + (currentView.channel || currentView.data.channels[0])}`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  style={{ width: '100%', backgroundColor: currentView.type === 'dm' && currentView.data.isBlocked ? '#1e1f22' : '#383a40', border: 'none', borderRadius: '8px', padding: '12px 16px', color: '#f2f3f5', outline: 'none', fontSize: '15px', boxSizing: 'border-box', cursor: currentView.type === 'dm' && currentView.data.isBlocked ? 'not-allowed' : 'text' }}
                />
              </form>
            </div>
          </div>
        )}

      </div>

      {/* 4. Right-Side Collapsible Active Friends Panel */}
      <div style={{ width: rightSidebarExpanded ? '320px' : '56px', backgroundColor: '#2b2d31', padding: rightSidebarExpanded ? '24px 16px' : '16px 8px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, borderLeft: '1px solid #1f2023', transition: 'width 0.2s', overflow: 'hidden' }}>
        
        {/* Toggle Expand / Collapse Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: rightSidebarExpanded ? 'space-between' : 'center' }}>
          {rightSidebarExpanded && <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Active Friends</div>}
          <div 
            onClick={() => setRightSidebarExpanded(!rightSidebarExpanded)}
            style={{ width: '32px', height: '24px', backgroundColor: '#313338', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b5bac1', cursor: 'pointer', fontSize: '12px' }}
            title={rightSidebarExpanded ? 'Collapse Active Friends Bar' : 'Expand Active Friends Bar'}
          >
            {rightSidebarExpanded ? '►' : '◄'}
          </div>
        </div>

        {rightSidebarExpanded ? (
          <div style={{ width: '320px', backgroundColor: '#2b2d31', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, borderLeft: '1px solid #1f2023' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5' }}>Active Friends</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {friends.map(f => (
              <div key={f.id} style={{ backgroundColor: '#2b2d31', border: '1px solid #3f4147', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {renderAvatar(f, 32)}
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: '9px', height: '9px', backgroundColor: f.isBlocked ? '#f23f43' : '#23a55a', borderRadius: '50%', border: '2px solid #2b2d31' }}></div>
              </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 'bold', color: '#f2f3f5', fontSize: '14px', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: '12px', color: f.isBlocked ? '#f23f43' : '#b5bac1', marginTop: '2px', lineHeight: '1.2' }}>{f.isBlocked ? 'Blocked' : 'Active'}</div>
              </div>
            </div>
          </div>
          ))}
        </div>
      </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', overflowY: 'auto', flex: 1 }}>
            {friends.map(f => (
              <div key={f.id} style={{ position: 'relative', cursor: 'pointer' }} title={f.name}>
                {renderAvatar(f, 36)}
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: '9px', height: '9px', backgroundColor: f.isBlocked ? '#f23f43' : '#23a55a', borderRadius: '50%', border: '2px solid #2b2d31' }}></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Add Friend Popup Modal */}
      {showAddFriendModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '440px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Add Friend</h3>
            <p style={{ color: '#949ba4', fontSize: '14px', marginBottom: '16px' }}>You can add friends with their exact Harmony username.</p>
            <input 
              type="text" 
              placeholder="Enter username" 
              value={friendInput}
              onChange={(e) => { setFriendInput(e.target.value); setFriendRequestMessage(''); }}
              style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none', marginBottom: '20px' }}
            />
            {friendRequestMessage && (
              <p style={{ color: friendRequestMessage.startsWith('Friend request sent') ? '#23a55a' : '#f23f43', fontSize: '13px', margin: '-8px 0 16px' }}>
                {friendRequestMessage}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowAddFriendModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Close</button>
              <button 
                type="button"
                disabled={friendRequestSubmitting}
                onClick={async () => {
                  if (!friendInput.trim()) {
                    setFriendRequestMessage('Enter a username to search.');
                    return;
                  }
                  setFriendRequestSubmitting(true);
                  setFriendRequestMessage('');
                  try {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const query = friendInput.trim();
                    const users = await api<any>(`/api/users/search?q=${encodeURIComponent(query)}`);
                    const match = (users.users || []).find((user: any) =>
                      user.username.toLowerCase() === query.toLowerCase() &&
                      user.username.toLowerCase() !== (currentUser.username || '').toLowerCase()
                    );

                    if (!match) {
                      throw new Error('No matching username found. Enter the exact username and try again.');
                    }

                    await api<any>('/api/friends/requests', {
                      method: 'POST',
                      body: { recipientId: match._id },
                    });
                    setFriendRequestMessage(`Friend request sent to ${match.username}.`);
                    setFriendInput('');
                    setActiveTab('requests');
                    try {
                      await refreshFriendData();
                    } catch (refreshError) {
                      console.warn('Friend request sent, but request list refresh failed:', refreshError);
                    }
                  } catch (error) {
                    console.warn('Could not create friend request via API:', error);
                    setFriendRequestMessage(error instanceof Error ? error.message : 'Could not send friend request.');
                  } finally {
                    setFriendRequestSubmitting(false);
                  }
                }}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: friendRequestSubmitting ? 'wait' : 'pointer', opacity: friendRequestSubmitting ? 0.7 : 1 }}
              >
                {friendRequestSubmitting ? 'Sending…' : 'Send Friend Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Chat Modal */}
      {showCreateGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '440px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Create Group Chat</h3>
            <p style={{ color: '#949ba4', fontSize: '14px', marginBottom: '16px' }}>Give your group chat a name and select 2–9 other members.</p>
            <input 
              type="text" 
              placeholder="Group Name" 
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b5bac1', fontSize: '12px', marginBottom: '8px' }}>
              <span>Group members</span>
              <span>{selectedGroupMemberIds.length}/9 selected</span>
            </div>
            <div style={{ backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', maxHeight: '220px', minHeight: '100px', overflowY: 'auto', marginBottom: '12px' }}>
              {groupMembersLoading ? (
                <div style={{ color: '#949ba4', fontSize: '13px', padding: '12px' }}>Loading eligible users…</div>
              ) : eligibleGroupMembers.length === 0 ? (
                <div style={{ color: '#949ba4', fontSize: '13px', padding: '12px' }}>No eligible users are available.</div>
              ) : (
                eligibleGroupMembers.map((member) => {
                  const isSelected = selectedGroupMemberIds.includes(member._id);
                  return (
                    <label key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: isSelected ? '#f2f3f5' : '#dbdee1', padding: '9px 12px', borderBottom: '1px solid #2b2d31', cursor: !isSelected && selectedGroupMemberIds.length >= 9 ? 'not-allowed' : 'pointer', opacity: !isSelected && selectedGroupMemberIds.length >= 9 ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isSelected && selectedGroupMemberIds.length >= 9}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedGroupMemberIds((selected) => (
                            checked
                              ? [...selected, member._id]
                              : selected.filter((id) => id !== member._id)
                          ));
                          setGroupCreateError('');
                        }}
                      />
                      <span>{member.username}</span>
                    </label>
                  );
                })
              )}
            </div>
            {groupCreateError && <p style={{ color: '#f23f43', fontSize: '13px', margin: '0 0 12px' }}>{groupCreateError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setShowCreateGroupModal(false); setGroupCreateError(''); }} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={groupMembersLoading || groupCreating}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: groupMembersLoading || groupCreating ? 'wait' : 'pointer', opacity: groupMembersLoading || groupCreating ? 0.7 : 1 }}
              >
                {groupCreating ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#313338', padding: '32px', borderRadius: '8px', width: '480px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '16px' }}>User Settings</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1' }}>NICKNAME</label>
                <button
                  type="button"
                  onClick={() => {
                    setProfileDraft({ ...profileDraft, nickname: currentUser?.nickname ?? currentUser?.username ?? '' });
                    setProfileEditField(profileEditField === 'nickname' ? null : 'nickname');
                    setProfileMessage('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#00a8fc', fontSize: '12px', cursor: 'pointer' }}
                >
                  {profileEditField === 'nickname' ? 'Cancel' : '✎'}
                </button>
              </div>
              {profileEditField === 'nickname' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={profileDraft.nickname}
                    onChange={(e) => setProfileDraft({ ...profileDraft, nickname: e.target.value })}
                    style={{ flex: 1, color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px', border: '1px solid #111214', outline: 'none' }}
                  />
                  <button type="button" onClick={() => saveProfileField('nickname')} style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                </div>
              ) : (
                <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>{currentUser?.nickname || currentUser?.username || 'User'}</div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1' }}>USERNAME</label>
                <button
                  type="button"
                  onClick={() => {
                    setProfileDraft({ ...profileDraft, username: currentUser?.username ?? '' });
                    setProfileEditField(profileEditField === 'username' ? null : 'username');
                    setProfileMessage('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#00a8fc', fontSize: '12px', cursor: 'pointer' }}
                >
                  {profileEditField === 'username' ? 'Cancel' : '✎'}
                </button>
              </div>
              {profileEditField === 'username' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={profileDraft.username}
                    onChange={(e) => setProfileDraft({ ...profileDraft, username: e.target.value })}
                    style={{ flex: 1, color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px', border: '1px solid #111214', outline: 'none' }}
                  />
                  <button type="button" onClick={() => saveProfileField('username')} style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                </div>
              ) : (
                <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>{currentUser?.username || 'User'}</div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1' }}>EMAIL</label>
                <button type="button" title="Email updates are not supported by the current backend API." style={{ background: 'none', border: 'none', color: '#949ba4', fontSize: '12px', cursor: 'not-allowed' }}>
                  🔒
                </button>
              </div>
              <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>
                {showEmail ? (currentUser?.email || 'No email available') : '••••••••••••@••••••.us'}
              </div>
            </div>

            {profileMessage && (
              <div style={{ color: profileMessage.toLowerCase().includes('success') ? '#23a55a' : '#f23f43', fontSize: '13px', marginBottom: '12px' }}>{profileMessage}</div>
            )}

            {isAdmin && (
              <div style={{ marginBottom: '20px', borderTop: '1px solid #3f4147', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#f2f3f5', fontWeight: 'bold' }}>Admin Controls</div>
                  <div style={{ fontSize: '12px', color: '#949ba4' }}>Manage users, roles, and account statuses</div>
                </div>
                <button 
                  onClick={() => {
                    setShowSettingsModal(false);
                    setCurrentView({ type: 'admin' });
                  }}
                  style={{ backgroundColor: '#f23f43', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Open Admin Panel
                </button>
              </div>
            )}

            <div style={{ marginBottom: '20px', borderTop: '1px solid #3f4147', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#f2f3f5', fontWeight: '500' }}>Password & Security</span>
              <button 
                onClick={() => setShowPasswordModal(true)}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                Change Password
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowSettingsModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Popup Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#313338', padding: '32px', borderRadius: '8px', width: '440px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '16px' }}>Change Password</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>CURRENT PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input type={showCurrentPassword ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} required />
                <span onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}>
                  {renderPasswordEye(showCurrentPassword)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>NEW PASSWORD (MIN 8 CHARACTERS)</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} required />
                <span onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}>
                  {renderPasswordEye(showNewPassword)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} required />
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}>
                  {renderPasswordEye(showConfirmPassword)}
                </span>
              </div>
            </div>

            {passwordMessage && <p style={{ color: passwordMessage.includes('successfully') ? '#23a55a' : '#f23f43', fontSize: '13px', marginBottom: '15px' }}>{passwordMessage}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => void handleChangePassword()}
                disabled={passwordChanging}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: passwordChanging ? 'wait' : 'pointer' }}
              >
                {passwordChanging ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Message Modal */}
      {reportTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '440px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Report Message</h3>
            <p style={{ color: '#949ba4', fontSize: '14px', marginBottom: '12px' }}>Tell us why this message should be reviewed.</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Example: Harassment, spam, offensive content, etc."
              rows={5}
              style={{ width: '100%', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', padding: '10px', boxSizing: 'border-box', resize: 'vertical', outline: 'none', marginBottom: '12px' }}
            />
            {reportNotice && <div style={{ color: '#f23f43', fontSize: '13px', marginBottom: '12px' }}>{reportNotice}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => { setReportTarget(null); setReportReason(''); setReportNotice(''); }} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleReportMessage} style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Send Report</button>
            </div>
          </div>
        </div>
      )}

      {/* View User Profile Modal */}
      {viewProfileUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#313338', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'left', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              {renderAvatar(viewProfileUser, 72)}
            </div>
            <h3 style={{ color: '#f2f3f5', fontSize: '20px', marginBottom: '4px', textAlign: 'center' }}>{viewProfileUser.name}</h3>
            <p style={{ color: viewProfileUser.isBlocked ? '#f23f43' : '#23a55a', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
              {viewProfileUser.isBlocked ? 'Blocked User' : 'Online / Active'}
            </p>

            <div style={{ borderTop: '1px solid #3f4147', paddingTop: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', marginBottom: '6px', textTransform: 'uppercase' }}>Mutual Friends</div>
              <div style={{ color: '#dbdee1', fontSize: '14px' }}>
                {viewProfileUser.mutualFriends && viewProfileUser.mutualFriends.length > 0 ? viewProfileUser.mutualFriends.join(', ') : 'No mutual friends'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #3f4147', paddingTop: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', marginBottom: '6px', textTransform: 'uppercase' }}>Mutual Group Chats</div>
              <div style={{ color: '#dbdee1', fontSize: '14px' }}>
                {viewProfileUser.mutualGroups && viewProfileUser.mutualGroups.length > 0 ? viewProfileUser.mutualGroups.join(', ') : 'No mutual group chats'}
              </div>
            </div>

            <button 
              onClick={() => setViewProfileUser(null)} 
              style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

    </div>
  );
}