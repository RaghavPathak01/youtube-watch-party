import { io } from "socket.io-client";

const HOST_URL = "http://localhost:4000";

async function runTests() {
  console.log("Starting Disconnect Tests...");

  const results = { A: '❌', B: '❌', C: '❌' };

  try {
    // Test A
    let hostSocket = io(HOST_URL);
    let partSocket = io(HOST_URL);
    
    await new Promise(r => hostSocket.on("connect", r));
    await new Promise(r => partSocket.on("connect", r));

    let roomId = null;
    hostSocket.emit("create_room", { username: "Host" });
    await new Promise(r => hostSocket.once("room_joined", (d) => { roomId = d.roomId; r(); }));
    
    partSocket.emit("join_room", { roomId, username: "Part" });
    await new Promise(r => partSocket.once("room_joined", r));

    hostSocket.emit("leave_room");
    await new Promise(r => partSocket.once("host_changed", (data) => {
      if (data.host.socketId === partSocket.id) results.A = '✅';
      r();
    }));

    partSocket.disconnect();

    // Test B
    hostSocket = io(HOST_URL);
    partSocket = io(HOST_URL);
    await new Promise(r => hostSocket.on("connect", r));
    await new Promise(r => partSocket.on("connect", r));

    hostSocket.emit("create_room", { username: "HostB" });
    await new Promise(r => hostSocket.once("room_joined", (d) => { roomId = d.roomId; r(); }));
    
    partSocket.emit("join_room", { roomId, username: "PartB" });
    await new Promise(r => partSocket.once("room_joined", r));

    hostSocket.disconnect(); // simulates browser close
    await new Promise((resolve) => {
      partSocket.once("host_changed", (data) => {
        if (data.host.socketId === partSocket.id) results.B = '✅';
        resolve();
      });
      setTimeout(resolve, 2000); // safety fallback
    });

    partSocket.disconnect();

    // Test C
    hostSocket = io(HOST_URL);
    partSocket = io(HOST_URL);
    const part2Socket = io(HOST_URL);
    
    await new Promise(r => hostSocket.on("connect", r));
    await new Promise(r => partSocket.on("connect", r));
    await new Promise(r => part2Socket.on("connect", r));

    hostSocket.emit("create_room", { username: "HostC" });
    await new Promise(r => hostSocket.once("room_joined", (d) => { roomId = d.roomId; r(); }));
    
    partSocket.emit("join_room", { roomId, username: "PartC1" });
    await new Promise(r => partSocket.once("room_joined", r));
    
    part2Socket.emit("join_room", { roomId, username: "PartC2" });
    await new Promise(r => part2Socket.once("room_joined", r));

    // part2 disconnects
    part2Socket.disconnect();
    
    await new Promise(r => {
      let fired = false;
      hostSocket.on("participants_updated", (data) => {
        if (data.participants.length === 2) {
          results.C = '✅';
          fired = true;
          r();
        }
      });
      setTimeout(() => { if(!fired) r(); }, 2000);
    });
    
    hostSocket.disconnect();
    partSocket.disconnect();

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    console.log(`\nResults:\nA ${results.A}\nB ${results.B}\nC ${results.C}`);
    process.exit(0);
  }
}

runTests();
