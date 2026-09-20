'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface Course {
  id: string;
  title: string;
  description: string;
  enrollment_fee: number;
  video_count?: number;
  enrollment_count?: number;
  is_enrolled?: boolean;
}

export default function CourseCatalogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [user, authLoading]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithDetails = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count: videoCount } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'PUBLISHED');

          const { count: enrollmentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'ACTIVE');

          let isEnrolled = false;
          if (user) {
            const { data: enrollment } = await supabase
              .from('enrollments')
              .select('status')
              .eq('course_id', course.id)
              .eq('user_id', user.id)
              .eq('status', 'ACTIVE')
              .maybeSingle();

            isEnrolled = !!enrollment;
          }

          return {
            ...course,
            video_count: videoCount || 0,
            enrollment_count: enrollmentCount || 0,
            is_enrolled: isEnrolled,
          };
        })
      );

      setCourses(coursesWithDetails);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Browse Courses
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Explore interactive video courses and start learning today
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses available</h3>
              <p className="text-slate-500 text-center">
                Check back later for new courses
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {course.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-lg font-bold">
                        <DollarSign className="h-5 w-5 mr-1 text-green-600" />
                        <span>
                          {course.enrollment_fee === 0 ? 'Free' : `$${course.enrollment_fee}`}
                        </span>
                      </div>
                      {course.is_enrolled && (
                        <Badge variant="default">Enrolled</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    {course.is_enrolled ? (
                      <Link href={`/courses/${course.id}`} className="w-full">
                        <Button className="w-full">
                          Continue Learning
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/courses/${course.id}`} className="w-full">
                        <Button className="w-full" variant="outline">
                          View Course
                        </Button>
                      </Link>
                    )}
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
