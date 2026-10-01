import { canControlPlayback, canAssignModerator , canRemoveParticipant ,  canApproveRequest } from "./permissions.js";

export function setupSocketHandlers(io, socket, roomManager) {

  // Create a new room
  socket.on("create_room", ({ userId, username } = {}) => {
  const cleanUserId = String(userId || "").trim();
  const cleanUsername = String(username || "")
    .trim()
    .slice(0, 30);

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

  const room = roomManager.createRoom();

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
    videoId: room.videoId,
    playState: room.playState,
    currentTime: room.getCurrentTime(),
    serverTime: Date.now(),
    chatHistory: room.chatHistory,
  });

  io.to(room.roomId).emit("participants_updated", {
    participants: room.getAllParticipants(),
  });

  console.log(
    `${cleanUsername} created room ${room.roomId}`
  );
});


  // Join an existing room
  socket.on("join_room", ({ roomId, userId, username } = {}) => {

    const cleanRoomId = String(roomId || "")
      .trim()
      .toUpperCase();

    const cleanUserId = String(userId || "").trim();
    const cleanUsername = String(username || "")
      .trim()
      .slice(0, 30);

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
          videoId: currentRoom.videoId,
          playState: currentRoom.playState,
          currentTime: currentRoom.getCurrentTime(),
          serverTime: Date.now(),
          chatHistory: currentRoom.chatHistory,
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

      socket.join(cleanRoomId);

      socket.emit("room_joined", {
        roomId: cleanRoomId,
        participant: reconnectingParticipant,
      });

      socket.emit("sync_state", {
        videoId: room.videoId,
        playState: room.playState,
        currentTime: room.getCurrentTime(),
        serverTime: Date.now(),
        chatHistory: room.chatHistory,
      });

      io.to(cleanRoomId).emit("participants_updated", {
        participants: room.getAllParticipants(),
      });

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
      videoId: room.videoId,
      playState: room.playState,
      currentTime: room.getCurrentTime(),
      serverTime: Date.now(),
    });

    // Update everyone in the room
    io.to(cleanRoomId).emit("participants_updated", {
      participants: room.getAllParticipants(),
    });

    console.log(
      `${cleanUsername} joined ${cleanRoomId} as ${participant.role}`
    );
  });


  // Common function for leaving a room
  const leaveCurrentRoom = () => {
  const result = roomManager.removeParticipant(socket.id);

  if (!result) {
    return null;
  }

  const { room, participant } = result;

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
  }

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
      }
    );
  });

  const playVideo = (room) => {
  room.currentTime = room.getCurrentTime();
  room.playState = "playing";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("play", {
    currentTime: room.currentTime,
    serverTime: room.lastUpdatedAt,
  });
};

  // Play Event
  socket.on("play", () => {
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

    playVideo(room);
  });


const pauseVideo = (room) => {
  room.currentTime = room.getCurrentTime();
  room.playState = "paused";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("pause", {
    currentTime: room.currentTime,
    serverTime: room.lastUpdatedAt,
  });
};

  // Pause Event
  socket.on("pause", () => {
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

    pauseVideo(room);
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

  const changeVideo = (room, videoId) => {
  room.videoId = videoId;
  room.currentTime = 0;
  room.playState = "paused";
  room.lastUpdatedAt = Date.now();

  io.to(room.roomId).emit("change_video", {
    videoId: room.videoId,
    currentTime: room.currentTime,
    playState: room.playState,
    serverTime: room.lastUpdatedAt,
  });
};

  socket.on("change_video", ({ videoId } = {}) => {
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

  const request = {
    requestId: Date.now().toString(),
    socketId: socket.id,
    username: participant.username,
    action,
    data: data || {},
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
    (item) => item.requestId === requestId
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
    (item) => item.requestId !== requestId
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
    (item) => item.requestId === requestId
  );

  if (!request) {
    socket.emit("error_message", {
      message: "Request not found",
    });

    return;
  }

  room.pendingRequests = room.pendingRequests.filter(
    (item) => item.requestId !== requestId
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

  const target = room.getParticipant(targetSocketId);

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

  if (targetSocketId === socket.id) {
    socket.emit("error_message", {
      message: "You cannot remove yourself",
    });

    return;
  }

  const target = room.getParticipant(targetSocketId);

  if (!target) {
    socket.emit("error_message", {
      message: "Participant not found",
    });

    return;
  }

  const result = roomManager.removeParticipant(targetSocketId);

  if (!result) {
    socket.emit("error_message", {
      message: "Could not remove participant",
    });

    return;
  }

  const targetSocket = io.sockets.sockets.get(targetSocketId);

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

  // Chat message
  socket.on("send_chat_message", ({ message } = {}) => {
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
}