import { currentLocalUser } from "../../../../lib/local-auth-db";
import { STUDIO_COOKIE } from "../../../../lib/studio-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  drawingInstructions,
  drawingJsonSchema,
  generatedBoardCommand,
} from "../../../../lib/studio/whiteboard-ai";
export const dynamic = "force-dynamic";
function local(request: NextRequest) {
  const host = request.nextUrl.hostname;
  const origin = request.headers.get("origin");
  return (
    ["localhost", "127.0.0.1", "[::1]"].includes(host) &&
    (!origin || origin === request.nextUrl.origin)
  );
}
export async function GET(request: NextRequest) {
  if (!(await currentLocalUser(request.cookies.get(STUDIO_COOKIE)?.value)))
    return NextResponse.json(
      { error: "Please sign in to Studio." },
      { status: 401 },
    );
  return NextResponse.json(
    { configured: local(request) && !!process.env.OPENAI_API_KEY },
    { headers: { "Cache-Control": "no-store" } },
  );
}
let running = false;
export async function POST(request: NextRequest) {
  if (!(await currentLocalUser(request.cookies.get(STUDIO_COOKIE)?.value)))
    return NextResponse.json(
      { error: "Please sign in to Studio." },
      { status: 401 },
    );
  if (!local(request))
    return NextResponse.json(
      { error: "AI drawing is available only in the local Studio." },
      { status: 403 },
    );
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      {
        error:
          "AI drawing is not connected. Set OPENAI_API_KEY in .env.local and restart Studio, or use “Draw with ChatGPT JSON” below.",
      },
      { status: 503 },
    );
  if (running)
    return NextResponse.json(
      { error: "A drawing is already being generated. Try again shortly." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 180000)
      return NextResponse.json(
        { error: "Board data is too large. Start a fresh board." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (
      typeof body.command !== "string" ||
      !body.command.trim() ||
      body.command.length > 500 ||
      !Array.isArray(body.strokes) ||
      body.strokes.length > 3600
    )
      return NextResponse.json(
        { error: "Invalid drawing request." },
        { status: 400 },
      );
    running = true;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: process.env.STUDIO_DRAWING_MODEL || "gpt-4o",
        store: false,
        instructions: drawingInstructions,
        input: JSON.stringify({
          request: body.command,
          existingStrokes: body.strokes,
        }),
        max_output_tokens: 12000,
        text: {
          format: {
            type: "json_schema",
            name: "whiteboard_drawing",
            strict: true,
            schema: drawingJsonSchema,
          },
        },
      }),
    });
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "AI service is busy or its quota is exhausted. Try again later."
              : "AI drawing failed. Check the server API key and model configuration.",
        },
        { status: 502 },
      );
    const result = await response.json();
    if (result.status !== "completed")
      return NextResponse.json(
        {
          error:
            "The drawing could not be completed. Try a simpler description.",
        },
        { status: 422 },
      );
    const output = result.output?.flatMap(
      (item: { content?: { type: string; text?: string }[] }) =>
        item.content ?? [],
    );
    const text = output
      ?.filter((item: { type: string }) => item.type === "output_text")
      .map((item: { text: string }) => item.text)
      .join("");
    if (!text)
      return NextResponse.json(
        {
          error:
            "The AI could not provide this drawing. Try a different description.",
        },
        { status: 422 },
      );
    const data = JSON.parse(text);
    generatedBoardCommand(body.command, data, 0);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "Drawing timed out. Try again with a simpler description."
            : "Drawing response was invalid. Please try again.",
      },
      { status: 422 },
    );
  } finally {
    running = false;
  }
}
