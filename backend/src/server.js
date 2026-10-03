import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

import { RoomManager } from "./RoomManager.js";
import { setupSocketHandlers } from "./socketHandlers.js";
import { socketAuth } from "./socketAuth.js";
import authRoutes from "./auth.js";
import { initDatabase } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// In production on Render, frontend is served from the same origin.
// Allow both the explicit FRONTEND_URL and the server's own origin.
const allowedOrigins = [FRONTEND_URL];
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

app.use(helmet());

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (same-origin, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

const io = new Server(httpServer, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  },
});

const roomManager = new RoomManager();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth Routes
app.use("/auth", authRoutes);

// Anything that doesn't match the above, send back index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

// Socket Auth Middleware
io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "Authenticated as:", socket.user.name);

  setupSocketHandlers(io, socket, roomManager);
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await initDatabase();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();