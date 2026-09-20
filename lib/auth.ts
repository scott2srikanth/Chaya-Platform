import { supabase } from './supabase';
import type { Profile } from './supabase';

export async function signUp(email: string, password: string, role: 'ADMIN' | 'USER' = 'USER') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email: data.user.email!,
      role,
    });

  if (profileError) throw profileError;

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === 'ADMIN';
}
