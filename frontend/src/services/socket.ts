import { io } from "socket.io-client";

// VITE_BACKEND_URL is useful if you host frontend on Vercel and backend on Render.
// If it's a full-stack deployment on Render, it automatically falls back to window.location.origin.
const SOCKET_URL = import.meta.env.PROD 
    ? (import.meta.env.VITE_BACKEND_URL || window.location.origin) 
    : "http://localhost:4000";

const socket = io(SOCKET_URL, {
    withCredentials: true
});

export default socket;