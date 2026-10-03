import type { ReactNode } from "react";

interface VideoSectionProps {
    children: ReactNode;
    videoTitle?: string;
    isMaximized: boolean;
}

export function VideoSection({ children, videoTitle, isMaximized }: VideoSectionProps) {
    return (
        <section className={`player-section ${isMaximized ? "video-maximized" : ""}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="player-header">
                <div>
                    <span>NOW PLAYING</span>
                    <h2>{videoTitle || "Ready to watch together?"}</h2>
                </div>

                <div className="sync-badge">
                    <span></span>
                    SYNCED
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
                {children}
            </div>
        </section>
    );
}
