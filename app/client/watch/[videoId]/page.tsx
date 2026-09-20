'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, Hotspot, supabase } from '@/lib/supabase';
import { VideoPlayer, VideoPlayerRef } from '@/components/VideoPlayer';
import { VideoControls } from '@/components/VideoControls';
import { HotspotLayer } from '@/components/HotspotLayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  useEffect(() => {
    fetchVideo();
    fetchHotspots();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/videos/${videoId}`, { headers });
      const data = await res.json();

      if (data.video) {
        setVideo(data.video);
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotspots = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/hotspots?videoId=${videoId}`, { headers });
      const data = await res.json();

      if (data.hotspots) {
        setHotspots(data.hotspots);
      }
    } catch (error) {
      console.error('Failed to fetch hotspots:', error);
    }
  };

  const handleJumpToTime = (time: number) => {
    videoPlayerRef.current?.seek(time);
    videoPlayerRef.current?.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    videoPlayerRef.current?.pause();
    setIsPlaying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-lg text-white mb-4">Video not found</div>
          <Link href="/client/videos">
            <Button variant="outline">Back to Videos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/client/videos">
              <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Videos
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">{video.title}</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <div
            ref={videoContainerRef}
            className="relative bg-black rounded-lg overflow-hidden aspect-video"
          >
            <div
              onClick={() => {
                const player = videoPlayerRef.current;
                if (!player) return;
                if (player.isPlaying()) {
                  player.pause();
                  setIsPlaying(false);
                } else {
                  player.play();
                  setIsPlaying(true);
                }
              }}
              className="cursor-pointer"
            >
              <VideoPlayer
                ref={videoPlayerRef}
                src={video.url}
                onTimeUpdate={setCurrentTime}
                onLoadedMetadata={setDuration}
                className="w-full h-full"
              />
            </div>
            <HotspotLayer
              hotspots={hotspots}
              currentTime={currentTime}
              onJumpToTime={handleJumpToTime}
              onPause={handlePause}
              onResume={() => {
                videoPlayerRef.current?.play();
                setIsPlaying(true);
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <VideoControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onPlayPause={() => {
                  const player = videoPlayerRef.current;
                  if (!player) return;
                  if (player.isPlaying()) {
                    player.pause();
                    setIsPlaying(false);
                  } else {
                    player.play();
                    setIsPlaying(true);
                  }
                }}
                onSeek={(time) => videoPlayerRef.current?.seek(time)}
                onVolumeChange={(vol) => {
                  videoPlayerRef.current?.setVolume(vol);
                  setVolume(vol);
                }}
                onFullscreen={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoContainerRef.current?.requestFullscreen();
                  }
                }}
              />
            </div>
          </div>
        </div>

        {video.transcript && (
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Transcript
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {video.transcript}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
