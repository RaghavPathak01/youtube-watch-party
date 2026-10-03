import { useState } from "react";
import type { QueueItem } from "../../types/room";
import { useModal } from "../../context/ModalContext";

interface QueuePanelProps {
    queue: QueueItem[];
    canControl: boolean;
    onAddVideo: (videoId: string, title: string) => void;
    onRemove: (id: string) => void;
    onPlayNow: (id: string) => void;
}

export function QueuePanel({ queue, canControl, onAddVideo, onRemove, onPlayNow }: QueuePanelProps) {
    const [videoUrl, setVideoUrl] = useState("");
    const { showAlert } = useModal();

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

    const handleAdd = () => {
        const id = getVideoId(videoUrl);
        if (!id) {
            showAlert("Please enter a valid YouTube URL");
            return;
        }
        onAddVideo(id, "YouTube Video");
        setVideoUrl("");
    };

    return (
        <div className="queue-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-heading">
                <div>
                    <span className="panel-label">UP NEXT</span>
                    <h2>Video Queue</h2>
                </div>
                {queue.length > 0 && (
                    <span className="queue-count">{queue.length} items</span>
                )}
            </div>

            <div className="queue-list" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {queue.length === 0 ? (
                    <div className="queue-empty-state">
                        <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.4 }}>📺</div>
                        <h3 style={{ fontSize: '14px', marginBottom: '4px' }}>Queue is empty</h3>
                        <p style={{ fontSize: '13px', lineHeight: '1.5' }}>Add a video to play it next.</p>
                    </div>
                ) : (
                    queue.map((item, index) => (
                        <div key={item.id} className="queue-item" style={{ overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', fontWeight: '700', color: '#a1a1aa', fontSize: '12px', flexShrink: 0 }}>
                                {index + 1}
                            </div>
                            <img src={item.thumbnail} alt={item.title} style={{ width: '120px', height: '68px', objectFit: 'cover' }} />
                            <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.title}
                                </strong>
                                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                                    Added by {item.addedBy.username}
                                </span>
                                {canControl && (
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => onPlayNow(item.id)}
                                            style={{ flex: 1, padding: '4px', fontSize: '12px', background: '#a855f7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Play Now
                                        </button>
                                        <button 
                                            onClick={() => onRemove(item.id)}
                                            style={{ flex: 1, padding: '4px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="queue-input" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Paste YouTube URL..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                        }}
                        style={{ flex: 1, padding: '9px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                    <button
                        onClick={handleAdd}
                        style={{ padding: '0 16px', fontWeight: 'bold', fontSize: '13px' }}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
