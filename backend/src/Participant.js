export const ROLES = {
  HOST: "host",
  MODERATOR: "moderator",
  PARTICIPANT: "participant",
};

export class Participant {
  constructor(socketId, userId, username, role) {
    this.socketId = socketId;
    this.userId = userId;
    this.username = username;
    this.role = role;
  }
}