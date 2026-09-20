'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Eye, Users, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface Course {
  id: string;
  title: string;
  description: string;
  enrollment_fee: number;
  upi_qr_url: string | null;
  status: 'DRAFT' | 'PUBLISHED';
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const { user, profile, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enrollmentFee, setEnrollmentFee] = useState('0');
  const [videoCount, setVideoCount] = useState(0);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }

    fetchCourse();
  }, [user, profile, authLoading, router, courseId]);

  const fetchCourse = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('teacher_id', user!.id)
        .single();

      if (courseError) throw courseError;

      setCourse(courseData);
      setTitle(courseData.title);
      setDescription(courseData.description || '');
      setEnrollmentFee(courseData.enrollment_fee.toString());

      const { count: vCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      const { count: eCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'ACTIVE');

      setVideoCount(vCount || 0);
      setEnrollmentCount(eCount || 0);
    } catch (error) {
      console.error('Failed to fetch course:', error);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!title) {
      setError('Course title is required');
      return;
    }

    const fee = parseFloat(enrollmentFee);
    if (isNaN(fee) || fee < 0) {
      setError('Invalid enrollment fee');
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          title,
          description,
          enrollment_fee: fee,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId);

      if (updateError) throw updateError;

      setSuccess('Course updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (videoCount === 0) {
      setError('Add at least one video before publishing');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'PUBLISHED' })
        .eq('id', courseId);

      if (updateError) throw updateError;

      setSuccess('Course published successfully!');
      fetchCourse();
    } catch (err: any) {
      setError(err.message || 'Failed to publish course');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'DRAFT' })
        .eq('id', courseId);

      if (updateError) throw updateError;

      setSuccess('Course unpublished');
      fetchCourse();
    } catch (err: any) {
      setError(err.message || 'Failed to unpublish course');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher/courses">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {course.title}
                </h1>
                <Badge variant={course.status === 'PUBLISHED' ? 'default' : 'secondary'} className="mt-1">
                  {course.status}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/teacher/courses/${courseId}/enrollments`}>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Enrollments
                </Button>
              </Link>
              <Link href={`/teacher/courses/${courseId}/videos`}>
                <Button>
                  <Video className="h-4 w-4 mr-2" />
                  Manage Videos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{videoCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollmentCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Enrollment Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {course.enrollment_fee === 0 ? 'Free' : `$${course.enrollment_fee}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              Edit your course information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentFee">Enrollment Fee (USD)</Label>
              <Input
                id="enrollmentFee"
                type="number"
                min="0"
                step="0.01"
                value={enrollmentFee}
                onChange={(e) => setEnrollmentFee(e.target.value)}
                disabled={saving}
              />
            </div>

            {course.upi_qr_url && (
              <div className="space-y-2">
                <Label>UPI QR Code</Label>
                <img
                  src={course.upi_qr_url}
                  alt="UPI QR Code"
                  className="w-48 h-48 border rounded"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {course.status === 'DRAFT' ? (
                <Button onClick={handlePublish} disabled={saving} variant="default">
                  <Eye className="h-4 w-4 mr-2" />
                  Publish Course
                </Button>
              ) : (
                <Button onClick={handleUnpublish} disabled={saving} variant="outline">
                  Unpublish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
