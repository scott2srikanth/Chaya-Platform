'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, role);
      router.push(role === 'ADMIN' ? '/admin/dashboard' : '/client/videos');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label>Account Type</Label>
        <RadioGroup value={role} onValueChange={(value) => setRole(value as 'ADMIN' | 'USER')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="USER" id="user" />
            <Label htmlFor="user" className="font-normal cursor-pointer">
              User (View videos)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ADMIN" id="admin" />
            <Label htmlFor="admin" className="font-normal cursor-pointer">
              Admin (Create and manage videos)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
