import { useState } from "react";
import { useModal } from "../../context/ModalContext";

interface VideoInputProps {
    onLoadVideo: (videoId: string) => void;
}

export function VideoInput({ onLoadVideo }: VideoInputProps) {
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

    const handleLoad = () => {
        const id = getVideoId(videoUrl);
        if (!id) {
            showAlert("Please enter a valid YouTube URL");
            return;
        }
        onLoadVideo(id);
        setVideoUrl("");
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '6px' }}>
            <div style={{ padding: '0 12px', color: '#a1a1aa' }}>🔗</div>
            <input
                type="text"
                placeholder="Paste a YouTube link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoad();
                }}
                style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#f4f4f5',
                    outline: 'none',
                    fontSize: '14px',
                    padding: '8px 0'
                }}
            />
            <button 
                onClick={handleLoad}
                style={{
                    background: '#a855f7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                }}
            >
                Play now
            </button>
        </div>
    );
}
