import { useState, useEffect, useRef } from "react";
import type { Participant } from "../../types/room";
import { useModal } from "../../context/ModalContext";

interface RoomHeaderProps {
    roomId?: string;
    roomName: string;
    genre: string;
    visibility: string;
    isHost: boolean;
    currentUser: Participant | null;
    onUpdateGenre: (genre: string) => void;
    onUpdateVisibility: (visibility: string) => void;
    onUpdateRoomName: (roomName: string) => void;
    onShareRoom: () => void;
    onLeaveRoom: () => void;
}

export function RoomHeader({
    roomId,
    roomName,
    genre,
    visibility,
    isHost,
    currentUser,
    onUpdateGenre,
    onUpdateVisibility,
    onUpdateRoomName,
    onShareRoom,
    onLeaveRoom
}: RoomHeaderProps) {
    const { showAlert, showPrompt } = useModal();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
    const genreRef = useRef<HTMLDivElement>(null);
    const visibilityRef = useRef<HTMLDivElement>(null);
    
    // Theme logic
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem("theme") === "dark";
    });

    useEffect(() => {
        if (isDark) {
            document.body.classList.remove("light-theme");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.add("light-theme");
            localStorage.setItem("theme", "light");
        }
    }, [isDark]);

    // Click outside logic for all dropdowns
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
                setIsGenreOpen(false);
            }
            if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
                setIsVisibilityOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="room-header">
            <div className="brand" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="https://em-content.zobj.net/source/apple/354/clapper-board_1f3ac.png" alt="Room Icon" style={{ width: '28px', height: '28px' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</span>
                {roomId && (
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(roomId);
                            showAlert("Room code copied!");
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            color: '#f4f4f5',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            letterSpacing: '1px'
                        }}
                    >
                        {roomId} <span>⧉</span>
                    </button>
                )}
            </div>

            <div className="room-info" style={{ flex: '0 0 auto', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>

                {/* GENRE custom dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#777780', letterSpacing: '1px', fontWeight: 'bold' }}>GENRE</span>
                    {isHost ? (
                        <div ref={genreRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => { setIsGenreOpen(!isGenreOpen); setIsVisibilityOpen(false); }}
                                style={{
                                    background: '#27272a', border: '2px solid #3f3f46',
                                    color: '#f4f4f5', padding: '4px 10px 4px 12px',
                                    borderRadius: '20px', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {genre.toUpperCase()}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                            {isGenreOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                                    background: '#18181b', border: '1px solid #3f3f46',
                                    borderRadius: '10px', overflow: 'hidden',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 100,
                                    minWidth: '140px'
                                }}>
                                    {['Movies','Gaming','Music','Education','Sports'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { onUpdateGenre(opt); setIsGenreOpen(false); }}
                                            style={{
                                                display: 'block', width: '100%',
                                                textAlign: 'left', padding: '9px 14px',
                                                background: genre === opt ? 'rgba(168,85,247,0.2)' : 'transparent',
                                                border: 'none',
                                                color: genre === opt ? '#c084fc' : '#d4d4d8',
                                                fontSize: '13px', fontWeight: genre === opt ? '700' : '500',
                                                letterSpacing: '0.5px', cursor: 'pointer',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={e => { if (genre !== opt) (e.target as HTMLElement).style.background = '#27272a'; }}
                                            onMouseLeave={e => { if (genre !== opt) (e.target as HTMLElement).style.background = 'transparent'; }}
                                        >
                                            {opt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <strong style={{ color: '#f4f4f5', fontSize: '14px', letterSpacing: '0.5px' }}>{genre.toUpperCase()}</strong>
                    )}
                </div>

                {/* VISIBILITY custom dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#777780', letterSpacing: '1px', fontWeight: 'bold' }}>VISIBILITY</span>
                    {isHost ? (
                        <div ref={visibilityRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => { setIsVisibilityOpen(!isVisibilityOpen); setIsGenreOpen(false); }}
                                style={{
                                    background: '#27272a', border: '2px solid #3f3f46',
                                    color: '#f4f4f5', padding: '4px 10px 4px 12px',
                                    borderRadius: '20px', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {visibility.toUpperCase()}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                            {isVisibilityOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                                    background: '#18181b', border: '1px solid #3f3f46',
                                    borderRadius: '10px', overflow: 'hidden',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 100,
                                    minWidth: '130px'
                                }}>
                                    {['private','public'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { onUpdateVisibility(opt); setIsVisibilityOpen(false); }}
                                            style={{
                                                display: 'block', width: '100%',
                                                textAlign: 'left', padding: '9px 14px',
                                                background: visibility === opt ? 'rgba(168,85,247,0.2)' : 'transparent',
                                                border: 'none',
                                                color: visibility === opt ? '#c084fc' : '#d4d4d8',
                                                fontSize: '13px', fontWeight: visibility === opt ? '700' : '500',
                                                letterSpacing: '0.5px', cursor: 'pointer',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={e => { if (visibility !== opt) (e.target as HTMLElement).style.background = '#27272a'; }}
                                            onMouseLeave={e => { if (visibility !== opt) (e.target as HTMLElement).style.background = 'transparent'; }}
                                        >
                                            {opt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <strong style={{ color: '#f4f4f5', fontSize: '14px', letterSpacing: '0.5px' }}>{visibility.toUpperCase()}</strong>
                    )}
                </div>
            </div>

            <div className="room-actions desktop-room-actions" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: '#27272a', color: '#a1a1aa', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                        }}
                    >
                        {currentUser?.username?.substring(0, 2).toUpperCase() || "??"}
                    </button>

                    {isDropdownOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                            background: '#18181b', border: '1px solid #27272a',
                            borderRadius: '8px', width: '220px', zIndex: 50,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #27272a' }}>
                                <strong style={{ display: 'block', color: '#f4f4f5', fontSize: '14px', marginBottom: '2px' }}>{currentUser?.username}</strong>
                                <span style={{ color: '#a1a1aa', fontSize: '12px' }}>Account</span>
                            </div>
                            
                            <div style={{ padding: '4px' }}>
                                <button 
                                    onClick={() => { onShareRoom(); setIsDropdownOpen(false); }}
                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                                >
                                    <span style={{ fontSize: '16px', color: '#a855f7' }}>🔗</span> Share Room
                                </button>
                            </div>
                            
                            <div style={{ padding: '4px', borderTop: '1px solid #27272a' }}>
                                <button 
                                    onClick={async () => {
                                        const newName = await showPrompt("Enter new room name:", roomName);
                                        if (newName && newName.trim() !== "") {
                                            onUpdateRoomName(newName.trim());
                                        }
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                                >
                                    <span style={{ fontSize: '16px' }}>✎</span> Change name
                                </button>
                                <button 
                                    onClick={() => { setIsDark(!isDark); setIsDropdownOpen(false); }}
                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                                >
                                    <span style={{ fontSize: '16px' }}>{isDark ? '☀' : '☾'}</span> {isDark ? 'Light mode' : 'Dark mode'}
                                </button>
                            </div>
                            
                            <div style={{ padding: '4px', borderTop: '1px solid #27272a' }}>
                                <button 
                                    onClick={() => {
                                        onLeaveRoom();
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    Leave Room
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
