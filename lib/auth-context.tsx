"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, signOut as logout, type LocalUser } from "./auth";
import type { Profile, Subscription } from "./supabase";
interface AuthContextType {
  user: LocalUser | null;
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
  const [user, setUser] = useState<LocalUser | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getCurrentUser();
        if (active) setUser(next);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const listener = () => {
      void refresh();
    };
    window.addEventListener("chaya-auth-change", listener);
    window.addEventListener("focus", listener);
    const interval = setInterval(listener, 60000);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("chaya-auth-change", listener);
      window.removeEventListener("focus", listener);
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user ? { ...user, role: "USER" } : null,
        subscription: null,
        loading,
        signOut: async () => {
          await logout();
          setUser(null);
        },
        refreshSubscription: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
