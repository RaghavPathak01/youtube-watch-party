import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface YouTubePlayerHandle {
    load: (videoId: string, autoplay: boolean) => void;
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    setQuality: (quality: string) => void;
}

interface YouTubePlayerProps {
    videoId: string;
    onTimeUpdate: (currentTime: number, duration: number) => void;
    onReady: () => void;
    onEnded?: () => void;
    onTitleUpdate?: (title: string) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
    ({ videoId, onTimeUpdate, onReady, onEnded, onTitleUpdate, onPlayStateChange }, ref) => {
        const playerRef = useRef<YT.Player | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const timeUpdateInterval = useRef<number | null>(null);

        useImperativeHandle(ref, () => ({
            load: (vidId: string, autoplay: boolean) => {
                if (!playerRef.current) return;
                if (autoplay && typeof playerRef.current.loadVideoById === 'function') {
                    playerRef.current.loadVideoById(vidId);
                } else if (typeof playerRef.current.cueVideoById === 'function') {
                    playerRef.current.cueVideoById(vidId);
                }
            },
            play: () => {
                playerRef.current?.playVideo();
            },
            pause: () => {
                playerRef.current?.pauseVideo();
            },
            seekTo: (time: number) => {
                playerRef.current?.seekTo(time, true);
            },
            getCurrentTime: () => {
                return playerRef.current?.getCurrentTime() || 0;
            },
            getDuration: () => {
                return playerRef.current?.getDuration() || 0;
            },
            setQuality: (quality: string) => {
                playerRef.current?.setPlaybackQuality(quality);
            }
        }));

        useEffect(() => {
            if (!window.YT) {
                const script = document.createElement("script");
                script.src = "https://www.youtube.com/iframe_api";
                script.async = true;
                document.body.appendChild(script);
            }

            const checkAndEmitTitle = () => {
                if (playerRef.current && typeof (playerRef.current as any).getVideoData === 'function') {
                    const data = (playerRef.current as any).getVideoData();
                    if (data && data.title) {
                        onTitleUpdate?.(data.title);
                    }
                }
            };

            const initPlayer = () => {
                if (!containerRef.current) return;
                
                playerRef.current = new window.YT.Player("youtube-player-iframe", {
                    videoId,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1
                    },
                    events: {
                        onReady: () => {
                            onReady();
                            setTimeout(checkAndEmitTitle, 500); // Sometimes it takes a moment to be available
                        },
                        onStateChange: (event: any) => {
                            checkAndEmitTitle();
                            const isPlayingNow = event.data === window.YT.PlayerState.PLAYING;
                            onPlayStateChange?.(isPlayingNow);
                            
                            if (isPlayingNow) {
                                if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
                                timeUpdateInterval.current = window.setInterval(() => {
                                    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                                        onTimeUpdate(playerRef.current.getCurrentTime(), playerRef.current.getDuration());
                                    }
                                }, 500);
                            } else {
                                if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
                                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                                    onTimeUpdate(playerRef.current.getCurrentTime(), playerRef.current.getDuration());
                                }
                                if (event.data === window.YT.PlayerState.ENDED) {
                                    onEnded?.();
                                }
                            }
                        }
                    }
                } as any);
            };

            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                window.onYouTubeIframeAPIReady = initPlayer;
            }

            return () => {
                if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
                playerRef.current?.destroy();
            };
        }, []); // Initialize only once

        // We removed the useEffect that watched videoId.
        // Loading is now done explicitly via the exposed `load` method.

        return (
            <div className="youtube-player-wrapper" style={{ pointerEvents: 'none', position: 'relative', width: '100%', height: '100%' }}>
                <div id="youtube-player-iframe" ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
            </div>
        );
    }
);
