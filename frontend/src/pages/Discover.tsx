import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";
import { Header } from "../components/Header";

import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["All", "Movies", "Gaming", "Music", "Education", "Sports"];

interface ActiveRoom {
  discoverId: string;
  roomId: string | null;
  roomName: string;
  genre: string;
  visibility: string;
  watching: number;
  host: string;
}

export default function Discover() {
  const navigate = useNavigate();
  const { user, setIsAuthModalOpen } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    if (user && !roomName) {
      setRoomName(`${user.name}'s Room`);
    }
  }, [user]);
  const [genre, setGenre] = useState("Movies");
  const [visibility, setVisibility] = useState("private");

  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [privateRoomCode, setPrivateRoomCode] = useState("");
  const [privateError, setPrivateError] = useState("");

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

  useEffect(() => {
    socket.emit("get_active_rooms");

    const handleActiveRoomsUpdated = (updatedRooms: ActiveRoom[]) => {
        setRooms(updatedRooms);
    };

    const handleRoomJoined = (data: { roomId: string }) => {
        setShowPrivateModal(false);
        navigate(`/room/${data.roomId}`);
    };

    const handleError = (data: { message: string }) => {
        setPrivateError(data.message);
    };

    socket.on("active_rooms_updated", handleActiveRoomsUpdated);
    socket.on("room_joined", handleRoomJoined);
    socket.on("error_message", handleError);

    return () => {
        socket.off("active_rooms_updated", handleActiveRoomsUpdated);
        socket.off("room_joined", handleRoomJoined);
        socket.off("error_message", handleError);
    };
  }, [navigate]);

  const filteredRooms = selectedCategory === "All" 
    ? rooms 
    : rooms.filter(r => r.genre === selectedCategory);

  const joinExistingRoom = (room: ActiveRoom) => {
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }

    if (room.visibility === "private") {
        setPrivateError("");
        setPrivateRoomCode("");
        setShowPrivateModal(true);
        return;
    }

    emitJoin(room.roomId as string);
  };

  const submitPrivateCode = () => {
      if (!privateRoomCode.trim()) {
          setPrivateError("Please enter the room code.");
          return;
      }
      emitJoin(privateRoomCode.trim());
  };

  const emitJoin = (code: string) => {
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }

    socket.emit("join_room", {
      roomId: code,
    });
  };

  return (
    <div className="home-page discover-page-wrapper">
      <Header />
      
      <main className="dashboard discover-dashboard">
        
        {/* Discover Hero */}
        <section className="discover-hero">
          <span className="section-label">DISCOVER WATCH PARTIES</span>
          <h1>Find something to <br/> <span>watch together.</span></h1>
          <p>Join an active watch party and watch together in real-time.</p>
        </section>

        {/* Categories */}
        <div className="category-filters">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length > 0 ? (
          <div className="rooms-grid">
            {filteredRooms.map(room => (
              <div key={room.discoverId} className="room-card">
                <div className="room-thumbnail">
                  <div className="room-play-overlay">▶</div>
                </div>
                <div className="room-info">
                  <div className="room-meta">
                    <span className="room-category">{room.genre}</span>
                    <span className="room-watching">● {room.watching} watching</span>
                    {room.visibility === "private" && (
                        <span style={{ fontSize: '10px', color: '#a1a1aa', border: '1px solid #3f3f46', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>PRIVATE</span>
                    )}
                  </div>
                  <h3 className="room-title">{room.roomName}</h3>
                  <div className="room-host">Host: <strong>{room.host}</strong></div>
                  
                  <button className="join-room-btn" onClick={() => joinExistingRoom(room)}>Join Room</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No rooms available</h3>
            <p>Be the first to start a watch party.</p>
            <button className="primary-btn" onClick={() => setShowCreateForm(true)}>Start a Watch Party</button>
          </div>
        )}

        {/* Create Room Section */}
        {rooms.length > 0 && (
          <section className="create-room-section" style={{ marginTop: '40px', padding: '40px 20px', background: 'rgba(35, 36, 39, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          {showCreateForm ? (
              <div className="create-room-form" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                  <div className="hero-name-input">
                      <label className="input-label">Room Name</label>
                      <input type="text" placeholder="Friday Movie Night" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                      <div className="hero-name-input" style={{ flex: 1, marginBottom: 0 }}>
                          <label className="input-label">Genre</label>
                          <select value={genre} onChange={(e) => setGenre(e.target.value)} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}>
                              <option value="Movies" style={{ background: '#17181b' }}>Movies</option>
                              <option value="Gaming" style={{ background: '#17181b' }}>Gaming</option>
                              <option value="Music" style={{ background: '#17181b' }}>Music</option>
                              <option value="Education" style={{ background: '#17181b' }}>Education</option>
                              <option value="Sports" style={{ background: '#17181b' }}>Sports</option>
                          </select>
                      </div>
                      <div className="hero-name-input" style={{ flex: 1, marginBottom: 0 }}>
                          <label className="input-label">Visibility</label>
                          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}>
                              <option value="private" style={{ background: '#17181b' }}>Private</option>
                              <option value="public" style={{ background: '#17181b' }}>Public</option>
                          </select>
                      </div>
                  </div>
                  <button className="primary-btn" onClick={createRoom} style={{ width: '100%' }}>
                      Start a Watch Party
                  </button>
              </div>
          ) : (
              <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Don't have a room?</h3>
                  <p style={{ color: '#a1a1aa', marginBottom: '24px' }}>Create your own watch party and invite your friends.</p>
                  <button className="primary-btn" onClick={() => setShowCreateForm(true)}>
                      Start a Watch Party
                  </button>
              </div>
          )}
          </section>
        )}

      </main>

      {/* Private Room Modal */}
      {showPrivateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#f4f4f5' }}>Join Private Room</h2>
                <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '15px' }}>This room is private. Please enter the room code to join.</p>
                
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Room Code</label>
                    <input 
                        type="text" 
                        value={privateRoomCode}
                        onChange={(e) => setPrivateRoomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. F8B115"
                        autoFocus
                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none' }}
                    />
                    {privateError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{privateError}</div>}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setShowPrivateModal(false)}
                        style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f4f4f5', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitPrivateCode}
                        className="primary-btn"
                        style={{ flex: 1 }}
                    >
                        Join Room
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
