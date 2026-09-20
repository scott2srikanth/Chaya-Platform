'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, Hotspot, supabase } from '@/lib/supabase';
import { VideoPlayer, VideoPlayerRef } from '@/components/VideoPlayer';
import { VideoControls } from '@/components/VideoControls';
import { HotspotLayer } from '@/components/HotspotLayer';
import { HotspotEditor } from '@/components/HotspotEditor';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!profile) {
      router.push('/login');
      return;
    }

    if (profile.role !== 'ADMIN') {
      router.push('/client/videos');
      return;
    }
  }, [user, profile, router, authLoading]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  useEffect(() => {
    if (!authLoading && user && profile && profile.role === 'ADMIN') {
      fetchVideo();
      fetchHotspots();
    }
  }, [videoId, authLoading, user, profile]);

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
      toast({
        title: 'Error',
        description: 'Failed to load video',
        variant: 'destructive',
      });
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

  const handleHotspotCreate = async (hotspot: Omit<Hotspot, 'id' | 'created_at' | 'video_id'>) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/hotspots', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...hotspot, video_id: videoId }),
      });

      const data = await res.json();

      if (data.hotspot) {
        setHotspots([...hotspots, data.hotspot]);
        toast({
          title: 'Success',
          description: 'Hotspot created',
        });
      }
    } catch (error) {
      console.error('Failed to create hotspot:', error);
      toast({
        title: 'Error',
        description: 'Failed to create hotspot',
        variant: 'destructive',
      });
    }
  };

  const handleHotspotUpdate = async (id: string, updates: Partial<Hotspot>) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/hotspots/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (data.hotspot) {
        setHotspots(hotspots.map((h) => (h.id === id ? data.hotspot : h)));
      }
    } catch (error) {
      console.error('Failed to update hotspot:', error);
      toast({
        title: 'Error',
        description: 'Failed to update hotspot',
        variant: 'destructive',
      });
    }
  };

  const handleHotspotDelete = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/hotspots/${id}`, { method: 'DELETE', headers });
      setHotspots(hotspots.filter((h) => h.id !== id));
      toast({
        title: 'Success',
        description: 'Hotspot deleted',
      });
    } catch (error) {
      console.error('Failed to delete hotspot:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete hotspot',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...video, status: 'PUBLISHED' }),
      });

      toast({
        title: 'Success',
        description: 'Video published successfully',
      });

      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Failed to publish video:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish video',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!video?.transcript) {
      toast({
        title: 'No Transcript',
        description: 'Please add a transcript to generate AI hotspots',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingAI(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai/generate-hotspots', {
        method: 'POST',
        headers,
        body: JSON.stringify({ videoId, transcript: video.transcript }),
      });

      const data = await res.json();

      if (data.hotspots) {
        for (const hotspot of data.hotspots) {
          await handleHotspotCreate(hotspot);
        }

        toast({
          title: 'Success',
          description: `Generated ${data.hotspots.length} AI hotspots`,
        });

        fetchHotspots();
      }
    } catch (error) {
      console.error('Failed to generate AI hotspots:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI hotspots',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Video not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {video.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={video.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                    {video.status}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {video.transcript && (
                <Button
                  onClick={handleGenerateAI}
                  variant="outline"
                  disabled={generatingAI}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generatingAI ? 'Generating...' : 'Generate AI Hotspots'}
                </Button>
              )}
              <Link href={`/client/watch/${videoId}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button onClick={handlePublish} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <HotspotEditor
              hotspots={hotspots}
              currentTime={currentTime}
              duration={duration}
              onHotspotCreate={handleHotspotCreate}
              onHotspotUpdate={handleHotspotUpdate}
              onHotspotDelete={handleHotspotDelete}
              videoContainerRef={videoContainerRef}
            >
              <div className="space-y-4">
                <div
                  ref={videoContainerRef}
                  className="relative bg-black rounded-lg overflow-hidden aspect-video group"
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
                    editable
                    onHotspotClick={() => {}}
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

                <Timeline
                  duration={duration}
                  currentTime={currentTime}
                  hotspots={hotspots}
                  onSeek={(time) => videoPlayerRef.current?.seek(time)}
                />
              </div>
            </HotspotEditor>
          </div>
        </div>
      </main>
    </div>
  );
}
