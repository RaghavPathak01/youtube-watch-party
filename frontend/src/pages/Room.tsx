import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import type { Participant, QueueItem } from "../types/room";

import { RoomHeader } from "../components/room/RoomHeader";
import type { YouTubePlayerHandle } from "../components/room/YouTubePlayer";
import { YouTubePlayer } from "../components/room/YouTubePlayer";
import { VideoControls } from "../components/room/VideoControls";
import { VideoInput } from "../components/room/VideoInput";
import { ReactionBar } from "../components/room/ReactionBar";
import { FloatingReactions, type FloatingReaction } from "../components/room/FloatingReactions";
import { RoomPanel } from "../components/room/RoomPanel";
import type { ChatMessage } from "../components/room/ChatPanel";

export default function Room() {
    const { roomId } = useParams();
    const { user, setIsAuthModalOpen, isLoading } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const navigate = useNavigate();

    // -- Room State --
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentUser, setCurrentUser] = useState<Participant | null>(null);
    const [roomName, setRoomName] = useState("Anonymous");
    const [genre, setGenre] = useState("Movies");
    const [visibility, setVisibility] = useState("private");
    const [hasJoinedRoom] = useState(false);

    // -- Player State --
    const [videoId, setVideoId] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoTitle, setVideoTitle] = useState("");
    const [isVideoMaximized, setIsVideoMaximized] = useState(false);
    
    // -- Other State --
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [actionRequests, setActionRequests] = useState<any[]>([]);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);

    const playerRef = useRef<YouTubePlayerHandle>(null);
    const hasVideo = Boolean(videoId);

    // Derived Auth/RBAC
    const isHost = currentUser?.role === "host";
    const isModerator = currentUser?.role === "moderator";
    const canControl = isHost || isModerator;

    // Reset title when video is removed
    useEffect(() => {
        if (!videoId) setVideoTitle("");
    }, [videoId]);


    // ------------------------------------------
    // SOCKET: CONNECTION & JOINING
    // ------------------------------------------
    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            setIsAuthModalOpen(true);
            navigate("/discover");
            return;
        }
        if (!roomId || hasJoinedRoom) return;

        const joinRoom = () => socket.emit("join_room", { roomId });
        if (socket.connected) joinRoom();
        socket.on("connect", joinRoom);

        return () => {
            socket.off("connect", joinRoom);
        };
    }, [roomId, hasJoinedRoom, isLoading, user, navigate, setIsAuthModalOpen]);

    // ------------------------------------------
    // SOCKET: ERROR HANDLING & ROOM EVENTS
    // ------------------------------------------
    useEffect(() => {
        const handleError = async (data: { message: string }) => {
            await showAlert(data.message);
            if (data.message === "Room not found" || data.message === "You are not in a room") {
                navigate("/discover");
            }
        };
        const handleParticipantRemoved = async () => {
            await showAlert("You have been removed from the room.", "Removed");
            navigate("/discover");
        };
        const handleRoomLeft = () => navigate("/discover");

        socket.on("error_message", handleError);
        socket.on("participant_removed", handleParticipantRemoved);
        socket.on("room_left", handleRoomLeft);

        return () => {
            socket.off("error_message", handleError);
            socket.off("participant_removed", handleParticipantRemoved);
            socket.off("room_left", handleRoomLeft);
        };
    }, [navigate]);

    // ------------------------------------------
    // SOCKET: PARTICIPANTS & ROLES
    // ------------------------------------------
    useEffect(() => {
        const handleParticipantsUpdated = (data: { participants: Participant[] }) => {
            setParticipants(data.participants);
            const userInRoom = data.participants.find(p => p.socketId === socket.id);
            if (userInRoom) setCurrentUser(userInRoom);
        };

        const handleHostChanged = (data: { host: Participant }) => {
            setParticipants(prev => prev.map(p => {
                if (p.socketId === data.host.socketId) return { ...p, role: "host" };
                if (p.role === "host") return { ...p, role: "participant" };
                return p;
            }));
            if (currentUser?.socketId === data.host.socketId) {
                setCurrentUser(prev => prev ? { ...prev, role: "host" } : null);
            } else if (currentUser?.role === "host") {
                setCurrentUser(prev => prev ? { ...prev, role: "participant" } : null);
            }
        };

        socket.on("participants_updated", handleParticipantsUpdated);
        socket.on("host_changed", handleHostChanged);

        return () => {
            socket.off("participants_updated", handleParticipantsUpdated);
            socket.off("host_changed", handleHostChanged);
        };
    }, [currentUser]);

    // ------------------------------------------
    // SOCKET: STATE SYNC & METADATA
    // ------------------------------------------
    useEffect(() => {
        const handleSyncState = (data: any) => {
            setVideoId(data.videoId);
            if (data.roomName) setRoomName(data.roomName);
            if (data.genre) setGenre(data.genre);
            if (data.visibility) setVisibility(data.visibility);
            if (data.chatHistory) setChatMessages(data.chatHistory);
            if (data.queue) setQueue(data.queue);

            // Apply playback state immediately to the ref
            setTimeout(() => {
                if (!playerRef.current) return;
                let targetTime = data.currentTime;
                if (data.playState === "playing") {
                    const elapsed = (Date.now() - data.serverTime) / 1000;
                    targetTime += elapsed;
                    playerRef.current.seekTo(targetTime);
                    playerRef.current.play();
                } else {
                    playerRef.current.seekTo(targetTime);
                    playerRef.current.pause();
                }
                setCurrentTime(targetTime);
                setIsPlaying(data.playState === "playing");
            }, 500); // small delay to ensure player is ready
        };

        const handleGenreUpdated = (newGenre: string) => setGenre(newGenre);
        const handleVisibilityUpdated = (newVisibility: string) => setVisibility(newVisibility);
        const handleRoomNameUpdated = (newName: string) => setRoomName(newName);
        const handleVideoChanged = (data: { videoId: string, playState: string, currentTime: number, serverTime: number }) => {
            setVideoId(data.videoId);
            setIsPlaying(data.playState === "playing");
            setCurrentTime(data.currentTime);
            
            // Use the explicit load API. Delay slightly to ensure player handles the change.
            setTimeout(() => {
                const autoplay = data.playState === "playing";
                playerRef.current?.load(data.videoId, autoplay);
                
                // If it was already playing, we want it to seek as well
                if (data.currentTime > 0) {
                    playerRef.current?.seekTo(data.currentTime);
                }
            }, 50);
        };
        const handleQueueUpdated = (newQueue: QueueItem[]) => setQueue(newQueue);

        socket.on("sync_state", handleSyncState);
        socket.on("genre_updated", handleGenreUpdated);
        socket.on("visibility_updated", handleVisibilityUpdated);
        socket.on("room_name_updated", handleRoomNameUpdated);
        socket.on("change_video", handleVideoChanged);
        socket.on("queue_updated", handleQueueUpdated);

        return () => {
            socket.off("sync_state", handleSyncState);
            socket.off("genre_updated", handleGenreUpdated);
            socket.off("visibility_updated", handleVisibilityUpdated);
            socket.off("room_name_updated", handleRoomNameUpdated);
            socket.off("change_video", handleVideoChanged);
            socket.off("queue_updated", handleQueueUpdated);
        };
    }, []);

    // ------------------------------------------
    // SOCKET: SERVER PLAYBACK COMMANDS
    // ------------------------------------------
    useEffect(() => {
        const handlePlay = () => {
            setIsPlaying(true);
            playerRef.current?.play();
        };

        const handlePause = () => {
            setIsPlaying(false);
            playerRef.current?.pause();
        };

        const handleSeek = (data: { currentTime: number }) => {
            const newTime = Number(data.currentTime);
            if (Number.isFinite(newTime) && newTime >= 0) {
                playerRef.current?.seekTo(newTime);
                setCurrentTime(newTime);
            }
        };

        socket.on("play", handlePlay);
        socket.on("pause", handlePause);
        socket.on("seek", handleSeek);

        return () => {
            socket.off("play", handlePlay);
            socket.off("pause", handlePause);
            socket.off("seek", handleSeek);
        };
    }, []);

    // ------------------------------------------
    // CHAT & REQUESTS
    // ------------------------------------------
    useEffect(() => {
        const handleNewMessage = (msg: ChatMessage) => setChatMessages(prev => [...prev, msg]);
        const handleActionRequest = (req: any) => setActionRequests(prev => [...prev, req]);
        const handleRequestApproved = (data: { action: string }) => showAlert(`Your ${data.action} request was approved.`);
        const handleRequestRejected = (data: { action: string }) => showAlert(`Your ${data.action} request was rejected.`);
        const handleReaction = (data: { emoji: string }) => {
            const id = Math.random().toString(36).substr(2, 9) + Date.now();
            const left = 20 + Math.random() * 60; // 20% to 80% width
            setFloatingReactions(prev => [...prev, { id, emoji: data.emoji, left }]);
        };

        socket.on("new_chat_message", handleNewMessage);
        socket.on("action_request", handleActionRequest);
        socket.on("request_approved", handleRequestApproved);
        socket.on("request_rejected", handleRequestRejected);
        socket.on("reaction", handleReaction);

        return () => {
            socket.off("new_chat_message", handleNewMessage);
            socket.off("action_request", handleActionRequest);
            socket.off("request_approved", handleRequestApproved);
            socket.off("request_rejected", handleRequestRejected);
            socket.off("reaction", handleReaction);
        };
    }, []);

    // ------------------------------------------
    // LOCAL ACTION HANDLERS
    // ------------------------------------------
    const handleTogglePlayback = () => {
        const action = isPlaying ? "pause" : "play";
        if (canControl) {
            socket.emit(action, { currentTime: playerRef.current?.getCurrentTime() || 0 });
        } else {
            socket.emit("request_action", { action });
        }
    };

    const handleSeek = (time: number) => {
        if (canControl) {
            socket.emit("seek", { currentTime: time });
        } else {
            socket.emit("request_action", { action: "seek", data: { currentTime: time } });
        }
    };

    const handleLoadVideo = (id: string) => {
        if (canControl) {
            socket.emit("change_video", { videoId: id });
        } else {
            socket.emit("request_action", { action: "change_video", data: { videoId: id } });
        }
    };

    const handleApproveRequest = (requestId: string) => {
        socket.emit("approve_request", { requestId });
        setActionRequests(prev => prev.filter(r => r.requestId !== requestId));
    };

    const handleRejectRequest = (requestId: string) => {
        socket.emit("reject_request", { requestId });
        setActionRequests(prev => prev.filter(r => r.requestId !== requestId));
    };

    // Fullscreen behavior
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isVideoMaximized) setIsVideoMaximized(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isVideoMaximized]);

    return (
        <div className="room-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#09090b' }}>
            <RoomHeader
                roomId={roomId}
                roomName={roomName}
                genre={genre}
                visibility={visibility}
                isHost={isHost}
                currentUser={currentUser}
                onUpdateGenre={(g: string) => socket.emit("update_genre", { roomId, genre: g })}
                onUpdateVisibility={(v: string) => socket.emit("update_visibility", { roomId, visibility: v })}
                onUpdateRoomName={(n: string) => socket.emit("update_room_name", { roomId, roomName: n })}
                onShareRoom={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
                    showAlert("Room link copied!");
                }}
                onLeaveRoom={async () => {
                    const confirmed = await showConfirm("Are you sure you want to leave this room?", "Leave room?", true);
                    if (confirmed) {
                        socket.emit("leave_room");
                        navigate("/discover");
                    }
                }}
            />

            <main className="room-content">
                <div className="room-video-area">
                    <div className="youtube-placeholder" style={{ width: '100%', maxWidth: '100%', aspectRatio: '16/9', position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <FloatingReactions 
                            reactions={floatingReactions} 
                            onComplete={(id) => setFloatingReactions(prev => prev.filter(r => r.id !== id))} 
                        />
                        {hasVideo ? (
                            <YouTubePlayer
                                ref={playerRef}
                                videoId={videoId}
                                onTimeUpdate={(time: number, dur: number) => {
                                    setCurrentTime(time);
                                    setDuration(dur);
                                }}
                                onReady={() => {
                                    // Player ready logic if needed
                                }}
                                onTitleUpdate={setVideoTitle}
                                onEnded={() => {
                                    if (canControl) {
                                        socket.emit("video_ended", { videoId });
                                    }
                                }}
                            />
                        ) : (
                            <div className="empty-player">
                                {/* Subtle ambient glow behind icon */}
                                <div className="empty-player-glow" />

                                {/* Icon container */}
                                <div className="empty-player-icon-wrap">
                                    <svg className="empty-player-play-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <polygon points="6,4 20,12 6,20" fill="currentColor" />
                                    </svg>
                                </div>

                                <h3 className="empty-player-title">No video loaded</h3>
                                <p className="empty-player-subtitle">Paste a YouTube URL below to start watching</p>
                            </div>
                        )}
                    </div>

                    <div className="now-playing-section">
                        <div className="now-playing-meta">
                            {hasVideo && (
                                <img src={`https://img.youtube.com/vi/${videoId}/default.jpg`} style={{ width: '72px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} alt="Thumbnail" />
                            )}
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <span className="now-playing-label">Now playing</span>
                                <h2 className="now-playing-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                    {hasVideo ? (videoTitle || "Ready to watch together?") : "Ready to watch together?"}
                                </h2>
                            </div>
                        </div>
                        <ReactionBar onReact={(emoji) => {
                            socket.emit("send_reaction", { emoji });
                        }} />
                    </div>

                    <VideoControls
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        hasVideo={hasVideo}
                        onTogglePlayback={handleTogglePlayback}
                        onSeek={handleSeek}
                        onChangeQuality={(q: string) => playerRef.current?.setQuality(q)}
                        onToggleFullscreen={() => setIsVideoMaximized(!isVideoMaximized)}
                    />

                    <div className="video-input-wrapper" style={{ marginTop: '8px' }}>
                        <VideoInput onLoadVideo={handleLoadVideo} />
                    </div>
                </div>

                <div className="room-panel-area">
                    <RoomPanel
                        canControl={canControl}
                        pendingRequestsCount={actionRequests.length}
                        participantsProps={{
                            participants,
                            currentUser,
                            isHost,
                            onMakeModerator: (id: string) => socket.emit("assign_moderator", { targetSocketId: id }),
                            onRemoveParticipant: (id: string) => socket.emit("remove_participant", { targetSocketId: id })
                        }}
                        chatProps={{
                            messages: chatMessages,
                            currentUserId: user?.id,
                            onSendMessage: (msg: string) => socket.emit("send_chat_message", { message: msg })
                        }}
                        requestsProps={{
                            requests: actionRequests,
                            canControl,
                            onApprove: handleApproveRequest,
                            onReject: handleRejectRequest
                        }}
                        queueProps={{
                            queue,
                            canControl,
                            onAddVideo: (vid: string, title: string) => socket.emit("queue_add", { videoId: vid, title }),
                            onRemove: (id: string) => socket.emit("queue_remove", { id }),
                            onPlayNow: (id: string) => socket.emit("queue_play_now", { id })
                        }}
                    />
                </div>
            </main>
        </div>
    );
}