import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';

const NotificationToast = ({ notifications, position = 'top-right', theme = 'dark' }) => {
    if (notifications.length === 0) return null;

    // Position styles
    const getPositionStyle = () => {
        switch (position) {
            case 'top-left':
                return { top: '2rem', left: '2rem', flexDirection: 'column' };
            case 'bottom-left':
                return { bottom: '5rem', left: '2rem', flexDirection: 'column-reverse' };
            case 'bottom-right':
                return { bottom: '5rem', right: '2rem', flexDirection: 'column-reverse' };
            case 'top-right':
            default:
                return { top: '2rem', right: '2rem', flexDirection: 'column' };
        }
    };

    const isDark = theme === 'dark';

    return (
        <div style={{
            position: 'absolute',
            zIndex: 100,
            display: 'flex',
            gap: '0.5rem',
            pointerEvents: 'none', // Allow clicks to pass through to video
            maxWidth: '350px',
            ...getPositionStyle()
        }}>
            {notifications.map((notif) => (
                <div key={notif.id} style={{
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    color: isDark ? 'white' : '#1E293B',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '2rem', // Fully rounded pill shape
                    borderBottomRightRadius: position.includes('right') ? '0.25rem' : '2rem', // Chat bubble effect
                    borderBottomLeftRadius: position.includes('left') ? '0.25rem' : '2rem', // Chat bubble effect
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy pop effect
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: isDark ? '#FACCDD' : '#BE185D' }}>
                            {notif.sender}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B', opacity: 0.8 }}>Now</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', lineHeight: '1.4', fontWeight: '500' }}>
                        {notif.text}
                    </div>
                </div>
            ))}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;
