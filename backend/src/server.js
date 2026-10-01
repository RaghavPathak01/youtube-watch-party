import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { RoomManager } from "./RoomManager.js";
import { setupSocketHandlers } from "./socketHandlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
  })
);
app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
  },
});

const roomManager = new RoomManager();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Anything that doesn't match the above, send back index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  setupSocketHandlers(io, socket, roomManager);
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});