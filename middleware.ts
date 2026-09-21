import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STUDIO_COOKIE } from "./lib/studio-auth";
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(STUDIO_COOKIE)?.value;
  let authenticated = false;
  if (token) {
    try {
      const endpoint = new URL("/api/auth/studio-session", request.url);
      const result = await fetch(endpoint, {
        headers: { cookie: `${STUDIO_COOKIE}=${encodeURIComponent(token)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      authenticated = result.ok;
    } catch {}
  }
  if (authenticated) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (request.nextUrl.pathname.startsWith("/api/"))
    return NextResponse.json(
      { error: "Please sign in to access Motion Explainer Studio." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const login = new URL("/login", request.url);
  login.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  const response = NextResponse.redirect(login);
  response.cookies.delete(STUDIO_COOKIE);
  return response;
}
export const config = { matcher: ["/studio/:path*", "/api/studio/:path*"] };
