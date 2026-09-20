'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchUsers();
  }, [user, profile, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
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
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                User Management
              </h1>
            </div>
            <Badge variant="destructive" className="text-sm">
              SUPER ADMIN
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users
              </CardTitle>
              <CardDescription>
                Manage user roles and access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.role === 'SUPER_ADMIN'
                              ? 'destructive'
                              : u.role === 'ADMIN'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {u.id !== user?.id && (
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.id, value)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {u.id === user?.id && (
                          <span className="text-sm text-slate-500">(You)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
