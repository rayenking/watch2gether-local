const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Debug Logger
const logFile = path.join(__dirname, 'server_debug.log');
const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(logFile, logMsg);
};

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*", // Allow all origins for simplicity in local dev
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // Increase timeout to avoid disconnects on slow networks
    pingInterval: 25000
});

const PORT = process.env.PORT || 3642;

// Store room state: { [roomId]: { users: [], currentTime: 0, isPlaying: false, lastUpdate: Date.now() } }
const rooms = {};

io.on('connection', (socket) => {
    logToFile(`User connected: ${socket.id}`);
    console.log('User connected:', socket.id);

    // Ping/Pong for latency check
    socket.on('ping', (callback) => {
        if (typeof callback === 'function') callback();
    });
    socket.on('chat_message', ({ roomId, text, userId }) => {
        logToFile(`RECEIVED CHAT: from=${userId} room=${roomId} text=${text}`);
        logToFile(`Current Room State: ${JSON.stringify(rooms[roomId] ? 'EXISTS' : 'MISSING')}`);

        // DEBUG: Force emit even if room invalid to see if it reaches client
        // (But normally we want logic)

        console.log(`💬 Chat message from ${userId} in room ${roomId}: ${text}`);
        if (rooms[roomId]) {
            io.to(roomId).emit('chat_message', {
                type: 'user',
                text,
                userId: userId || 'Anonymous',
                timestamp: Date.now()
            });
            logToFile(`BROADCASTED CHAT to room ${roomId}`);
            console.log(`✅ Broadcasted chat to room ${roomId}`);
        } else {
            logToFile(`REJECTED CHAT: Room ${roomId} not found`);
            console.warn(`⚠️ Chat message rejected: Room ${roomId} not found`);
        }
    });

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        logToFile(`JOIN ROOM: socket=${socket.id} room=${roomId}`);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Initialize room if not exists
        if (!rooms[roomId]) {
            logToFile(`CREATED ROOM: ${roomId}`);
            rooms[roomId] = {
                users: [],
                currentTime: 0,
                isPlaying: false,
                lastUpdate: Date.now(),
                fileName: null // To verify if users match
            };
        }
        rooms[roomId].users.push(socket.id);

        // System Log
        io.to(roomId).emit('chat_message', {
            type: 'system',
            text: `User joined the room`,
            timestamp: Date.now()
        });

        // Calculate accurate current time based on elapsed time if playing
        // let adjustedTime = rooms[roomId].currentTime;
        // if (rooms[roomId].isPlaying) {
        //     const timeElapsed = (Date.now() - rooms[roomId].lastUpdate) / 1000;
        //     adjustedTime += timeElapsed;
        // }

        // Send current state to new user -- DISABLED AS PER REQUEST
        // socket.emit('sync_state', {
        //     currentTime: adjustedTime,
        //     isPlaying: rooms[roomId].isPlaying,
        //     fileName: rooms[roomId].fileName
        // });
    });

    socket.on('file_loaded', ({ roomId, fileName }) => {
        if (rooms[roomId]) {
            rooms[roomId].fileName = fileName;
            // Notify others that a file has been loaded (optional, just for UI info)
            socket.to(roomId).emit('peer_file_loaded', fileName);

            // System Log
            io.to(roomId).emit('chat_message', {
                type: 'system',
                text: `Video loaded: ${fileName}`,
                timestamp: Date.now()
            });
        }
    });

    socket.on('play', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].isPlaying = true;
            rooms[roomId].currentTime = currentTime;
            rooms[roomId].lastUpdate = Date.now();
            // Broadcast to others in the room
            socket.to(roomId).emit('play', currentTime);

            // System Log
            io.to(roomId).emit('chat_message', {
                type: 'system',
                text: `Resumed video at ${formatTime(currentTime)}`,
                timestamp: Date.now()
            });
            console.log(`Room ${roomId} playing at ${currentTime}`);
        }
    });

    socket.on('pause', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].isPlaying = false;
            rooms[roomId].currentTime = currentTime;
            rooms[roomId].lastUpdate = Date.now(); // Update lastUpdate even on pause
            // Broadcast to others
            socket.to(roomId).emit('pause', currentTime);

            // System Log
            io.to(roomId).emit('chat_message', {
                type: 'system',
                text: `Paused video at ${formatTime(currentTime)}`,
                timestamp: Date.now()
            });
            console.log(`Room ${roomId} paused at ${currentTime}`);
        }
    });

    socket.on('seek', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].currentTime = currentTime;
            rooms[roomId].lastUpdate = Date.now(); // Reset last update time on seek
            socket.to(roomId).emit('seek', currentTime);

            // System Log
            io.to(roomId).emit('chat_message', {
                type: 'system',
                text: `Seeked to ${formatTime(currentTime)}`,
                timestamp: Date.now()
            });
            console.log(`Room ${roomId} seek to ${currentTime}`);
        }
    });

    // Helper to format time for logs
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Optional: Periodic time sync or "I am here" updates from clients
    socket.on('time_update', ({ roomId, currentTime }) => {
        // We can relax this, maybe just update server state occasionally
        if (rooms[roomId]) {
            rooms[roomId].currentTime = currentTime;
            // Don't update lastUpdate here constantly as it might cause jitter, 
            // relying on 'play' event timestamp + elapsed is smoother.
            // But if we wanted to correct drift, we could do it here.
        }
    });

    // Sync request - force sync to current server state
    socket.on('sync_request', ({ roomId }) => {
        if (rooms[roomId]) {
            // Calculate accurate current time
            let adjustedTime = rooms[roomId].currentTime;
            if (rooms[roomId].isPlaying) {
                const timeElapsed = (Date.now() - rooms[roomId].lastUpdate) / 1000;
                adjustedTime += timeElapsed;
            }

            console.log(`🔄 Sync requested for room ${roomId} - sending state:`, {
                currentTime: adjustedTime,
                isPlaying: rooms[roomId].isPlaying
            });
            // Send current state to requester
            socket.emit('sync_state', {
                currentTime: adjustedTime,
                isPlaying: rooms[roomId].isPlaying,
                fileName: rooms[roomId].fileName
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup logic could go here (remove user from rooms)
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
