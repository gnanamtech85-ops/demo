import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface PlayerProps {
    src: string;
    options?: any;
}

export default function Player({ src, options }: PlayerProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!playerRef.current) {
            const videoElement = document.createElement("video-js");
            videoElement.classList.add('vjs-big-play-centered');
            videoRef.current?.appendChild(videoElement);

            const player = playerRef.current = videojs(videoElement, {
                ...options,
                controls: true,
                autoplay: true,
                preload: 'auto',
                fluid: true,
                sources: [{
                    src: src,
                    type: 'application/x-mpegURL'
                }]
            }, () => {
                videojs.log('player is ready');
            });

        } else {
            const player = playerRef.current;
            player.src({ src: src, type: 'application/x-mpegURL' });
        }
    }, [src, options]);

    useEffect(() => {
        const player = playerRef.current;
        return () => {
            if (player && !player.isDisposed()) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, []);

    return (
        <div data-vjs-player>
            <div ref={videoRef} />
        </div>
    );
}
