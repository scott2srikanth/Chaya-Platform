'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Payment } from '@/lib/supabase';
import { PLANS } from '@/lib/stripe';
import type { PlanKey } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, ExternalLink, Loader2, ArrowLeft, Crown, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const router = useRouter();
  const { user, profile, subscription, loading: authLoading, refreshSubscription } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login?redirect=/billing');
      return;
    }

    fetchPayments();
  }, [user, authLoading, router]);

  const fetchPayments = async () => {
    try {
      const supabase = (await import('@/lib/supabase')).supabase;

      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      setPayments(data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async (action: string) => {
    setActionLoading(true);

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (action === 'portal' && data.url) {
        window.location.href = data.url;
      } else {
        await refreshSubscription();
        alert(data.message || 'Subscription updated');
      }
    } catch (error) {
      console.error('Manage subscription error:', error);
      alert('Failed to manage subscription. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const currentPlanKey = (subscription?.plan || 'FREE') as PlanKey;
  const currentPlan = PLANS[currentPlanKey] || PLANS.FREE;
  const isPaid = currentPlanKey === 'PRO' || currentPlanKey === 'ELITE';
  const isElite = currentPlanKey === 'ELITE';
  const isActive = subscription?.status === 'ACTIVE';
  const enrollmentCount = (subscription as any)?.enrollment_count || 0;

  const getPlanBadgeStyle = () => {
    if (isElite) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0';
    if (currentPlanKey === 'PRO') return 'bg-blue-600 text-white border-0';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/client/videos'}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Billing & Subscription
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Manage your subscription and billing</CardDescription>
                </div>
                <Badge className={`text-lg px-4 py-1 ${getPlanBadgeStyle()}`}>
                  {isElite && <Crown className="w-4 h-4 mr-1.5 inline-block" />}
                  {currentPlanKey === 'PRO' && <Sparkles className="w-4 h-4 mr-1.5 inline-block" />}
                  {currentPlan.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`grid gap-4 ${isElite ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Plan Status</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {subscription?.status || 'ACTIVE'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Monthly Price</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    ${currentPlan.price}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Video Limit</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {currentPlan.videoLimit === Infinity ? 'Unlimited' : `${currentPlan.videoLimit} videos`}
                  </p>
                </div>
                {isElite && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active Enrollments</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {enrollmentCount}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ${(enrollmentCount * 4).toFixed(0)} enrollment fees
                    </p>
                  </div>
                )}
              </div>

              {subscription?.current_period_end && isPaid && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {subscription.status === 'ACTIVE' ? 'Next billing date:' : 'Expires on:'}
                    <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </p>
                  {isElite && isActive && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Estimated next bill: ${currentPlan.price + enrollmentCount * 4}/month
                      (base ${currentPlan.price} + {enrollmentCount} enrollments x $4)
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {!isPaid ? (
                  <Link href="/pricing">
                    <Button>
                      <CreditCard className="w-4 h-4 mr-2" />
                      View Plans
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleManageSubscription('portal')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Manage Payment Method
                        </>
                      )}
                    </Button>
                    {subscription?.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        onClick={() => handleManageSubscription('cancel')}
                        disabled={actionLoading}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                    {currentPlanKey === 'PRO' && isActive && (
                      <Link href="/pricing">
                        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to Elite
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Plan Features</h3>
                <ul className="space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Elite Upsell for Pro Users */}
          {currentPlanKey === 'PRO' && isActive && (
            <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Ready to teach?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Upgrade to Elite to create courses, manage student enrollments, and accept payments
                    through UPI QR codes. Just $10 more per month.
                  </p>
                </div>
                <Link href="/pricing" className="shrink-0">
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                    Upgrade to Elite
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View your past transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                  No payment history yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === 'SUCCESS'
                                ? 'default'
                                : payment.status === 'FAILED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(payment.metadata as any)?.plan || '--'}
                        </TableCell>
                        <TableCell className="capitalize">{payment.provider}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
