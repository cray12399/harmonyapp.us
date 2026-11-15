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
  sender: string;
  text: string;
  timestamp: string;
}

interface Friend {
  id: string;
  name: string;
  status: string;
  customStatus?: string;
  avatarText: string;
  color: string;
  messages: Message[];
}

interface GroupChat {
  id: string;
  name: string;
  avatarText: string;
  color: string;
  channels: string[];
  messages: Record<string, Message[]>;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  status: 'Active' | 'Disabled';
  role: 'System Admin' | 'Member';
}

interface ReportedMessage {
  id: string;
  user: string;
  channel: string;
  reason: string;
  content: string;
  reportedBy: string;
  timestamp: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>({
    username: 'TestUser',
    email: 'testuser@harmonyapp.us',
    phone: '555-019-2834',
    status: 2, // 2 = Admin
    role: 'System Admin',
  });

  const [selectedRailId, setSelectedRailId] = useState<string>('dm');

  const [activeChat, setActiveChat] = useState<{
    type: 'dm' | 'group' | 'admin-chat';
    id: string;
    name: string;
    channel?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Modals
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [selectedReport, setSelectedReport] = useState<ReportedMessage | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'System Admin' | 'Member'>('Member');
  const [showPasswordResetSection, setShowPasswordResetSection] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const [revealEmail, setRevealEmail] = useState(false);
  const [revealPhone, setRevealPhone] = useState(false);

  const [adminTab, setAdminTab] = useState<'users' | 'reports' | 'chat'>('users');
  const [adminUserSearch, setAdminUserSearch] = useState('');

  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([
    { id: '1001', firstName: 'Test', lastName: 'User', name: 'Test User', username: '@TestUser', email: 'testuser@harmonyapp.us', phone: '555-019-2834', status: 'Active', role: 'System Admin' },
    { id: '1002', firstName: 'Second', lastName: 'User', name: 'Second User', username: '@SecondUser', email: 'second@harmonyapp.us', phone: '555-234-5678', status: 'Active', role: 'Member' },
    { id: '1003', firstName: 'Bruce', lastName: 'Banner', name: 'Bruce Banner', username: '@TheHulk', email: 'hulk@harmonyapp.us', phone: '555-876-5432', status: 'Active', role: 'Member' },
    { id: '1004', firstName: 'Matthew', lastName: 'Janke', name: 'Matthew Janke', username: '@Janke', email: 'matthew@harmonyapp.us', phone: '555-111-2222', status: 'Active', role: 'System Admin' },
    { id: '1005', firstName: 'Alex', lastName: 'Smith', name: 'Alex Smith', username: '@InactiveDev', email: 'alex@harmonyapp.us', phone: '555-333-4444', status: 'Disabled', role: 'Member' },
  ]);

  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([
    { id: '501', user: '@InactiveDev', channel: '#general (Dev Team)', reason: 'Spam / Unsolicited Links', content: 'Click here for free nitro codes!! http://suspicious-link.example.com', reportedBy: '@SecondUser', timestamp: 'Today at 2:14 PM' },
    { id: '502', user: '@TheHulk', channel: '#homework-help (Dev Team)', reason: 'Off-topic / Caps Spam', content: 'HULK SMASH BUGS IN PRODUCTION SERVER RIGHT NOW!!!', reportedBy: '@TestUser', timestamp: 'Today at 1:05 PM' },
  ]);

  const [adminChatMessages, setAdminChatMessages] = useState<Message[]>([
    { id: 'ac1', sender: 'Janke', text: 'Welcome to the private Admin Chat! Use this channel to coordinate user reports and server moderation.', timestamp: '10:30 AM' },
    { id: 'ac2', sender: 'TestUser', text: 'Heads up — InactiveDev posted a suspicious link in #general earlier. I flagged it for review.', timestamp: '2:15 PM' },
  ]);

  const [friends, setFriends] = useState<Friend[]>([
    {
      id: '1',
      name: 'TestUser',
      status: 'Online',
      customStatus: 'Working on Harmony Mobile',
      avatarText: 'T',
      color: '#5865F2',
      messages: [{ id: 'm1', sender: 'TestUser', text: 'Hey there! Welcome to mobile.', timestamp: 'Today at 2:14 PM' }],
    },
    {
      id: '2',
      name: 'SecondUser',
      status: 'Online',
      customStatus: 'Debugging MERN stack',
      avatarText: 'S',
      color: '#b6a544',
      messages: [{ id: 'm2', sender: 'SecondUser', text: 'Yeah no problem! Glad all is good.', timestamp: '1d ago' }],
    },
  ]);

  const [groupChats, setGroupChats] = useState<GroupChat[]>([
    {
      id: 'g1',
      name: 'Dev Team',
      avatarText: 'DT',
      color: '#5865F2',
      channels: ['welcome', 'announcements', 'general', 'homework-help'],
      messages: {
        welcome: [{ id: 'gm1', sender: 'Janke', text: 'Welcome to the Dev Team server!', timestamp: '11/10/2026' }],
        announcements: [{ id: 'gm2', sender: 'TestUser', text: 'Mobile app layout updated!', timestamp: 'Today at 10:00 AM' }],
        general: [
          { id: 'gm3', sender: 'TheHulk', text: 'I think it is a group report', timestamp: '7:55 AM' },
          { id: 'gm4', sender: 'Janke', text: 'Yeah its a group one', timestamp: '8:02 AM' },
        ],
        'homework-help': [],
      },
    },
    {
      id: 'g2',
      name: 'Project Alpha',
      avatarText: 'PA',
      color: '#23a55a',
      channels: ['general', 'notes'],
      messages: {
        general: [{ id: 'gm5', sender: 'SecondUser', text: 'Meeting scheduled for tomorrow.', timestamp: 'Yesterday' }],
        notes: [],
      },
    },
  ]);

  useEffect(() => {
    AsyncStorage.getItem('user').then((val) => {
      if (val) {
        const parsed = JSON.parse(val);
        setCurrentUser((prev: any) => ({ ...prev, ...parsed }));
      }
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setShowSettingsModal(false);
    router.replace('/');
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeChat) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: currentUser?.username || 'TestUser',
      text: messageInput.trim(),
      timestamp: 'Just now',
    };

    if (activeChat.type === 'dm') {
      setFriends((prev) =>
        prev.map((f) => (f.id === activeChat.id ? { ...f, messages: [...f.messages, newMsg] } : f))
      );
    } else if (activeChat.type === 'group' && activeChat.channel) {
      const ch = activeChat.channel;
      setGroupChats((prev) =>
        prev.map((g) =>
          g.id === activeChat.id
            ? { ...g, messages: { ...g.messages, [ch]: [...(g.messages[ch] || []), newMsg] } }
            : g
        )
      );
    } else if (activeChat.type === 'admin-chat') {
      setAdminChatMessages((prev) => [...prev, newMsg]);
    }

    setMessageInput('');
  };

  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;
    const created: Friend = {
      id: Date.now().toString(),
      name: newFriendName.trim(),
      status: 'Online',
      avatarText: newFriendName.trim()[0].toUpperCase(),
      color: '#5865F2',
      messages: [],
    };
    setFriends([created, ...friends]);
    setNewFriendName('');
    setShowAddFriendModal(false);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const created: GroupChat = {
      id: `g_${Date.now()}`,
      name: newGroupName.trim(),
      avatarText: newGroupName.trim().substring(0, 2).toUpperCase(),
      color: '#23a55a',
      channels: ['general', 'notes'],
      messages: { general: [], notes: [] },
    };
    setGroupChats([...groupChats, created]);
    setSelectedRailId(created.id);
    setNewGroupName('');
    setShowCreateGroupModal(false);
  };

  const handleCopyInviteLink = (groupName: string) => {
    alert(`Invite link copied to clipboard!\nhttps://harmonyapp.us/invite/${groupName.toLowerCase().replace(/\s+/g, '-')}-xyz89`);
  };

  const toggleUserStatus = (userId: string) => {
    setAdminUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: u.status === 'Active' ? 'Disabled' : 'Active' } : u))
    );
  };

  const handleOpenEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditRole(user.role);
    setShowPasswordResetSection(false);
    setAdminNewPassword('');
    setAdminConfirmPassword('');
  };

  const handleSaveEditedUser = () => {
    if (!editingUser) return;
    setAdminUsersList((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: editUsername,
              firstName: editFirstName,
              lastName: editLastName,
              name: `${editFirstName} ${editLastName}`,
              email: editEmail,
              phone: editPhone,
              role: editRole,
            }
          : u
      )
    );
    setEditingUser(null);
    alert('User updated successfully!');
  };

  const handleResolveReport = (reportId: string) => {
    setReportedMessages((prev) => prev.filter((r) => r.id !== reportId));
    setSelectedReport(null);
  };

  // =========================================================================
  // VIEW 1: FULL-SCREEN ACTIVE CHAT OR ADMIN CHAT
  // =========================================================================
  if (activeChat) {
    const isAdminChat = activeChat.type === 'admin-chat';
    const currentMessages = isAdminChat
      ? adminChatMessages
      : activeChat.type === 'dm'
      ? friends.find((f) => f.id === activeChat.id)?.messages || []
      : groupChats.find((g) => g.id === activeChat.id)?.messages[activeChat.channel || 'general'] || [];

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.chatScreenContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {isAdminChat ? '🔒 #admin-lounge' : activeChat.type === 'dm' ? `@ ${activeChat.name}` : `# ${activeChat.channel}`}
              </Text>
              {activeChat.type === 'group' && <Text style={styles.chatHeaderSubtitle}>{activeChat.name}</Text>}
            </View>
          </View>

          <FlatList
            data={currentMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatFeedContent}
            ListEmptyComponent={<Text style={styles.emptyChatText}>No messages here yet. Say hello!</Text>}
            renderItem={({ item }) => (
              <View style={styles.messageRow}>
                <View style={styles.messageAvatar}>
                  <Text style={styles.avatarLetter}>{item.sender[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.messageMetaRow}>
                    <Text style={styles.messageSender}>{item.sender}</Text>
                    <Text style={styles.messageTime}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.messageBody}>{item.text}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.chatInputWrapper}>
            <TextInput
              style={styles.chatTextInput}
              placeholder={isAdminChat ? 'Message #admin-lounge' : `Message #${activeChat.channel || activeChat.name}`}
              placeholderTextColor="#949ba4"
              value={messageInput}
              onChangeText={setMessageInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN DASHBOARD
  // =========================================================================
  if (selectedRailId === 'admin' && currentUser?.status === 2) {
    const filteredAdminUsers = adminUsersList.filter(
      (u) =>
        u.name.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
        u.id.includes(adminUserSearch)
    );

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
              <TouchableOpacity onPress={() => setShowCreateGroupModal(true)} style={styles.railAddButton}>
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
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>💬 Admin Chat</Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: USER MANAGEMENT (With Mobile Layout: ID Top, Status Top-Right, Name Below ID) */}
            {adminTab === 'users' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={styles.adminSearchBox}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 13 }}
                    placeholder="Search (e.g. user ID 1001, username @TestUser...)"
                    placeholderTextColor="#949ba4"
                    value={adminUserSearch}
                    onChangeText={setAdminUserSearch}
                  />
                </View>

                {filteredAdminUsers.map((u) => (
                  <View key={u.id} style={styles.adminUserCard}>
                    {/* Top Row: ID on left, Active/Disabled status pill on top right */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#949ba4', fontWeight: 'bold', fontSize: 12 }}>ID: {u.id}</Text>
                      <View style={[styles.statusPill, { backgroundColor: u.status === 'Active' ? '#23a55a' : '#f23f43' }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{u.status}</Text>
                      </View>
                    </View>

                    {/* Below ID: Full Name & Admin Badge */}
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                      {u.name} {u.role === 'System Admin' && <Text style={styles.adminBadge}>ADMIN</Text>}
                    </Text>

                    {/* Remaining User Information */}
                    <Text style={{ color: '#00a8fc', fontSize: 13 }}>{u.username} • {u.email}</Text>
                    <Text style={{ color: '#949ba4', fontSize: 12, marginTop: 2 }}>Phone: {u.phone} | Role: {u.role}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditUser(u)}
                        style={styles.adminActionBtn}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                      </TouchableOpacity>
                      {u.role !== 'System Admin' && (
                        <TouchableOpacity
                          onPress={() => toggleUserStatus(u.id)}
                          style={[styles.adminActionBtn, { backgroundColor: u.status === 'Active' ? '#f23f43' : '#23a55a' }]}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                            {u.status === 'Active' ? 'Disable' : 'Enable'}
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
                <Text style={{ color: '#949ba4', fontSize: 13, marginBottom: 12 }}>Pending moderation queue for reported messages:</Text>
                {reportedMessages.length === 0 ? (
                  <Text style={{ color: '#23a55a', textAlign: 'center', marginTop: 40, fontWeight: 'bold' }}>All clear! No pending reports.</Text>
                ) : (
                  reportedMessages.map((r) => (
                    <View key={r.id} style={styles.adminReportCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#f23f43', fontWeight: 'bold', fontSize: 13 }}>{r.user} in {r.channel}</Text>
                        <Text style={{ color: '#f0b232', fontSize: 11, fontWeight: 'bold' }}>Reason: {r.reason}</Text>
                      </View>
                      <View style={styles.reportedContentBox}>
                        <Text style={{ color: '#fff', fontSize: 14 }} numberOfLines={2}>{r.content}</Text>
                      </View>
                      <Text style={{ color: '#949ba4', fontSize: 11, marginTop: 6 }}>Reported by {r.reportedBy} (Report #{r.id})</Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => setSelectedReport(r)}
                          style={styles.reviewDetailsBtn}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Review Details</Text>
                        </TouchableOpacity>
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
                  Private staff channel visible only to system administrators.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveChat({ type: 'admin-chat', id: 'admin-lounge', name: 'Admin Lounge', channel: 'admin-lounge' })}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalConfirmText}>Open Admin Chat Room</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* --- EXPLICIT GLOBAL MODAL RENDER FOR REPORT DETAILS --- */}
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

                <Text style={{ color: '#949ba4', fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' }}>Message Content</Text>
                <View style={styles.reportContentBox}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>{selectedReport.content}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                  <TouchableOpacity onPress={() => setSelectedReport(null)}>
                    <Text style={{ color: '#f2f3f5', fontWeight: 'bold', fontSize: 14 }}>Close</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => handleResolveReport(selectedReport.id)}
                      style={styles.keepMessageBtn}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>✓ Keep Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleResolveReport(selectedReport.id)}
                      style={styles.getRidMessageBtn}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>🗑️ Get Rid of Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* --- EDIT USER ADMIN MODAL (Matches Screenshots 34 & 35) --- */}
        <Modal visible={!!editingUser} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            {editingUser && (
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
                <View style={styles.editUserModalBox}>
                  <Text style={{ color: '#f2f3f5', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                    Edit User (ID: {editingUser.id})
                  </Text>

                  <Text style={styles.settingsFieldLabel}>USERNAME</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    autoCapitalize="none"
                    placeholderTextColor="#72767d"
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingsFieldLabel}>FIRST NAME</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editFirstName}
                        onChangeText={setEditFirstName}
                        placeholderTextColor="#72767d"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingsFieldLabel}>LAST NAME</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editLastName}
                        onChangeText={setEditLastName}
                        placeholderTextColor="#72767d"
                      />
                    </View>
                  </View>

                  <Text style={styles.settingsFieldLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#72767d"
                  />

                  <Text style={styles.settingsFieldLabel}>PHONE NUMBER</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#72767d"
                  />

                  <Text style={styles.settingsFieldLabel}>PRIVILEGE LEVEL / ROLE</Text>
                  <TouchableOpacity
                    onPress={() => setEditRole(editRole === 'System Admin' ? 'Member' : 'System Admin')}
                    style={[styles.modalInput, { justifyContent: 'center' }]}
                  >
                    <Text style={{ color: '#fff', fontSize: 15 }}>
                      {editRole === 'System Admin' ? 'Admin Privilege' : 'Standard Member'} ▾
                    </Text>
                  </TouchableOpacity>

                  {/* Password Controls Section */}
                  <View style={styles.passwordControlsCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Password Controls</Text>
                      <TouchableOpacity
                        onPress={() => setShowPasswordResetSection(!showPasswordResetSection)}
                        style={styles.hideResetBtn}
                      >
                        <Text style={{ color: '#ffcc00', fontSize: 12, fontWeight: 'bold' }}>
                          {showPasswordResetSection ? 'Hide Reset' : 'Reset Password'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showPasswordResetSection && (
                      <>
                        <Text style={styles.settingsFieldLabel}>NEW PASSWORD</Text>
                        <TextInput
                          style={styles.modalInput}
                          secureTextEntry
                          placeholder="New password"
                          placeholderTextColor="#72767d"
                          value={adminNewPassword}
                          onChangeText={setAdminNewPassword}
                        />

                        <Text style={styles.settingsFieldLabel}>CONFIRM NEW PASSWORD</Text>
                        <TextInput
                          style={styles.modalInput}
                          secureTextEntry
                          placeholder="Confirm new password"
                          placeholderTextColor="#72767d"
                          value={adminConfirmPassword}
                          onChangeText={setAdminConfirmPassword}
                        />

                        <TouchableOpacity
                          onPress={() => {
                            if (!adminNewPassword || adminNewPassword !== adminConfirmPassword) {
                              alert('Passwords do not match or are empty.');
                              return;
                            }
                            alert('Password reset successfully!');
                            setAdminNewPassword('');
                            setAdminConfirmPassword('');
                            setShowPasswordResetSection(false);
                          }}
                          style={styles.confirmPasswordResetBtn}
                        >
                          <Text style={{ color: '#111', fontWeight: 'bold', fontSize: 14 }}>Confirm Password Reset</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 18 }}>
                    <TouchableOpacity onPress={() => setEditingUser(null)}>
                      <Text style={{ color: '#b5bac1', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveEditedUser} style={styles.modalConfirm}>
                      <Text style={styles.modalConfirmText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
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
  const filteredFriends = friends.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
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
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={() => setShowCreateGroupModal(true)} style={styles.railAddButton}>
              <Text style={styles.railAddText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* RIGHT CONTENT PANEL */}
        <View style={styles.rightPanel}>
          {selectedRailId === 'dm' ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Messages</Text>

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

                <TouchableOpacity onPress={() => setShowAddFriendModal(true)} style={styles.addFriendPill}>
                  <Text style={styles.addFriendPillText}>👥 Add Friends</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                renderItem={({ item }) => {
                  const lastMsg = item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
                  return (
                    <TouchableOpacity
                      onPress={() => setActiveChat({ type: 'dm', id: item.id, name: item.name })}
                      style={styles.dmRow}
                    >
                      <View style={[styles.dmAvatar, { backgroundColor: item.color }]}>
                        <Text style={styles.avatarLetter}>{item.avatarText}</Text>
                        <View style={[styles.statusDot, { backgroundColor: item.status === 'Online' ? '#23a55a' : '#f0b232' }]} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.dmRowTop}>
                          <Text style={styles.dmName}>{item.name}</Text>
                          {lastMsg && <Text style={styles.dmTime}>{lastMsg.timestamp}</Text>}
                        </View>
                        <Text style={styles.dmPreview} numberOfLines={1}>
                          {lastMsg ? `${lastMsg.sender === 'You' ? 'You: ' : ''}${lastMsg.text}` : item.customStatus || 'Tap to chat'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ) : (
            selectedGroup && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={styles.panelTitle}>{selectedGroup.name} ›</Text>
                  <TouchableOpacity
                    onPress={() => handleCopyInviteLink(selectedGroup.name)}
                    style={styles.groupInviteBtn}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>+ Add / Invite</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.searchPill, { marginBottom: 18 }]}>
                  <Text style={{ color: '#949ba4', marginRight: 6 }}>🔍</Text>
                  <Text style={{ color: '#949ba4', fontSize: 14 }}>Search channels</Text>
                </View>

                <Text style={styles.channelCategoryHeader}>Text Channels ⌄</Text>
                {selectedGroup.channels.map((channel) => (
                  <TouchableOpacity
                    key={channel}
                    onPress={() =>
                      setActiveChat({
                        type: 'group',
                        id: selectedGroup.id,
                        name: selectedGroup.name,
                        channel,
                      })
                    }
                    style={styles.channelRow}
                  >
                    <Text style={styles.channelHash}>#</Text>
                    <Text style={styles.channelName}>{channel}</Text>
                  </TouchableOpacity>
                ))}
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
            <Text style={styles.avatarLetter}>{(currentUser?.username || 'T')[0].toUpperCase()}</Text>
            <View style={[styles.statusDot, { backgroundColor: '#23a55a' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dockUsername}>{currentUser?.username || 'TestUser'}</Text>
            <Text style={styles.dockSubtext}>Online • Tap for Settings</Text>
          </View>
          <Text style={{ fontSize: 18, color: '#b5bac1' }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================================== */}
      {/* 1. USER SETTINGS MODAL                                                */}
      {/* ===================================================================== */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalBox}>
            <Text style={styles.settingsModalHeader}>User Settings</Text>

            <Text style={styles.settingsFieldLabel}>USERNAME</Text>
            <View style={styles.settingsInputCard}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{currentUser?.username || 'TestUser'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.settingsFieldLabel}>EMAIL</Text>
              <TouchableOpacity onPress={() => setRevealEmail(!revealEmail)}>
                <Text style={{ color: '#00a8fc', fontSize: 12, fontWeight: 'bold' }}>{revealEmail ? 'Hide' : 'Reveal'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsInputCard}>
              <Text style={{ color: '#fff', fontSize: 14 }}>
                {revealEmail ? currentUser?.email || 'testuser@harmonyapp.us' : '••••••••••••@••••.us'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.settingsFieldLabel}>PHONE NUMBER</Text>
              <TouchableOpacity onPress={() => setRevealPhone(!revealPhone)}>
                <Text style={{ color: '#00a8fc', fontSize: 12, fontWeight: 'bold' }}>{revealPhone ? 'Hide' : 'Reveal'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsInputCard}>
              <Text style={{ color: '#fff', fontSize: 14 }}>
                {revealPhone ? currentUser?.phone || '555-019-2834' : '•••••••-2834'}
              </Text>
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
                onPress={() => setShowChangePasswordModal(true)}
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
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              placeholderTextColor="#72767d"
              value={currentPasswordInput}
              onChangeText={setCurrentPasswordInput}
            />

            <Text style={styles.settingsFieldLabel}>NEW PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              placeholderTextColor="#72767d"
              value={newPasswordInput}
              onChangeText={setNewPasswordInput}
            />

            <Text style={styles.settingsFieldLabel}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              placeholderTextColor="#72767d"
              value={confirmPasswordInput}
              onChangeText={setConfirmPasswordInput}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  alert('Password updated successfully!');
                  setShowChangePasswordModal(false);
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                }}
                style={styles.modalConfirm}
              >
                <Text style={styles.modalConfirmText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* OTHER MODALS (Add Friend, Create Group)                               */}
      {/* ===================================================================== */}
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
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddFriend} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateGroupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalDesc}>Give your new group a name.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name"
              placeholderTextColor="#72767d"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateGroup} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>Create</Text>
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
  railGroupBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  railGroupSelected: { borderRadius: 16 },
  railGroupText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
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
  editUserModalBox: { backgroundColor: '#313338', borderRadius: 12, padding: 22, width: '90%', maxWidth: 420, alignSelf: 'center' },
  passwordControlsCard: { backgroundColor: '#1e1f22', borderRadius: 8, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#35363c' },
  hideResetBtn: { backgroundColor: '#383a40', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  confirmPasswordResetBtn: { backgroundColor: '#f0b232', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
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