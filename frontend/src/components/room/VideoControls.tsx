import { useState } from "react";

interface VideoControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    hasVideo: boolean;
    onTogglePlayback: () => void;
    onSeek: (time: number) => void;
    onChangeQuality: (quality: string) => void;
    onToggleFullscreen: () => void;
}

export function VideoControls({
    isPlaying,
    currentTime,
    duration,
    hasVideo,
    onTogglePlayback,
    onSeek,
    onChangeQuality: _onChangeQuality,
    onToggleFullscreen: _onToggleFullscreen
}: VideoControlsProps) {
    const [_showQualityMenu, _setShowQualityMenu] = useState(false);

    const formatTime = (time: number) => {
        if (!Number.isFinite(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hasVideo || !duration) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
        
        onSeek(newTime);
    };

    return (
        <div className={`player-controls ${!hasVideo ? "controls-disabled" : ""}`} style={{ 
            display: 'flex', alignItems: 'center', gap: '20px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '16px 20px', 
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '16px',
            boxSizing: 'border-box',
            width: '100%'
        }}>
            <button 
                onClick={onTogglePlayback} 
                disabled={!hasVideo}
                style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: '#a855f7', color: 'white', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: hasVideo ? 'pointer' : 'not-allowed',
                    fontSize: '18px', flexShrink: 0
                }}
            >
                {isPlaying ? "❚❚" : "▶"}
            </button>

            <span style={{ color: '#a1a1aa', fontSize: '13px', fontWeight: '500', flexShrink: 0, minWidth: '80px', whiteSpace: 'nowrap' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div 
                className="progress-bar-container" 
                onClick={handleProgressClick}
                style={{
                    flex: 1, minWidth: 0, height: '6px', background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px', cursor: 'pointer', position: 'relative'
                }}
            >
                <div style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    height: '100%', background: '#a855f7', borderRadius: '3px',
                    position: 'absolute', top: 0, left: 0
                }}></div>
                {/* Thumb */}
                <div style={{
                    width: '14px', height: '14px', background: 'white',
                    borderRadius: '50%', position: 'absolute', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}></div>
            </div>
        </div>
    );
}
