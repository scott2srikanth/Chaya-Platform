import { compileLessonScene } from "../../../../lib/studio/presenter-lesson";
import { currentLocalUser } from "../../../../lib/local-auth-db";
import { STUDIO_COOKIE } from "../../../../lib/studio-auth";
import { livePresenterProject } from "../../../../lib/studio/templates";
import { NextRequest, NextResponse } from "next/server";
import { networkInterfaces } from "node:os";
import { liveStore } from "../../../../lib/studio/shared-live-session";
import { accountRateLimit } from "../../../../lib/local-auth-db";
function localHosts(req: NextRequest, shared: boolean) {
  return Object.values(shared ? {} : networkInterfaces())
    .flat()
    .filter(
      (i) =>
        i &&
        !i.internal &&
        i.family === "IPv4" &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(i.address),
    )
    .map(
      (i) =>
        `${req.nextUrl.protocol}//${i!.address}:${req.nextUrl.port || "3000"}`,
    );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value)))
    return NextResponse.json(
      { error: "Please sign in to Studio." },
      { status: 401 },
    );
  const origin = req.headers.get("origin");
  if (origin) {
    let allowed = false;
    try {
      allowed =
        new URL(origin).host === (req.headers.get("host") ?? req.nextUrl.host);
    } catch {}
    if (!allowed)
      return NextResponse.json(
        { error: "Use this Studio’s controller page." },
        { status: 403 },
      );
  }
  try {
    const text = await req.text();
    if (text.length > 2000000)
      return NextResponse.json(
        { error: "Recording too large." },
        { status: 413 },
      );
    const body = JSON.parse(text);
    const store = await liveStore();
    if (body.action === "create") {
      await accountRateLimit(
        `room-create:${(await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value))!.id}`,
        50,
        60 * 60000,
      );
      const session = await store.create(body.events ?? []);
      const hosts = localHosts(req, store.shared);
      return NextResponse.json({ ...session, hosts });
    }
    if (body.action === "join") {
      await accountRateLimit(
        `room-join:${(await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value))!.id}`,
        20,
        60000,
      );
      if (typeof body.code !== "string")
        throw new Error("Enter the session code.");
      return NextResponse.json(await store.join(body.code));
    }
    if (
      typeof body.id !== "string" ||
      typeof body.requestId !== "string" ||
      body.requestId.length > 100
    )
      throw new Error("Invalid command request.");
    if (body.action === "recording") {
      const session = await store.get(body.id);
      if (session.token !== req.headers.get("x-presenter-token"))
        return NextResponse.json(
          { error: "Controller access denied." },
          { status: 403 },
        );
      const project = livePresenterProject();
      project.scenes[0].duration = Math.max(1, session.state.end);
      project.scenes[0].elements[0].endTime = project.scenes[0].duration;
      project.scenes[0].elements[0].whiteboard = {
        liveMode: true,
        liveCommands: session.state.events,
      };
      if (session.state.lesson) {
        const base = project.scenes[0];
        project.metadata.name = session.state.lesson.title;
        project.scenes = session.state.lesson.scenes.map((scene, index) => {
          const events = compileLessonScene(scene),
            last = events[events.length - 1];
          const duration = last.start + last.duration + 2;
          return {
            ...structuredClone(base),
            id: `lesson-${scene.id}`,
            name: scene.title,
            duration,
            elements: base.elements.map((el, i) => ({
              ...el,
              id: `lesson-${index}-${i}`,
              endTime: duration,
              whiteboard: { liveMode: true, liveCommands: events },
            })),
          };
        });
      }
      return NextResponse.json({ project });
    }
    return NextResponse.json({
      state: await store.command(
        body.id,
        req.headers.get("x-presenter-token") ?? "",
        body,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update presenter.",
      },
      { status: 400 },
    );
  }
}
export async function GET(req: NextRequest) {
  if (!(await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value)))
    return NextResponse.json(
      { error: "Please sign in to Studio." },
      { status: 401 },
    );
  try {
    const store = await liveStore();
    if (req.nextUrl.searchParams.get("connection") === "1") {
      const hosts = localHosts(req, store.shared);
      return NextResponse.json(
        { shared: store.shared, hosts, serverTime: Date.now() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const s = await store.get(req.nextUrl.searchParams.get("session") ?? "");
    if (req.nextUrl.searchParams.get("stream") !== "1")
      return NextResponse.json(
        { state: s.state, serverTime: Date.now() },
        { headers: { "Cache-Control": "no-store" } },
      );
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let stopped = false,
          revision = s.state.revision,
          busy = false;
        const send = (state: typeof s.state) => {
          if (!stopped)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ state, serverTime: Date.now() })}\n\n`,
              ),
            );
        };
        const close = () => {
          if (stopped) return;
          cleanup();
          try {
            controller.close();
          } catch {}
        };
        send(s.state);
        if (!store.shared) s.listeners.add(send);
        // D1 is shared across isolates; never rely on per-Worker listeners in production.
        const poll = store.shared
          ? setInterval(async () => {
              if (stopped || busy) return;
              busy = true;
              try {
                const latest = await store.get(s.state.id);
                if (latest.state.revision !== revision) {
                  revision = latest.state.revision;
                  send(latest.state);
                }
              } catch {
                close();
              } finally {
                busy = false;
              }
            }, 500)
          : undefined;
        const heartbeat = setInterval(async () => {
          try {
            if (
              !(await currentLocalUser(req.cookies.get(STUDIO_COOKIE)?.value))
            ) {
              close();
              return;
            }
            if (!stopped) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            close();
          }
        }, 15000);
        // Bound request lifetime; EventSource reconnects and resumes from shared state.
        const lifetime = setTimeout(close, 60000);
        cleanup = () => {
          stopped = true;
          clearInterval(poll);
          clearInterval(heartbeat);
          clearTimeout(lifetime);
          s.listeners.delete(send);
          req.signal.removeEventListener("abort", close);
        };
        req.signal.addEventListener("abort", close, { once: true });
        if (req.signal.aborted) close();
      },
      cancel() {
        cleanup();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session unavailable" },
      { status: 404 },
    );
  }
}
