import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import { Upload, Users, Film, Sparkles } from 'lucide-react';

// Backend URL from environment variable
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3642';

function App() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    // Clean up socket on unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

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

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      console.error('Backend URL:', SOCKET_URL);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
    });
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', backgroundColor: '#F5F8FF' }}>

      {/* Header */}
      <header style={{
        width: '100%',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: 'white',
        borderBottom: '2px solid #87CEEB',
        boxShadow: '0 2px 8px rgba(135, 206, 235, 0.1)'
      }}>
        <div style={{ padding: '0.5rem', backgroundColor: '#87CEEB', borderRadius: '0.5rem' }}>
          <Film style={{ width: '1.25rem', height: '1.25rem', color: 'white', strokeWidth: 2.5 }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#2D3748', margin: 0 }}>Watch2Gether</h1>
          <span style={{ fontSize: '0.75rem', color: '#87CEEB', fontWeight: '600' }}>LOCAL SYNC</span>
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
              border: '2px solid #87CEEB',
              boxShadow: '0 8px 24px rgba(135, 206, 235, 0.15)'
            }}>

              {/* Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: '#F0F9FF',
                  borderRadius: '9999px',
                  border: '3px solid #87CEEB'
                }}>
                  <Users style={{ width: '2.5rem', height: '2.5rem', color: '#87CEEB', strokeWidth: 2 }} />
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
                  onFocus={(e) => e.target.style.borderColor = '#87CEEB'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />

                <button
                  onClick={joinRoom}
                  disabled={!roomId}
                  style={{
                    backgroundColor: roomId ? '#87CEEB' : '#CBD5E1',
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
                    if (roomId) e.target.style.backgroundColor = '#6BB6E8';
                  }}
                  onMouseLeave={(e) => {
                    if (roomId) e.target.style.backgroundColor = '#87CEEB';
                  }}
                >
                  Enter Theater
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Theater Room
          <div style={{ width: '100%', maxWidth: '72rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

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
                    backgroundColor: '#87CEEB'
                  }}></span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Room</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#2D3748', fontFamily: 'monospace' }}>{roomId}</span>
                    <span style={{ fontSize: '0.75rem', color: '#87CEEB', fontWeight: '600' }}>● SYNCED</span>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <label style={{
                backgroundColor: '#F0F9FF',
                border: '2px solid #87CEEB',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#87CEEB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F0F9FF'}
              >
                <Upload style={{ width: '1rem', height: '1rem', color: '#87CEEB', strokeWidth: 2 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2D3748' }}>{file ? 'Change Video' : 'Select Video'}</span>
                <input type="file" accept="video/*,.mkv,.mp4,.webm,.avi,.mov" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Video Player */}
            <div style={{
              borderRadius: '1rem',
              overflow: 'hidden',
              border: '2px solid #E2E8F0',
              backgroundColor: '#000',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              <VideoPlayer file={file} socket={socket} roomId={roomId} />
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
