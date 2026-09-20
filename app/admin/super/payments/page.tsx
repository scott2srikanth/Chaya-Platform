'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Payment } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type PaymentWithUser = Payment & {
  profiles: { email: string } | null;
};

export default function SuperAdminPaymentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'FAILED' | 'PENDING'>('all');

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

    fetchPayments();
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  }, [payments, statusFilter, searchTerm]);

  const fetchPayments = async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });

      setPayments(data as PaymentWithUser[] || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
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
    total: payments.length,
    success: payments.filter(p => p.status === 'SUCCESS').length,
    failed: payments.filter(p => p.status === 'FAILED').length,
    revenue: payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0) / 100,
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
                Payment Transactions
              </h1>
            </div>
            <Badge variant="destructive" className="text-sm">
              SUPER ADMIN
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.total}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.success}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Successful</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                ${stats.revenue.toFixed(2)}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              All Transactions
            </CardTitle>
            <CardDescription>
              View payment history and audit trail
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
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'SUCCESS' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('SUCCESS')}
                  size="sm"
                >
                  Success
                </Button>
                <Button
                  variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('FAILED')}
                  size="sm"
                >
                  Failed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.profiles?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
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
                    <TableCell className="capitalize">{payment.provider}</TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString()} {new Date(payment.created_at).toLocaleTimeString()}
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
