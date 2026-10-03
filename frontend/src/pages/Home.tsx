import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import socket from "../services/socket";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import "../Landing.css";
import { ProfileModal } from "../components/ProfileModal";


interface ActiveRoom {
  discoverId: string;
  roomId: string | null;
  roomName: string;
  genre: string;
  visibility: string;
  watching: number;
  host: string;
  hostId: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const { showPrompt, showAlert } = useModal();
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [pendingRoomCreate, setPendingRoomCreate] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (user && pendingRoomCreate) {
      setPendingRoomCreate(false);
      socket.emit("create_room", {
        roomName: `${user.name}'s Room`,
        genre: "Movies",
        visibility: "private"
      });
    } else if (!user && !isAuthModalOpen && pendingRoomCreate) {
      setPendingRoomCreate(false);
    }
  }, [user, isAuthModalOpen, pendingRoomCreate]);

  useEffect(() => {
    socket.emit("get_active_rooms");

    const handleActiveRoomsUpdated = (updatedRooms: ActiveRoom[]) => {
      setRooms(updatedRooms.filter(r => r.visibility === 'public').slice(0, 3));
    };

    socket.on("active_rooms_updated", handleActiveRoomsUpdated);
    return () => {
      socket.off("active_rooms_updated", handleActiveRoomsUpdated);
    };
  }, []);

  const handleStartParty = () => {
    if (!user) {
      setPendingRoomCreate(true);
      setIsAuthModalOpen(true);
      return;
    }
    
    socket.emit("create_room", {
      roomName: `${user.name}'s Room`,
      genre: "Movies",
      visibility: "private"
    });
  };

  const joinExistingRoom = async (room: ActiveRoom) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (room.visibility === "private") {
      if (user.id === room.hostId) {
        socket.emit("join_room", { discoverId: room.discoverId });
        return;
      }
      
      const code = await showPrompt("Enter private room code:");
      if (!code) return;
      socket.emit("join_room", { roomId: code.trim() });
    } else {
      socket.emit("join_room", { roomId: room.roomId });
    }
  };

  useEffect(() => {
    const handleRoomJoined = (data: { roomId: string }) => {
        navigate(`/room/${data.roomId}`);
    };
    const handleError = (data: { message: string }) => {
        showAlert(data.message, "Room Error");
    };

    socket.on("room_joined", handleRoomJoined);
    socket.on("error_message", handleError);
    return () => {
        socket.off("room_joined", handleRoomJoined);
        socket.off("error_message", handleError);
    };
  }, [navigate, showAlert]);

  return (
    <div className="home-page landing-upgrade">
      <Header />

      <main className="landing-main">
        {/* HERO SECTION */}
        <section className="landing-hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Watch together.<br/>
              <span className="hero-highlight">Make every moment count.</span>
            </h1>
            <p className="hero-subtitle">
              Create a watch party, invite your friends, and experience videos together in real-time.
            </p>
            <div className="hero-actions">
              <button className="primary-btn hero-btn" onClick={handleStartParty}>
                Start a Watch Party
              </button>
              <button className="secondary-btn hero-btn outline" onClick={() => navigate('/discover')}>
                Discover Rooms
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="party-preview">
              <div className="preview-glow"></div>
              <div className="video-window">
                <div className="video-topbar">
                  <div className="window-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="sync-status">
                    <span></span> LIVE SYNCED
                  </div>
                </div>
                <div className="video-content">
                  <div className="play-button">▶</div>
                </div>
                <div className="video-controls">
                  <div className="progress"><span></span></div>
                  <div className="control-row">
                    <span>▶</span>
                    <span>1:24:05</span>
                  </div>
                </div>
              </div>
              
              <div className="floating-card people-card">
                <div className="mini-avatars">
                  <div>R</div><div>A</div><div>K</div>
                </div>
                <div>
                  <strong>8 people watching</strong>
                </div>
              </div>

              <div className="floating-card chat-card">
                <div>😂 Haha exactly!</div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE ROOMS */}
        <section className="landing-live-rooms">
          <div className="section-header center">
            <h2>Live Watch Parties</h2>
            <p>Jump into something people are watching right now.</p>
          </div>

          {rooms.length > 0 ? (
            <div className="rooms-grid">
              {rooms.map(room => (
                <div key={room.discoverId} className="room-card">
                  <div className="room-thumbnail">
                    <div className="room-play-overlay">▶</div>
                  </div>
                  <div className="room-info">
                    <div className="room-meta">
                      <span className="room-category">{room.genre}</span>
                      <span className="room-watching">● {room.watching} watching</span>
                    </div>
                    <h3 className="room-title">{room.roomName}</h3>
                    <div className="room-host">Host: <strong>{room.host}</strong></div>
                    <button className="join-room-btn" onClick={() => joinExistingRoom(room)}>Join Room</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state beautiful-empty">
              <h3>Discover Active Watch Parties</h3>
              <p>Explore rooms that are currently live and watch together.</p>
              <button className="primary-btn" onClick={() => navigate('/discover')}>Join a Live Watch Party</button>
            </div>
          )}
        </section>

        {/* FEATURES (ABOUT) */}
        <section id="about" className="landing-features" style={{ scrollMarginTop: '80px' }}>
          <div className="section-header center">
            <h2>Everything you need to watch together.</h2>
          </div>
          <div className="features-grid-new">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h3>SYNCED PLAYBACK</h3>
              <p>Everyone stays on the same moment.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💬</div>
              <h3>REAL-TIME CHAT</h3>
              <p>Talk, react and enjoy the moment together.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📝</div>
              <h3>SHARED QUEUE</h3>
              <p>Build what you want to watch next.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">👑</div>
              <h3>ROOM CONTROL</h3>
              <p>Hosts and moderators keep the party organized.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="landing-how-it-works">
          <div className="section-header center">
            <h2>How It Works</h2>
            <p>Three simple steps. One shared experience.</p>
          </div>
          
          <div className="steps-container">
            <div className="step-card-new">
              <div className="step-num">01 &mdash; CREATE</div>
              <h3>Start your watch party</h3>
              <p>Create a private room and choose what you want to watch.</p>
            </div>
            <div className="step-card-new">
              <div className="step-num">02 &mdash; INVITE</div>
              <h3>Bring your people in</h3>
              <p>Share your room and invite friends to join the party.</p>
            </div>
            <div className="step-card-new">
              <div className="step-num">03 &mdash; WATCH TOGETHER</div>
              <h3>Enjoy every moment together</h3>
              <p>Stay perfectly synced with playback, chat, queue and reactions.</p>
            </div>
          </div>
        </section>

        {/* PRODUCT HIGHLIGHT */}
        <section className="landing-highlight">
          <div className="highlight-box">
            <div className="highlight-content">
              <h2>Your next watch party starts here.</h2>
              <p>Create a room, invite your friends and watch together.</p>
              <button className="primary-btn" onClick={handleStartParty}>Start a Watch Party</button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer id="help" className="minimal-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand" style={{ gap: '10px', fontSize: '1.2rem' }}>
              <img src="https://em-content.zobj.net/source/apple/354/clapper-board_1f3ac.png" alt="WatchTogether Logo" style={{ width: '28px', height: '28px' }} />
              <span>WatchTogether</span>
            </div>
            <p style={{ marginTop: '16px', color: '#a1a1aa' }}>Experience videos together in real-time.</p>
          </div>
          <div className="footer-links">
            <Link to="/discover">Discover</Link>
            <a href="#" onClick={(e) => { e.preventDefault(); handleStartParty(); }}>Start a Watch Party</a>
            <a href="#" onClick={(e) => {
              e.preventDefault();
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                setIsProfileModalOpen(true);
              }
            }}>Profile</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 WatchTogether</p>
        </div>
      </footer>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}