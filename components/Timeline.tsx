'use client';

import { useRef } from 'react';
import { Hotspot } from '@/lib/supabase';

interface TimelineProps {
  duration: number;
  currentTime: number;
  hotspots: Hotspot[];
  onSeek: (time: number) => void;
}

export function Timeline({ duration, currentTime, hotspots, onSeek }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    onSeek(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div
        ref={timelineRef}
        className="relative h-12 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        {hotspots.map((hotspot) => (
          <div
            key={hotspot.id}
            className="absolute top-0 bottom-0 bg-blue-400 dark:bg-blue-600 opacity-50"
            style={{
              left: `${(hotspot.start_time / duration) * 100}%`,
              width: `${((hotspot.end_time - hotspot.start_time) / duration) * 100}%`,
            }}
            title={`Hotspot: ${hotspot.start_time.toFixed(1)}s - ${hotspot.end_time.toFixed(1)}s`}
          />
        ))}

        <div
          className="absolute top-0 bottom-0 w-1 bg-red-500"
          style={{
            left: `${(currentTime / duration) * 100}%`,
          }}
        />

        <div
          className="absolute top-0 bottom-0 left-0 bg-blue-500 dark:bg-blue-600 opacity-30"
          style={{
            width: `${(currentTime / duration) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
