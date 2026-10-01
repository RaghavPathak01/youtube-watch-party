interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
}

declare namespace YT {
    class Player {
        constructor(
            elementId: string,
            options: {
                videoId?: string;
                events?: {
                    onReady?: (event: { target: YT.Player }) => void;
                    onStateChange?: (event: {
                        data: number;
                    }) => void;
                };
            }
        );

        loadVideoById(videoId: string, startSeconds?: number): void;
        playVideo(): void;
        pauseVideo(): void;

        getPlayerState(): number;
        getCurrentTime(): number;
        getDuration(): number;
        getIframe(): HTMLIFrameElement;
        seekTo(seconds: number, allowSeekAhead: boolean): void;

        setPlaybackQuality(quality: string): void;

        destroy(): void;
    }

    const PlayerState: {
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        UNSTARTED: number;
        ENDED: number;
        CUED: number;
    };
}