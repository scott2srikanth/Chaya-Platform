'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Video } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video as VideoIcon, Play, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function ClientVideosPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    fetchVideos();
  }, [user, authLoading, router]);

  const fetchVideos = async () => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/videos', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.videos) {
        setVideos(data.videos.filter((v: Video) => v.status === 'PUBLISHED'));
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Video Library
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {profile?.email}
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.role === 'ADMIN' && (
              <Link href="/admin/dashboard">
                <Button variant="outline">Admin Dashboard</Button>
              </Link>
            )}
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Interactive Videos
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Explore our collection of interactive learning content
          </p>
        </div>

        {videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <VideoIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No videos available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Check back later for new content
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative group">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <Link href={`/client/watch/${video.id}`}>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <CardDescription>
                    {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/client/watch/${video.id}`} className="w-full">
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Watch Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
