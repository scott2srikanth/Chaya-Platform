'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PLANS } from '@/lib/stripe';
import type { PlanKey } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Crown, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const router = useRouter();
  const { user, subscription, loading: authLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleUpgrade = async (plan: PlanKey) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoadingPlan(plan);

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlan = (subscription?.plan || 'FREE') as PlanKey;
  const isActive = subscription?.status === 'ACTIVE';

  const planOrder: Record<PlanKey, number> = { FREE: 0, PRO: 1, ELITE: 2 };
  const isCurrentOrHigher = (plan: PlanKey) =>
    isActive && planOrder[currentPlan] >= planOrder[plan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900 dark:text-white">
            Onboard Doc
          </Link>
          <div className="flex gap-2">
            {user ? (
              <Link href={currentPlan !== 'FREE' ? '/admin/dashboard' : '/client/videos'}>
                <Button variant="outline">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start free, upgrade when you need more power
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* FREE Plan */}
          <Card className={`relative transition-all duration-300 hover:shadow-lg ${
            currentPlan === 'FREE' && isActive
              ? 'border-slate-400 dark:border-slate-500 border-2 shadow-md'
              : 'border-slate-200 dark:border-slate-700'
          }`}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle className="text-2xl">{PLANS.FREE.name}</CardTitle>
              </div>
              <CardDescription>Perfect for trying out the platform</CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">
                  ${PLANS.FREE.price}
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                {PLANS.FREE.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === 'FREE' && isActive ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Link href="/billing" className="w-full">
                  <Button variant="outline" className="w-full">
                    Manage Subscription
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>

          {/* PRO Plan */}
          <Card className={`relative transition-all duration-300 hover:shadow-xl ${
            currentPlan === 'PRO' && isActive
              ? 'border-blue-500 border-2 shadow-lg shadow-blue-500/10'
              : 'border-blue-200 dark:border-blue-800 shadow-md'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold shadow-sm">
                Most Popular
              </span>
            </div>
            <CardHeader className="pb-4 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">{PLANS.PRO.name}</CardTitle>
              </div>
              <CardDescription>For serious content creators</CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">
                  ${PLANS.PRO.price}
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                {PLANS.PRO.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentOrHigher('PRO') ? (
                <Button className="w-full" disabled>
                  {currentPlan === 'PRO' ? 'Current Plan' : 'Included in Elite'}
                </Button>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleUpgrade('PRO')}
                  disabled={loadingPlan !== null || authLoading}
                >
                  {loadingPlan === 'PRO' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade to Pro'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* ELITE Plan */}
          <Card className={`relative transition-all duration-300 hover:shadow-xl ${
            currentPlan === 'ELITE' && isActive
              ? 'border-amber-500 border-2 shadow-lg shadow-amber-500/10'
              : 'border-amber-200 dark:border-amber-800/50'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-semibold shadow-sm">
                For Teachers
              </span>
            </div>
            <CardHeader className="pb-4 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-2xl">{PLANS.ELITE.name}</CardTitle>
              </div>
              <CardDescription>Create and monetize courses</CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">
                  ${PLANS.ELITE.price}
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">/month</span>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  + $4 per student enrollment
                </p>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                {PLANS.ELITE.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === 'ELITE' && isActive ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                  onClick={() => handleUpgrade('ELITE')}
                  disabled={loadingPlan !== null || authLoading}
                >
                  {loadingPlan === 'ELITE' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade to Elite'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                Can I upgrade or downgrade at any time?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Yes, you can upgrade from Free to Pro or Elite, or from Pro to Elite at any time.
                When you cancel, you&apos;ll continue to have access until the end of your billing period.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                What happens to my videos if I downgrade?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your existing videos will remain accessible, but you won&apos;t be able to upload new videos
                if you exceed the Free plan&apos;s limit of 2 videos.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                What happens to my courses if I downgrade from Elite?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your existing courses and enrollments will remain intact, but you won&apos;t be able to
                create new courses or accept new paid enrollments until you re-subscribe to Elite.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                How does the $4 per enrollment fee work?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                For Elite members, we charge a $4 platform fee for each student enrollment in your paid
                courses. Free course enrollments are not charged. This is tracked and added to your
                monthly billing automatically.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We offer a 30-day money-back guarantee. If you&apos;re not satisfied with your plan,
                contact our support team for a full refund.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
