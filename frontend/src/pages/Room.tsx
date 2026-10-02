import { useEffect,useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import socket from "../services/socket";

import type { Participant } from "../types/room";

interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

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

const AVATAR_COLORS = [
    "#a78bfa", // Purple
    "#22d3ee", // Cyan
    "#fb923c", // Orange
    "#4ade80", // Green
    "#f472b6", // Pink
];

const getColorForUsername = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
};

function Room() {

    const { roomId } = useParams();
    console.log("ROOM ID:", roomId);
    console.log(
        "SAVED USERNAME:",
        localStorage.getItem("watchPartyUsername")
    );
    console.log("SOCKET ID:", socket.id);
    console.log("SOCKET CONNECTED:", socket.connected);
    const navigate = useNavigate();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentUser, setCurrentUser] = useState<Participant | null>(null);

    const hostParticipant = participants.find(
        (participant) => participant.role === "host"
    );

    const hostInitial =
        hostParticipant?.username?.charAt(0).toUpperCase() || "?";
    const [videoUrl, setVideoUrl] = useState("");
    const [videoId, setVideoId] = useState("");
    const hasVideo = Boolean(videoId);

    const [syncState, setSyncState] = useState<{
        videoId: string;
        playState: "playing" | "paused";
        currentTime: number;
        serverTime: number;
    } | null>(null);

    const syncStateRef = useRef<{
        videoId: string;
        playState: "playing" | "paused";
        currentTime: number;
        serverTime: number;
    } | null>(null);

    const [actionRequests, setActionRequests] = useState<any[]>([]);
    const [isVideoMaximized, setIsVideoMaximized] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    
    useEffect(() => {
        if (!showQualityMenu) {
            return;
        }

        const timer = setTimeout(() => {
            setShowQualityMenu(false);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [showQualityMenu]);

    const [hasJoinedRoom] = useState(false);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const playerRef = useRef<YT.Player | null>(null);
    const expectedRemoteState = useRef<number | null>(null);

    const isHost = currentUser?.role === "host";
    const isModerator = currentUser?.role === "moderator";
    const canControl = isHost || isModerator;

    const canControlRef = useRef(canControl);
    canControlRef.current = canControl;

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    const makeModerator = (socketId: string) => {
        socket.emit("assign_moderator", {
            targetSocketId: socketId,
        });
    };

    const removeParticipant = (socketId: string) => {
        socket.emit("remove_participant", {
            targetSocketId: socketId,
        });
    };

    const leaveRoom = () => {
        socket.emit("leave_room");
    };

    const shareRoom = async () => {
        if (!roomId) {
            return;
        }

        const roomLink = `${window.location.origin}/room/${roomId}`;

        try {
            await navigator.clipboard.writeText(roomLink);

            alert("Room link copied!");
        } catch {
            alert("Could not copy room link");
        }
    };


    const approveRequest = (requestId: string) => {
        socket.emit("approve_request", {
            requestId,
        });

        setActionRequests((prevRequests) =>
            prevRequests.filter(
                (request) => request.requestId !== requestId
            )
        );
    };

    const rejectRequest = (requestId: string) => {
        socket.emit("reject_request", {
            requestId,
        });

        setActionRequests((prevRequests) =>
            prevRequests.filter(
                (request) => request.requestId !== requestId
            )
        );
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);

        return `${String(minutes).padStart(2, "0")}:${String(
            seconds
        ).padStart(2, "0")}`;
    };

    const togglePlayback = () => {
        if (!playerRef.current) {
            return;
        }

        const playerState = playerRef.current.getPlayerState();

        const action =
            playerState === YT.PlayerState.PLAYING
                ? "pause"
                : "play";

        if (canControl) {
            socket.emit(action);
            return;
        }

        socket.emit("request_action", {
            action,
        });
    };

    const seekVideo = (time: number) => {
        if (!playerRef.current) {
            return;
        }

        if (canControl) {
            socket.emit("seek", {
                currentTime: time,
            });
            return;
        }

        socket.emit("request_action", {
            action: "seek",
            data: {
                currentTime: time,
            },
        });
    };


    const toggleFullscreen = () => {
        setIsVideoMaximized((prev) => !prev);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isVideoMaximized) {
                setIsVideoMaximized(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isVideoMaximized]);

    const changeQuality = (quality: string) => {
        if (!playerRef.current) {
            return;
        }

        playerRef.current.setPlaybackQuality(quality);
        setShowQualityMenu(false);
    };

    const getVideoId = (url: string) => {
        try {
            const urlObject = new URL(url);

            if (urlObject.hostname === "youtu.be") {
                return urlObject.pathname.slice(1);
            }

            return urlObject.searchParams.get("v");
        } catch {
            return null;
        }
    };

    const loadVideo = () => {
        const id = getVideoId(videoUrl);

        if (!id) {
            alert("Please enter a valid YouTube URL");
            return;
        }

        if (canControl) {
            socket.emit("change_video", {
                videoId: id,
            });

            return;
        }

        socket.emit("request_action", {
            action: "change_video",
            data: {
                videoId: id,
            },
        });
    };

    useEffect(() => {
        const handleParticipantsUpdated = (data: {
            participants: Participant[];
        }) => {
            setParticipants(data.participants);

            const user = data.participants.find(
                (participant) => participant.socketId === socket.id
            );

            if (user) {
                setCurrentUser(user);
            }
        };

        socket.on("participants_updated", handleParticipantsUpdated);

        return () => {
            socket.off("participants_updated", handleParticipantsUpdated);
        };
    }, []);

    useEffect(() => {
        const username = localStorage.getItem("watchPartyUsername");

        if (!roomId || !username || hasJoinedRoom) {
            return;
        }

        const joinRoom = () => {
            socket.emit("join_room", {
                roomId,
                userId: getUserId(),
                username,
            });
        };

        if (socket.connected) {
            joinRoom();
        }
        
        // Use .on instead of .once so it auto-rejoins after sleep/disconnect!
        socket.on("connect", joinRoom);

        return () => {
            socket.off("connect", joinRoom);
        };
    }, [roomId, hasJoinedRoom]);

    useEffect(() => {
        const handleError = (data: { message: string }) => {
            alert(data.message);
            if (data.message === "Room not found" || data.message === "You are not in a room") {
                navigate("/");
            }
        };

        socket.on("error_message", handleError);

        return () => {
            socket.off("error_message", handleError);
        };
    }, [navigate]);

    useEffect(() => {
        const handleNewMessage = (msg: ChatMessage) => {
            setChatMessages((prev) => [...prev, msg]);
        };
        socket.on("new_chat_message", handleNewMessage);
        return () => {
            socket.off("new_chat_message", handleNewMessage);
        };
    }, []);

    const sendChat = () => {
        if (!newMessage.trim()) return;
        socket.emit("send_chat_message", { message: newMessage.trim() });
        setNewMessage("");
    };



    useEffect(() => {
        const handleActionRequest = (request: any) => {
            setActionRequests((prevRequests) => [
                ...prevRequests,
                request,
            ]);
        };

        socket.on("action_request", handleActionRequest);

        return () => {
            socket.off("action_request", handleActionRequest);
        };
    }, []);

    useEffect(() => {
        const handleRequestApproved = (data: {
            requestId: string;
            action: string;
        }) => {
            alert(`Your ${data.action} request was approved.`);
        };

        const handleRequestRejected = (data: {
            requestId: string;
            action: string;
        }) => {
            alert(`Your ${data.action} request was rejected.`);
        };

        socket.on("request_approved", handleRequestApproved);
        socket.on("request_rejected", handleRequestRejected);

        return () => {
            socket.off("request_approved", handleRequestApproved);
            socket.off("request_rejected", handleRequestRejected);
        };
    }, []);

    useEffect(() => {
        // const handleParticipantRemoved = (data: {
        //     roomId: string;
        // }) => {
        //     alert("You have been removed from the room.");
        //     navigate("/");
        // };

        const handleParticipantRemoved = () => {
            alert("You have been removed from the room.");
            navigate("/");
        };
        socket.on("participant_removed", handleParticipantRemoved);

        return () => {
            socket.off("participant_removed", handleParticipantRemoved);
        };
    }, [navigate]);

    useEffect(() => {
        const handleRoomLeft = () => {
            navigate("/");
        };

        socket.on("room_left", handleRoomLeft);

        return () => {
            socket.off("room_left", handleRoomLeft);
        };
    }, [navigate]);

    useEffect(() => {
        const handleHostChanged = (data: {
            host: Participant;
        }) => {
            setParticipants((prevParticipants) =>
                prevParticipants.map((participant) => {
                    if (participant.socketId === data.host.socketId) {
                        return {
                            ...participant,
                            role: "host",
                        };
                    }

                    if (participant.role === "host") {
                        return {
                            ...participant,
                            role: "participant",
                        };
                    }

                    return participant;
                })
            );

            if (currentUser?.socketId === data.host.socketId) {
                setCurrentUser((prevUser) =>
                    prevUser
                        ? {
                            ...prevUser,
                            role: "host",
                        }
                        : null
                );
            } else if (currentUser?.role === "host") {
                setCurrentUser((prevUser) =>
                    prevUser
                        ? {
                            ...prevUser,
                            role: "participant",
                        }
                        : null
                );
            }
        };

        socket.on("host_changed", handleHostChanged);

        return () => {
            socket.off("host_changed", handleHostChanged);
        };
    }, [currentUser]);

    useEffect(() => {
        const script = document.createElement("script");

        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);


    useEffect(() => {
    const createPlayer = () => {
        playerRef.current = new YT.Player("youtube-player", {
            events: {
                onStateChange: (event) => {
                    if (
                        event.data === YT.PlayerState.UNSTARTED ||
                        event.data === YT.PlayerState.CUED
                    ) {
                        return;
                    }

                    if (event.data === YT.PlayerState.BUFFERING) {
                        if (canControlRef.current && expectedRemoteState.current === null) {
                            // User clicked progress bar natively
                            socket.emit("seek", {
                                currentTime: playerRef.current.getCurrentTime(),
                            });
                        }
                        return;
                    }

                    if (expectedRemoteState.current === event.data) {
                        expectedRemoteState.current = null;

                        if (event.data === YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        }

                        if (event.data === YT.PlayerState.PAUSED) {
                            setIsPlaying(false);
                        }

                        return;
                    }

                    expectedRemoteState.current = null;

                    if (event.data === YT.PlayerState.PLAYING) {
                        setIsPlaying(true);

                        if (canControlRef.current) {
                            socket.emit("play", {
                                currentTime: playerRef.current.getCurrentTime(),
                            });
                        }
                    }

                    if (event.data === YT.PlayerState.PAUSED) {
                        setIsPlaying(false);

                        if (canControlRef.current) {
                            socket.emit("pause", {
                                currentTime: playerRef.current.getCurrentTime(),
                            });
                        }
                    }
                },
                onReady: () => {
                    setIsPlayerReady(true);
                }
            },
        });

        const iframe = playerRef.current.getIframe();

        iframe.setAttribute("allowfullscreen", "true");

        iframe.setAttribute(
            "allow",
            "autoplay; encrypted-media; picture-in-picture; fullscreen"
        );
    };

    if (window.YT && window.YT.Player) {
        createPlayer();
    } else {
        window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
        playerRef.current?.destroy();
    };
}, []);

    useEffect(() => {
        const handleSyncState = (data: {
            videoId: string;
            playState: "playing" | "paused";
            currentTime: number;
            serverTime: number;
            chatHistory?: ChatMessage[];
        }) => {
            syncStateRef.current = data;
            setSyncState(data);
            setVideoId(data.videoId);
            setCurrentTime(data.currentTime);
            setIsPlaying(data.playState === "playing");
            
            if (data.chatHistory) {
                setChatMessages(data.chatHistory);
            }
        };

        socket.on("sync_state", handleSyncState);

        return () => {
            socket.off("sync_state", handleSyncState);
        };
    }, []);

    useEffect(() => {
        if (!isPlayerReady || !syncState || !playerRef.current) {
            return;
        }

        if (!syncState.videoId) {
            return;
        }

        const player = playerRef.current;

        let targetTime = syncState.currentTime;

        if (syncState.playState === "playing") {
            const elapsed =
                (Date.now() - syncState.serverTime) / 1000;

            targetTime += elapsed;
        }

        expectedRemoteState.current = syncState.playState === "playing" ? YT.PlayerState.PLAYING : YT.PlayerState.PAUSED;

        player.loadVideoById(syncState.videoId);

        setTimeout(() => {
            if (!playerRef.current) {
                return;
            }

            playerRef.current.seekTo(targetTime, true);

            if (syncState.playState === "playing") {
                playerRef.current.playVideo();
            } else {
                playerRef.current.pauseVideo();
            }

            setCurrentTime(targetTime);
        }, 500);
    }, [isPlayerReady, syncState]);

    useEffect(() => {
        if (!videoId || !playerRef.current) {
            return;
        }

        // If this video came from room sync,
        // syncState effect will handle the exact position.
        if (syncStateRef.current?.videoId === videoId) {
            return;
        }

        playerRef.current.loadVideoById(videoId);
    }, [videoId]);

    useEffect(() => {
        const handleVideoChanged = (data: {
            videoId: string;
        }) => {
            setVideoId(data.videoId);
        };

        socket.on("change_video", handleVideoChanged);

        return () => {
            socket.off("change_video", handleVideoChanged);
        };
    }, []);


    useEffect(() => {
        const handlePlay = () => {
            if (!playerRef.current) {
                return;
            }

            expectedRemoteState.current = YT.PlayerState.PLAYING;
            setIsPlaying(true);

            playerRef.current.playVideo();
        };

        const handlePause = () => {
            if (!playerRef.current) {
                return;
            }

            expectedRemoteState.current = YT.PlayerState.PAUSED;
            setIsPlaying(false);

            playerRef.current.pauseVideo();
        };

        const handleSeek = (data: { currentTime: number }) => {
            if (!playerRef.current) {
                return;
            }

            const newTime = Number(data.currentTime);

            if (!Number.isFinite(newTime) || newTime < 0) {
                return;
            }

            expectedRemoteState.current = isPlayingRef.current ? YT.PlayerState.PLAYING : YT.PlayerState.PAUSED;

            playerRef.current.seekTo(newTime, true);

            setCurrentTime(newTime);
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

    useEffect(() => {
        let lastTime = 0;

        const updateTime = () => {
            if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') {
                return;
            }

            const player = playerRef.current;
            const current = player.getCurrentTime();

            // Detect native seek (jump > 1.5 seconds)
            if (Math.abs(current - lastTime) > 1.5) {
                if (canControlRef.current && expectedRemoteState.current === null) {
                    socket.emit("seek", {
                        currentTime: current,
                    });
                }
            }

            // Only update lastTime if we're actually playing to avoid drift while paused
            if (player.getPlayerState() === YT.PlayerState.PLAYING || Math.abs(current - lastTime) > 1.5) {
                lastTime = current;
            } else if (player.getPlayerState() === YT.PlayerState.PAUSED) {
                lastTime = current;
            }

            setCurrentTime(current);
            setDuration(player.getDuration());
        };

        const interval = setInterval(updateTime, 500);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="room-page">

            {/* Header */}
            <header className="room-header">

                <div className="brand">
                    <div className="brand-icon">W</div>
                    <span>WatchTogether</span>
                </div>

                <div className="room-info">
                    <span>ROOM</span>
                    <strong>{roomId}</strong>


                </div>


                <div className="room-actions">

                    <button
                        className="share-room-button"
                        onClick={shareRoom}
                    >
                        Share Room
                    </button>

                    <button
                        onClick={leaveRoom}
                    >
                        Leave Room
                    </button>

                    <div className="profile-avatar">
                        {hostInitial}
                    </div>

                </div>

            </header>


            {/* Main Room */}
            <main className="room-content">

                {/* Participants */}
                <aside className="participants-panel">

                    <div className="panel-heading">
                        <div>
                            <span className="panel-label">PARTY CREW</span>
                            <h2>Participants</h2>
                        </div>

                        <span className="online-count">
                            {participants.length} online
                        </span>
                    </div>


                    <div className="participants-list">
                        {participants.map((participant) => (
                            <div
                                className={`participant ${participant.role === "host" ? "host" : ""
                                    }`}
                                key={participant.socketId}
                            >
                                <div className="participant-avatar">
                                    {participant.username.charAt(0).toUpperCase()}
                                </div>

                                <div className="participant-info">
                                    <strong>
                                        {participant.username}

                                        {currentUser?.socketId === participant.socketId && (
                                            <span className="you-label"> You</span>
                                        )}
                                    </strong>

                                    {participant.role === "host" && (
                                        <span className="participant-role host">Host</span>
                                    )}

                                    {participant.role === "moderator" && (
                                        <span className="participant-role moderator">Moderator</span>
                                    )}
                                </div>

                                {isHost &&
                                    currentUser?.socketId !== participant.socketId && (
                                        <div className="participant-actions">
                                            {participant.role === "participant" && (
                                                <button className="moderator-btn" onClick={() => makeModerator(participant.socketId)}>
                                                    Make Moderator
                                                </button>
                                            )}

                                            <button className="remove" onClick={() => removeParticipant(participant.socketId)}>
                                                Remove
                                            </button>
                                        </div>
                                    )}

                                <div className="online-dot"></div>
                            </div>
                        ))}
                    </div>

                </aside>


                {/* Player */}
                <section className={`player-section ${isVideoMaximized ? "video-maximized" : ""}`}>

                    <div className="player-header">
                        <div>
                            <span>NOW WATCHING</span>
                            <h2>Ready to watch together?</h2>
                        </div>

                        <div className="sync-badge">
                            <span></span>
                            SYNCED
                        </div>
                    </div>


                    {canControl && actionRequests.length > 0 && (
                        <div className="request-panel">
                            <h3>Pending Requests</h3>

                            {actionRequests.map((request) => (
                                <div
                                    className="request-item"
                                    key={request.requestId}
                                >
                                    <div>
                                        <strong>
                                            {request.username}
                                        </strong>

                                        <span>
                                            {" "}requested {request.action}
                                        </span>
                                    </div>

                                    <div className="request-actions">
                                        <button
                                            onClick={() =>
                                                approveRequest(request.requestId)
                                            }
                                        >
                                            Approve
                                        </button>

                                        <button
                                            onClick={() =>
                                                rejectRequest(request.requestId)
                                            }
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="video-input">
                        <input
                            type="text"
                            placeholder="Paste YouTube URL..."
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                        />

                        <button onClick={loadVideo}>
                            Load Video
                        </button>
                    </div>


                    <div className="youtube-placeholder">
                        <div id="youtube-player"></div>

                        {!hasVideo && (
                            <div className="empty-player">
                                <div className="empty-player-icon">▶</div>
                                <h3>No video loaded</h3>
                                <p>Paste a YouTube URL above to start watching</p>
                            </div>
                        )}

                        {hasVideo && !canControl && (
                            <div className="player-interaction-blocker"></div>
                        )}
                    </div>


                    <div className={`player-controls ${!hasVideo ? "controls-disabled" : ""}`}>

                        <div
                            className="progress-bar"
                            onClick={(e) => {
                                if (!hasVideo || !duration || !playerRef.current) {
                                    return;
                                }

                                const rect = e.currentTarget.getBoundingClientRect();

                                const clickPosition =
                                    (e.clientX - rect.left) / rect.width;

                                const newTime = Math.max(
                                    0,
                                    Math.min(duration, clickPosition * duration)
                                );

                                seekVideo(newTime);
                            }}
                        >
                            <span
                                style={{
                                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                                }}
                            ></span>
                        </div>

                        <div className="controls-row">

                            <div className="left-controls">
                                <button onClick={togglePlayback} disabled={!hasVideo}>
                                    {isPlaying ? "❚❚" : "▶"}
                                </button>

                                <span>
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            <div className="right-controls">

                                <div className="quality-control">
                                    <button
                                        onClick={() =>
                                            setShowQualityMenu(!showQualityMenu)
                                        }
                                        disabled={!hasVideo}
                                    >
                                        ⚙
                                    </button>

                                    {showQualityMenu && (
                                        <div className="quality-menu">
                                            <button onClick={() => changeQuality("small")}>
                                                360p
                                            </button>

                                            <button onClick={() => changeQuality("medium")}>
                                                480p
                                            </button>

                                            <button onClick={() => changeQuality("hd720")}>
                                                720p
                                            </button>

                                            <button onClick={() => changeQuality("hd1080")}>
                                                1080p
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button onClick={toggleFullscreen} disabled={!hasVideo}>
                                    ⛶
                                </button>

                            </div>

                        </div>

                    </div>

                </section>


                {/* Chat */}
                <aside className="chat-panel">

                    <div className="panel-heading">
                        <div>
                            <span className="panel-label">ROOM</span>
                            <h2>Live Chat</h2>
                        </div>

                        <span className="chat-status">
                            ● LIVE
                        </span>
                    </div>


                    <div className="chat-messages">
                        {chatMessages.map((msg, index) => {
                            const isCurrentUser = msg.username === localStorage.getItem("watchPartyUsername");
                            const showAvatar = index === 0 || chatMessages[index - 1].username !== msg.username;
                            const accentColor = getColorForUsername(msg.username);

                            return (
                                <div 
                                    className={`chat-message ${isCurrentUser ? 'current-user-message' : ''} ${!showAvatar ? 'consecutive-message' : ''}`} 
                                    key={msg.id}
                                    style={{ "--accent-color": accentColor } as React.CSSProperties}
                                >
                                    {showAvatar ? (
                                        <div className="chat-avatar" style={{ backgroundColor: accentColor }}>
                                            {msg.username.charAt(0)}
                                        </div>
                                    ) : (
                                        <div className="chat-avatar-placeholder"></div>
                                    )}
                                    <div className="chat-message-content">
                                        {showAvatar && <strong>{msg.username}</strong>}
                                        <p>{msg.message}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="chat-input">
                        <input
                            type="text"
                            placeholder="Send a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") sendChat();
                            }}
                        />

                        <button onClick={sendChat}>
                            →
                        </button>
                    </div>

                </aside>

            </main>

        </div>
    );
}

export default Room;