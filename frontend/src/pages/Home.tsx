import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";


const getUserId = () => {
  let userId = localStorage.getItem("watchPartyUserId");

  if (!userId) {
    userId = crypto.randomUUID();

    localStorage.setItem(
      "watchPartyUserId",
      userId
    );
  }

  return userId;
};

function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");


  const createRoom = () => {
      const cleanUsername = username.trim();

      if (!cleanUsername) {
          alert("Please enter your name");
          return;
      }

      localStorage.setItem(
          "watchPartyUsername",
          cleanUsername
      );

      socket.emit("create_room", {
          userId: getUserId(),
          username: cleanUsername,
      });
  };

  const joinRoom = () => {
    const cleanUsername = username.trim();
    const cleanRoomId = roomId.trim();

    if (!cleanUsername) {
      alert("Please enter your name");
      return;
    }

    if (!cleanRoomId) {
      alert("Please enter room ID");
      return;
    }

    localStorage.setItem(
      "watchPartyUsername",
      cleanUsername
    );

    socket.emit("join_room", {
      roomId: cleanRoomId,
      userId: getUserId(),
      username: cleanUsername,
    });
  };

  useEffect(() => {
    const handleRoomJoined = (data: { roomId: string }) => {
        navigate(`/room/${data.roomId}`);
    };

    socket.on("room_joined", handleRoomJoined);

    return () => {
        socket.off("room_joined", handleRoomJoined);
    };
    }, [navigate]);

  return (
    <div className="home-page">

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">W</div>
          <span>WatchTogether</span>
        </div>

        <nav>
          <a className="active">Home</a>
          <a>Discover</a>
          <a>About</a>
        </nav>

        <div className="profile">
          <div className="profile-dot"></div>
          <span>Guest</span>
        </div>
      </header>


      {/* Hero */}
      <main className="dashboard">

        <section className="hero">

          <div className="hero-content">

            <div className="live-badge">
              <span></span>
              REAL-TIME WATCH PARTY
            </div>

            <h1>
              Watch together.
              <br />
              <span>Stay in sync.</span>
            </h1>

            <p>
              Create a private room, invite your friends and watch
              YouTube together in perfect synchronization.
            </p>

            <div className="hero-name-input">
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            <div className="hero-buttons">
              <button className="primary-btn" onClick={createRoom}>
                + Start a Watch Party
              </button>

              <button className="secondary-btn">
                Join with Room ID
              </button>
            </div>

          </div>


          {/* Visual */}
          <div className="party-preview">

            <div className="preview-glow"></div>

            <div className="video-window">

              <div className="video-topbar">
                <div className="window-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="sync-status">
                  <span></span>
                  SYNCED
                </div>
              </div>

              <div className="video-content">

                <div className="play-button">
                  ▶
                </div>

                <div className="video-label">
                  <small>NOW WATCHING</small>
                  <strong>Your next movie night</strong>
                </div>

              </div>

              <div className="video-controls">
                <div className="progress">
                  <span></span>
                </div>

                <div className="control-row">
                  <span>▶</span>
                  <span>0:42:18</span>

                  <div className="avatars">
                    <div>R</div>
                    <div>A</div>
                    <div>+</div>
                  </div>
                </div>
              </div>

            </div>


            {/* Floating participant card */}
            <div className="floating-card people-card">
              <div className="mini-avatars">
                <div>R</div>
                <div>A</div>
                <div>K</div>
              </div>

              <div>
                <strong>4 watching</strong>
                <small>Party is live</small>
              </div>
            </div>


            {/* Floating sync card */}
            <div className="floating-card sync-card">
              <div className="check-icon">✓</div>

              <div>
                <strong>Perfectly synced</strong>
                <small>Everyone is at 42:18</small>
              </div>
            </div>

          </div>

        </section>


        {/* Quick Join */}
        <section className="quick-join">

          <div>
            <span className="section-label">JOIN A PARTY</span>
            <h2>Already have a room?</h2>
            <p>Enter the room code shared by your friend.</p>
          </div>

          <div className="join-form">

            <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />

            <button onClick={joinRoom}>
              Join Room →
            </button>

          </div>

        </section>


        {/* How it works */}
        <section className="how-section">

          <div className="section-heading">
            <span className="section-label">HOW IT WORKS</span>

            <h2>
              Your movie night,
              <span> synchronized.</span>
            </h2>
          </div>

          <div className="steps">

            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Create a party</h3>
              <p>
                Start a room and share the unique room ID
                with your friends.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Invite your crew</h3>
              <p>
                Friends join the same room and appear
                instantly in your party.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Watch in sync</h3>
              <p>
                Play, pause and seek together with
                real-time synchronization.
              </p>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Home;