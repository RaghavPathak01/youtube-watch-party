# 🎬 WatchTogether

A real-time, synchronized YouTube watch party application where users can create rooms, watch videos together in perfect sync, chat, react, and manage roles.

## 🚀 Live Demo
**Live URL:** [https://watchtogether-wh7z.onrender.com/](https://watchtogether-wh7z.onrender.com/)

---

## 🛠️ Technology Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (hosted on Supabase)
- **Authentication:** JWT (JSON Web Tokens) with HTTP-only cookies
- **Real-time Sync:** Socket.IO (WebSockets)
- **Video Player:** YouTube IFrame API

---

## 📋 Features

- **Real-Time Video Sync:** Play, pause, and seek actions are instantly synchronized across all users in a room.
- **Role-Based Access Control:**
  - **Host:** Full control over the room, playback, and queue. Hosts can seamlessly rejoin their private rooms without entering the join code.
  - **Participant:** Can watch the video in sync but must request permission to control playback.
- **Action Requests:** Participants can request to play, pause, or change the video, which the Host can approve or reject in real-time.
- **Video Queue:** Add videos to the "Up Next" queue. The host can play them immediately or let them auto-play.
- **Live Chat & Floating Reactions:** Send messages and floating emoji reactions that appear on the video player for everyone.
- **Discover Page:** Browse public rooms with live participant counts and currently playing videos. Private rooms require a unique join code.
- **Fully Responsive UI:** A premium, dark-mode aesthetic that looks great on desktops, tablets, and mobile devices.

---

## ⚙️ Architecture & Real-Time Flow

WebSockets (via **Socket.IO**) form the backbone of this real-time application:

- **Bidirectional Communication:** A persistent connection remains open between the client and server.
- **Room Management:** Socket.IO's native `.join()` and `.to(roomId).emit()` broadcast messages exclusively to users in the same watch party.
- **State Synchronization:** When a Host performs an action, the client sends an event to the Express server. The server instantly broadcasts this state change to all participants, updating their local YouTube IFrame API.
- **Database Persistence:** Users, Rooms, and Messages are stored in PostgreSQL using secure, sanitized queries. Passwords are hashed with `bcryptjs`.

---

## 💻 Local Setup Instructions

### 1. Environment Variables
You will need a PostgreSQL database (e.g., Supabase, Neon) to run this locally. 
Create a `.env` file in the `backend/` directory:

```env
PORT=4000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_super_secret_jwt_key
```

### 2. Install Dependencies

```bash
# In the backend directory
cd backend
npm install

# In the frontend directory
cd ../frontend
npm install
```

### 3. Run the Application (Development)

Run the backend and frontend separately for development:

```bash
# Run Backend (Port 4000)
cd backend
npm run dev

# Run Frontend (Port 5173)
cd ../frontend
npm run dev
```

### 4. Run the Application (Production Mode)

The backend is configured to serve the frontend as static files in production.

```bash
# Build the frontend
cd frontend
npm run build

# Start the full-stack server
cd ../backend
node src/server.js
```
Go to `http://localhost:4000` to view the app!

---

## 🌍 Deployment Guide (Render)

This application is optimized to be deployed as a single full-stack app on [Render](https://render.com/), which provides excellent native WebSocket support.

1. On Render, create a **New Web Service**.
2. Connect your GitHub repository.
3. Set the following configuration:
   - **Root Directory:** *(leave blank)*
   - **Build Command:** 
     `cd frontend && npm install --include=dev && npm run build && cd ../backend && npm install`
   - **Start Command:** 
     `cd backend && node src/server.js`
4. Add your **Environment Variables** (`DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`).
5. Click **Deploy Web Service**.

Once deployed, your backend will automatically serve the built React frontend, and Socket.IO will handle all WebSocket connections on the same port, completely bypassing CORS issues!
