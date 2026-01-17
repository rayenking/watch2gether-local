# Watch2Gether Local

A lightweight, real-time video synchronization app that lets you watch videos together with friends—without uploading anything to a server. Everything stays on your device.

I built this because existing watch-together solutions either required uploading videos (slow, privacy concerns) or had overly complex setups. This keeps it simple: everyone loads the same video file locally, joins a room, and playback syncs automatically.

## Features

- **Real-time sync** - Play, pause, and seek are instantly synchronized across all viewers
- **Live Chat** - Real-time messaging with side-by-side or split-screen support
- **User Identity** - Set your username to identify yourself in the chat
- **Connection Status** - Live latency (ping) indicator to monitor your connection quality
- **100% local playback** - Videos never leave your device, just sync commands are shared
- **Zero upload time** - No waiting for videos to upload or process
- **Lightweight** - Just Socket.IO for sync, plain video elements for playback
- **Mobile friendly** - Works on phones and tablets, not just desktop
- **Keyboard shortcuts** - Arrow keys to skip, spacebar to play/pause, etc.
- **CI/CD** - Automated builds and checks via GitHub Actions

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- The same video file on all devices (same name and content)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rayenking/watch2gether-local.git
   cd watch2gether-local
   ```

2. **Set up the server**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env if you want to change the port
   npm start
   ```

3. **Set up the client** (in a new terminal)
   ```bash
   cd client
   npm install
   cp .env.example .env
   # Edit .env to point to your backend URL if needed
   npm run dev
   ```

4. **Open in browser**
   - Go to `http://localhost:5173`
   - Enter a room name
   - Upload your video file
   - Share the room name with friends!

## Configuration

### Server Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3642                # Port the server runs on
CORS_ORIGIN=*           # Allowed origins (use * for development)
```

### Client Environment Variables

Create a `.env` file in the `client/` directory:

```env
# Backend URL - where your server is running
VITE_BACKEND_URL=http://localhost:3642

# Allowed hosts for Vite dev server (comma-separated)
VITE_ALLOWED_HOSTS=localhost,127.0.0.1
```

## How It Works

1. All users join a "room" using the same room ID
2. Each user selects the same video file from their device
3. When someone plays/pauses/seeks, that action is broadcast to everyone in the room
4. Other clients receive the sync command and update their video accordingly
5. No video data is transmitted—only playback state

This means you can watch a 4K movie together without anyone uploading gigabytes of data. You just need everyone to have the same file.

## Development

### Architecture

```
watch2gether-local/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Main app component
│   │   ├── components/
│   │   │   └── VideoPlayer.jsx  # Custom video player with sync
│   └── .env         # Client configuration
│
└── server/          # Node.js + Socket.IO backend
    ├── index.js     # WebSocket server
    └── .env         # Server configuration
```

### Available Scripts

**Server:**
- `npm start` - Start the WebSocket server
- `npm run dev` - Start with auto-reload (if nodemon installed)

**Client:**
- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Keyboard Shortcuts

- `Space` or `K` - Play/pause
- `←` - Skip backward 5 seconds
- `→` - Skip forward 5 seconds
- `F` - Toggle fullscreen
- `M` - Mute/unmute

## Deployment

### Using Cloudflare Tunnel (Zero Trust)

If you want to host this for remote friends without exposing your IP:

1. Set up Cloudflare Tunnel for your backend
2. Update client `.env`:
   ```env
   VITE_BACKEND_URL=https://your-backend-tunnel.com
   ```
3. Update `VITE_ALLOWED_HOSTS` to include your tunnel domains

### Traditional Hosting

1. Build the client: `cd client && npm run build`
2. Serve the `dist/` folder with any static host (Vercel, Netlify, etc.)
3. Deploy the server to any Node.js host
4. Update client `.env` to point to your production backend URL

## Troubleshooting

### "Socket connected: undefined"
- Check that `VITE_BACKEND_URL` points to the correct backend address
- Verify the backend server is running and accessible
- Check browser console for CORS errors

### Videos not syncing
- Make sure everyone is in the **exact same room** (room IDs are case-sensitive)
- Verify everyone has **uploaded a video file** - sync only works after file upload
- Check that socket listeners attached: look for "✅ Socket listeners attached successfully" in console

### "Can't connect to server"
- Backend might not be running - check `server/` directory
- Port might be in use - try changing `PORT` in server `.env`
- Firewall blocking WebSocket connections

### Auto-reload issues
- This is usually Vite's HMR kicking in during development
- Normal behavior, not a bug
- Use `npm run build` + `npm run preview` to test without HMR

## License

MIT - feel free to use this for whatever. If you make something cool with it, I'd love to hear about it!

## Contributing

Pull requests welcome! This started as a weekend project so there's definitely room for improvement. Some ideas:

- Support for subtitles/captions
- Quality selection for different network speeds
- Persistent rooms (currently rooms reset on server restart)

If you're adding a feature, just make sure to update the README.

---

Built because watching videos "together" over a video call with screen-sharing lag is painful. This actually works.
