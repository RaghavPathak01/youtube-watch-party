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

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  addedBy: {
    userId: string;
    username: string;
  };
}