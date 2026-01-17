import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, RotateCw, SkipBack, SkipForward } from 'lucide-react';

const VideoPlayer = ({ file, socket, roomId, onToggleFullscreen }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Anti-loop flags
    const isRemoteUpdate = useRef(false);
    const controlsTimeoutRef = useRef(null);

    useEffect(() => {
        if (file && videoRef.current) {
            const url = URL.createObjectURL(file);
            videoRef.current.src = url;

            // Notify server we have a file (metadata only)
            socket.emit('file_loaded', { roomId, fileName: file.name });

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [file, socket, roomId]);

    // Handle Socket Events
    useEffect(() => {
        if (!socket || !videoRef.current) {
            console.warn('⚠️ Socket or video ref not ready:', { socket: !!socket, videoRef: !!videoRef.current });
            return;
        }

        console.log('🔌 Setting up socket listeners for room:', roomId);
        console.log('   Socket ID:', socket.id);
        console.log('   Socket connected:', socket.connected);

        socket.on('play', (time) => {
            console.log('▶️ [RECEIVED] PLAY event at time:', time);
            isRemoteUpdate.current = true;
            if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
                videoRef.current.currentTime = time;
            }
            videoRef.current.play().catch(e => console.error("Play error", e));
            setIsPlaying(true);
        });

        socket.on('pause', (time) => {
            console.log('⏸️ [RECEIVED] PAUSE event at time:', time);
            isRemoteUpdate.current = true;
            videoRef.current.pause();
            if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
                videoRef.current.currentTime = time;
            }
            setIsPlaying(false);
        });

        socket.on('seek', (time) => {
            console.log('⏩ [RECEIVED] SEEK event to time:', time);
            isRemoteUpdate.current = true;
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        });

        socket.on('sync_state', (state) => {
            console.log('🔄 [RECEIVED] SYNC_STATE:', state);
            if (state.isPlaying) {
                isRemoteUpdate.current = true;
                videoRef.current.currentTime = state.currentTime;
                videoRef.current.play();
                setIsPlaying(true);
            }
        });

        console.log('✅ Socket listeners attached successfully');

        return () => {
            console.log('🔌 Removing socket listeners');
            socket.off('play');
            socket.off('pause');
            socket.off('seek');
            socket.off('sync_state');
        };
    }, [socket, roomId, file]); // Added file dependency!

    // Video Event Handlers (Native)
    const onTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const onLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const onEnded = () => {
        setIsPlaying(false);
    };

    // Custom Control Handlers
    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            // Pause
            if (isRemoteUpdate.current) {
                isRemoteUpdate.current = false;
                return;
            }
            videoRef.current.pause();
            setIsPlaying(false);
            console.log('⏸️ [SENDING] PAUSE event at time:', videoRef.current.currentTime);
            socket.emit('pause', { roomId, currentTime: videoRef.current.currentTime });
        } else {
            // Play
            if (isRemoteUpdate.current) {
                isRemoteUpdate.current = false;
                return;
            }
            videoRef.current.play();
            setIsPlaying(true);
            console.log('▶️ [SENDING] PLAY event at time:', videoRef.current.currentTime);
            socket.emit('play', { roomId, currentTime: videoRef.current.currentTime });
        }
    };

    const handleSeekChange = (e) => {
        if (!videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);

        // Debounce/Emit
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        console.log('⏩ [SENDING] SEEK event to time:', time);
        socket.emit('seek', { roomId, currentTime: time });
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e) => {
        if (!videoRef.current) return;
        const vol = parseFloat(e.target.value);
        videoRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };



    // Skip forward/backward
    const skipForward = () => {
        if (!videoRef.current) return;
        const newTime = Math.min(videoRef.current.currentTime + 5, duration);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        console.log('⏭️ [SENDING] SKIP FORWARD (+5s) to time:', newTime);
        socket.emit('seek', { roomId, currentTime: newTime });
    };

    const skipBackward = () => {
        if (!videoRef.current) return;
        const newTime = Math.max(videoRef.current.currentTime - 5, 0);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        console.log('⏪ [SENDING] SKIP BACKWARD (-5s) to time:', newTime);
        socket.emit('seek', { roomId, currentTime: newTime });
    };

    const syncTime = () => {
        if (!videoRef.current) return;
        console.log('🔄 [SENDING] SYNC REQUEST for room:', roomId);
        socket.emit('sync_request', { roomId });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ignore if typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skipBackward();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skipForward();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isPlaying, duration]); // Dependencies for closure

    // Hover Effect for Controls - YouTube style
    const handleMouseMove = () => {
        setShowControls(true);
        // Show cursor
        if (containerRef.current) {
            containerRef.current.style.cursor = 'default';
        }

        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
                // Hide cursor in fullscreen
                if (containerRef.current && document.fullscreenElement) {
                    containerRef.current.style.cursor = 'none';
                }
            }
        }, 3000);
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%', // Ensure it fills parent
                backgroundColor: '#000',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {file ? (
                <>
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'contain',
                            cursor: 'pointer'
                        }}
                        onClick={togglePlay}
                        onTimeUpdate={onTimeUpdate}
                        onLoadedMetadata={onLoadedMetadata}
                        onEnded={onEnded}
                    />

                    {/* Custom Overlay Controls */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        padding: '1.5rem',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                        transition: 'opacity 0.3s',
                        opacity: showControls ? 1 : 0
                    }}>

                        {/* Progress Bar */}
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeekChange}
                            style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: '9999px',
                                appearance: 'none',
                                cursor: 'pointer',
                                marginBottom: '1rem',
                                background: `linear-gradient(to right, #FACCDD 0%, #FACCDD ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                            }}
                        />

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                >
                                    {isPlaying ?
                                        <Pause size={24} fill="currentColor" /> :
                                        <Play size={24} fill="currentColor" />
                                    }
                                </button>

                                {/* Skip Backward -5s */}
                                <button
                                    onClick={skipBackward}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                    title="Skip backward 5s (←)"
                                >
                                    <SkipBack size={20} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>5</span>
                                </button>

                                {/* Skip Forward +5s */}
                                <button
                                    onClick={skipForward}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                    title="Skip forward 5s (→)"
                                >
                                    <SkipForward size={20} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>5</span>
                                </button>

                                {/* Sync Time */}
                                <button
                                    onClick={syncTime}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                    title="Sync time with others"
                                >
                                    <RotateCw size={20} />
                                </button>

                                {/* Volume */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <button
                                        onClick={toggleMute}
                                        style={{
                                            color: 'white',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#FACCDD'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                                    >
                                        {isMuted || volume === 0 ?
                                            <VolumeX size={22} /> :
                                            <Volume2 size={22} />
                                        }
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        style={{
                                            width: '80px',
                                            height: '4px',
                                            borderRadius: '9999px',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                            background: `linear-gradient(to right, #FACCDD 0%, #FACCDD ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                                        }}
                                    />
                                </div>

                                {/* Time Display */}
                                <span style={{
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    fontFamily: 'monospace'
                                }}>
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            {/* Fullscreen Toggle */}
                            <button
                                onClick={onToggleFullscreen}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACCDD'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                            >
                                <Maximize size={22} />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#16171F',
                    gap: '1rem'
                }}>
                    <div style={{
                        padding: '2rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '9999px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Play size={48} style={{ color: 'white', opacity: 0.4 }} strokeWidth={2} />
                    </div>
                    <p style={{ color: 'white', fontWeight: '600' }}>No Video Selected</p>
                    <p style={{ fontSize: '0.875rem', color: '#A8A8B8' }}>Upload a video file to start</p>
                </div>
            )}

            {/* Video Title */}
            {file && showControls && (
                <div className={`absolute top-6 left-6 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-[#FACCDD]"></div>
                        <h3 className="text-sm font-semibold text-white max-w-xl truncate">{file.name}</h3>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;

