'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function UploadVideoPage() {
  const router = useRouter();
  const { user, profile, subscription, loading: authLoading } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [limitError, setLimitError] = useState<{ message: string; limit: number; current: number } | null>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourse, setSelectedCourse] = useState('');

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

    fetchVideoCount();
    fetchCourses();
  }, [user, profile, router, authLoading]);

  const fetchVideoCount = async () => {
    try {
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user!.id);

      setVideoCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch video count:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Video file must be less than 200MB');
      return;
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only MP4, MOV, and WEBM video files are allowed');
      return;
    }

    setSelectedFile(file);
    setError('');

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const uploadVideoFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLimitError(null);

    if (!title) {
      setError('Title is required');
      return;
    }

    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (uploadMethod === 'file' && !selectedFile) {
      setError('Please select a video file');
      return;
    }

    if (uploadMethod === 'url' && !videoUrl) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let finalVideoUrl = videoUrl;

      if (uploadMethod === 'file' && selectedFile) {
        setUploadProgress(30);
        finalVideoUrl = await uploadVideoFile(selectedFile);
        setUploadProgress(70);
      }

      const { count: existingVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourse);

      const videoOrder = (existingVideos || 0) + 1;

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title,
          url: finalVideoUrl,
          thumbnail_url: thumbnailUrl || null,
          duration,
          transcript: transcript || null,
          status: 'DRAFT',
          course_id: selectedCourse,
          video_order: videoOrder,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.limit) {
          setLimitError({
            message: data.message,
            limit: data.limit,
            current: data.current,
          });
          return;
        }
        throw new Error(data.error || 'Failed to create video');
      }

      setUploadProgress(100);
      router.push(`/admin/editor/${data.video.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Video
            </CardTitle>
            <CardDescription>
              Add video details and upload your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {subscription && (
                <Alert>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>
                        {subscription.plan === 'PRO' && subscription.status === 'ACTIVE' ? (
                          <>
                            <strong>Pro Plan:</strong> Unlimited video uploads
                          </>
                        ) : (
                          <>
                            <strong>Free Plan:</strong> {videoCount} / 2 videos uploaded
                          </>
                        )}
                      </span>
                      {subscription.plan === 'FREE' && (
                        <Link href="/pricing">
                          <Button size="sm" variant="outline">
                            Upgrade to Pro
                          </Button>
                        </Link>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {limitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{limitError.message}</p>
                      <Link href="/pricing">
                        <Button size="sm" variant="secondary">
                          Upgrade to Pro Now
                        </Button>
                      </Link>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        No courses available. Create a course first.
                      </div>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {courses.length === 0 && (
                  <p className="text-xs text-orange-500">
                    You need to create a course before uploading videos.{' '}
                    <Link href="/teacher/courses/new" className="underline">
                      Create Course
                    </Link>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Introduction to Attention Mechanisms"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <Label>Upload Method</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    onClick={() => {
                      setUploadMethod('file');
                      setVideoUrl('');
                      setSelectedFile(null);
                    }}
                    disabled={loading}
                  >
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    onClick={() => {
                      setUploadMethod('url');
                      setSelectedFile(null);
                      if (videoUrl.startsWith('blob:')) setVideoUrl('');
                    }}
                    disabled={loading}
                  >
                    Use URL
                  </Button>
                </div>
              </div>

              {uploadMethod === 'file' ? (
                <div className="space-y-2">
                  <Label htmlFor="videoFile">Video File</Label>
                  <Input
                    ref={fileInputRef}
                    id="videoFile"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500">
                    MP4, MOV, or WEBM format • Max 200MB
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-green-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500">
                    Direct link to MP4 video file
                  </p>
                </div>
              )}

              {videoUrl && (
                <div className="space-y-2">
                  <Label>Video Preview</Label>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onLoadedMetadata={handleVideoLoad}
                    className="w-full rounded-lg bg-black"
                  />
                  {duration > 0 && (
                    <p className="text-xs text-slate-500">
                      Duration: {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnailUrl"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript (Optional)</Label>
                <Textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the video transcript here for AI-powered hotspot generation..."
                  rows={8}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Adding a transcript enables AI-powered hotspot suggestions
                </p>
              </div>

              {loading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>Uploading video...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading || (uploadMethod === 'file' && !selectedFile) || (uploadMethod === 'url' && !videoUrl)}
                >
                  {loading ? (
                    uploadProgress > 0 ? `Uploading (${uploadProgress}%)...` : 'Processing...'
                  ) : (
                    'Create Video & Continue to Editor'
                  )}
                </Button>
                <Link href="/admin/dashboard">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
