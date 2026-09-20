'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Users, DollarSign, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface Course {
  id: string;
  title: string;
  description: string;
  enrollment_fee: number;
  upi_qr_url: string | null;
  teacher_id: string;
}

interface Video {
  id: string;
  title: string;
  video_order: number;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [user, authLoading, courseId]);

  const fetchCourseDetails = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('status', 'PUBLISHED')
        .single();

      if (courseError) throw courseError;

      setCourse(courseData);

      const { data: videosData } = await supabase
        .from('videos')
        .select('id, title, video_order')
        .eq('course_id', courseId)
        .eq('status', 'PUBLISHED')
        .order('video_order', { ascending: true });

      setVideos(videosData || []);

      if (user) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        setEnrollment(enrollmentData);
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG and JPG images are allowed');
      return;
    }

    setPaymentProof(file);
    setError('');
  };

  const uploadPaymentProof = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/payment-${Date.now()}.${fileExt}`;

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

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (course!.enrollment_fee > 0 && !paymentProof) {
      setError('Please upload payment proof');
      return;
    }

    setEnrolling(true);
    setError('');
    setSuccess('');

    try {
      let proofUrl = null;

      if (paymentProof) {
        proofUrl = await uploadPaymentProof(paymentProof);
      }

      const enrollmentStatus = course!.enrollment_fee === 0 ? 'ACTIVE' : 'PENDING';

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: enrollmentStatus,
          payment_proof_url: proofUrl,
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      if (course!.enrollment_fee > 0) {
        await supabase
          .from('course_payments')
          .insert({
            user_id: user.id,
            course_id: courseId,
            enrollment_id: enrollmentData.id,
            amount: course!.enrollment_fee,
            payment_method: 'upi',
            payment_proof_url: proofUrl,
            status: 'PENDING',
          });
      }

      setSuccess(
        course!.enrollment_fee === 0
          ? 'Successfully enrolled in the course!'
          : 'Enrollment request submitted! The teacher will review your payment and approve shortly.'
      );

      setEnrollment(enrollmentData);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(false);
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

  const isEnrolled = enrollment?.status === 'ACTIVE';
  const isPending = enrollment?.status === 'PENDING';
  const firstVideo = videos[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/courses" className="text-sm text-slate-600 dark:text-slate-400 hover:underline mb-4 block">
            ← Back to Courses
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {course.title}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {course.description}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {videos.length} video lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {videos.map((video, index) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span>{video.title}</span>
                      </div>
                      {index === 0 ? (
                        <Badge variant="secondary">Preview</Badge>
                      ) : !isEnrolled ? (
                        <Badge variant="outline">Locked</Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
                {videos.length > 0 && (
                  <div className="mt-6">
                    {firstVideo && (
                      <Link href={`/client/watch/${firstVideo.id}`}>
                        <Button className="w-full">
                          Watch Preview Video
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">Price:</span>
                    <div className="flex items-center text-2xl font-bold">
                      <DollarSign className="h-6 w-6 text-green-600" />
                      {course.enrollment_fee === 0 ? 'Free' : course.enrollment_fee}
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {isEnrolled ? (
                  <div>
                    <Badge variant="default" className="w-full justify-center py-2">
                      Enrolled
                    </Badge>
                    <Link href={`/client/watch/${firstVideo?.id}`} className="block mt-4">
                      <Button className="w-full">
                        Start Learning
                      </Button>
                    </Link>
                  </div>
                ) : isPending ? (
                  <Alert>
                    <AlertDescription>
                      Your enrollment is pending teacher approval
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {course.enrollment_fee > 0 && course.upi_qr_url && (
                      <div className="space-y-2">
                        <Label>Scan QR Code to Pay</Label>
                        <img
                          src={course.upi_qr_url}
                          alt="UPI QR Code"
                          className="w-full border rounded"
                        />
                        <div className="space-y-2">
                          <Label htmlFor="paymentProof">Upload Payment Screenshot</Label>
                          <Input
                            ref={fileInputRef}
                            id="paymentProof"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleFileSelect}
                            disabled={enrolling}
                          />
                          {paymentProof && (
                            <p className="text-sm text-green-600">
                              Selected: {paymentProof.name}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={enrolling || !user}
                    >
                      {enrolling ? 'Enrolling...' : course.enrollment_fee === 0 ? 'Enroll for Free' : 'Submit Enrollment'}
                    </Button>
                    {!user && (
                      <p className="text-sm text-center text-slate-500">
                        Please <Link href="/login" className="underline">login</Link> to enroll
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
