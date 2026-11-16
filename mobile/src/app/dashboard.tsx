// app/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  _id?: string;
  senderId?: string;
  sender: string;
  text: string;
  timestamp: string;
  createdAt?: string;
  isRemoved?: boolean;
}

interface Friend {
  id: string;
  friendshipId: string;
  name: string;
  username: string;
  avatarText: string;
  color: string;
  isBlocked: boolean;
  messages: Message[];
}

interface GroupChat {
  id: string;
  createdBy: string;
  name: string;
  avatarText: string;
  color: string;
  channels: string[];
  members: Array<{ id: string; username: string; nickname?: string }>;
  messages: Record<string, Message[]>;
}

interface AdminUser {
  id: string;
  name: string;
  username: string;
  nickname: string;
  email: string;
  status: 'Active' | 'Disabled';
  role: 'System Admin' | 'Member';
  verified: boolean;
}

interface ReportedMessage {
  id: string;
  user: string;
  channel: string;
  reason: string;
  content: string;
  reportedBy: string;
  timestamp: string;
  status: 'pending' | 'kept' | 'deleted';
  groupDeleted: boolean;
}

interface ConversationSummary {
  id: string;
  type: 0 | 1;
  members: string[];
  lastMessageAt?: string;
}

interface EligibleUser {
  _id: string;
  username: string;
}

const API_BASE_URL = 'https://harmonyapp.us/api';

class MobileApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MobileApiError(
      typeof data.error === 'string' ? data.error : 'Request failed',
      response.status,
    );
  }
  return data as T;
}

const formatTimestamp = (value?: string) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export default function DashboardScreen() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedRailId, setSelectedRailId] = useState<string>('dm');

  const [activeChat, setActiveChat] = useState<{
    type: 'dm' | 'group' | 'admin-chat';
    id: string;
    name: string;
    channel?: string;
    isBlocked?: boolean;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Modals
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [friendRequestMessage, setFriendRequestMessage] = useState('');
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);
  const [friendsTab, setFriendsTab] = useState<'friends' | 'requests'>('friends');
  const [profileFriend, setProfileFriend] = useState<Friend | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendActionMessage, setFriendActionMessage] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [showGroupActionModal, setShowGroupActionModal] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [groupActionError, setGroupActionError] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [selectedReport, setSelectedReport] = useState<ReportedMessage | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [revealEmail, setRevealEmail] = useState(false);
  const [profileNickname, setProfileNickname] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [adminTab, setAdminTab] = useState<'users' | 'reports' | 'chat'>('users');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState<'all' | 'active' | 'disabled' | 'admin'>('all');
  const [adminReportFilter, setAdminReportFilter] = useState<'pending' | 'all' | 'kept' | 'deleted'>('pending');
  const [adminReportSearch, setAdminReportSearch] = useState('');
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([]);
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<Friend[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<Friend[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [conversationRecords, setConversationRecords] = useState<ConversationSummary[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [unreadConversationIds, setUnreadConversationIds] = useState<string[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminActionLoadingId, setAdminActionLoadingId] = useState<string | null>(null);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [showAdminEditPassword, setShowAdminEditPassword] = useState(false);
  const [showAdminEditConfirmPassword, setShowAdminEditConfirmPassword] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({
    username: '',
    nickname: '',
    email: '',
    role: 'Member' as 'System Admin' | 'Member',
    password: '',
    confirmPassword: '',
  });
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showAdminCreatePassword, setShowAdminCreatePassword] = useState(false);
  const [showAdminCreateConfirmPassword, setShowAdminCreateConfirmPassword] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [adminChatMessages] = useState<Message[]>([]);

  const normalizeFriend = (entry: any): Friend => {
    const user = entry.user ?? entry;
    const username = user.username ?? 'Unknown User';
    const name = user.nickname || username;
    return {
      id: String(user._id ?? entry.id ?? ''),
      friendshipId: String(entry.friendshipId ?? entry._id ?? ''),
      name,
      username,
      avatarText: name.charAt(0).toUpperCase(),
      color: '#5865F2',
      isBlocked: false,
      messages: [],
    };
  };

  const applyFriendData = (payload: any) => {
    setFriends((payload.friends ?? []).map(normalizeFriend));
    setIncomingFriendRequests((payload.pending?.incoming ?? []).map(normalizeFriend));
    setOutgoingFriendRequests((payload.pending?.outgoing ?? []).map(normalizeFriend));
  };

  const normalizeConversation = (conversation: any): GroupChat => ({
    id: String(conversation._id),
    createdBy: String(conversation.createdBy?._id ?? conversation.createdBy ?? ''),
    name: conversation.name || 'Group Chat',
    avatarText: ((conversation.name || 'G').trim().charAt(0) || 'G').toUpperCase(),
    color: '#5865F2',
    channels: ['general'],
    members: (conversation.members ?? []).map((member: any) => ({
      id: String(member?._id ?? member),
      username: member?.username ?? 'Unknown User',
      nickname: member?.nickname,
    })),
    messages: { general: [] },
  });

  const messageDisplayName = (message: any) => {
    const senderId = String(message.sender?._id ?? message.sender ?? '');
    const groupMember = groupChats
      .map((group) => group.members.find((member) => member.id === senderId))
      .find((member) => member !== undefined);
    const nickname = [
      message.senderNickname,
      message.sender?.nickname,
      senderId === String(currentUser?._id) ? currentUser?.nickname : '',
      friends.find((friend) => friend.id === senderId)?.name,
      groupMember?.nickname,
    ].find((name) => typeof name === 'string' && name.trim());
    return nickname?.trim() || message.senderUsername || message.sender?.username || 'Unknown';
  };

  const handleRequestError = (error: unknown, fallback: string) => {
    if (error instanceof MobileApiError && error.status === 401) {
      void AsyncStorage.removeItem('token');
      void AsyncStorage.removeItem('user');
      router.replace('/');
      return error.message || 'Please sign in again.';
    }
    return error instanceof Error ? error.message : fallback;
  };

  const loadConversationMessages = async (conversationId: string) => {
    setLiveMessages([]);
    const payload = await apiRequest<{ messages: any[] }>(`/conversations/${conversationId}/messages`);
    const messages = (payload.messages ?? []).map((message) => ({
      id: String(message._id),
      _id: String(message._id),
      senderId: String(message.sender?._id ?? message.sender ?? ''),
      sender: messageDisplayName(message),
      text: message.content || '',
      timestamp: formatTimestamp(message.createdAt),
      createdAt: message.createdAt,
      isRemoved: message.isRemoved === true,
    }));
    setLiveMessages(messages);
    return messages;
  };

  const refreshDashboardData = async () => {
    const [profile, friendPayload, conversationPayload] = await Promise.all([
      apiRequest<any>('/auth/me'),
      apiRequest<any>('/friends'),
      apiRequest<any>('/conversations'),
    ]);

    const user = profile.user;
    setCurrentUser(user);
    setProfileNickname(user.nickname ?? user.username ?? '');
    setProfileUsername(user.username ?? '');
    await AsyncStorage.setItem('user', JSON.stringify(user));
    applyFriendData(friendPayload);

    const conversations = conversationPayload.conversations ?? [];
    setConversationRecords(conversations.map((conversation: any) => ({
      id: String(conversation._id),
      type: conversation.type,
      members: (conversation.members ?? []).map((member: any) => String(member?._id ?? member)),
      lastMessageAt: conversation.lastMessageAt,
    })));
    setGroupChats(
      conversations
        .filter((conversation: any) => conversation.type === 1)
        .map(normalizeConversation)
    );
    setDashboardMessage('');

    if (user.status === 2) {
      await refreshAdminData();
    }
  };

  const refreshAdminData = async () => {
    setAdminLoading(true);
    setAdminMessage('');
    try {
      const [usersPayload, reportsPayload] = await Promise.all([
        apiRequest<any>('/admin/users'),
        apiRequest<any>('/admin/reports'),
      ]);
      setAdminUsersList((usersPayload.users ?? []).map((user: any) => ({
        id: String(user._id),
        name: user.nickname || user.username,
        username: user.username,
        nickname: user.nickname || user.username,
        email: user.email ?? '',
        status: user.status === 0 ? 'Disabled' as const : 'Active' as const,
        role: user.status === 2 ? 'System Admin' as const : 'Member' as const,
        verified: user.isVerified === true,
      })));
      setReportedMessages((reportsPayload.reports ?? []).map((report: any) => {
        const message = report.message;
        const groupDeleted = Boolean(message && !message.conversation);
        const conversation = message?.conversation;
        return {
          id: String(report._id),
          user: message?.sender?.username ?? 'Unknown User',
          channel: groupDeleted
            ? 'Group deleted'
            : conversation
              ? `${conversation.name || 'Conversation'} (${conversation.type === 0 ? 'DM' : 'Group'})`
              : 'Unknown chat',
          reason: report.reason ?? 'No reason provided',
          content: message?.content ?? 'Message unavailable',
          reportedBy: report.reportedBy?.username ?? 'Unknown User',
          timestamp: report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown time',
          status: report.status ?? 'pending',
          groupDeleted,
        };
      }));
      setAdminMessage('');
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not load admin data.'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminRefresh = async () => {
    try {
      await refreshDashboardData();
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not refresh dashboard data.'));
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      try {
        await refreshDashboardData();
      } catch (error) {
        if (active) setDashboardMessage(handleRequestError(error, 'Could not load your account.'));
      } finally {
        if (active) setDashboardLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not sign out from the server.'));
    } finally {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setShowSettingsModal(false);
      router.replace('/');
    }
  };

  const markConversationRead = async (conversationId: string) => {
    await AsyncStorage.setItem(`harmony:last-read:${currentUser?._id}:${conversationId}`, new Date().toISOString());
    setUnreadConversationIds((previous) => previous.filter((id) => id !== conversationId));
  };

  const handleOpenDM = async (friend: Friend) => {
    try {
      const payload = await apiRequest<any>('/conversations/dm', {
        method: 'POST',
        body: { recipientId: friend.id },
      });
      const conversation = payload.conversation;
      if (!conversation?._id) throw new Error('The server did not return this conversation.');
      const conversationId = String(conversation._id);
      setLiveMessages([]);
      setConversationRecords((previous) =>
        previous.some((item) => item.id === conversationId)
          ? previous
          : [...previous, {
              id: conversationId,
              type: 0,
              members: (conversation.members ?? []).map((member: any) => String(member?._id ?? member)),
              lastMessageAt: conversation.lastMessageAt,
            }]
      );
      setActiveChat({ type: 'dm', id: conversationId, name: friend.name, isBlocked: friend.isBlocked });
      await markConversationRead(conversationId);
      await loadConversationMessages(conversationId);
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not open this conversation.'));
    }
  };

  const handleOpenGroup = async (group: GroupChat) => {
    setLiveMessages([]);
    setActiveChat({
      type: 'group',
      id: group.id,
      name: group.name,
      channel: 'general',
    });
    try {
      await markConversationRead(group.id);
      await loadConversationMessages(group.id);
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not load group messages.'));
    }
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !activeChat || activeChat.type === 'admin-chat' || activeChat.isBlocked) return;
    try {
      const payload = await apiRequest<any>(`/conversations/${activeChat.id}/messages`, {
        method: 'POST',
        body: { content },
      });
      const message = payload.message;
      if (!message?._id) throw new Error('The server did not return the sent message.');
      const newMessage: Message = {
        id: String(message._id),
        _id: String(message._id),
        senderId: String(message.sender?._id ?? message.sender ?? currentUser?._id ?? ''),
        sender: messageDisplayName(message) || currentUser?.nickname || currentUser?.username || 'You',
        text: message.content ?? content,
        timestamp: formatTimestamp(message.createdAt),
        createdAt: message.createdAt,
        isRemoved: message.isRemoved === true,
      };
      setLiveMessages((previous) => [...previous, newMessage]);
      setMessageInput('');
      await markConversationRead(activeChat.id);
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not send this message.'));
    }
  };

  const handleAddFriend = async () => {
    const username = newFriendName.trim();
    if (!username) {
      setFriendRequestMessage('Enter a username.');
      return;
    }
    setFriendRequestLoading(true);
    setFriendRequestMessage('');
    try {
      const search = await apiRequest<any>(`/users/search?q=${encodeURIComponent(username)}`);
      const match = (search.users ?? []).find((user: any) =>
        user.username?.toLowerCase() === username.toLowerCase() &&
        String(user._id) !== String(currentUser?._id)
      );
      if (!match) throw new Error('No matching username found.');
      await apiRequest('/friends/requests', {
        method: 'POST',
        body: { recipientId: match._id },
      });
      setFriendRequestMessage(`Request sent to ${match.username}.`);
      setNewFriendName('');
      await refreshDashboardData();
    } catch (error) {
      setFriendRequestMessage(handleRequestError(error, 'Could not send the friend request.'));
    } finally {
      setFriendRequestLoading(false);
    }
  };

  const handleFriendRequestAction = async (friend: Friend, action: 'accept' | 'remove') => {
    try {
      if (action === 'accept') {
        await apiRequest(`/friends/requests/${friend.friendshipId}/accept`, { method: 'PATCH' });
      } else {
        await apiRequest(`/friends/${friend.friendshipId}`, { method: 'DELETE' });
      }
      await refreshDashboardData();
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not update this friend request.'));
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    setFriendActionLoading(true);
    setFriendActionMessage('');
    try {
      await apiRequest(`/friends/${friendToRemove.friendshipId}`, { method: 'DELETE' });
      setFriendToRemove(null);
      setProfileFriend(null);
      await refreshDashboardData();
    } catch (error) {
      setFriendActionMessage(handleRequestError(error, 'Could not remove this friend.'));
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleToggleFriendBlock = () => {
    if (!profileFriend) return;
    const updatedFriend = { ...profileFriend, isBlocked: !profileFriend.isBlocked };
    setFriends((previous) => previous.map((friend) =>
      friend.id === updatedFriend.id ? updatedFriend : friend
    ));
    setProfileFriend(updatedFriend);
  };

  const openCreateGroup = async () => {
    setShowCreateGroupModal(true);
    setSelectedMemberIds([]);
    setGroupError('');
    setGroupLoading(true);
    try {
      const payload = await apiRequest<{ users: EligibleUser[] }>('/conversations/eligible-users');
      setEligibleUsers(payload.users ?? []);
    } catch (error) {
      setEligibleUsers([]);
      setGroupError(handleRequestError(error, 'Could not load eligible group members.'));
    } finally {
      setGroupLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      setGroupError('Enter a group name.');
      return;
    }
    if (selectedMemberIds.length < 2 || selectedMemberIds.length > 9) {
      setGroupError('Select 2–9 other members.');
      return;
    }
    setGroupSaving(true);
    setGroupError('');
    try {
      const payload = await apiRequest<any>('/conversations', {
        method: 'POST',
        body: { type: 1, name, memberIds: selectedMemberIds },
      });
      const conversation = payload.conversation;
      if (!conversation?._id) throw new Error('The server did not return the created group.');
      const group = normalizeConversation(conversation);
      setGroupChats((previous) => [group, ...previous.filter((item) => item.id !== group.id)]);
      setConversationRecords((previous) => [
        {
          id: group.id,
          type: 1,
          members: group.members.map((member) => member.id),
          lastMessageAt: conversation.lastMessageAt,
        },
        ...previous.filter((item) => item.id !== group.id),
      ]);
      setSelectedRailId(group.id);
      setNewGroupName('');
      setShowCreateGroupModal(false);
    } catch (error) {
      setGroupError(handleRequestError(error, 'Could not create the group.'));
    } finally {
      setGroupSaving(false);
    }
  };

  const handleGroupAction = async () => {
    const group = groupChats.find((item) => item.id === selectedRailId);
    if (!group) return;
    setGroupActionLoading(true);
    setGroupActionError('');
    try {
      const isCreator = group.createdBy === String(currentUser?._id);
      await apiRequest(`/conversations/${group.id}${isCreator ? '' : '/leave'}`, {
        method: isCreator ? 'DELETE' : 'POST',
      });
      setGroupChats((previous) => previous.filter((item) => item.id !== group.id));
      setConversationRecords((previous) => previous.filter((item) => item.id !== group.id));
      setUnreadConversationIds((previous) => previous.filter((id) => id !== group.id));
      setSelectedRailId('dm');
      setActiveChat(null);
      setShowGroupActionModal(false);
    } catch (error) {
      setGroupActionError(handleRequestError(error, 'Could not update this group.'));
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPasswordInput) return setPasswordMessage('Enter your current password.');
    if (newPasswordInput.length < 8) return setPasswordMessage('Password must be at least 8 characters.');
    if (newPasswordInput !== confirmPasswordInput) return setPasswordMessage('New passwords do not match.');
    setPasswordLoading(true);
    setPasswordMessage('');
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: currentPasswordInput, newPassword: newPasswordInput },
      });
      setPasswordMessage('Password changed successfully.');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (error) {
      setPasswordMessage(handleRequestError(error, 'Could not change your password.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const username = profileUsername.trim();
    const nickname = profileNickname.trim();
    if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setProfileMessage('Username must be 3–32 characters using letters, numbers, or underscores.');
      return;
    }
    if (nickname.length < 1 || nickname.length > 32) {
      setProfileMessage('Display name must be 1–32 characters.');
      return;
    }
    setProfileLoading(true);
    setProfileMessage('');
    try {
      const result = await apiRequest<any>('/auth/me', {
        method: 'PATCH',
        body: { username, nickname },
      });
      setCurrentUser(result.user);
      setProfileUsername(result.user.username);
      setProfileNickname(result.user.nickname ?? result.user.username);
      await AsyncStorage.setItem('user', JSON.stringify(result.user));
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileMessage(handleRequestError(error, 'Could not update your profile.'));
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleUserStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'Active' ? 0 : 1;
    setAdminActionLoadingId(user.id);
    setAdminMessage('');
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      setAdminUsersList((previous) => previous.map((item) =>
        item.id === user.id
          ? { ...item, status: nextStatus === 0 ? 'Disabled' as const : 'Active' as const }
          : item
      ));
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not update this account status.'));
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  const openAdminUserEditor = (user: AdminUser) => {
    setEditingAdminUser(user);
    setAdminEditForm({
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    setAdminMessage('');
  };

  const saveAdminUser = async () => {
    if (!editingAdminUser) return;
    const username = adminEditForm.username.trim();
    const nickname = adminEditForm.nickname.trim();
    const email = adminEditForm.email.trim();
    if (username.length < 3 || username.length > 32) {
      setAdminMessage('Username must be 3–32 characters.');
      return;
    }
    if (nickname.length < 1 || nickname.length > 32) {
      setAdminMessage('Display name must be 1–32 characters.');
      return;
    }
    if (!email) {
      setAdminMessage('Email is required.');
      return;
    }

    setAdminFormLoading(true);
    setAdminMessage('');
    try {
      const result = await apiRequest<{ user: any; message?: string }>(`/admin/users/${editingAdminUser.id}`, {
        method: 'PATCH',
        body: {
          username,
          nickname,
          email,
          status: adminEditForm.role === 'System Admin'
            ? 2
            : editingAdminUser.status === 'Disabled' ? 0 : 1,
        },
      });
      setEditingAdminUser(null);
      await refreshAdminData();
      setAdminMessage(`Success: ${result.message || 'Account updated.'}`);
    } catch (error) {
      await refreshAdminData();
      setAdminMessage(handleRequestError(error, 'Could not update this account.'));
    } finally {
      setAdminFormLoading(false);
    }
  };

  const resetAdminUserPassword = async () => {
    if (!editingAdminUser) return;
    if (adminEditForm.password.length < 8) {
      setAdminMessage('Password must be at least 8 characters.');
      return;
    }
    if (adminEditForm.password !== adminEditForm.confirmPassword) {
      setAdminMessage('Passwords do not match.');
      return;
    }

    setAdminFormLoading(true);
    setAdminMessage('');
    try {
      await apiRequest(`/admin/users/${editingAdminUser.id}/password`, {
        method: 'PATCH',
        body: { password: adminEditForm.password },
      });
      setAdminEditForm((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      setAdminMessage('Success: Password updated.');
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not update this password.'));
    } finally {
      setAdminFormLoading(false);
    }
  };

  const createAdminAccount = async () => {
    const username = newAdminForm.username.trim();
    const nickname = newAdminForm.nickname.trim();
    const email = newAdminForm.email.trim();
    if (username.length < 3 || username.length > 32) {
      setAdminMessage('Username must be 3–32 characters.');
      return;
    }
    if (nickname.length < 1 || nickname.length > 32) {
      setAdminMessage('Display name must be 1–32 characters.');
      return;
    }
    if (!email || newAdminForm.password.length < 8) {
      setAdminMessage('Enter an email and a password of at least 8 characters.');
      return;
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      setAdminMessage('Passwords do not match.');
      return;
    }

    setAdminFormLoading(true);
    setAdminMessage('');
    try {
      const result = await apiRequest<{ message: string }>('/admin/users', {
        method: 'POST',
        body: {
          username,
          nickname,
          email,
          password: newAdminForm.password,
        },
      });
      setShowCreateAdminModal(false);
      setNewAdminForm({ username: '', nickname: '', email: '', password: '', confirmPassword: '' });
      await refreshAdminData();
      setAdminMessage(`Success: ${result.message}`);
    } catch (error) {
      await refreshAdminData();
      setAdminMessage(handleRequestError(error, 'Could not create an admin account.'));
    } finally {
      setAdminFormLoading(false);
    }
  };

  const toggleAllRegularUsers = async () => {
    const regularUsers = adminUsersList.filter((user) => user.role !== 'System Admin');
    const allDisabled = regularUsers.length > 0 && regularUsers.every((user) => user.status === 'Disabled');
    setBulkStatusLoading(true);
    setAdminMessage('');
    try {
      await apiRequest('/admin/users/bulk-status', {
        method: 'PATCH',
        body: { status: allDisabled ? 1 : 0 },
      });
      await refreshAdminData();
      setAdminMessage(`Success: All regular users ${allDisabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not update all regular users.'));
    } finally {
      setBulkStatusLoading(false);
    }
  };

  const handleResolveReport = async (report: ReportedMessage, decision: 'kept' | 'deleted') => {
    setAdminMessage('');
    try {
      await apiRequest(`/admin/reports/${report.id}`, {
        method: 'PATCH',
        body: { decision },
      });
      setReportedMessages((previous) => previous.map((item) =>
        item.id === report.id ? { ...item, status: decision } : item
      ));
      setSelectedReport(null);
    } catch (error) {
      setAdminMessage(handleRequestError(error, 'Could not resolve this report.'));
    }
  };

  const handleReportMessage = async () => {
    if (!activeChat || !reportingMessage?._id || !reportReason.trim()) {
      setReportMessage('Choose a message and enter a reason.');
      return;
    }
    setReportLoading(true);
    setReportMessage('');
    try {
      await apiRequest(`/conversations/${activeChat.id}/messages/${reportingMessage._id}/reports`, {
        method: 'POST',
        body: { reason: reportReason.trim() },
      });
      setReportingMessage(null);
      setReportReason('');
      setReportMessage('');
      setDashboardMessage('Report sent.');
    } catch (error) {
      setReportMessage(handleRequestError(error, 'Could not report this message.'));
    } finally {
      setReportLoading(false);
    }
  };

  const handleRemoveMessage = async (message: Message) => {
    if (!message._id) return;
    try {
      await apiRequest(`/admin/messages/${message._id}`, { method: 'DELETE' });
      setLiveMessages((previous) => previous.map((item) =>
        item._id === message._id ? { ...item, isRemoved: true, text: 'Message removed by an admin' } : item
      ));
      if (currentUser?.status === 2) await refreshAdminData();
    } catch (error) {
      setDashboardMessage(handleRequestError(error, 'Could not remove this message.'));
    }
  };

  useEffect(() => {
    if (!currentUser?._id || conversationRecords.length === 0) return;
    let cancelled = false;
    const checkUnread = async () => {
      const results = await Promise.all(conversationRecords.map(async (conversation) => {
        const key = `harmony:last-read:${currentUser._id}:${conversation.id}`;
        if (activeChat?.id === conversation.id) {
          await AsyncStorage.setItem(key, new Date().toISOString());
          return { id: conversation.id, unread: false };
        }
        let readAt = await AsyncStorage.getItem(key);
        if (!readAt) {
          readAt = conversation.lastMessageAt || new Date().toISOString();
          await AsyncStorage.setItem(key, readAt);
          return { id: conversation.id, unread: false };
        }
        try {
          const payload = await apiRequest<any>(
            `/conversations/${conversation.id}/messages?after=${encodeURIComponent(readAt)}`
          );
          const hasIncoming = (payload.messages ?? []).some((message: any) =>
            String(message.sender?._id ?? message.sender) !== String(currentUser._id)
          );
          return { id: conversation.id, unread: hasIncoming };
        } catch (error) {
          setDashboardMessage(handleRequestError(error, 'Could not refresh unread messages.'));
          return { id: conversation.id, unread: null };
        }
      }));
      if (cancelled) return;
      setUnreadConversationIds((previous) => {
        const unread = new Set(previous);
        results.forEach((result) => {
          if (result.unread === true) unread.add(result.id);
          if (result.unread === false) unread.delete(result.id);
        });
        return Array.from(unread);
      });
    };
    void checkUnread();
    const intervalId = setInterval(() => void checkUnread(), 15000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [currentUser?._id, conversationRecords, activeChat?.id]);

  const filteredReports = reportedMessages.filter((report) =>
    (adminReportFilter === 'all' || report.status === adminReportFilter) &&
    `${report.user} ${report.reportedBy} ${report.channel} ${report.reason} ${report.content}`
      .toLowerCase()
      .includes(adminReportSearch.trim().toLowerCase())
  );

  // =========================================================================
  // VIEW 1: FULL-SCREEN ACTIVE CHAT OR ADMIN CHAT
  // =========================================================================
  if (activeChat) {
    const isAdminChat = activeChat.type === 'admin-chat';
    const currentMessages = isAdminChat ? adminChatMessages : liveMessages;

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={[styles.chatScreenContainer, Platform.OS === 'android' && { paddingTop: 25 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {isAdminChat ? '🔒 #admin-lounge' : activeChat.type === 'dm' ? `@ ${activeChat.name}${activeChat.isBlocked ? ' (Blocked)' : ''}` : `# ${activeChat.channel}`}
              </Text>
              {activeChat.type === 'group' && <Text style={styles.chatHeaderSubtitle}>{activeChat.name}</Text>}
            </View>
          </View>

          {dashboardMessage ? (
            <Text style={{ color: '#f0b232', paddingHorizontal: 16, paddingTop: 8 }}>{dashboardMessage}</Text>
          ) : null}
          {activeChat.type === 'dm' && activeChat.isBlocked ? (
            <Text style={{ color: '#f23f43', paddingHorizontal: 16, paddingVertical: 8, textAlign: 'center' }}>
              You have blocked this user. Messages cannot be sent or received.
            </Text>
          ) : null}

          <FlatList
            data={currentMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatFeedContent}
            ListEmptyComponent={<Text style={styles.emptyChatText}>No messages here yet. Say hello!</Text>}
            renderItem={({ item }) => (
              <View>
                <View style={styles.messageRow}>
                  <View style={styles.messageAvatar}>
                    <Text style={styles.avatarLetter}>{item.sender[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.messageMetaRow}>
                      <Text style={styles.messageSender}>{item.sender}</Text>
                      <Text style={styles.messageTime}>{item.timestamp}</Text>
                    </View>
                    <Text style={[styles.messageBody, item.isRemoved && { color: '#f23f43', fontStyle: 'italic' }]}>
                      {item.isRemoved ? 'Message removed by an admin' : item.text}
                    </Text>
                  </View>
                </View>
                {!item.isRemoved && !isAdminChat && (
                  <View style={{ flexDirection: 'row', gap: 8, marginLeft: 50, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setReportingMessage(item);
                        setReportReason('');
                        setReportMessage('');
                      }}
                      style={styles.adminActionBtn}
                    >
                      <Text style={{ color: '#fff', fontSize: 11 }}>Report</Text>
                    </TouchableOpacity>
                    {currentUser?.status === 2 && (
                      <TouchableOpacity onPress={() => void handleRemoveMessage(item)} style={[styles.adminActionBtn, { backgroundColor: '#f23f43' }]}>
                        <Text style={{ color: '#fff', fontSize: 11 }}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          />

          <View style={[styles.chatInputWrapper, Platform.OS === 'android' && { marginBottom: 55 }]}>
            <TextInput
              style={styles.chatTextInput}
              placeholder={isAdminChat ? 'Message #admin-lounge' : `Message #${activeChat.channel || activeChat.name}`}
              placeholderTextColor="#949ba4"
              value={messageInput}
              onChangeText={setMessageInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              editable={!isAdminChat && !activeChat.isBlocked}
            />
            <TouchableOpacity onPress={() => void handleSendMessage()} style={styles.sendButton} disabled={isAdminChat || activeChat.isBlocked}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={!!reportingMessage} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Report message</Text>
              <Text style={styles.modalDesc}>Tell an admin why this message should be reviewed.</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Reason"
                placeholderTextColor="#72767d"
                value={reportReason}
                onChangeText={setReportReason}
                maxLength={500}
              />
              {reportMessage ? <Text style={{ color: '#f23f43', marginBottom: 10 }}>{reportMessage}</Text> : null}
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setReportingMessage(null)} disabled={reportLoading}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleReportMessage()} style={styles.modalConfirm} disabled={reportLoading}>
                  <Text style={styles.modalConfirmText}>{reportLoading ? 'Sending…' : 'Submit report'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN DASHBOARD
  // =========================================================================
  if (selectedRailId === 'admin' && currentUser?.status === 2) {
    const filteredAdminUsers = adminUsersList.filter(
      (user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
          user.username.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
          user.id.includes(adminUserSearch);
        const matchesFilter =
          adminUserFilter === 'all' ||
          (adminUserFilter === 'active' && user.status === 'Active') ||
          (adminUserFilter === 'disabled' && user.status === 'Disabled') ||
          (adminUserFilter === 'admin' && user.role === 'System Admin');
        return matchesSearch && matchesFilter;
      }
    );
    const regularAdminUsers = adminUsersList.filter((user) => user.role !== 'System Admin');
    const allRegularUsersDisabled =
      regularAdminUsers.length > 0 &&
      regularAdminUsers.every((user) => user.status === 'Disabled');

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainSplitContainer}>
          {/* FAR-LEFT RAIL */}
          <View style={styles.leftRail}>
            <TouchableOpacity onPress={() => setSelectedRailId('dm')} style={styles.railIconBox}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>H</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedRailId('admin')}
              style={[styles.railIconBox, styles.railIconBoxActive, { backgroundColor: '#f23f43' }]}
            >
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </TouchableOpacity>

            <View style={styles.railDivider} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {groupChats.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => setSelectedRailId(group.id)}
                  style={[styles.railGroupBox, { backgroundColor: '#2b2d31' }]}
                >
                  <Text style={styles.railGroupText}>{group.avatarText}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => void openCreateGroup()} style={styles.railAddButton}>
                <Text style={styles.railAddText}>+</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* ADMIN PANEL MAIN CONTENT */}
          <View style={styles.rightPanel}>
            <View style={styles.adminHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
                <Text style={styles.panelTitle}>Admin Dashboard</Text>
              </View>
              <View style={styles.adminModeBadge}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>ADMIN MODE</Text>
              </View>
            </View>

            {/* Admin Nav Tabs */}
            <View style={styles.adminTabsRow}>
              <TouchableOpacity
                onPress={() => setAdminTab('users')}
                style={[styles.adminTabBtn, adminTab === 'users' && styles.adminTabActive]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>👥 User Management ({adminUsersList.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdminTab('reports')}
                style={[styles.adminTabBtn, adminTab === 'reports' && styles.adminTabActive, { backgroundColor: adminTab === 'reports' ? '#f23f43' : '#383a40' }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>🚨 Reported Messages ({reportedMessages.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdminTab('chat')}
                style={[styles.adminTabBtn, adminTab === 'chat' && styles.adminTabActive, { backgroundColor: adminTab === 'chat' ? '#5865F2' : '#383a40' }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>💬 Admin Chat unavailable</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              {adminMessage ? <Text style={{ color: adminMessage.startsWith('Success:') ? '#23a55a' : '#f23f43', flex: 1, marginRight: 8 }}>{adminMessage}</Text> : <View />}
              <TouchableOpacity onPress={() => void handleAdminRefresh()} disabled={adminLoading} style={styles.adminActionBtn}>
                <Text style={{ color: '#fff', fontSize: 12 }}>{adminLoading ? 'Refreshing…' : 'Refresh'}</Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: USER MANAGEMENT */}
            {adminTab === 'users' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <Text style={{ color: '#949ba4', fontSize: 12, marginBottom: 10 }}>
                  Admin-created accounts must verify their email before signing in. Bulk status changes apply to regular accounts only.
                </Text>
                <View style={styles.adminSearchBox}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 13 }}
                    placeholder="Search ID, username, or email"
                    placeholderTextColor="#949ba4"
                    value={adminUserSearch}
                    onChangeText={setAdminUserSearch}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {(['all', 'active', 'disabled', 'admin'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setAdminUserFilter(filter)}
                      style={[styles.adminActionBtn, adminUserFilter === filter && styles.adminTabActive]}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, textTransform: 'capitalize' }}>{filter}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => void toggleAllRegularUsers()}
                    disabled={bulkStatusLoading || regularAdminUsers.length === 0}
                    style={[styles.adminActionBtn, { backgroundColor: allRegularUsersDisabled ? '#23a55a' : '#f23f43', opacity: bulkStatusLoading || regularAdminUsers.length === 0 ? 0.6 : 1 }]}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {bulkStatusLoading ? 'Updating…' : allRegularUsersDisabled ? 'Enable All' : 'Disable All'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setAdminMessage('');
                      setShowCreateAdminModal(true);
                    }}
                    style={[styles.adminActionBtn, { backgroundColor: '#5865F2' }]}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Add Admin</Text>
                  </TouchableOpacity>
                </View>

                {adminLoading ? <Text style={{ color: '#949ba4', textAlign: 'center', marginTop: 24 }}>Loading users…</Text> : null}
                {!adminLoading && filteredAdminUsers.length === 0 ? (
                  <Text style={{ color: '#949ba4', textAlign: 'center', marginTop: 24 }}>No users found.</Text>
                ) : null}
                {filteredAdminUsers.map((u) => (
                  <View key={u.id} style={styles.adminUserCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#949ba4', fontWeight: 'bold', fontSize: 12 }}>ID: {u.id}</Text>
                      <View style={[styles.statusPill, { backgroundColor: u.status === 'Disabled' ? '#f23f43' : u.verified ? '#23a55a' : '#f0b232' }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                          {u.status === 'Disabled' ? 'Disabled' : u.verified ? 'Active' : 'Unverified'}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                      {u.name} {u.role === 'System Admin' && <Text style={styles.adminBadge}>ADMIN</Text>}
                    </Text>

                    <Text style={{ color: '#00a8fc', fontSize: 13 }}>{u.username} • {u.email}</Text>
                    <Text style={{ color: '#949ba4', fontSize: 12, marginTop: 2 }}>Role: {u.role}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity onPress={() => openAdminUserEditor(u)} style={styles.adminActionBtn}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                      </TouchableOpacity>
                      {u.role !== 'System Admin' && (
                        <TouchableOpacity
                          onPress={() => void toggleUserStatus(u)}
                          disabled={adminActionLoadingId === u.id}
                          style={[styles.adminActionBtn, { backgroundColor: u.status === 'Active' ? '#f23f43' : '#23a55a' }]}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                            {adminActionLoadingId === u.id ? 'Saving…' : u.status === 'Active' ? 'Disable' : 'Enable'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* TAB 2: REPORTED MESSAGES */}
            {adminTab === 'reports' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={styles.adminSearchBox}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 13 }}
                    placeholder="Search reports"
                    placeholderTextColor="#949ba4"
                    value={adminReportSearch}
                    onChangeText={setAdminReportSearch}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {(['pending', 'all', 'kept', 'deleted'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setAdminReportFilter(filter)}
                      style={[styles.adminActionBtn, adminReportFilter === filter && styles.adminTabActive]}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, textTransform: 'capitalize' }}>{filter}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {adminLoading ? (
                  <Text style={{ color: '#949ba4', textAlign: 'center', marginTop: 24 }}>Loading reports…</Text>
                ) : filteredReports.length === 0 ? (
                  <Text style={{ color: '#949ba4', textAlign: 'center', marginTop: 40 }}>No reports found.</Text>
                ) : (
                  filteredReports.map((r) => (
                    <View key={r.id} style={styles.adminReportCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#f23f43', fontWeight: 'bold', fontSize: 13 }}>{r.user} in {r.channel}</Text>
                        <Text style={{ color: r.status === 'pending' ? '#f0b232' : '#949ba4', fontSize: 11, fontWeight: 'bold' }}>
                          {r.groupDeleted
                            ? `Group deleted${r.status === 'kept' ? ' • Seen' : r.status === 'pending' ? ' • Needs review' : ''}`
                            : r.status === 'pending' ? 'Pending' : r.status === 'kept' ? 'Kept' : 'Deleted'}
                        </Text>
                      </View>
                      <View style={styles.reportedContentBox}>
                        <Text style={{ color: '#fff', fontSize: 14 }} numberOfLines={2}>{r.status === 'deleted' ? '[Message removed by administrator]' : r.content}</Text>
                      </View>
                      <Text style={{ color: '#f0b232', fontSize: 11, marginTop: 6 }}>Reason: {r.reason}</Text>
                      <Text style={{ color: '#949ba4', fontSize: 11, marginTop: 6 }}>Reported by {r.reportedBy} (Report #{r.id})</Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => setSelectedReport(r)}
                          style={styles.reviewDetailsBtn}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Review Details</Text>
                        </TouchableOpacity>
                        {r.status === 'pending' && (
                          <TouchableOpacity
                            onPress={() => void handleResolveReport(r, 'kept')}
                            style={[styles.reviewDetailsBtn, { marginLeft: 8, backgroundColor: '#23a55a' }]}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                              {r.groupDeleted ? 'Mark as seen' : 'Keep'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* TAB 3: ADMIN CHAT */}
            {adminTab === 'chat' && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#f23f43', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>🔒 #admin-lounge</Text>
                <Text style={{ color: '#949ba4', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
                  Admin chat is not available in the current API.
                </Text>
              </View>
            )}
          </View>
        </View>

        <Modal visible={!!editingAdminUser} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            {editingAdminUser && (
              <View style={[styles.modalBox, { maxHeight: '85%' }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalTitle}>Edit User</Text>
                  <Text style={styles.settingsFieldLabel}>USERNAME</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={adminEditForm.username}
                    onChangeText={(username) => setAdminEditForm((previous) => ({ ...previous, username }))}
                    autoCapitalize="none"
                  />
                  <Text style={styles.settingsFieldLabel}>DISPLAY NAME</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={adminEditForm.nickname}
                    onChangeText={(nickname) => setAdminEditForm((previous) => ({ ...previous, nickname }))}
                    maxLength={32}
                  />
                  <Text style={styles.settingsFieldLabel}>EMAIL</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={adminEditForm.email}
                    onChangeText={(email) => setAdminEditForm((previous) => ({ ...previous, email }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Text style={styles.settingsFieldLabel}>ROLE</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {(['Member', 'System Admin'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        onPress={() => setAdminEditForm((previous) => ({ ...previous, role }))}
                        style={[styles.adminActionBtn, adminEditForm.role === role && styles.adminTabActive]}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {adminMessage ? (
                    <Text style={{ color: adminMessage.startsWith('Success:') ? '#23a55a' : '#f23f43', marginVertical: 8 }}>
                      {adminMessage}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => void saveAdminUser()}
                    style={styles.modalConfirm}
                    disabled={adminFormLoading}
                  >
                    <Text style={styles.modalConfirmText}>{adminFormLoading ? 'Saving…' : 'Save User'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.settingsFieldLabel, { marginTop: 16 }]}>SET NEW PASSWORD</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                      value={adminEditForm.password}
                      onChangeText={(password) => setAdminEditForm((previous) => ({ ...previous, password }))}
                      secureTextEntry={!showAdminEditPassword}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#72767d"
                    />
                    <TouchableOpacity onPress={() => setShowAdminEditPassword(!showAdminEditPassword)} style={{ paddingHorizontal: 10 }}>
                      <Text style={{ color: '#00a8fc' }}>{showAdminEditPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                      value={adminEditForm.confirmPassword}
                      onChangeText={(confirmPassword) => setAdminEditForm((previous) => ({ ...previous, confirmPassword }))}
                      secureTextEntry={!showAdminEditConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#72767d"
                    />
                    <TouchableOpacity onPress={() => setShowAdminEditConfirmPassword(!showAdminEditConfirmPassword)} style={{ paddingHorizontal: 10 }}>
                      <Text style={{ color: '#00a8fc' }}>{showAdminEditConfirmPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => void resetAdminUserPassword()}
                    style={[styles.modalConfirm, { backgroundColor: '#f0b232', marginBottom: 12 }]}
                    disabled={adminFormLoading}
                  >
                    <Text style={[styles.modalConfirmText, { color: '#111' }]}>
                      {adminFormLoading ? 'Updating…' : 'Set Password'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setEditingAdminUser(null)} disabled={adminFormLoading}>
                      <Text style={styles.modalCancel}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </Modal>

        <Modal visible={showCreateAdminModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '85%' }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Create Admin Account</Text>
                <Text style={styles.modalDesc}>The new administrator must verify their email before signing in.</Text>
                <Text style={styles.settingsFieldLabel}>USERNAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newAdminForm.username}
                  onChangeText={(username) => setNewAdminForm((previous) => ({ ...previous, username }))}
                  autoCapitalize="none"
                />
                <Text style={styles.settingsFieldLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newAdminForm.nickname}
                  onChangeText={(nickname) => setNewAdminForm((previous) => ({ ...previous, nickname }))}
                  maxLength={32}
                />
                <Text style={styles.settingsFieldLabel}>EMAIL</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newAdminForm.email}
                  onChangeText={(email) => setNewAdminForm((previous) => ({ ...previous, email }))}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.settingsFieldLabel}>PASSWORD</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    value={newAdminForm.password}
                    onChangeText={(password) => setNewAdminForm((previous) => ({ ...previous, password }))}
                    secureTextEntry={!showAdminCreatePassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#72767d"
                  />
                  <TouchableOpacity onPress={() => setShowAdminCreatePassword(!showAdminCreatePassword)} style={{ paddingHorizontal: 10 }}>
                    <Text style={{ color: '#00a8fc' }}>{showAdminCreatePassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    value={newAdminForm.confirmPassword}
                    onChangeText={(confirmPassword) => setNewAdminForm((previous) => ({ ...previous, confirmPassword }))}
                    secureTextEntry={!showAdminCreateConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="#72767d"
                  />
                  <TouchableOpacity onPress={() => setShowAdminCreateConfirmPassword(!showAdminCreateConfirmPassword)} style={{ paddingHorizontal: 10 }}>
                    <Text style={{ color: '#00a8fc' }}>{showAdminCreateConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {adminMessage ? <Text style={{ color: '#f23f43', marginBottom: 8 }}>{adminMessage}</Text> : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowCreateAdminModal(false)} disabled={adminFormLoading}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void createAdminAccount()}
                    style={styles.modalConfirm}
                    disabled={adminFormLoading}
                  >
                    <Text style={styles.modalConfirmText}>{adminFormLoading ? 'Creating…' : 'Create Admin'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- REPORT DETAILS MODAL --- */}
        <Modal visible={!!selectedReport} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            {selectedReport && (
              <View style={styles.reportModalBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🚩</Text>
                  <Text style={{ color: '#f2f3f5', fontSize: 18, fontWeight: 'bold' }}>Review Report #{selectedReport.id}</Text>
                </View>

                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Author:</Text>
                  <Text style={styles.reportDetailVal}>{selectedReport.user}</Text>
                </View>

                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Reported By:</Text>
                  <Text style={styles.reportDetailVal}>{selectedReport.reportedBy}</Text>
                </View>

                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Channel / Location:</Text>
                  <Text style={styles.reportDetailVal}>{selectedReport.channel}</Text>
                </View>

                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Timestamp:</Text>
                  <Text style={styles.reportDetailVal}>{selectedReport.timestamp}</Text>
                </View>

                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Flag Reason:</Text>
                  <Text style={[styles.reportDetailVal, { color: '#f23f43', fontWeight: 'bold' }]}>{selectedReport.reason}</Text>
                </View>
                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailKey}>Status:</Text>
                  <Text style={styles.reportDetailVal}>
                    {selectedReport.groupDeleted
                      ? `Group deleted${selectedReport.status === 'kept' ? ' • Seen' : selectedReport.status === 'pending' ? ' • Needs review' : ''}`
                      : selectedReport.status}
                  </Text>
                </View>

                <Text style={{ color: '#949ba4', fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' }}>Message Content</Text>
                <View style={styles.reportContentBox}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>
                    {selectedReport.status === 'deleted' ? '[Message removed by administrator]' : selectedReport.content}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                  <TouchableOpacity onPress={() => setSelectedReport(null)}>
                    <Text style={{ color: '#f2f3f5', fontWeight: 'bold', fontSize: 14 }}>Close</Text>
                  </TouchableOpacity>

                  {selectedReport.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {selectedReport.groupDeleted ? (
                        <TouchableOpacity
                          onPress={() => void handleResolveReport(selectedReport, 'kept')}
                          style={styles.keepMessageBtn}
                        >
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Mark as seen</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            onPress={() => void handleResolveReport(selectedReport, 'kept')}
                            style={styles.keepMessageBtn}
                          >
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>✓ Keep Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => void handleResolveReport(selectedReport, 'deleted')}
                            style={styles.getRidMessageBtn}
                          >
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>🗑️ Delete Message</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 3: MAIN NAVIGATION DRAWER (DM or Group Channels)
  // =========================================================================
  const selectedGroup = groupChats.find((g) => g.id === selectedRailId);
  const filteredFriends = friends.filter((f) =>
    `${f.name} ${f.username}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const requestRows = [
    ...incomingFriendRequests.map((friend) => ({ ...friend, requestDirection: 'incoming' as const })),
    ...outgoingFriendRequests.map((friend) => ({ ...friend, requestDirection: 'outgoing' as const })),
  ];
  const friendRows = friendsTab === 'friends'
    ? filteredFriends.map((friend) => ({ ...friend, requestDirection: 'friend' as const }))
    : requestRows;
  const displayName = currentUser?.nickname || currentUser?.username || 'User';
  const maskEmail = (email?: string) => {
    if (!email || !email.includes('@')) return '••••••••';
    const [, domain] = email.split('@');
    return `••••••••@${domain}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {dashboardLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1f22' }}>
          <Text style={{ color: '#f2f3f5' }}>Loading your Harmony account…</Text>
        </View>
      ) : (
      <View style={styles.mainSplitContainer}>
        {/* FAR-LEFT VERTICAL ICON RAIL */}
        <View style={styles.leftRail}>
          <TouchableOpacity
            onPress={() => setSelectedRailId('dm')}
            style={[styles.railIconBox, selectedRailId === 'dm' && styles.railIconBoxActive]}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>H</Text>
          </TouchableOpacity>

          {currentUser?.status === 2 && (
            <TouchableOpacity
              onPress={() => setSelectedRailId('admin')}
              style={[styles.railIconBox, { marginTop: 8, backgroundColor: '#383a40' }]}
            >
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </TouchableOpacity>
          )}

          <View style={styles.railDivider} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {groupChats.map((group) => {
              const isSelected = selectedRailId === group.id;
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => setSelectedRailId(group.id)}
                  style={[
                    styles.railGroupBox,
                    { backgroundColor: isSelected ? '#5865F2' : '#2b2d31' },
                    isSelected && styles.railGroupSelected,
                  ]}
                >
                  <Text style={styles.railGroupText}>{group.avatarText}</Text>
                  {unreadConversationIds.includes(group.id) && (
                    <View style={styles.unreadDot}><Text style={styles.unreadDotText}>!</Text></View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={() => void openCreateGroup()} style={styles.railAddButton}>
              <Text style={styles.railAddText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* RIGHT CONTENT PANEL */}
        <View style={styles.rightPanel}>
          {selectedRailId === 'dm' ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Messages</Text>

              {dashboardMessage ? <Text style={{ color: '#f0b232', marginBottom: 8 }}>{dashboardMessage}</Text> : null}

              <View style={styles.dmActionRow}>
                <View style={styles.searchPill}>
                  <Text style={{ color: '#949ba4', marginRight: 6 }}>🔍</Text>
                  <TextInput
                    style={styles.searchPillInput}
                    placeholder="Search"
                    placeholderTextColor="#949ba4"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <TouchableOpacity onPress={() => { setFriendRequestMessage(''); setShowAddFriendModal(true); }} style={styles.addFriendPill}>
                  <Text style={styles.addFriendPillText}>👥 Add Friends</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setFriendsTab('friends')} style={[styles.adminActionBtn, friendsTab === 'friends' && styles.adminTabActive]}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>Friends ({friends.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFriendsTab('requests')} style={[styles.adminActionBtn, friendsTab === 'requests' && styles.adminTabActive]}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>Requests ({incomingFriendRequests.length + outgoingFriendRequests.length})</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={friendRows}
                keyExtractor={(item) => `${item.friendshipId}-${item.id}`}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={
                  <Text style={{ color: '#949ba4', textAlign: 'center', marginTop: 32 }}>
                    {friendsTab === 'friends' ? 'No friends found.' : 'No pending friend requests.'}
                  </Text>
                }
                renderItem={({ item }) => {
                  if (item.requestDirection !== 'friend') {
                    const isIncoming = item.requestDirection === 'incoming';
                    return (
                      <View style={styles.dmRow}>
                        <View style={[styles.dmAvatar, { backgroundColor: item.color }]}>
                          <Text style={styles.avatarLetter}>{item.avatarText}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dmName}>{item.name}</Text>
                          <Text style={styles.dmPreview}>{isIncoming ? 'Incoming friend request' : 'Outgoing request'}</Text>
                        </View>
                        {isIncoming ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity onPress={() => void handleFriendRequestAction(item, 'accept')} style={[styles.adminActionBtn, { backgroundColor: '#23a55a' }]}>
                              <Text style={{ color: '#fff', fontSize: 11 }}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => void handleFriendRequestAction(item, 'remove')} style={styles.adminActionBtn}>
                              <Text style={{ color: '#fff', fontSize: 11 }}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => void handleFriendRequestAction(item, 'remove')} style={styles.adminActionBtn}>
                            <Text style={{ color: '#fff', fontSize: 11 }}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }
                  const conversation = conversationRecords.find(
                    (record) => record.type === 0 && record.members.includes(item.id)
                  );
                  return (
                    <View style={styles.dmRow}>
                      <TouchableOpacity onPress={() => void handleOpenDM(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <View style={[styles.dmAvatar, { backgroundColor: item.color }]}>
                          <Text style={styles.avatarLetter}>{item.avatarText}</Text>
                          {conversation && unreadConversationIds.includes(conversation.id) && (
                            <View style={styles.unreadDot}><Text style={styles.unreadDotText}>!</Text></View>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.dmRowTop}>
                            <Text style={[styles.dmName, item.isBlocked && { color: '#949ba4' }]} numberOfLines={1}>{item.name}</Text>
                            {conversation?.lastMessageAt && <Text style={styles.dmTime}>{formatTimestamp(conversation.lastMessageAt)}</Text>}
                          </View>
                          <Text style={[styles.dmPreview, item.isBlocked && { color: '#f23f43' }]} numberOfLines={1}>
                            {item.isBlocked ? 'Blocked' : `@${item.username} • Presence unavailable`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setProfileFriend(item)}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#383a40', alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel={`Manage ${item.name}`}
                        hitSlop={8}
                      >
                        <Text style={{ color: '#fff', fontSize: 18 }}>⚙</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          ) : (
            selectedGroup && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={styles.panelTitle}>{selectedGroup.name} ›</Text>
                  <Text style={{ color: '#949ba4', fontSize: 10 }}>Invites unavailable</Text>
                </View>

                <Text style={{ color: '#949ba4', fontSize: 12, marginBottom: 14 }}>
                  Groups use one shared conversation. Separate channels and adding members are not supported by the API.
                </Text>
                <Text style={styles.channelCategoryHeader}>Group Chat</Text>
                {selectedGroup.channels.map((channel) => (
                  <TouchableOpacity
                    key={channel}
                    onPress={() => void handleOpenGroup(selectedGroup)}
                    style={styles.channelRow}
                  >
                    <Text style={styles.channelHash}>#</Text>
                    <Text style={styles.channelName}>{channel} (shared)</Text>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.channelCategoryHeader, { marginTop: 16 }]}>Members</Text>
                {selectedGroup.members.map((member) => (
                  <Text key={member.id} style={{ color: '#dbdee1', paddingVertical: 5 }}>
                    {member.nickname || member.username} <Text style={{ color: '#949ba4' }}>@{member.username}</Text>
                  </Text>
                ))}
                <TouchableOpacity onPress={() => { setGroupActionError(''); setShowGroupActionModal(true); }} style={[styles.adminActionBtn, { marginTop: 14, alignSelf: 'flex-start', backgroundColor: selectedGroup.createdBy === String(currentUser?._id) ? '#f23f43' : '#383a40' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {selectedGroup.createdBy === String(currentUser?._id) ? 'Delete Group' : 'Leave Group'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )
          )}
        </View>

        {/* FLOATING BOTTOM USER PROFILE DOCK */}
        <TouchableOpacity
          onPress={() => setShowSettingsModal(true)}
          activeOpacity={0.85}
          style={styles.floatingProfileDock}
        >
          <View style={styles.dockAvatar}>
            <Text style={styles.avatarLetter}>{displayName[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dockUsername}>{displayName}</Text>
            <Text style={styles.dockSubtext}>@{currentUser?.username} • Settings</Text>
          </View>
          <Text style={{ fontSize: 18, color: '#b5bac1' }}>⚙️</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* ===================================================================== */}
      {/* 1. USER SETTINGS MODAL                                                */}
      {/* ===================================================================== */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalBox}>
            <Text style={styles.settingsModalHeader}>User Settings</Text>

            <Text style={styles.settingsFieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={profileNickname}
              onChangeText={setProfileNickname}
              maxLength={32}
              placeholderTextColor="#72767d"
            />

            <Text style={styles.settingsFieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.modalInput}
              value={profileUsername}
              onChangeText={setProfileUsername}
              autoCapitalize="none"
              maxLength={32}
              placeholderTextColor="#72767d"
            />
            <TouchableOpacity onPress={() => void handleSaveProfile()} style={[styles.modalConfirm, { marginTop: 8 }]} disabled={profileLoading}>
              <Text style={styles.modalConfirmText}>{profileLoading ? 'Saving…' : 'Save Profile'}</Text>
            </TouchableOpacity>
            {profileMessage ? <Text style={{ color: profileMessage === 'Profile updated.' ? '#23a55a' : '#f23f43', marginTop: 8 }}>{profileMessage}</Text> : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.settingsFieldLabel}>EMAIL</Text>
              <TouchableOpacity onPress={() => setRevealEmail(!revealEmail)}>
                <Text style={{ color: '#00a8fc', fontSize: 12, fontWeight: 'bold' }}>{revealEmail ? 'Hide' : 'Reveal'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsInputCard}>
              <Text style={{ color: '#fff', fontSize: 14 }}>
                {revealEmail ? currentUser?.email || 'Not available' : maskEmail(currentUser?.email)}
              </Text>
            </View>

            <View style={styles.settingsInputCard}>
              <Text style={{ color: '#949ba4', fontSize: 12 }}>Phone number is not available through the account API.</Text>
            </View>

            {currentUser?.status === 2 && (
              <View style={styles.adminControlsCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Admin Controls</Text>
                  <Text style={{ color: '#949ba4', fontSize: 11, marginTop: 2 }}>Manage users, roles, and account statuses</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowSettingsModal(false);
                    setSelectedRailId('admin');
                  }}
                  style={styles.openAdminPanelBtn}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Open Admin Panel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Password & Security</Text>
              <TouchableOpacity
                onPress={() => { setPasswordMessage(''); setShowChangePasswordModal(true); }}
                style={styles.changePasswordBtn}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Change Password</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}>
              <TouchableOpacity onPress={handleLogout} style={styles.settingsLogoutBtn}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 2. CHANGE PASSWORD MODAL                                              */}
      {/* ===================================================================== */}
      <Modal visible={showChangePasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ color: '#f2f3f5', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Change Password</Text>

            <Text style={styles.settingsFieldLabel}>CURRENT PASSWORD</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                secureTextEntry={!showCurrentPassword}
                placeholderTextColor="#72767d"
                value={currentPasswordInput}
                onChangeText={setCurrentPasswordInput}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ paddingHorizontal: 10 }}>
                <Text style={{ color: '#00a8fc' }}>{showCurrentPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsFieldLabel}>NEW PASSWORD</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                secureTextEntry={!showNewPassword}
                placeholderTextColor="#72767d"
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 10 }}>
                <Text style={{ color: '#00a8fc' }}>{showNewPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsFieldLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor="#72767d"
                value={confirmPasswordInput}
                onChangeText={setConfirmPasswordInput}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 10 }}>
                <Text style={{ color: '#00a8fc' }}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {passwordMessage ? (
              <Text style={{ color: passwordMessage === 'Password changed successfully.' ? '#23a55a' : '#f23f43', marginTop: 6 }}>
                {passwordMessage}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)} disabled={passwordLoading}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleChangePassword()}
                style={styles.modalConfirm}
                disabled={passwordLoading}
              >
                <Text style={styles.modalConfirmText}>{passwordLoading ? 'Updating…' : 'Update Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* OTHER MODALS (Add Friend, Create Group)                               */}
      {/* ===================================================================== */}
      <Modal visible={!!profileFriend} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {profileFriend && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{profileFriend.name}</Text>
              <Text style={{ color: '#00a8fc', textAlign: 'center', marginBottom: 12 }}>@{profileFriend.username}</Text>
              <View style={{ gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={handleToggleFriendBlock}
                  style={[styles.modalConfirm, { backgroundColor: '#383a40' }]}
                >
                  <Text style={styles.modalConfirmText}>{profileFriend.isBlocked ? 'Unblock User' : 'Block User'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setFriendActionMessage('');
                    setFriendToRemove(profileFriend);
                    setProfileFriend(null);
                  }}
                  style={[styles.modalConfirm, { backgroundColor: '#f23f43' }]}
                >
                  <Text style={styles.modalConfirmText}>Remove Friend</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setProfileFriend(null)}>
                  <Text style={styles.modalCancel}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!friendToRemove} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {friendToRemove && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Remove friend?</Text>
              <Text style={styles.modalDesc}>Remove {friendToRemove.name} from your friends?</Text>
              {friendActionMessage ? <Text style={{ color: '#f23f43', marginBottom: 10 }}>{friendActionMessage}</Text> : null}
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setFriendToRemove(null)} disabled={friendActionLoading}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleRemoveFriend()} style={[styles.modalConfirm, { backgroundColor: '#f23f43' }]} disabled={friendActionLoading}>
                  <Text style={styles.modalConfirmText}>{friendActionLoading ? 'Removing…' : 'Remove Friend'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={showAddFriendModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <Text style={styles.modalDesc}>Enter their exact Harmony username.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Username"
              placeholderTextColor="#72767d"
              value={newFriendName}
              onChangeText={setNewFriendName}
              autoCapitalize="none"
            />
            {friendRequestMessage ? (
              <Text style={{ color: friendRequestMessage.startsWith('Request sent') ? '#23a55a' : '#f23f43', marginBottom: 10 }}>
                {friendRequestMessage}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)} disabled={friendRequestLoading}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleAddFriend()} style={styles.modalConfirm} disabled={friendRequestLoading}>
                <Text style={styles.modalConfirmText}>{friendRequestLoading ? 'Sending…' : 'Send Request'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateGroupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalDesc}>Give your group a name and select 2–9 other members.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name"
              placeholderTextColor="#72767d"
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={80}
            />
            <Text style={{ color: '#b5bac1', fontSize: 12, marginBottom: 6 }}>
              Members selected: {selectedMemberIds.length}/9
            </Text>
            <ScrollView style={{ maxHeight: 220, marginBottom: 8 }} keyboardShouldPersistTaps="handled">
              {groupLoading ? (
                <Text style={{ color: '#949ba4', padding: 10 }}>Loading eligible members…</Text>
              ) : eligibleUsers.length === 0 ? (
                <Text style={{ color: '#949ba4', padding: 10 }}>No eligible members available.</Text>
              ) : eligibleUsers.map((user) => {
                const selected = selectedMemberIds.includes(user._id);
                const atLimit = selectedMemberIds.length >= 9 && !selected;
                return (
                  <TouchableOpacity
                    key={user._id}
                    onPress={() => setSelectedMemberIds((previous) =>
                      selected
                        ? previous.filter((id) => id !== user._id)
                        : previous.length < 9 ? [...previous, user._id] : previous
                    )}
                    disabled={atLimit || groupLoading || groupSaving}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, opacity: atLimit ? 0.5 : 1 }}
                  >
                    <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: selected ? '#5865F2' : '#949ba4', borderRadius: 3, backgroundColor: selected ? '#5865F2' : 'transparent', marginRight: 10 }} />
                    <Text style={{ color: '#f2f3f5' }}>{user.username}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {groupError ? <Text style={{ color: '#f23f43', marginBottom: 10 }}>{groupError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)} disabled={groupSaving}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleCreateGroup()} style={styles.modalConfirm} disabled={groupLoading || groupSaving}>
                <Text style={styles.modalConfirmText}>{groupSaving ? 'Creating…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGroupActionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {selectedGroup?.createdBy === String(currentUser?._id) ? 'Delete group?' : 'Leave group?'}
            </Text>
            <Text style={styles.modalDesc}>
              {selectedGroup?.createdBy === String(currentUser?._id)
                ? `Delete "${selectedGroup.name}"? Reported messages and reports remain available to admins.`
                : `Leave "${selectedGroup?.name}"? Your existing messages and reports will remain.`}
            </Text>
            {groupActionError ? <Text style={{ color: '#f23f43', marginBottom: 10 }}>{groupActionError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowGroupActionModal(false)} disabled={groupActionLoading}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleGroupAction()} style={[styles.modalConfirm, { backgroundColor: '#f23f43' }]} disabled={groupActionLoading}>
                <Text style={styles.modalConfirmText}>{groupActionLoading ? 'Saving…' : selectedGroup?.createdBy === String(currentUser?._id) ? 'Delete Group' : 'Leave Group'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1e1f22' },
  mainSplitContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#1e1f22' },
  leftRail: { width: 68, backgroundColor: '#1e1f22', alignItems: 'center', paddingTop: 25, paddingBottom: 85 },
  railIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2b2d31', justifyContent: 'center', alignItems: 'center' },
  railIconBoxActive: { backgroundColor: '#5865F2', borderRadius: 16 },
  railDivider: { width: 32, height: 2, backgroundColor: '#35363c', marginVertical: 10 },
  railGroupBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  railGroupSelected: { borderRadius: 16 },
  railGroupText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  unreadDot: { position: 'absolute', right: -3, top: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#f23f43', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#2b2d31' },
  unreadDotText: { color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: 12 },
  railAddButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2b2d31', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  railAddText: { color: '#23a55a', fontSize: 24, fontWeight: 'bold' },
  rightPanel: { flex: 1, backgroundColor: '#2b2d31', borderTopLeftRadius: 20, paddingHorizontal: 16, paddingTop: 25 },
  panelTitle: { color: '#f2f3f5', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  dmActionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1f22', borderRadius: 20, paddingHorizontal: 12, height: 38 },
  searchPillInput: { flex: 1, color: '#f2f3f5', fontSize: 14 },
  addFriendPill: { backgroundColor: '#383a40', borderRadius: 20, paddingHorizontal: 14, height: 38, justifyContent: 'center', alignItems: 'center' },
  addFriendPillText: { color: '#f2f3f5', fontWeight: '600', fontSize: 13 },
  groupInviteBtn: { backgroundColor: '#5865F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  dmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  dmAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarLetter: { color: '#ffffff', fontWeight: 'bold', fontSize: 17 },
  statusDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#2b2d31' },
  dmRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dmName: { color: '#f2f3f5', fontWeight: 'bold', fontSize: 15 },
  dmTime: { color: '#949ba4', fontSize: 11 },
  dmPreview: { color: '#949ba4', fontSize: 13, marginTop: 2 },
  channelCategoryHeader: { color: '#949ba4', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, gap: 10 },
  channelHash: { color: '#949ba4', fontSize: 18, fontWeight: 'bold' },
  channelName: { color: '#dbdee1', fontSize: 16, fontWeight: '500' },
  floatingProfileDock: { position: 'absolute', bottom: 55, left: 12, right: 12, height: 60, backgroundColor: '#1e1f22', borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12, borderWidth: 1, borderColor: '#35363c', elevation: 6 },
  dockAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dockUsername: { color: '#f2f3f5', fontWeight: 'bold', fontSize: 14 },
  dockSubtext: { color: '#949ba4', fontSize: 12 },
  chatScreenContainer: { flex: 1, backgroundColor: '#313338' },
  chatHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#232428', backgroundColor: '#2b2d31', gap: 12 },
  backButton: { padding: 6 },
  backArrow: { color: '#f2f3f5', fontSize: 24, fontWeight: 'bold' },
  chatHeaderTitle: { color: '#f2f3f5', fontSize: 17, fontWeight: 'bold' },
  chatHeaderSubtitle: { color: '#949ba4', fontSize: 12 },
  chatFeedContent: { padding: 16 },
  emptyChatText: { color: '#949ba4', textAlign: 'center', marginTop: 40, fontSize: 14 },
  messageRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  messageAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center' },
  messageMetaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  messageSender: { color: '#f2f3f5', fontWeight: 'bold', fontSize: 15 },
  messageTime: { color: '#949ba4', fontSize: 11 },
  messageBody: { color: '#dbdee1', fontSize: 15, marginTop: 2, lineHeight: 20 },
  chatInputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#2b2d31', borderTopWidth: 1, borderTopColor: '#232428', gap: 8 },
  chatTextInput: { flex: 1, backgroundColor: '#383a40', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#f2f3f5', fontSize: 15 },
  sendButton: { backgroundColor: '#5865F2', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  adminHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  adminModeBadge: { backgroundColor: '#f23f43', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  adminTabsRow: { flexDirection: 'row', gap: 2, marginBottom: 14 },
  adminTabBtn: { backgroundColor: '#383a40', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center' },
  adminTabActive: { backgroundColor: '#5865F2' },
  adminSearchBox: { backgroundColor: '#1e1f22', borderRadius: 6, padding: 10, marginBottom: 12 },
  adminUserCard: { backgroundColor: '#1e1f22', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#35363c' },
  adminBadge: { backgroundColor: '#5865F2', color: '#fff', fontSize: 9, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, overflow: 'hidden' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  adminActionBtn: { backgroundColor: '#383a40', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  adminReportCard: { backgroundColor: '#1e1f22', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f23f43' },
  reportedContentBox: { backgroundColor: '#2b2d31', padding: 10, borderRadius: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#f23f43' },
  reviewDetailsBtn: { backgroundColor: '#383a40', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  settingsModalBox: { backgroundColor: '#313338', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420 },
  settingsModalHeader: { color: '#f2f3f5', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  settingsFieldLabel: { color: '#949ba4', fontSize: 11, fontWeight: 'bold', marginBottom: 4, marginTop: 10 },
  settingsInputCard: { backgroundColor: '#1e1f22', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: '#111214' },
  adminControlsCard: { backgroundColor: '#1e1f22', borderRadius: 8, padding: 12, marginTop: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f23f43' },
  openAdminPanelBtn: { backgroundColor: '#f23f43', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  changePasswordBtn: { backgroundColor: '#5865F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  settingsLogoutBtn: { backgroundColor: '#f23f43', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  reportModalBox: { backgroundColor: '#313338', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420 },
  reportDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reportDetailKey: { color: '#949ba4', fontSize: 13, fontWeight: '600' },
  reportDetailVal: { color: '#f2f3f5', fontSize: 13, fontWeight: '500' },
  reportContentBox: { backgroundColor: '#1e1f22', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#f23f43' },
  keepMessageBtn: { backgroundColor: '#23a55a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  getRidMessageBtn: { backgroundColor: '#f23f43', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#313338', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380 },
  modalTitle: { color: '#f2f3f5', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  modalDesc: { color: '#949ba4', fontSize: 14, marginBottom: 16 },
  modalInput: { backgroundColor: '#1e1f22', borderRadius: 6, padding: 12, color: '#f2f3f5', fontSize: 15, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  modalCancel: { color: '#b5bac1', fontSize: 14, fontWeight: '600' },
  modalConfirm: { backgroundColor: '#5865F2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  modalConfirmText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});