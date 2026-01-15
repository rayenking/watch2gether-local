const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*", // Allow all origins for simplicity in local dev
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3642;

// Store room state: { [roomId]: { users: [], currentTime: 0, isPlaying: false, lastUpdate: Date.now() } }
const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Initialize room if not exists
        if (!rooms[roomId]) {
            rooms[roomId] = {
                users: [],
                currentTime: 0,
                isPlaying: false,
                lastUpdate: Date.now(),
                fileName: null // To verify if users match
            };
        }
        rooms[roomId].users.push(socket.id);

        // Send current state to new user
        socket.emit('sync_state', {
            currentTime: rooms[roomId].currentTime,
            isPlaying: rooms[roomId].isPlaying,
            fileName: rooms[roomId].fileName
        });
    });

    socket.on('file_loaded', ({ roomId, fileName }) => {
        if (rooms[roomId]) {
            rooms[roomId].fileName = fileName;
            // Notify others that a file has been loaded (optional, just for UI info)
            socket.to(roomId).emit('peer_file_loaded', fileName);
        }
    });

    socket.on('play', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].isPlaying = true;
            rooms[roomId].currentTime = currentTime;
            rooms[roomId].lastUpdate = Date.now();
            // Broadcast to others in the room
            socket.to(roomId).emit('play', currentTime);
            console.log(`Room ${roomId} playing at ${currentTime}`);
        }
    });

    socket.on('pause', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].isPlaying = false;
            rooms[roomId].currentTime = currentTime;
            // Broadcast to others
            socket.to(roomId).emit('pause', currentTime);
            console.log(`Room ${roomId} paused at ${currentTime}`);
        }
    });

    socket.on('seek', ({ roomId, currentTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].currentTime = currentTime;
            socket.to(roomId).emit('seek', currentTime);
            console.log(`Room ${roomId} seek to ${currentTime}`);
        }
    });

    // Optional: Periodic time sync or "I am here" updates from clients
    socket.on('time_update', ({ roomId, currentTime }) => {
        // We can relax this, maybe just update server state occasionally
        if (rooms[roomId]) {
            rooms[roomId].currentTime = currentTime;
        }
    });

    // Sync request - force sync to current server state
    socket.on('sync_request', ({ roomId }) => {
        if (rooms[roomId]) {
            console.log(`🔄 Sync requested for room ${roomId} - sending state:`, {
                currentTime: rooms[roomId].currentTime,
                isPlaying: rooms[roomId].isPlaying
            });
            // Send current state to requester
            socket.emit('sync_state', {
                currentTime: rooms[roomId].currentTime,
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
