import { io } from "socket.io-client";

const HOST_URL = "http://localhost:4000";

async function runTests() {
  console.log("Starting Lifecycle Tests...");

  const hostSocket = io(HOST_URL);
  const partSocket = io(HOST_URL);

  let roomId = null;
  const results = { A: '❌', B: '❌', C: '❌', D: '❌' };
  
  hostSocket.on("error_message", (err) => console.log("Host error:", err));
  partSocket.on("error_message", (err) => console.log("Participant error:", err));

  try {
    // Wait for connections
    await Promise.all([
      new Promise(resolve => hostSocket.on("connect", resolve)),
      new Promise(resolve => partSocket.on("connect", resolve))
    ]);

    // Test A - Room Create
    hostSocket.emit("create_room", { username: "Host" });
    await new Promise((resolve, reject) => {
      hostSocket.once("room_joined", (data) => {
        if (data.roomId && data.participant.role === "host") {
          roomId = data.roomId;
          results.A = '✅';
          resolve();
        } else {
          reject(new Error("Test A failed: Data missing or role is not host"));
        }
      });
      setTimeout(() => reject(new Error("Timeout in Test A")), 2000);
    });

    // Test B - Join
    partSocket.emit("join_room", { roomId, username: "Participant" });
    await new Promise((resolve, reject) => {
      let hostUpdated = false;
      let partJoined = false;

      hostSocket.once("participants_updated", (data) => {
        console.log("host participants_updated:", data.participants.length);
        if (data.participants.length === 2) hostUpdated = true;
        if (hostUpdated && partJoined) resolve();
      });

      partSocket.once("room_joined", (data) => {
        console.log("part room_joined role:", data.participant.role);
        if (data.participant.role === "participant") partJoined = true;
        if (hostUpdated && partJoined) resolve();
      });

      setTimeout(() => reject(new Error("Timeout in Test B")), 2000);
    });
    results.B = '✅';

    // Test C - Leave
    partSocket.emit("leave_room");
    await new Promise((resolve, reject) => {
      let left = false;
      let hostUpdated = false;

      partSocket.once("room_left", () => {
        left = true;
        if (left && hostUpdated) resolve();
      });

      hostSocket.once("participants_updated", (data) => {
        if (data.participants.length === 1) hostUpdated = true;
        if (left && hostUpdated) resolve();
      });
      setTimeout(() => reject(new Error("Timeout in Test C")), 2000);
    });
    results.C = '✅';

    // To test D, Participant must join back
    partSocket.emit("join_room", { roomId, username: "Participant2" });
    await new Promise((resolve) => partSocket.once("room_joined", resolve));

    // Test D - Host leaves, participant becomes host
    hostSocket.emit("leave_room");
    await new Promise((resolve, reject) => {
      partSocket.once("host_changed", (data) => {
        if (data.host.socketId === partSocket.id) {
          resolve();
        } else {
          reject(new Error("New host is not the remaining participant"));
        }
      });
      setTimeout(() => reject(new Error("Timeout in Test D")), 2000);
    });
    results.D = '✅';

  } catch (err) {
    console.error("Test execution stopped due to error:", err.message);
  } finally {
    console.log(`\nResults:\nA ${results.A}\nB ${results.B}\nC ${results.C}\nD ${results.D}`);
    hostSocket.disconnect();
    partSocket.disconnect();
    process.exit(0);
  }
}

runTests();
