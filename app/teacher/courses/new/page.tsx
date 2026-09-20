'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function NewCoursePage() {
  const router = useRouter();
  const { user, profile, subscription, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enrollmentFee, setEnrollmentFee] = useState('0');
  const [upiQrFile, setUpiQrFile] = useState<File | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (subscription?.plan !== 'ELITE') {
      setError('Elite subscription required to create courses');
    }
  }, [user, profile, subscription, authLoading, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('QR code image must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG and JPG images are allowed');
      return;
    }

    setUpiQrFile(file);
    setError('');
  };

  const uploadQrCode = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/qr-${Date.now()}.${fileExt}`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title) {
      setError('Course title is required');
      return;
    }

    const fee = parseFloat(enrollmentFee);
    if (isNaN(fee) || fee < 0) {
      setError('Invalid enrollment fee');
      return;
    }

    if (fee > 0 && !upiQrFile && !upiQrUrl) {
      setError('UPI QR code is required for paid courses');
      return;
    }

    setLoading(true);

    try {
      let qrCodeUrl = upiQrUrl;

      if (upiQrFile) {
        qrCodeUrl = await uploadQrCode(upiQrFile);
      }

      const { data, error: insertError } = await supabase
        .from('courses')
        .insert({
          teacher_id: user!.id,
          title,
          description,
          enrollment_fee: fee,
          upi_qr_url: fee > 0 ? qrCodeUrl : null,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/teacher/courses/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (subscription?.plan !== 'ELITE') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/teacher/courses">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Elite Subscription Required</h3>
              <p className="text-slate-500 mb-6 text-center">
                Upgrade to Elite to create courses and enable paid enrollments
              </p>
              <Link href="/pricing">
                <Button>View Plans</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher/courses">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Create New Course
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              Create a new course to organize your videos and manage student enrollments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Introduction to Machine Learning"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students will learn in this course..."
                  rows={4}
                  disabled={loading}
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
                  placeholder="0.00"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Set to 0 for free courses. First video is always public.
                </p>
              </div>

              {parseFloat(enrollmentFee) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="upiQr">UPI QR Code</Label>
                  <Input
                    ref={fileInputRef}
                    id="upiQr"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500">
                    Upload your UPI QR code for payment collection (PNG or JPG, max 5MB)
                  </p>
                  {upiQrFile && (
                    <p className="text-sm text-green-600">
                      Selected: {upiQrFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Course'}
                </Button>
                <Link href="/teacher/courses">
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
