
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, User, Settings } from 'lucide-react';

const Chat = ({
    messages,
    onSendMessage,
    socket,
    roomId,
    isConnected = false,
    ping = 0,
    darkMode = false,
    onClose,
    username,
    onUsernameChange,
    notificationSettings = { enabled: true, position: 'top-right' },
    onUpdateSettings,
    fullscreenTheme = 'dark',
    onThemeChange
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Styling
    const containerStyle = {
        width: '100%', // Fill parent
        height: '100%', // Fill parent
        backgroundColor: darkMode ? '#16171F' : 'white',
        borderLeft: darkMode ? '1px solid #333' : '2px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        color: darkMode ? '#E2E8F0' : '#334155'
    };

    const getPingColor = (ms) => {
        if (ms < 100) return '#10B981'; // Green
        if (ms < 200) return '#F59E0B'; // Yellow
        return '#EF4444'; // Red
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                borderBottom: darkMode ? '1px solid #333' : '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: darkMode ? '#16171F' : 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MessageSquare size={18} color="#FACCDD" />
                    <span style={{ fontWeight: 'bold', color: darkMode ? 'white' : '#2D3748' }}>Live Chat</span>

                    {/* Connection Status & Ping */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div title={isConnected ? "Connected" : "Disconnected"} style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isConnected ? '#10B981' : '#EF4444', // Green or Red
                            boxShadow: isConnected ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                            transition: 'background-color 0.3s'
                        }}></div>
                        {isConnected && (
                            <span style={{
                                fontSize: '0.7rem',
                                color: getPingColor(ping),
                                fontFamily: 'monospace',
                                fontWeight: 'bold'
                            }}>
                                {ping}ms
                            </span>
                        )}
                    </div>
                </div>

                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: darkMode ? '#94A3B8' : '#64748B' }}
                    title="Chat Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Settings Menu Overlay */}
            {showSettings && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: darkMode ? '#0f1014' : '#F1F5F9',
                    borderBottom: darkMode ? '1px solid #333' : '1px solid #E2E8F0',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: darkMode ? 'white' : '#334155' }}>
                        Notifications (Fullscreen)
                    </div>

                    {/* Theme Selector (Only relevant for fullscreen preference) */}
                    {onThemeChange && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span>Theme</span>
                            <div style={{ display: 'flex', backgroundColor: darkMode ? '#1E293B' : '#E2E8F0', borderRadius: '0.375rem', padding: '0.15rem' }}>
                                <button
                                    onClick={() => onThemeChange('light')}
                                    style={{
                                        border: 'none',
                                        background: fullscreenTheme === 'light' ? 'white' : 'transparent',
                                        color: fullscreenTheme === 'light' ? 'black' : (darkMode ? '#94A3B8' : '#64748B'),
                                        borderRadius: '0.25rem',
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        boxShadow: fullscreenTheme === 'light' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    Light
                                </button>
                                <button
                                    onClick={() => onThemeChange('dark')}
                                    style={{
                                        border: 'none',
                                        background: fullscreenTheme === 'dark' ? (darkMode ? '#334155' : 'white') : 'transparent', // slightly complex logic for active state bg
                                        backgroundColor: fullscreenTheme === 'dark' ? (darkMode ? '#475569' : 'white') : 'transparent',
                                        color: fullscreenTheme === 'dark' ? 'white' : (darkMode ? '#94A3B8' : '#64748B'),
                                        borderRadius: '0.25rem',
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        boxShadow: fullscreenTheme === 'dark' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    Dark
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Toggle Enabled */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span>Show Popup</span>
                        <input
                            type="checkbox"
                            checked={notificationSettings.enabled}
                            onChange={(e) => onUpdateSettings({ ...notificationSettings, enabled: e.target.checked })}
                            style={{ cursor: 'pointer' }}
                        />
                    </div>

                    {/* Position Selector */}
                    {notificationSettings.enabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem', color: darkMode ? '#94A3B8' : '#64748B' }}>Position</span>
                            <select
                                value={notificationSettings.position}
                                onChange={(e) => onUpdateSettings({ ...notificationSettings, position: e.target.value })}
                                style={{
                                    padding: '0.3rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: darkMode ? '#1E293B' : 'white',
                                    color: darkMode ? 'white' : 'black',
                                    outline: 'none'
                                }}
                            >
                                <option value="top-right">Top Right</option>
                                <option value="top-left">Top Left</option>
                                <option value="bottom-right">Bottom Right</option>
                                <option value="bottom-left">Bottom Left</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Username Input */}
            <div style={{
                padding: '0.5rem 1rem',
                borderBottom: darkMode ? '1px solid #333' : '1px solid #E2E8F0',
                backgroundColor: darkMode ? '#0f1014' : '#F8FAFC'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: darkMode ? '#16171F' : 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: darkMode ? '1px solid #333' : '1px solid #E2E8F0'
                }}>
                    <User size={14} color={darkMode ? '#94A3B8' : '#64748B'} />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                        placeholder="Your Name"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                            color: darkMode ? 'white' : '#334155',
                            width: '100%',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '2rem', color: darkMode ? '#64748B' : '#CBD5E1' }}>
                        <p>No messages yet.</p>
                        <p style={{ fontSize: '0.8rem' }}>Say hello!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.userId === username;
                    return (
                        <div key={index} style={{
                            alignSelf: msg.type === 'system' ? 'center' : (isMe ? 'flex-end' : 'flex-start'),
                            maxWidth: msg.type === 'system' ? '100%' : '85%',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.type === 'system' ? 'center' : (isMe ? 'flex-end' : 'flex-start')
                        }}>
                            {msg.type === 'system' ? (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: darkMode ? '#94A3B8' : '#94A3B8',
                                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    display: 'inline-block'
                                }}>
                                    {msg.text}
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: darkMode ? '#94A3B8' : '#64748B',
                                        marginBottom: '0.1rem',
                                        marginLeft: isMe ? 0 : '0.2rem',
                                        marginRight: isMe ? '0.2rem' : 0,
                                        textAlign: isMe ? 'right' : 'left'
                                    }}>
                                        {msg.userId !== 'Anonymous' ? msg.userId : 'User'}
                                    </div>
                                    <div style={{
                                        backgroundColor: isMe ? '#FACCDD' : (darkMode ? '#2D3748' : '#FFF0F5'),
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '0.75rem',
                                        borderTopRightRadius: isMe ? '0.1rem' : '0.75rem',
                                        borderTopLeftRadius: isMe ? '0.75rem' : '0.1rem',
                                        color: isMe ? '#831843' : (darkMode ? 'white' : '#1E293B'),
                                        fontSize: '0.9rem',
                                        lineHeight: '1.4',
                                        fontWeight: isMe ? '500' : '400'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '1rem',
                borderTop: darkMode ? '1px solid #333' : '1px solid #E2E8F0',
                backgroundColor: darkMode ? '#16171F' : 'white'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: darkMode ? '#000' : '#F8FAFC',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    border: darkMode ? '1px solid #333' : '1px solid #E2E8F0'
                }}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '0.9rem',
                            color: darkMode ? 'white' : '#334155'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        style={{
                            backgroundColor: '#FACCDD',
                            border: 'none',
                            borderRadius: '0.25rem',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#F9B3D9'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#FACCDD'}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
