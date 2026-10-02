import { randomBytes } from "crypto";
import { Room } from "./Room.js";

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketRooms = new Map();
    this.reconnectTimers = new Map();
  }

  generateRoomId() {
    let roomId;

    do {
      roomId = randomBytes(3).toString("hex").toUpperCase();
    } while (this.rooms.has(roomId));

    return roomId;
  }

  createRoom() {
    const roomId = this.generateRoomId();
    const room = new Room(roomId);

    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  addParticipant(roomId, socketId, userId, username) {
    const room = this.getRoom(roomId);

    if (!room) {
      return null;
    }

    const participant = room.addParticipant(
      socketId,
      userId,
      username
    );

    this.socketRooms.set(socketId, roomId);

    return participant;
  }

  removeParticipant(socketId) {
    const roomId = this.socketRooms.get(socketId);

    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      this.socketRooms.delete(socketId);
      return null;
    }

    const participant = room.removeParticipant(socketId);

    this.socketRooms.delete(socketId);

    return {
      room,
      participant
    };
  }

  disconnectParticipant(socketId) {
    const roomId = this.socketRooms.get(socketId);

    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      this.socketRooms.delete(socketId);
      return null;
    }

    const participant = room.getParticipant(socketId);

    if (!participant) {
      this.socketRooms.delete(socketId);
      return null;
    }

    // Remove socket connection,
    // but keep participant temporarily
    this.socketRooms.delete(socketId);

    room.participants.delete(socketId);

    return {
      room,
      participant
    };
  }

  startReconnectTimer(room, participant, onExpired) {
    const timer = setTimeout(() => {
      room.pendingDisconnects.delete(
        participant.userId
      );

      const currentParticipant =
        Array.from(room.participants.values()).find(
          (item) =>
            item.userId === participant.userId
        );

      if (currentParticipant) {
        this.reconnectTimers.delete(
          participant.userId
        );

        return;
      }

      let newHost = null;

      if (
        participant.role === "host" &&
        room.hostUserId === participant.userId
      ) {
        room.hostUserId = null;

        const remainingParticipants =
          room.getAllParticipants();

        if (remainingParticipants.length > 0) {
          newHost = remainingParticipants[0];

          newHost.role = "host";

          room.hostUserId = newHost.userId;
        }
      }

      this.reconnectTimers.delete(
        participant.userId
      );

      if (onExpired) {
        onExpired(room, participant, newHost);
      }
    }, 5000);

    this.reconnectTimers.set(
      participant.userId,
      timer
    );

    room.pendingDisconnects.set(
      participant.userId,
      participant
    );
  }

  cancelReconnectTimer(userId) {
    const timer = this.reconnectTimers.get(userId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);

    this.reconnectTimers.delete(userId);
  }

  getRoomBySocket(socketId) {
    const roomId = this.socketRooms.get(socketId);

    if (!roomId) {
      return null;
    }

    return this.rooms.get(roomId);
  }
}