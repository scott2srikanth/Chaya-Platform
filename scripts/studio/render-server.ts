/** Local-only rendering worker. Never included in the deployed Next application. */
import { installedVoices, generateDialogue } from "./voices";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  makeCancelSignal,
} from "@remotion/renderer";
import { parseProject } from "../../lib/studio/project";
const jobs = new Map<
  string,
  {
    state: string;
    progress: number;
    error?: string;
    file?: string;
    cancel: () => void;
  }
>();
let bundlePromise: Promise<string> | undefined;
const root = process.cwd();
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader(
    "Access-Control-Allow-Origin",
    origin ?? "http://localhost:3000",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const send = (code: number, data: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  const id = req.url?.split("/")[2],
    job = id ? jobs.get(id) : undefined;
  try {
    if (req.method === "GET" && req.url === "/voices") {
      send(200, { voices: await installedVoices() });
      return;
    }
    if (req.method === "POST" && req.url === "/narration") {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 150 * 1024 * 1024) throw new Error("Project exceeds 150 MB");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const project = parseProject(body.project);
      send(200, {
        lines: await generateDialogue(project, String(body.sceneId)),
      });
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      send(200, { ready: true });
      return;
    }
    if (req.method === "GET" && job) {
      if (req.url?.endsWith("/file") && job.file) {
        res.writeHead(200, {
          "Content-Type": job.file.endsWith(".mp4")
            ? "video/mp4"
            : "video/webm",
          "Content-Disposition":
            'attachment; filename="explainer.' +
            (job.file.endsWith(".mp4") ? "mp4" : "webm") +
            '"',
        });
        res.end(await readFile(job.file));
      } else
        send(200, {
          state: job.state,
          progress: job.progress,
          error: job.error,
        });
      return;
    }
    if (req.method === "DELETE" && job) {
      job.state = "canceled";
      job.cancel();
      send(200, { state: "canceled" });
      return;
    }
    if (req.method === "POST" && req.url === "/jobs") {
      if (Array.from(jobs.values()).some((j) => j.state === "rendering")) {
        send(409, { error: "A render is already running" });
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 150 * 1024 * 1024)
          throw new Error("Project exceeds 150 MB");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString()),
        project = parseProject(body.project),
        format = body.format === "webm" ? "webm" : "mp4";
      const { cancel, cancelSignal } = makeCancelSignal();
      const id = randomUUID(),
        job = { state: "rendering", progress: 0, cancel } as {
          state: string;
          progress: number;
          error?: string;
          file?: string;
          cancel: () => void;
        };
      jobs.set(id, job);
      send(202, { id });
      (async () => {
        const dir = await mkdtemp(path.join(tmpdir(), "motion-render-"));
        bundlePromise ??= bundle({
          entryPoint: path.join(root, "lib/studio/render/index.tsx"),
          publicDir: path.join(root, "public"),
          webpackOverride: (c) => ({
            ...c,
            resolve: {
              ...c.resolve,
              alias: { ...c.resolve?.alias, "@": root },
            },
          }),
        });
        const serveUrl = await bundlePromise;
        if (job.state === "canceled") return;
        const composition = await selectComposition({
          serveUrl,
          chromiumOptions: { gl: "swangle" },
          id: "MotionExplainer",
          inputProps: { project },
        });
        await renderMedia({
          serveUrl,
          composition,
          inputProps: { project },
          chromiumOptions: { gl: "swangle" },
          codec: format === "mp4" ? "h264" : "vp9",
          outputLocation: path.join(dir, "explainer." + format),
          cancelSignal,
          concurrency: 2,
          scale: body.quality === "draft" ? 0.5 : 1,
          crf: body.quality === "high" ? 16 : 23,
          onProgress: (p) => {
            job.progress = p.progress;
          },
        });
        job.file = path.join(dir, "explainer." + format);
        job.progress = 1;
        job.state = "done";
      })().catch((e) => {
        if (job.state !== "canceled") {
          job.state = "failed";
          job.error = e.message;
          console.error(e);
        }
      });
      return;
    }
    send(404, { error: "Not found" });
  } catch (e: any) {
    send(400, { error: e.message });
  }
});
server.listen(4319, "127.0.0.1", () =>
  console.log("Motion renderer listening on http://127.0.0.1:4319"),
);
