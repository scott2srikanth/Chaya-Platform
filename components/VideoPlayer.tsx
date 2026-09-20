'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  className?: string;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoElement: () => HTMLVideoElement | null;
  isPlaying: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  requestFullscreen: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src, onTimeUpdate, onLoadedMetadata, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play();
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
      getDuration: () => {
        return videoRef.current?.duration || 0;
      },
      getVideoElement: () => {
        return videoRef.current;
      },
      isPlaying: () => {
        return !videoRef.current?.paused;
      },
      setVolume: (volume: number) => {
        if (videoRef.current) {
          videoRef.current.volume = volume;
        }
      },
      getVolume: () => {
        return videoRef.current?.volume || 1;
      },
      requestFullscreen: () => {
        videoRef.current?.requestFullscreen();
      },
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        onLoadedMetadata?.(video.duration);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }, [onTimeUpdate, onLoadedMetadata]);

    return (
      <video
        ref={videoRef}
        src={src}
        className={className || 'w-full h-full'}
        preload="metadata"
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
