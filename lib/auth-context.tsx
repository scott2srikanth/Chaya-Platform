'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Subscription } from './supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  subscription: null,
  loading: true,
  signOut: async () => {},
  refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    setProfile(profileData);
    setSubscription(subscriptionData);
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      }

      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setSubscription(null);
        }
      })();
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSubscription(null);
  };

  const refreshSubscription = async () => {
    if (user) {
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setSubscription(subscriptionData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, subscription, loading, signOut: handleSignOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
