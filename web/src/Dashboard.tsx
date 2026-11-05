import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// TypeScript Interfaces for strict type safety
interface Message {
  sender: string;
  text: string;
}

interface GroupChat {
  id: number;
  name: string;
  avatarText: string;
  color: string;
  channels: string[];
  messages: Record<string, Message[]>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'add'>('online');
  
  // Navigation State
  const [currentView, setCurrentView] = useState<{ type: 'friends' | 'dm' | 'group'; data?: any; channel?: string }>({ type: 'friends' });

  // Sidebar Collapse States
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true);

  // Modals state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [viewProfileUser, setViewProfileUser] = useState<any | null>(null);
  const [activeMenuFriendId, setActiveMenuFriendId] = useState<number | null>(null);

  // Settings Field Privacy Toggles
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Search & Inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Password edit state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Data lists with mutual connections support
  const [friends, setFriends] = useState([
    { id: 1, name: 'TestUser', status: 'Online', avatarText: 'T', avatarUrl: '', color: '#5865F2', isBlocked: false, mutualFriends: ['SecondUser'], mutualGroups: ['Dev Team'], messages: [{ sender: 'TestUser', text: 'Hey there!' }] },
    { id: 2, name: 'SecondUser', status: 'Online', avatarText: 'S', avatarUrl: '', color: '#b6a544', isBlocked: false, mutualFriends: ['TestUser', 'TheHulk'], mutualGroups: ['Dev Team', 'Project Alpha'], messages: [{ sender: 'SecondUser', text: 'Working on the MERN project!' }] },
    { id: 3, name: 'TheHulk', status: 'Online', avatarText: 'H', avatarUrl: '', color: '#23a55a', isBlocked: false, mutualFriends: ['SecondUser'], mutualGroups: ['Project Alpha'], messages: [] },
  ]);

  const [groupChats, setGroupChats] = useState<GroupChat[]>([
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
  ]);

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

  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Send message handler inside active DM or Group Channel
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

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

        <div style={{ width: '100%', height: '2px', backgroundColor: '#35363c', borderRadius: 'px', margin: '4px 0' }}></div>

        {/* Group Chats List: Icons when shut, Icons + Titles when expanded */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {groupChats.map(group => {
            const isSelected = currentView.type === 'group' && currentView.data?.id === group.id;
            return (
              <div 
                key={group.id} 
                onClick={() => setCurrentView({ type: 'group', data: group, channel: group.channels[0] })}
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

        <div style={{ width: '100%', height: '2px', backgroundColor: '#35363c', borderRadius: '1px', margin: '4px 0' }}></div>

        {/* Plus Icon to Create Group Chat */}
        <div 
          onClick={() => setShowCreateGroupModal(true)}
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
                style={{ padding: '10px 12px', backgroundColor: currentView.type === 'friends' ? '#5865F2' : 'transparent', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}
              >
                👥 Friends
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase' }}>
                Direct Messages
              </div>

              {filteredFriends.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setCurrentView({ type: 'dm', data: f })}
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
              {renderAvatar({ avatarText: 'T', avatarUrl: '', color: '#5865F2' }, 32)}
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px', backgroundColor: '#23a55a', borderRadius: '50%', border: '2px solid #232428' }}></div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f2f3f5', lineHeight: '18px' }}>TestUser</div>
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
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: '500' }}>
                <span onClick={() => setActiveTab('online')} style={{ cursor: 'pointer', color: activeTab === 'online' ? '#f2f3f5' : '#949ba4', backgroundColor: activeTab === 'online' ? '#3f4147' : 'transparent', padding: '4px 8px', borderRadius: '4px' }}>Online</span>
                <span onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', color: activeTab === 'all' ? '#f2f3f5' : '#949ba4', backgroundColor: activeTab === 'all' ? '#3f4147' : 'transparent', padding: '4px 8px', borderRadius: '4px' }}>All</span>
                <span onClick={() => setShowAddFriendModal(true)} style={{ cursor: 'pointer', color: '#ffffff', backgroundColor: '#5865F2', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Add Friend</span>
              </div>
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
            onClick={() => navigate('/login')}
            style={{ backgroundColor: '#f23f43', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            Log Out
          </button>
        </div>
        
        {/* Main Workspace Area */}
        {currentView.type === 'friends' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#949ba4', marginBottom: '16px', textTransform: 'uppercase' }}>
              {activeTab === 'online' ? `Online — ${friends.length}` : `All Friends — ${friends.length}`}
            </div>
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
                      onClick={() => setCurrentView({ type: 'dm', data: f })}
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
                        <div onClick={() => { setFriends(friends.filter(item => item.id !== f.id)); setActiveMenuFriendId(null); }} style={{ padding: '8px', color: '#f23f43', fontSize: '13px', borderRadius: '4px', cursor: 'pointer' }}>Remove Friend</div>
                        
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
                const activeMessages = currentView.type === 'dm' 
                  ? currentView.data.messages 
                  : (currentView.data.messages[currentView.channel || currentView.data.channels[0]] || []);

                if (activeMessages.length === 0) {
                  return <div style={{ color: '#949ba4', textAlign: 'center', marginTop: '40px' }}>This is the beginning of your chat history.</div>;
                }

                return activeMessages.map((m: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', backgroundColor: '#5865F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                      {m.sender[0]}
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 'bold', color: '#f2f3f5' }}>{m.sender}</span>
                        <span style={{ fontSize: '12px', color: '#949ba4' }}>Today at 3:15 PM</span>
                      </div>
                      <div style={{ color: '#dbdee1', fontSize: '14px', marginTop: '4px', wordBreak: 'break-word' }}>{m.text}</div>
                    </div>
                  </div>
                ));
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
              onChange={(e) => setFriendInput(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowAddFriendModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if (friendInput) {
                    setFriends([...friends, { id: Date.now(), name: friendInput, status: 'Online', avatarText: friendInput[0].toUpperCase(), avatarUrl: '', color: '#5865F2', isBlocked: false, mutualFriends: ['TestUser'], mutualGroups: [], messages: [] }]);
                    setFriendInput('');
                    setShowAddFriendModal(false);
                  }
                }}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Chat Modal */}
      {showCreateGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '440px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Create Group Chat</h3>
            <p style={{ color: '#949ba4', fontSize: '14px', marginBottom: '16px' }}>Give your group chat a name to get started.</p>
            <input 
              type="text" 
              placeholder="Group Name" 
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if (groupInput) {
                    const newGroup: GroupChat = { id: Date.now(), name: groupInput, avatarText: groupInput[0].toUpperCase(), color: '#23a55a', channels: ['general', 'discussion'], messages: { general: [], discussion: [] } };
                    setGroupChats([...groupChats, newGroup]);
                    setGroupInput('');
                    setShowCreateGroupModal(false);
                    setCurrentView({ type: 'group', data: newGroup, channel: 'general' });
                  }
                }}
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Create Group
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
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '6px' }}>USERNAME</label>
              <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>TestUser</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1' }}>EMAIL</label>
                <button onClick={() => setShowEmail(!showEmail)} style={{ background: 'none', border: 'none', color: '#00a8fc', fontSize: '12px', cursor: 'pointer' }}>
                  {showEmail ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>
                {showEmail ? 'testuser@harmonyapp.us' : '••••••••••••@••••••.us'}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1' }}>PHONE NUMBER</label>
                <button onClick={() => setShowPhone(!showPhone)} style={{ background: 'none', border: 'none', color: '#00a8fc', fontSize: '12px', cursor: 'pointer' }}>
                  {showPhone ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <div style={{ color: '#f2f3f5', fontSize: '15px', backgroundColor: '#1e1f22', padding: '10px', borderRadius: '4px' }}>
                {showPhone ? '+1 (555) 019-2834' : '•••••••-2834'}
              </div>
            </div>

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
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>NEW PASSWORD</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {passwordMessage && <p style={{ color: passwordMessage.includes('successfully') ? '#23a55a' : '#f23f43', fontSize: '13px', marginBottom: '15px' }}>{passwordMessage}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if (newPassword && newPassword === confirmPassword) {
                    setPasswordMessage('Password updated successfully!');
                    setTimeout(() => {
                      setPasswordMessage('');
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowPasswordModal(false);
                    }, 1200);
                  } else {
                    setPasswordMessage('Error: New passwords do not match.');
                  }
                }} 
                style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Update Password
              </button>
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

            <div style={{ borderTop: '1px side #3f4147', paddingTop: '16px', marginBottom: '24px' }}>
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