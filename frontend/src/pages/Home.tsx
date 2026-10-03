import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import socket from "../services/socket";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";



function Home() {
  const navigate = useNavigate();
  const { showAlert } = useModal();
  const { user, setIsAuthModalOpen } = useAuth();
  
  const [roomName, setRoomName] = useState("");
  const [genre, setGenre] = useState("Movies");
  const [visibility, setVisibility] = useState("private");
  const [roomId, setRoomId] = useState("");
  const roomIdInputRef = useRef<HTMLInputElement>(null);

  const scrollToQuickJoin = () => {
    roomIdInputRef.current?.focus();
    roomIdInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };


  const createRoom = () => {
      if (!user) {
          setIsAuthModalOpen(true);
          return;
      }

      socket.emit("create_room", {
          roomName: roomName.trim(),
          genre,
          visibility
      });
  };

  const joinRoom = () => {
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }
      
    const cleanRoomId = roomId.trim();

    if (!cleanRoomId) {
      showAlert("Please enter room ID");
      return;
    }

    socket.emit("join_room", {
      roomId: cleanRoomId,
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
      <Header />


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
                <label className="input-label">Room Name</label>
                <input
                    type="text"
                    placeholder="Friday Movie Night"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div className="hero-name-input" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">Genre</label>
                    <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '15px',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none'
                        }}
                    >
                        <option value="Movies" style={{ background: '#17181b' }}>Movies</option>
                        <option value="Gaming" style={{ background: '#17181b' }}>Gaming</option>
                        <option value="Music" style={{ background: '#17181b' }}>Music</option>
                        <option value="Education" style={{ background: '#17181b' }}>Education</option>
                        <option value="Sports" style={{ background: '#17181b' }}>Sports</option>
                    </select>
                </div>

                <div className="hero-name-input" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">Visibility</label>
                    <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '15px',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none'
                        }}
                    >
                        <option value="private" style={{ background: '#17181b' }}>Private</option>
                        <option value="public" style={{ background: '#17181b' }}>Public</option>
                    </select>
                </div>
            </div>

            <div className="hero-buttons">
              <button className="primary-btn" onClick={createRoom}>
                + Start a Watch Party
              </button>

              <button className="secondary-btn" onClick={scrollToQuickJoin}>
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
              ref={roomIdInputRef}
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
        <section id="how-it-works" className="how-section">

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

        {/* About Section */}
        <section id="about" className="about-section">
          
          <div className="section-heading">
            <span className="section-label">ABOUT WATCHTOGETHER</span>
            <h2>
              Watch together. 
              <span> Built for real-time connection.</span>
            </h2>
            <p className="about-intro">
              WatchTogether is a real-time watch party application that lets friends create private rooms, watch YouTube together and stay synchronized through real-time communication.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Real-time Sync</h3>
              <p>Keep playback synchronized across everyone in the room.</p>
            </div>
            <div className="feature-card">
              <h3>Synced Playback</h3>
              <p>Play, pause and seek actions are reflected across participants.</p>
            </div>
            <div className="feature-card">
              <h3>Role Control</h3>
              <p>Hosts and moderators control the room while participants can request actions.</p>
            </div>
            <div className="feature-card">
              <h3>Live Chat</h3>
              <p>Participants can communicate with everyone inside the watch party.</p>
            </div>
          </div>

          <div className="flow-container">
            <h3>How the system works</h3>
            <div className="flow-diagram">
              <div className="flow-node">HOST</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node accent">SOCKET.IO</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">SERVER</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">PARTICIPANTS</div>
            </div>
            <p className="flow-desc">
              When the host performs a playback action, Socket.IO sends the event to the server. The server validates the action and broadcasts the update to the participants.
            </p>
          </div>

          <div className="tech-section">
            <h3>Technology</h3>
            <div className="tech-tags">
              <span>React + TypeScript</span>
              <span>Node.js + Express</span>
              <span>Socket.IO</span>
              <span>YouTube IFrame Player API</span>
              <span>Vite</span>
              <span>CSS</span>
            </div>
          </div>

          <div className="why-built">
            <h3>Why I Built It</h3>
            <p>
              I built WatchTogether to understand how real-time applications work beyond normal request-response communication. The project helped me work with WebSockets, synchronized media playback, role-based permissions and frontend-backend communication.
            </p>
          </div>

        </section>

      </main>

      {/* Footer / Help Section */}
      <footer id="help" className="footer-section">
        <div className="footer-content">
          
          <div className="footer-brand">
            <div className="brand">
              <div className="brand-icon">W</div>
              <span>WatchTogether</span>
            </div>
            <h3>Watch together.<br/>Stay in sync.</h3>
            <p>Watch YouTube together with your friends in real-time, with synchronized playback, role control and live chat.</p>
          </div>

          <div className="footer-links">
            <div className="link-column">
              <h4>PRODUCT</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0,0); }}>Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView(); }}>About</a>
              <Link to="/discover">Discover</Link>
            </div>
            
            <div className="link-column">
              <h4>RESOURCES</h4>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView(); }}>How it works</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView(); }}>Technology</a>
              <a href="#">Documentation</a>
              <a href="#">FAQ</a>
            </div>

            <div className="link-column">
              <h4>SUPPORT</h4>
              <a href="#help" onClick={(e) => { e.preventDefault(); document.getElementById('help')?.scrollIntoView(); }}>Help</a>
              <a href="mailto:support@watchtogether.com">Contact</a>
              <a href="#">Feedback</a>
            </div>
          </div>

          <div className="footer-help">
            <h4>Need help?</h4>
            <p>Have a question about WatchTogether?</p>
            <div className="help-buttons">
              <button className="primary-btn" onClick={() => showAlert("Ask a Question form coming soon!")}>Ask a Question</button>
              <a href="mailto:support@watchtogether.com" className="secondary-btn">Contact by Email</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 WatchTogether</p>
          <p>Built for real-time connection.</p>
        </div>
      </footer>

    </div>
  );
}

export default Home;