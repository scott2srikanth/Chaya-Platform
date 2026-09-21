"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
function Guard({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    { user, loading } = useAuth();
  const protectedPage = path === "/studio" || path.startsWith("/studio/");
  useEffect(() => {
    if (protectedPage && !loading && !user)
      router.replace(
        `/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
      );
  }, [protectedPage, loading, user, router]);
  if (protectedPage && (loading || !user))
    return (
      <main style={{ padding: 32 }} role="status">
        Checking your login…
      </main>
    );
  return <>{children}</>;
}
export default function StudioAuthBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Guard>{children}</Guard>
    </AuthProvider>
  );
}
