import { NextRequest, NextResponse } from "next/server";
import { STUDIO_COOKIE } from "../../../../lib/studio-auth";
import {
  currentLocalUser,
  registerLocalUser,
  loginLocalUser,
  createLocalSession,
  revokeLocalSession,
} from "../../../../lib/local-auth-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function sameOrigin(req: NextRequest) {
  try {
    return (
      !req.headers.get("origin") ||
      new URL(req.headers.get("origin")!).host ===
        (req.headers.get("host") ?? req.nextUrl.host)
    );
  } catch {
    return false;
  }
}
export async function GET(req: NextRequest) {
  const user = await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value);
  return NextResponse.json(
    { user },
    { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 4096)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.action !== "signup" && body.action !== "login")
      return NextResponse.json(
        { error: "Invalid account action" },
        { status: 400 },
      );
    const user =
      body.action === "signup"
        ? await registerLocalUser(
            body.email,
            body.password,
            req.headers.get("cf-connecting-ip") ?? req.ip ?? "local",
          )
        : await loginLocalUser(body.email, body.password);
    await revokeLocalSession(req.cookies.get(STUDIO_COOKIE)?.value);
    const token = await createLocalSession(user.id);
    const response = NextResponse.json(
      { user },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(STUDIO_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 7 * 86400,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in";
    return NextResponse.json(
      {
        error:
          message.includes("password") ||
          message.includes("email") ||
          message.includes("attempts")
            ? message
            : "Unable to create or access the local account.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await revokeLocalSession(req.cookies.get(STUDIO_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(STUDIO_COOKIE);
  return response;
}
