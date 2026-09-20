'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Video } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Video as VideoIcon, Edit, Trash2, Play, LogOut, Shield, CreditCard, BookOpen, Film } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, subscription, loading: authLoading, signOut } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED'>('all');

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

    if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
      router.push('/client/videos');
      return;
    }

    fetchVideos();
  }, [user, profile, router, filter, authLoading]);

  const fetchVideos = async () => {
    try {
      const url = filter === 'all'
        ? '/api/videos'
        : `/api/videos?status=${filter}`;

      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.videos) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      fetchVideos();
    } catch (error) {
      console.error('Failed to delete video:', error);
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Admin Dashboard
              </h1>
              {profile?.role === 'SUPER_ADMIN' && (
                <Badge variant="destructive">SUPER ADMIN</Badge>
              )}
              {subscription && (
                <Badge
                  variant={(subscription.plan === 'PRO' || subscription.plan === 'ELITE') ? 'default' : 'secondary'}
                  className={subscription.plan === 'ELITE' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' : ''}
                >
                  {subscription.plan}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {profile?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/billing">
              <Button variant="outline" size="sm">
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile?.role === 'SUPER_ADMIN' && (
          <Card className="mb-8 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Super Admin Controls
              </CardTitle>
              <CardDescription>Platform management and oversight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/super/users">
                  <Button variant="outline" className="w-full">
                    Manage Users
                  </Button>
                </Link>
                <Link href="/admin/super/subscriptions">
                  <Button variant="outline" className="w-full">
                    View Subscriptions
                  </Button>
                </Link>
                <Link href="/admin/super/payments">
                  <Button variant="outline" className="w-full">
                    View Payments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Video Library
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your interactive video content
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/studio">
              <Button variant="outline" className="bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300">
                <Film className="w-4 h-4 mr-2" />
                Motion Studio
              </Button>
            </Link>
            <Link href="/teacher/courses">
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                My Courses
              </Button>
            </Link>
            <Link href="/admin/upload">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="DRAFT">Drafts</TabsTrigger>
            <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
          </TabsList>
        </Tabs>

        {videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <VideoIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No videos yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Get started by uploading your first video
              </p>
              <Link href="/admin/upload">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Video
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative">
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
                  <Badge
                    className="absolute top-2 right-2"
                    variant={video.status === 'PUBLISHED' ? 'default' : 'secondary'}
                  >
                    {video.status}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <CardDescription>
                    {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link href={`/admin/editor/${video.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/client/watch/${video.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
