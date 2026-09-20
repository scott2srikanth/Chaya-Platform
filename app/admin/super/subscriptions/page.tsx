'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Subscription } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CreditCard, ArrowLeft, Search, Crown } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type PlanFilter = 'all' | 'FREE' | 'PRO' | 'ELITE';

type SubscriptionWithUser = Subscription & {
  profiles: { email: string } | null;
};

export default function SuperAdminSubscriptionsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PlanFilter>('all');

  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile) {
      router.push('/login');
      return;
    }

    if (profile.role !== 'SUPER_ADMIN') {
      router.push('/admin/dashboard');
      return;
    }

    fetchSubscriptions();
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    let filtered = subscriptions;

    if (filter !== 'all') {
      filtered = filtered.filter(sub => sub.plan === filter);
    }

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubscriptions(filtered);
  }, [subscriptions, filter, searchTerm]);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });

      setSubscriptions(data as SubscriptionWithUser[] || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const stats = {
    total: subscriptions.length,
    free: subscriptions.filter(s => s.plan === 'FREE').length,
    pro: subscriptions.filter(s => s.plan === 'PRO').length,
    elite: subscriptions.filter(s => s.plan === 'ELITE').length,
    activePaid: subscriptions.filter(s => s.status === 'ACTIVE' && (s.plan === 'PRO' || s.plan === 'ELITE')).length,
  };

  const getPlanBadgeStyle = (plan: string) => {
    if (plan === 'ELITE') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0';
    if (plan === 'PRO') return '';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Subscription Management
              </h1>
            </div>
            <Badge variant="destructive" className="text-sm">
              SUPER ADMIN
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.total}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.free}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Free Plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {stats.pro}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pro Plans</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-2xl font-bold text-amber-600">
                  {stats.elite}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Elite Plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.activePaid}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Paid</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              All Subscriptions
            </CardTitle>
            <CardDescription>
              View and manage user subscriptions
            </CardDescription>
            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'FREE', 'PRO', 'ELITE'] as PlanFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => setFilter(f)}
                    size="sm"
                    className={filter === f && f === 'ELITE' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600' : ''}
                  >
                    {f === 'all' ? 'All' : f}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Current Period End</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.profiles?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sub.plan === 'PRO' ? 'default' : sub.plan === 'ELITE' ? 'default' : 'secondary'}
                        className={getPlanBadgeStyle(sub.plan)}
                      >
                        {sub.plan === 'ELITE' && <Crown className="w-3 h-3 mr-1 inline-block" />}
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'ACTIVE'
                            ? 'default'
                            : sub.status === 'CANCELED'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.plan === 'ELITE' ? (sub.enrollment_count || 0) : '--'}
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
