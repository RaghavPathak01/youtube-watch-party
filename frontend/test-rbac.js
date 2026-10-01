import { io } from "socket.io-client";

const HOST_URL = "http://localhost:4000";

async function runTests() {
  console.log("Starting RBAC Security Tests...");

  const hostSocket = io(HOST_URL);
  const partSocket = io(HOST_URL);

  let roomId = null;

  // Wait for connections
  await Promise.all([
    new Promise(resolve => hostSocket.on("connect", resolve)),
    new Promise(resolve => partSocket.on("connect", resolve))
  ]);

  console.log("Both sockets connected.");

  // Host creates room
  hostSocket.emit("create_room", { username: "HostUser" });
  
  await new Promise(resolve => {
    hostSocket.on("room_joined", (data) => {
      roomId = data.roomId;
      resolve();
    });
  });
  console.log("Room created:", roomId);

  // Participant joins room
  partSocket.emit("join_room", { roomId, username: "PartUser" });
  
  await new Promise(resolve => {
    partSocket.on("room_joined", resolve);
  });
  console.log("Participant joined room.");

  // Helper to test an event and expect an error
  const testUnauthorizedEvent = (eventName, payload, expectedMessage) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        partSocket.off("error_message");
        reject(new Error(`Timeout waiting for error_message on ${eventName}`));
      }, 2000);

      partSocket.once("error_message", (data) => {
        clearTimeout(timeout);
        if (data.message === expectedMessage) {
          console.log(`✅ Test passed for '${eventName}': Got expected error "${data.message}"`);
          resolve();
        } else {
          reject(new Error(`Expected "${expectedMessage}" but got "${data.message}"`));
        }
      });

      partSocket.emit(eventName, payload);
    });
  };

  try {
    await testUnauthorizedEvent("play", undefined, "You do not have permission to control playback");
    await testUnauthorizedEvent("change_video", { videoId: "dQw4w9WgXcQ" }, "You do not have permission to change the video");
    await testUnauthorizedEvent("seek", { currentTime: 100 }, "You do not have permission to control playback");
    
    console.log("🎉 All RBAC tests passed successfully!");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  } finally {
    hostSocket.disconnect();
    partSocket.disconnect();
    process.exit(0);
  }
}

runTests();
