'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onFullscreen: () => void;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onFullscreen,
}: VideoControlsProps) {
  const [isMuted, setIsMuted] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(1);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-3">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="hover:bg-slate-800"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium min-w-[45px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={(value) => onSeek(value[0])}
            className="flex-1"
          />
          <span className="text-sm text-slate-400 min-w-[45px]">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMuteToggle}
            className="hover:bg-slate-800"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(value) => {
              setIsMuted(false);
              onVolumeChange(value[0]);
            }}
            className="w-24"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreen}
            className="hover:bg-slate-800"
          >
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
