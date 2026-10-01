export type Role = "host" | "moderator" | "participant";

export interface Participant {
  socketId: string;
  username: string;
  role: Role;
}

export interface RoomState {
  videoId: string;
  playState: "playing" | "paused";
  currentTime: number;
  serverTime: number;
}