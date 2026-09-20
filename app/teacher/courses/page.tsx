'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Users, Video, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface Course {
  id: string;
  title: string;
  description: string;
  enrollment_fee: number;
  status: 'DRAFT' | 'PUBLISHED';
  created_at: string;
  video_count?: number;
  enrollment_count?: number;
}

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchCourses();
  }, [user, profile, authLoading, router]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count: videoCount } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          const { count: enrollmentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'ACTIVE');

          return {
            ...course,
            video_count: videoCount || 0,
            enrollment_count: enrollmentCount || 0,
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
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
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                My Courses
              </h1>
            </div>
            <Link href="/teacher/courses/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-slate-500 mb-6 text-center">
                Create your first course to start teaching
              </p>
              <Link href="/teacher/courses/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                      <Badge variant={course.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {course.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {course.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-slate-600 dark:text-slate-400">
                        <Video className="h-4 w-4 mr-2" />
                        {course.video_count} Videos
                      </span>
                      <span className="flex items-center text-slate-600 dark:text-slate-400">
                        <Users className="h-4 w-4 mr-2" />
                        {course.enrollment_count} Students
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                      <span className="font-semibold">
                        {course.enrollment_fee === 0 ? 'Free' : `$${course.enrollment_fee}`}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={`/teacher/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Manage
                        </Button>
                      </Link>
                      <Link href={`/teacher/courses/${course.id}/videos`} className="flex-1">
                        <Button className="w-full">
                          Videos
                        </Button>
                      </Link>
                    </div>
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
