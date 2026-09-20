import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video, Sparkles, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              Onboard Doc - Interactive Video Platform
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Onboard Doc - Create Interactive Video Experiences
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Transform your educational videos with AI-powered interactive hotspots.
            Engage learners with clickable overlays, quizzes, and contextual information.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/courses">
              <Button size="lg" className="text-lg px-8">
                Browse Courses
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Pricing
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              AI-Powered Hotspots
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Generate interactive hotspots automatically from video transcripts using advanced AI.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Role-Based Access
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Separate admin and user experiences with secure authentication and permissions.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Production Ready
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Built with modern technology stack for scalability and performance.
            </p>
          </div>
        </div>

        <div className="mt-20 bg-blue-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Videos?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join educators and content creators using interactive video to enhance learning.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-600 dark:text-slate-400">
          <p>Interactive Video Platform - Built with Next.js, Supabase, and AI</p>
        </div>
      </footer>
    </div>
  );
}
