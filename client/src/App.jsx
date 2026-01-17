import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import Chat from './components/Chat';
import { Upload, Users, Film, Sparkles } from 'lucide-react';

// Backend URL from environment variable
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3642';

function App() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [file, setFile] = useState(null);

  // Chat & Layout State
  const [messages, setMessages] = useState([
    { type: 'system', text: 'Welcome to the room! Chat is ready.', timestamp: Date.now() }
  ]);
  const [username, setUsername] = useState('Anonymous');
  const [ping, setPing] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatInFullscreen, setShowChatInFullscreen] = useState(false);
  const theaterRef = useRef(null);

  // Effect 1: Handle beforeunload (Prevent accidental closing)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (joined) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires this to be set
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [joined]); // Only re-run if joined state changes

  // Effect 2: Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowChatInFullscreen(false); // Reset chat visibility on exit
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []); // Run once

  // Effect 3: Socket cleanup
  useEffect(() => {
    return () => {
      if (socket) {
        console.log('Cleaning up socket on socket change/unmount');
        socket.disconnect();
      }
    };
  }, [socket]); // Only re-run if socket instance changes

  // Effect 4: Ping Interval
  useEffect(() => {
    if (!socket || !joined) return;

    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping', () => {
        const latency = Date.now() - start;
        setPing(latency);
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [socket, joined]);

  const joinRoom = () => {
    if (!roomId) return;

    console.log('🔌 Connecting to:', SOCKET_URL);

    // Connect to server with options
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    setSocket(newSocket);
    window.socket = newSocket; // For debugging

    newSocket.on('connect', () => {
      console.log('✅ Connected! Socket ID:', newSocket.id);
      console.log('📍 Joining room:', roomId);
      newSocket.emit('join_room', roomId);
      setJoined(true);
    });

    // Chat Message Handler
    newSocket.on('chat_message', (msg) => {
      console.log('📩 Client Received Chat Message:', msg);
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      console.error('Backend URL:', SOCKET_URL);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
    });
  };

  const handleSendMessage = (text) => {
    if (socket && roomId) {
      console.log(`📤 Sending chat message: "${text}" to room: ${roomId}`);
      // Optimistic update (optional, but waiting for server echo is safer for order)
      socket.emit('chat_message', { roomId, text, userId: username });
    } else {
      console.error('❌ Cannot send message: Socket or RoomID missing', { socket: !!socket, roomId });
    }
  };

  const toggleFullscreen = () => {
    if (!theaterRef.current) return;

    if (!document.fullscreenElement) {
      theaterRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleFullscreenChat = () => {
    setShowChatInFullscreen(!showChatInFullscreen);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileType = selectedFile.type;
      const fileName = selectedFile.name.toLowerCase();

      // Log file info for debugging
      console.log('📁 Selected file:', {
        name: selectedFile.name,
        type: fileType,
        size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
      });

      // Check if it's a video file
      if (!fileType.startsWith('video/') && !fileName.endsWith('.mkv') && !fileName.endsWith('.mp4') && !fileName.endsWith('.webm')) {
        alert('Please select a video file (MP4, MKV, WebM, etc.)');
        return;
      }

      // Special note for MKV files
      if (fileName.endsWith('.mkv') || fileType === 'video/x-matroska') {
        console.log('⚠️ MKV file detected. Note: Browser support varies based on codecs used.');
      }

      setFile(selectedFile);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', backgroundColor: '#FFF5F9' }}>

      {/* Header */}
      <header style={{
        width: '100%',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: 'white',
        borderBottom: '2px solid #FACCDD',
        boxShadow: '0 2px 8px rgba(135, 206, 235, 0.1)'
      }}>
        <div style={{ padding: '0.5rem', backgroundColor: '#FACCDD', borderRadius: '0.5rem' }}>
          <Film style={{ width: '1.25rem', height: '1.25rem', color: 'white', strokeWidth: 2.5 }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#2D3748', margin: 0 }}>Watch2Gether</h1>
          <span style={{ fontSize: '0.75rem', color: '#FACCDD', fontWeight: '600' }}>LOCAL SYNC</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem'
      }}>

        {!joined ? (
          // Join Room
          <div style={{ width: '100%', maxWidth: '28rem' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              border: '2px solid #FACCDD',
              boxShadow: '0 8px 24px rgba(135, 206, 235, 0.15)'
            }}>

              {/* Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: '#FFF0F5',
                  borderRadius: '9999px',
                  border: '3px solid #FACCDD'
                }}>
                  <Users style={{ width: '2.5rem', height: '2.5rem', color: '#FACCDD', strokeWidth: 2 }} />
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2D3748', marginBottom: '0.5rem' }}>Join Room</h2>
                <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
                  Sync playback perfectly with friends
                </p>
                <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  💡 Both users need the same video file
                </p>
              </div>

              {/* Input & Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Enter Room ID..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '2px solid #E2E8F0',
                    borderRadius: '0.625rem',
                    padding: '0.75rem 1rem',
                    fontSize: '1rem',
                    color: '#2D3748',
                    width: '100%',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FACCDD'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />

                <button
                  onClick={joinRoom}
                  disabled={!roomId}
                  style={{
                    backgroundColor: roomId ? '#FACCDD' : '#CBD5E1',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.875rem 1.75rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'white',
                    cursor: roomId ? 'pointer' : 'not-allowed',
                    width: '100%',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (roomId) e.target.style.backgroundColor = '#F9B3D9';
                  }}
                  onMouseLeave={(e) => {
                    if (roomId) e.target.style.backgroundColor = '#FACCDD';
                  }}
                >
                  Enter Theater
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Theater Room
          <div style={{ width: '100%', maxWidth: '80rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Status Bar */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '2px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#FACCDD'
                  }}></span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Room</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#2D3748', fontFamily: 'monospace' }}>{roomId}</span>
                    <span style={{ fontSize: '0.75rem', color: '#FACCDD', fontWeight: '600' }}>● SYNCED</span>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <label style={{
                backgroundColor: '#FFF0F5',
                border: '2px solid #FACCDD',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFF0F5'}
              >
                <Upload style={{ width: '1rem', height: '1rem', color: '#FACCDD', strokeWidth: 2 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2D3748' }}>{file ? 'Change Video' : 'Select Video'}</span>
                <input type="file" accept="video/*,.mkv,.mp4,.webm,.avi,.mov" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Theater Container (Wraps Video and Chat for Fullscreen) */}
            <div
              ref={theaterRef}
              className="theater-container"
              style={{
                display: 'flex',
                alignItems: 'stretch', // Ensure both stretch to full height
                justifyContent: 'center',
                backgroundColor: isFullscreen ? 'black' : 'transparent',
                // In fullscreen with chat open: side-by-side (gap 0 or small). Normal: gap 1rem
                gap: isFullscreen ? '0' : '1rem',
                borderRadius: isFullscreen ? 0 : '1rem',
                overflow: 'hidden',
                // Fullscreen: 100vh. Normal: Use aspect ratio to define height based on width
                height: isFullscreen ? '100vh' : 'auto',
                aspectRatio: isFullscreen ? 'auto' : '16/9',
                position: 'relative',
                border: isFullscreen ? 'none' : '2px solid #E2E8F0',
                boxShadow: isFullscreen ? 'none' : '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              {/* Video Area */}
              <div style={{
                flex: 1,
                position: 'relative',
                height: '100%',
                minWidth: 0, // Important for flex text/content truncation if needed
                backgroundColor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <VideoPlayer
                  file={file}
                  socket={socket}
                  roomId={roomId}
                  onToggleFullscreen={toggleFullscreen}
                />

                {/* Fullscreen Chat Toggle Button */}
                {isFullscreen && (
                  <button
                    onClick={toggleFullscreenChat}
                    style={{
                      position: 'absolute',
                      top: '1.5rem',
                      right: '1.5rem',
                      backgroundColor: showChatInFullscreen ? '#FACCDD' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      zIndex: 60,
                      backdropFilter: 'blur(4px)',
                      display: 'flex', // Always visible in fullscreen
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title={showChatInFullscreen ? "Hide Chat" : "Show Chat"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </button>
                )}
              </div>

              {/* Chat Area */}
              {/* Always rendered if !fullscreen, OR if fullscreen AND showChat */}
              <div style={{
                width: (!isFullscreen || showChatInFullscreen) ? '320px' : '0px',
                overflow: 'hidden', // Hide content when width is 0
                transition: 'width 0.3s ease-in-out', // Smooth slide
                display: 'flex', // Flex to fill height
                flexDirection: 'column',
                backgroundColor: isFullscreen ? '#0f1014' : 'white', // Dark mode BG in fullscreen
                borderLeft: isFullscreen ? '1px solid #333' : 'none',
                flexShrink: 0 // Prevent video from squishing chat
              }}>
                <Chat
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  socket={socket}
                  roomId={roomId}
                  isConnected={socket?.connected}
                  ping={ping}
                  username={username}
                  onUsernameChange={setUsername}
                  overlay={false} // No longer using absolute overlay
                  darkMode={isFullscreen} // Pass dark mode prop
                  onClose={toggleFullscreenChat}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '1rem', textAlign: 'center' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: '600' }}>
          WATCH2GETHER • LOCAL SYNC
        </p>
      </footer>
    </div>
  );
}

export default App;
