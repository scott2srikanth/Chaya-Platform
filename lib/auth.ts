import type { Profile } from "./supabase";
export type LocalUser = { id: string; email: string; created_at: string };
async function account(action: string, email: string, password: string) {
  const response = await fetch("/api/auth/studio-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to sign in");
  window.dispatchEvent(new Event("chaya-auth-change"));
  return data;
}
export async function signUp(
  email: string,
  password: string,
  _role?: "ADMIN" | "USER",
) {
  return account("signup", email, password);
}
export async function signIn(email: string, password: string) {
  return account("login", email, password);
}
export async function signOut() {
  const response = await fetch("/api/auth/studio-session", {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to sign out");
  window.dispatchEvent(new Event("chaya-auth-change"));
}
export async function getCurrentUser(): Promise<LocalUser | null> {
  const response = await fetch("/api/auth/studio-session", {
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to load account");
  return (await response.json()).user;
}
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const user = await getCurrentUser();
  return user?.id === userId ? { ...user, role: "USER" } : null;
}
export async function isAdmin(_userId: string) {
  return false;
}
