import { canControlPlayback, canAssignModerator , canRemoveParticipant ,  canApproveRequest } from "./permissions.js";

const isRateLimited = (socket, eventName, limit, windowMs) => {
  if (!socket.rateLimits) {
    socket.rateLimits = {};
  }
  
  if (!socket.rateLimits[eventName]) {
    socket.rateLimits[eventName] = [];
  }
  
  const now = Date.now();
  const timestamps = socket.rateLimits[eventName];
  
  while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
    timestamps.shift();
  }
  
  if (timestamps.length >= limit) {
    return true;
  }
  
  timestamps.push(now);
  return false;
};

export function setupSocketHandlers(io, socket, roomManager) {

  const broadcastActiveRooms = () => {
    io.emit("active_rooms_updated", roomManager.getActiveRooms());
  };

  socket.on("get_active_rooms", () => {
    socket.emit("active_rooms_updated", roomManager.getActiveRooms());
  });

  // Create a new room
  socket.on("create_room", ({ roomName, genre, visibility } = {}) => {
  if (isRateLimited(socket, "create_room", 5, 10000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const cleanUserId = String(socket.user.userId);
  const cleanUsername = String(socket.user.name).slice(0, 30);
  let cleanRoomName = String(roomName || "").trim();
  cleanRoomName = cleanRoomName ? cleanRoomName.slice(0, 50) : `${cleanUsername}'s Room`;
  const ALLOWED_GENRES = ["Movies", "Gaming", "Music", "Education", "Sports"];
  const cleanGenre = ALLOWED_GENRES.includes(genre) ? genre : "Movies";
  const cleanVisibility = visibility === "public" ? "public" : "private";

  if (!cleanUserId || !cleanUsername) {
    socket.emit("error_message", {
      message: "User ID and username are required",
    });

    return;
  }

  if (roomManager.getRoomBySocket(socket.id)) {
    socket.emit("error_message", {
      message: "Already in a room",
    });

    return;
  }

  const room = roomManager.createRoom(cleanRoomName, cleanGenre, cleanVisibility);

  const participant = roomManager.addParticipant(
    room.roomId,
    socket.id,
    cleanUserId,
    cleanUsername
  );

  socket.join(room.roomId);

  socket.emit("room_joined", {
    roomId: room.roomId,
    participant,
  });

  socket.emit("sync_state", {
    roomName: room.name,
    genre: room.genre,
    visibility: room.visibility,
    videoId: room.videoId,
    playState: room.playState,
    currentTime: room.getCurrentTime(),
    serverTime: Date.now(),
    chatHistory: room.chatHistory,
    queue: room.queue,
  });

  io.to(room.roomId).emit("participants_updated", {
    participants: room.getAllParticipants(),
  });

  console.log(
    `${cleanUsername} created room ${room.roomId}`
  );
  
  broadcastActiveRooms();
});


  // Join an existing room
  socket.on("join_room", ({ roomId } = {}) => {
    if (isRateLimited(socket, "join_room", 10, 10000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }

    const cleanRoomId = String(roomId || "")
      .trim()
      .toUpperCase()
      .slice(0, 20);

    const cleanUserId = String(socket.user.userId);
    const cleanUsername = String(socket.user.name).slice(0, 30);

    if (!cleanRoomId || !cleanUserId || !cleanUsername) {
      socket.emit("error_message", {
        message: "Room ID, User ID and username are required",
      });

      return;
    }

    // Prevent one socket from joining multiple rooms
    const currentRoom = roomManager.getRoomBySocket(socket.id);
    if (currentRoom) {
      if (currentRoom.roomId === cleanRoomId) {
        const participant = currentRoom.getParticipant(socket.id);

        socket.emit("room_joined", {
          roomId: currentRoom.roomId,
          participant,
        });

        socket.emit("sync_state", {
          roomName: currentRoom.name,
          genre: currentRoom.genre,
          visibility: currentRoom.visibility,
          videoId: currentRoom.videoId,
          playState: currentRoom.playState,
          currentTime: currentRoom.getCurrentTime(),
          serverTime: Date.now(),
          chatHistory: currentRoom.chatHistory,
          queue: currentRoom.queue,
        });

        socket.emit("participants_updated", {
          participants: currentRoom.getAllParticipants(),
        });

        return;
      } else {
        socket.emit("error_message", {
          message: "Already in a room",
        });

        return;
      }
    }

    const room = roomManager.getRoom(cleanRoomId);

    if (!room) {
      socket.emit("error_message", {
        message: "Room not found",
      });

      return;
    }

    const reconnectingParticipant = room.pendingDisconnects?.get(cleanUserId);

    if (reconnectingParticipant) {
      roomManager.cancelReconnectTimer(cleanUserId);

      room.pendingDisconnects.delete(cleanUserId);

      reconnectingParticipant.socketId = socket.id;
      reconnectingParticipant.username = cleanUsername;

      room.participants.set(
        socket.id,
        reconnectingParticipant
      );

      roomManager.socketRooms.set(
        socket.id,
        cleanRoomId
      );

      if (room.pendingRequests) {
        room.pendingRequests.forEach((req) => {
          if (req.userId === cleanUserId) {
            req.socketId = socket.id;
          }
        });
      }

      socket.join(cleanRoomId);

      socket.emit("room_joined", {
        roomId: cleanRoomId,
        participant: reconnectingParticipant,
      });

      socket.emit("sync_state", {
        roomName: room.name,
        genre: room.genre,
        visibility: room.visibility,
        videoId: room.videoId,
        playState: room.playState,
        currentTime: room.getCurrentTime(),
        serverTime: Date.now(),
        chatHistory: room.chatHistory,
        queue: room.queue,
      });

      io.to(cleanRoomId).emit("participants_updated", {
        participants: room.getAllParticipants(),
      });

      const systemMsg = {
        id: Math.random().toString(36).substr(2, 9),
        userId: "system",
        username: "System",
        message: `${reconnectingParticipant.username} joined`,
        timestamp: Date.now()
      };
      room.chatHistory.push(systemMsg);
      if (room.chatHistory.length > 100) room.chatHistory.shift();
      io.to(cleanRoomId).emit("new_message", systemMsg);

      console.log(
        `${cleanUsername} reconnected to ${cleanRoomId} as ${reconnectingParticipant.role}`
      );

      return;
    }

    const participant = roomManager.addParticipant(
      cleanRoomId,
      socket.id,
      cleanUserId,
      cleanUsername
    );

    socket.join(cleanRoomId);

    // Tell the new user about their identity
    socket.emit("room_joined", {
      roomId: cleanRoomId,
      participant,
    });

    // Sync current playback state
    socket.emit("sync_state", {
      roomName: room.name,
      genre: room.genre,
      visibility: room.visibility,
      videoId: room.videoId,
      playState: room.playState,
      currentTime: room.getCurrentTime(),
      serverTime: Date.now(),
      queue: room.queue,
    });

    // Update everyone in the room
    io.to(cleanRoomId).emit("participants_updated", {
      participants: room.getAllParticipants(),
    });

    console.log(
      `${cleanUsername} joined ${cleanRoomId} as ${participant.role}`
    );
    
    broadcastActiveRooms();
  });

  // Update room name
  socket.on("update_room_name", ({ roomId, roomName }) => {
    const cleanRoomId = String(roomId || "").trim().toUpperCase();
    const room = roomManager.getRoom(cleanRoomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant || participant.role !== "host") return;

    let cleanName = String(roomName || "").trim();
    if (!cleanName) return;
    cleanName = cleanName.slice(0, 50);

    room.name = cleanName;
    io.to(cleanRoomId).emit("room_name_updated", cleanName);
    broadcastActiveRooms();
  });

  // Update genre
  socket.on("update_genre", ({ roomId, genre }) => {
    const cleanRoomId = String(roomId || "").trim().toUpperCase();
    const room = roomManager.getRoom(cleanRoomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant || participant.role !== "host") return;

    const ALLOWED_GENRES = ["Movies", "Gaming", "Music", "Education", "Sports"];
    if (!ALLOWED_GENRES.includes(genre)) return;

    room.genre = genre;
    io.to(cleanRoomId).emit("genre_updated", genre);
    broadcastActiveRooms();
  });

  // Update visibility
  socket.on("update_visibility", ({ roomId, visibility }) => {
    const cleanRoomId = String(roomId || "").trim().toUpperCase();
    const room = roomManager.getRoom(cleanRoomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant || participant.role !== "host") return;

    const cleanVisibility = visibility === "public" ? "public" : "private";
    room.visibility = cleanVisibility;
    io.to(cleanRoomId).emit("visibility_updated", cleanVisibility);
    broadcastActiveRooms();
  });


  // Common function for leaving a room
  const leaveCurrentRoom = () => {
  const result = roomManager.removeParticipant(socket.id);

  if (!result) {
    return null;
  }

  const { room, participant } = result;

  if (room.pendingRequests) {
    room.pendingRequests = room.pendingRequests.filter(
      (req) => req.userId !== participant.userId
    );
  }

  socket.leave(room.roomId);

  console.log(
    `${participant.username} left room ${room.roomId}`
  );

  if (!room.isEmpty()) {
    io.to(room.roomId).emit("participants_updated", {
      participants: room.getAllParticipants(),
    });

    const newHost = room
      .getAllParticipants()
      .find((p) => p.role === "host");

    if (participant.role === "host" && newHost) {
      io.to(room.roomId).emit("host_changed", {
        host: newHost,
      });
    }
  } else {
    roomManager.deleteRoom(room.roomId);
    console.log(`Room ${room.roomId} deleted (empty)`);
  }

  broadcastActiveRooms();
  return result;
};

  // Leave room manually
  socket.on("leave_room", () => {
    const result = leaveCurrentRoom();

    if (!result) {
      socket.emit("error_message", {
        message: "You are not in a room",
      });

      return;
    }

    socket.emit("room_left", {
      roomId: result.room.roomId,
    });
  });


  // Handle disconnect
  socket.on("disconnect", () => {
    const result = roomManager.disconnectParticipant(socket.id);

    if (!result) {
      return;
    }

    const { room, participant } = result;

    console.log(
      `${participant.username} disconnected from room ${room.roomId}`
    );

    roomManager.startReconnectTimer(
      room,
      participant,
      (room, disconnectedParticipant, newHost) => {
        if (room.pendingRequests) {
          room.pendingRequests = room.pendingRequests.filter(
            (req) => req.userId !== disconnectedParticipant.userId
          );
        }

        if (room.isEmpty()) {
            roomManager.deleteRoom(room.roomId);
            console.log(`Room ${room.roomId} deleted (empty after disconnect timeout)`);
            return;
        }

        io.to(room.roomId).emit(
          "participants_updated",
          {
            participants: room.getAllParticipants(),
          }
        );

        if (newHost) {
          io.to(room.roomId).emit(
            "host_changed",
            {
              host: newHost,
            }
          );

          console.log(
            `${newHost.username} is now the Host of ${room.roomId}`
          );
        }
        
        broadcastActiveRooms();
      }
    );
  });

  const playVideo = (room, providedTime) => {
  if (typeof providedTime === "number") {
    room.currentTime = providedTime;
  } else {
    room.currentTime = room.getCurrentTime();
  }
  room.playState = "playing";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("play", {
    currentTime: room.currentTime,
    serverTime: room.lastUpdatedAt,
  });
};

  // Play Event
  socket.on("play", (data = {}) => {
    if (isRateLimited(socket, "play", 10, 1000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }
    const room = roomManager.getRoomBySocket(socket.id);

    if (!room) {
        socket.emit("error_message", {
        message: "You are not in a room",
        });

        return;
    }

    const participant = room.getParticipant(socket.id);

    if (!participant || !canControlPlayback(participant.role)) {
        socket.emit("error_message", {
        message: "You do not have permission to control playback",
        });

        return;
    }

    let timeToPlay = data?.currentTime;
    if (timeToPlay !== undefined) {
      timeToPlay = Number(timeToPlay);
      if (!Number.isFinite(timeToPlay) || timeToPlay < 0) {
        timeToPlay = undefined;
      }
    }
    playVideo(room, timeToPlay);
  });


const pauseVideo = (room, providedTime) => {
  if (typeof providedTime === "number") {
    room.currentTime = providedTime;
  } else {
    room.currentTime = room.getCurrentTime();
  }
  room.playState = "paused";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("pause", {
    currentTime: room.currentTime,
    serverTime: room.lastUpdatedAt,
  });
};

  // Pause Event
  socket.on("pause", (data = {}) => {
    if (isRateLimited(socket, "pause", 10, 1000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }
    const room = roomManager.getRoomBySocket(socket.id);

    if (!room) {
        socket.emit("error_message", {
        message: "You are not in a room",
        });

        return;
    }

    const participant = room.getParticipant(socket.id);

    if (!participant || !canControlPlayback(participant.role)) {
        socket.emit("error_message", {
        message: "You do not have permission to control playback",
        });

        return;
    }

    let timeToPause = data?.currentTime;
    if (timeToPause !== undefined) {
      timeToPause = Number(timeToPause);
      if (!Number.isFinite(timeToPause) || timeToPause < 0) {
        timeToPause = undefined;
      }
    }
    pauseVideo(room, timeToPause);
  });

  // seek event

  const seekVideo = (room, newTime) => {
  room.currentTime = newTime;
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("seek", {
    currentTime: room.currentTime,
    serverTime: room.lastUpdatedAt,
  });
};

  socket.on("seek", ({ currentTime } = {}) => {
    if (isRateLimited(socket, "seek", 10, 1000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }
    const room = roomManager.getRoomBySocket(socket.id);

    if (!room) {
        socket.emit("error_message", {
        message: "You are not in a room",
        });

        return;
    }

    const participant = room.getParticipant(socket.id);

    if (!participant || !canControlPlayback(participant.role)) {
        socket.emit("error_message", {
        message: "You do not have permission to control playback",
        });

        return;
    }

    const newTime = Number(currentTime);

    if (!Number.isFinite(newTime) || newTime < 0) {
        socket.emit("error_message", {
        message: "Invalid seek position",
        });

        return;
    }

    seekVideo(room, newTime);
  });

  // change video event

  const changeVideo = (room, videoId, autoplay = false) => {
  room.videoId = videoId;
  room.currentTime = 0;
  room.playState = autoplay ? "playing" : "paused";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("change_video", {
    videoId: room.videoId,
    currentTime: room.currentTime,
    playState: room.playState,
    serverTime: room.lastUpdatedAt,
  });
};

  socket.on("change_video", ({ videoId } = {}) => {
  if (isRateLimited(socket, "change_video", 3, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const participant = room.getParticipant(socket.id);

  if (!participant || !canControlPlayback(participant.role)) {
    socket.emit("error_message", {
      message: "You do not have permission to change the video",
    });

    return;
  }

  const cleanVideoId = String(videoId || "").trim();

  if (!/^[a-zA-Z0-9_-]{11}$/.test(cleanVideoId)) {
    socket.emit("error_message", {
      message: "Invalid YouTube video ID",
    });

    return;
  }

  changeVideo(room, cleanVideoId);
});

// request action 

socket.on("request_action", ({ action, data } = {}) => {
  if (isRateLimited(socket, "request_action", 5, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const participant = room.getParticipant(socket.id);

  if (!participant) {
    socket.emit("error_message", {
      message: "Participant not found",
    });

    return;
  }

  // Only participants need approval
  if (participant.role !== "participant") {
    socket.emit("error_message", {
      message: "You can perform this action directly",
    });

    return;
  }

  const allowedActions = [
    "play",
    "pause",
    "seek",
    "change_video",
  ];

  if (!allowedActions.includes(action)) {
    socket.emit("error_message", {
      message: "Invalid action",
    });

    return;
  }

  room.pendingRequests = room.pendingRequests || [];

  // Check if the same participant already has
  // a pending request for the same action
  const existingRequest = room.pendingRequests.find(
    (item) =>
      item.socketId === socket.id &&
      item.action === action
  );

  if (existingRequest) {
    return;
  }

  let cleanData = {};
  if (action === "seek") {
    const time = Number(data?.currentTime);
    if (!Number.isFinite(time) || time < 0) {
      socket.emit("error_message", { message: "Invalid seek time" });
      return;
    }
    cleanData = { currentTime: time };
  } else if (action === "change_video") {
    const vid = String(data?.videoId || "").trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
      socket.emit("error_message", { message: "Invalid YouTube video ID" });
      return;
    }
    cleanData = { videoId: vid };
  }

  const request = {
    requestId: Date.now().toString(),
    socketId: socket.id,
    userId: participant.userId,
    username: participant.username,
    action,
    data: cleanData,
  };

  room.pendingRequests.push(request);

  // Send request to Host/Moderator
  room.getAllParticipants().forEach((member) => {
    if (
      member.role === "host" ||
      member.role === "moderator"
    ) {
      io.to(member.socketId).emit("action_request", request);
    }
  });
});

// Request Approval

socket.on("approve_request", ({ requestId } = {}) => {
  if (isRateLimited(socket, "approve_request", 10, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const cleanRequestId = String(requestId || "");
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const participant = room.getParticipant(socket.id);

  if (!participant || !canApproveRequest(participant.role)) {
    socket.emit("error_message", {
      message: "You do not have permission to approve requests",
    });

    return;
  }

  const request = room.pendingRequests?.find(
    (item) => item.requestId === cleanRequestId
  );

  // Check request before using request.action
  if (!request) {
    socket.emit("error_message", {
      message: "Request not found",
    });

    return;
  }

  // Execute the requested action
  if (request.action === "play") {
    playVideo(room);
  }

  if (request.action === "pause") {
    pauseVideo(room);
  }

  if (request.action === "seek") {
    const newTime = Number(request.data.currentTime);

    if (Number.isFinite(newTime) && newTime >= 0) {
      seekVideo(room, newTime);
    }
  }

  if (request.action === "change_video") {
    const videoId = String(request.data.videoId || "").trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      changeVideo(room, videoId);
    } else {
      socket.emit("error_message", {
        message: "Invalid YouTube video ID in request",
      });
    }
  }

  // Remove processed request
  room.pendingRequests = room.pendingRequests.filter(
    (item) => item.requestId !== cleanRequestId
  );

  // Tell requester that request was approved
  io.to(request.socketId).emit("request_approved", {
    requestId: request.requestId,
    action: request.action,
  });

  // Tell approver that request was processed
  socket.emit("request_processed", {
    requestId: request.requestId,
    status: "approved",
  });
});

// Reject

socket.on("reject_request", ({ requestId } = {}) => {
  if (isRateLimited(socket, "reject_request", 10, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const cleanRequestId = String(requestId || "");
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const participant = room.getParticipant(socket.id);

  if (!participant || !canApproveRequest(participant.role)) {
    socket.emit("error_message", {
      message: "You do not have permission to reject requests",
    });

    return;
  }

  const request = room.pendingRequests?.find(
    (item) => item.requestId === cleanRequestId
  );

  if (!request) {
    socket.emit("error_message", {
      message: "Request not found",
    });

    return;
  }

  room.pendingRequests = room.pendingRequests.filter(
    (item) => item.requestId !== cleanRequestId
  );

  io.to(request.socketId).emit("request_rejected", {
    requestId: request.requestId,
    action: request.action,
  });

  socket.emit("request_processed", {
    requestId: request.requestId,
    status: "rejected",
  });
});

 // assign moderator
 socket.on("assign_moderator", ({ targetSocketId } = {}) => {
  if (isRateLimited(socket, "assign_moderator", 5, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const cleanTargetSocketId = String(targetSocketId || "");
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const requester = room.getParticipant(socket.id);

  if (!requester || !canAssignModerator(requester.role)) {
    socket.emit("error_message", {
      message: "Only the host can assign a moderator",
    });

    return;
  }

  const target = room.getParticipant(cleanTargetSocketId);

  if (!target) {
    socket.emit("error_message", {
      message: "Participant not found",
    });

    return;
  }

  if (target.role !== "participant") {
    socket.emit("error_message", {
      message: "This user cannot be assigned as moderator",
    });

    return;
  }

  target.role = "moderator";

  io.to(room.roomId).emit("participants_updated", {
    participants: room.getAllParticipants(),
  });

  console.log(
    `${target.username} is now a moderator in room ${room.roomId}`
  );
});

// Remove Participant
socket.on("remove_participant", ({ targetSocketId } = {}) => {
  if (isRateLimited(socket, "remove_participant", 5, 1000)) {
    socket.emit("error_message", { message: "Too many requests. Please slow down." });
    return;
  }
  const cleanTargetSocketId = String(targetSocketId || "");
  const room = roomManager.getRoomBySocket(socket.id);

  if (!room) {
    socket.emit("error_message", {
      message: "You are not in a room",
    });

    return;
  }

  const requester = room.getParticipant(socket.id);

  if (!requester || !canRemoveParticipant(requester.role)) {
    socket.emit("error_message", {
      message: "Only the host can remove participants",
    });

    return;
  }

  if (cleanTargetSocketId === socket.id) {
    socket.emit("error_message", {
      message: "You cannot remove yourself",
    });

    return;
  }

  const target = room.getParticipant(cleanTargetSocketId);

  if (!target) {
    socket.emit("error_message", {
      message: "Participant not found",
    });

    return;
  }

  const result = roomManager.removeParticipant(cleanTargetSocketId);

  if (!result) {
    socket.emit("error_message", {
      message: "Could not remove participant",
    });

    return;
  }

  const targetSocket = io.sockets.sockets.get(cleanTargetSocketId);

  if (targetSocket) {
    targetSocket.leave(room.roomId);

    targetSocket.emit("participant_removed", {
      roomId: room.roomId,
      message: "You have been removed from the room",
    });
  }

  io.to(room.roomId).emit("participants_updated", {
    participants: room.getAllParticipants(),
  });

  console.log(
    `${target.username} was removed from room ${room.roomId}`
  );
});

// Host Transfer

  // Reaction
  socket.on("send_reaction", ({ emoji } = {}) => {
    if (isRateLimited(socket, "send_reaction", 10, 1000)) {
      return;
    }
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (!room.getParticipant(socket.id)) return;

    const validEmojis = ["😂", "❤️", "🔥", "😲", "👏", "👎"];
    if (!validEmojis.includes(emoji)) return;

    io.to(roomId).emit("reaction", { emoji });
  });

  // Chat message
  socket.on("send_chat_message", ({ message } = {}) => {
    if (isRateLimited(socket, "send_chat_message", 5, 1000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant) return;

    const cleanMessage = String(message || "")
      .trim()
      .slice(0, 500);
      
    if (!cleanMessage) return;

    const chatMsg = {
      id: crypto.randomUUID(),
      userId: participant.userId,
      username: participant.username,
      message: cleanMessage,
      timestamp: Date.now(),
    };

    room.addChatMessage(chatMsg);

    io.to(roomId).emit("new_chat_message", chatMsg);
  });

  // Queue Events
  socket.on("queue_add", ({ videoId, title } = {}) => {
    if (isRateLimited(socket, "queue_add", 5, 1000)) {
      socket.emit("error_message", { message: "Too many requests. Please slow down." });
      return;
    }
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const participant = room.getParticipant(socket.id);
    if (!participant) return;

    const cleanVideoId = String(videoId || "").trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(cleanVideoId)) {
      socket.emit("error_message", { message: "Invalid YouTube video ID" });
      return;
    }

    if (room.queue.length >= 50) {
      socket.emit("error_message", { message: "Queue is full (maximum 50 items)" });
      return;
    }

    let cleanTitle = String(title || "").trim().slice(0, 100);
    if (!cleanTitle) cleanTitle = "YouTube Video";

    const queueItem = {
      id: crypto.randomUUID(),
      videoId: cleanVideoId,
      title: cleanTitle,
      thumbnail: `https://img.youtube.com/vi/${cleanVideoId}/mqdefault.jpg`,
      addedBy: {
        userId: participant.userId,
        username: participant.username
      }
    };

    room.queue.push(queueItem);
    io.to(roomId).emit("queue_updated", room.queue);
  });

  socket.on("queue_remove", ({ id } = {}) => {
    if (isRateLimited(socket, "queue_remove", 10, 1000)) {
      socket.emit("error_message", { message: "Too many requests." });
      return;
    }
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const participant = room.getParticipant(socket.id);
    if (!participant) return;

    if (participant.role !== "host" && participant.role !== "moderator") {
      socket.emit("error_message", { message: "Only Host or Moderator can remove from queue" });
      return;
    }

    const cleanId = String(id || "");
    const initialLen = room.queue.length;
    room.queue = room.queue.filter(item => item.id !== cleanId);

    if (room.queue.length !== initialLen) {
      io.to(roomId).emit("queue_updated", room.queue);
    }
  });

  socket.on("queue_play_now", ({ id } = {}) => {
    if (isRateLimited(socket, "queue_play_now", 3, 1000)) {
      socket.emit("error_message", { message: "Too many requests." });
      return;
    }
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const participant = room.getParticipant(socket.id);
    if (!participant) return;

    if (participant.role !== "host" && participant.role !== "moderator") {
      socket.emit("error_message", { message: "Only Host or Moderator can play from queue" });
      return;
    }

    const cleanId = String(id || "");
    const itemIndex = room.queue.findIndex(item => item.id === cleanId);
    
    if (itemIndex === -1) {
      socket.emit("error_message", { message: "Item not found in queue" });
      return;
    }

    const item = room.queue.splice(itemIndex, 1)[0];
    
    // Play it using existing mechanism. Manual "Play Now" leaves it PAUSED.
    changeVideo(room, item.videoId, false);
    io.to(roomId).emit("queue_updated", room.queue);
  });

  socket.on("video_ended", ({ videoId } = {}) => {
    if (isRateLimited(socket, "video_ended", 5, 2000)) return;
    
    const roomId = roomManager.getRoomBySocket(socket.id)?.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    
    const cleanVideoId = String(videoId || "");
    
    // Server is authoritative. If the video that ended is STILL the room's video
    // AND there's something in the queue, we advance. 
    // This prevents race conditions where multiple clients send 'video_ended'.
    if (room.videoId === cleanVideoId && room.queue.length > 0) {
      // Debounce: prevent triggering multiple times within a short window
      if (Date.now() - room.lastUpdatedAt < 2000) return;
      
      const item = room.queue.shift(); // Remove next item
      // Automatic next video is AUTOPLAYED
      changeVideo(room, item.videoId, true);
      io.to(roomId).emit("queue_updated", room.queue);
    }
  });
}