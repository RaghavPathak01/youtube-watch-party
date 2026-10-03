import { useState } from "react";

export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    currentUserId?: string;
    onSendMessage: (message: string) => void;
}

const AVATAR_COLORS = [
    "#a78bfa", "#22d3ee", "#fb923c", "#4ade80", "#f472b6"
];

const getColorForUsername = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
};

export function ChatPanel({ messages, currentUserId, onSendMessage }: ChatPanelProps) {
    const [newMessage, setNewMessage] = useState("");

    const handleSend = () => {
        if (!newMessage.trim()) return;
        onSendMessage(newMessage.trim());
        setNewMessage("");
    };

    return (
        <div className="chat-panel">
            <div className="panel-heading">
                <div>
                    <span className="panel-label">ROOM</span>
                    <h2>Live Chat</h2>
                </div>
                <span className="chat-status">● LIVE</span>
            </div>

            <div className="chat-messages">
                {messages.map((msg, index) => {
                    if (msg.userId === "system") {
                        return (
                            <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0', fontSize: '13px', color: '#a1a1aa' }}>
                                {msg.message}
                            </div>
                        );
                    }

                    const isCurrentUser = msg.userId === currentUserId;
                    const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId || messages[index - 1].userId === "system";
                    const accentColor = getColorForUsername(msg.username);

                    return (
                        <div 
                            className={`chat-message-row ${isCurrentUser ? 'is-own' : 'is-other'} ${!showAvatar ? 'consecutive' : ''}`} 
                            key={msg.id}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start',
                                gap: '8px', 
                                marginBottom: showAvatar ? '8px' : '2px',
                                flexDirection: isCurrentUser ? 'row-reverse' : 'row'
                            }}
                        >
                            <div className="chat-avatar-container" style={{ width: '32px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                {showAvatar && (
                                    <div className="chat-avatar" style={{ 
                                        backgroundColor: isCurrentUser ? '#a855f7' : accentColor, 
                                        width: '32px', height: '32px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        color: 'white', fontWeight: 'bold', fontSize: '14px' 
                                    }}>
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div 
                            className={`chat-bubble ${isCurrentUser ? 'own-bubble' : ''}`}
                            style={{ 
                                flex: 1, 
                                padding: '10px 12px', 
                                borderRadius: isCurrentUser 
                                    ? (showAvatar ? '12px 0 12px 12px' : '12px 4px 12px 12px')
                                    : (showAvatar ? '0 12px 12px 12px' : '4px 12px 12px 12px'),
                                textAlign: isCurrentUser ? 'right' : 'left',
                                minWidth: 0
                            }}>
                                {showAvatar && (
                                    <strong style={{ 
                                        display: 'block', 
                                        color: isCurrentUser ? '#c084fc' : accentColor, 
                                        fontSize: '12px', 
                                        marginBottom: '4px' 
                                    }}>
                                        {msg.username}
                                    </strong>
                                )}
                                <p style={{ margin: 0, color: '#f4f4f5', fontSize: '13px', wordBreak: 'break-word' }}>
                                    {msg.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="chat-input-container" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    placeholder="Send a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                    }}
                    style={{
                        flex: 1,
                        borderRadius: '12px',
                        padding: '11px 14px',
                        fontSize: '13px'
                    }}
                />
                <button 
                    onClick={handleSend}
                    style={{
                        borderRadius: '12px',
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontSize: '18px',
                        border: 'none',
                        color: 'white'
                    }}
                >
                    →
                </button>
            </div>
        </div>
    );
}
