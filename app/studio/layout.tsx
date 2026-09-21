import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentLocalUser } from "@/lib/local-auth-db";
import { STUDIO_COOKIE } from "@/lib/studio-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentLocalUser(cookies().get(STUDIO_COOKIE)?.value)))
    redirect("/login?next=%2Fstudio");
  return <>{children}</>;
}
