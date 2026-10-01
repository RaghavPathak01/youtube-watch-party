# YouTube Watch Party

A real-time, synchronized YouTube watch party application where users can create rooms, watch videos together in perfect sync, and manage roles (Host, Moderator, Participant). 

## 🚀 Live Demo
**Live URL:** [Insert Deployment URL here, e.g., https://your-app.onrender.com]
*(Please follow the deployment instructions below to get your live URL and replace it here)*

## 🛠️ Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Real-time Sync**: Socket.IO (WebSockets)
- **Video Player**: YouTube IFrame API

## 📋 Features & Role-Based Access Control
- **Host**: Has full control over the room (play, pause, seek, change video, remove users, assign roles).
- **Moderator**: Assigned by the host, can control playback and change videos.
- **Participant**: Can watch the video but cannot control playback directly. They must send requests to the Host/Moderator to perform actions.

## ⚙️ How WebSockets Integrate with the Flow (Architecture Overview)
WebSockets (via Socket.IO) form the backbone of this real-time application:
1. **Bidirectional Communication**: Unlike standard HTTP, WebSockets keep a persistent connection open between the client and server.
2. **Room Management**: Socket.IO's native `.join()` and `.to(roomId).emit()` features are used to broadcast messages exclusively to users in the same watch party.
3. **State Synchronization**: When a Host or Moderator performs an action (play, pause, seek, or changing the video), the client sends an event to the Express server. The server instantly broadcasts this state change to all other participants in the room, making their local YouTube IFrame API reflect the new state.
4. **Action Requests**: Participants emit a `request_action` event. The server forwards this to the room's Host/Moderator, who can approve or reject the request in real-time.

## 💻 Local Setup Instructions

1. **Install Dependencies**
First, install the dependencies for both the frontend and backend.
```bash
# In the backend directory
cd backend
npm install

# In the frontend directory
cd ../frontend
npm install
```

2. **Run the Application locally (Development)**
You can run the backend and frontend separately for development:

```bash
# Run Backend (Port 4000)
cd backend
npm run dev

# Run Frontend (Port 5173)
cd ../frontend
npm run dev
```

3. **Run the Application locally (Production Mode)**
The backend is configured to serve the frontend as static files in production.
```bash
# Build the frontend
cd frontend
npm run build

# Start the full-stack server
cd ../backend
npm start
```
Go to `http://localhost:4000` to view the app!

## 🌍 Deployment Guide

This application can be deployed as a single full-stack app on Render OR separated (Frontend on Vercel, Backend on Render).

### Option A: Separate Deployments (Vercel + Render)

**1. Backend (Render):**
1. Push your code to GitHub.
2. On [Render](https://render.com/), create a **New Web Service**.
3. Connect your repository.
4. Set **Root Directory** to `backend`.
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`
7. Copy the public URL provided by Render once deployed (e.g., `https://my-backend.onrender.com`).

**2. Frontend (Vercel):**
1. On [Vercel](https://vercel.com/), **Import Project** from GitHub.
2. Set the **Framework Preset** to `Vite`.
3. Set the **Root Directory** to `frontend`.
4. Add an **Environment Variable**:
   - `VITE_BACKEND_URL` = `[Your Render Backend URL]`
5. Click **Deploy**.

### Option B: Single Full-Stack Deployment (Render)
1. On [Render](https://render.com/), create a **New Web Service**.
2. **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install`
3. **Start Command**: `cd backend && npm start`

---

## 📝 Code Walkthrough & Understanding
- **Socket.IO**: Used for low-latency, real-time message broadcasting. It automatically handles reconnections.
- **Express**: Used to serve the `/health` endpoint and statically serve the React frontend `dist` directory in production.
- **React + YouTube IFrame API**: The React frontend uses an invisible custom sync logic overlay to interpret WebSocket commands and translate them into native YouTube Player commands (`playVideo`, `pauseVideo`, `seekTo`).
- **Permissions**: A dedicated `permissions.js` file on the backend validates if a user has the appropriate role before allowing sensitive events (like seeking or kicking users) to broadcast.
