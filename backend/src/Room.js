import { randomUUID } from "crypto";
import { Participant, ROLES } from "./Participant.js";

export class Room {
  constructor(roomId, name = "Anonymous", genre = "Movies", visibility = "private") {
    this.roomId = roomId;
    this.discoverId = randomUUID();
    this.name = name;
    this.genre = genre;
    this.visibility = visibility;
    this.participants = new Map();
    this.hostUserId = null;
    this.pendingDisconnects = new Map();

    this.videoId = "";
    this.playState = "paused";
    this.currentTime = 0;
    this.lastUpdatedAt = Date.now();
    this.chatHistory = [];
    this.queue = [];
  }

  addParticipant(socketId, userId, username) {
    let role = ROLES.PARTICIPANT;

    // First person in the room becomes Host
    if (this.participants.size === 0 && !this.hostUserId) {
      role = ROLES.HOST;
      this.hostUserId = userId;
    }

    // Returning Host gets Host role back
    if (userId === this.hostUserId) {
      role = ROLES.HOST;
    }

    const participant = new Participant(
      socketId,
      userId,
      username,
      role
    );

    this.participants.set(socketId, participant);

    return participant;
  }

  getParticipant(socketId) {
    return this.participants.get(socketId);
  }

  removeParticipant(socketId) {
  const participant = this.participants.get(socketId);

  if (!participant) {
    return null;
  }

  this.participants.delete(socketId);

  // If the host leaves, make the first remaining participant host
  if (
    participant.role === ROLES.HOST &&
    this.participants.size > 0
  ) {
    const newHost = this.participants.values().next().value;

    newHost.role = ROLES.HOST;
    this.hostUserId = newHost.userId;
  }

  return participant;
}

  getAllParticipants() {
    return Array.from(this.participants.values());
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  getCurrentTime() {
    if (this.playState === "playing") {
      return this.currentTime + (Date.now() - this.lastUpdatedAt) / 1000;
    }

    return this.currentTime;
  }

  addChatMessage(message) {
    this.chatHistory.push(message);
    if (this.chatHistory.length > 50) {
      this.chatHistory.shift();
    }
  }
}