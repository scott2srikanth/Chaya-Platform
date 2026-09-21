import { getRemotionEnvironment, staticFile } from "remotion";
import type { StudioAsset } from "./types";
export const riveValue = (object: any, key: string): any =>
  typeof object[key] === "function" ? object[key]() : object[key];
let runtimePromise: Promise<any> | undefined;
export function riveRuntime() {
  return (runtimePromise ??= import("@rive-app/canvas-advanced").then((m) =>
    m.default({
      locateFile: () =>
        getRemotionEnvironment().isRendering
          ? staticFile("studio/rive.wasm")
          : "/studio/rive.wasm",
    }),
  ));
}
const files = new Map<string, Promise<any>>();
export function riveFile(asset: StudioAsset) {
  if (!files.has(asset.dataUrl))
    files.set(
      asset.dataUrl,
      riveRuntime().then(async (r) =>
        r.load(
          new Uint8Array(await (await fetch(asset.dataUrl)).arrayBuffer()),
          undefined,
          false,
        ),
      ),
    );
  return files.get(asset.dataUrl)!;
}
function dataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Cannot read file"));
    r.readAsDataURL(file);
  });
}
export function validateLottie(value: any) {
  if (
    !value ||
    !Number.isFinite(value.fr) ||
    value.fr <= 0 ||
    !Number.isFinite(value.ip) ||
    !Number.isFinite(value.op) ||
    value.op <= value.ip ||
    !Array.isArray(value.layers)
  )
    throw new Error(
      "Invalid Lottie: frame rate, frame range and layers are required",
    );
  if (
    (value.assets ?? []).some(
      (a: any) => a.p && !String(a.p).startsWith("data:"),
    )
  )
    throw new Error(
      "Lottie images must be embedded. Export with embedded assets.",
    );
  return value;
}
export function validateSprite(columns: number, rows: number, fps: number) {
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    rows < 1 ||
    columns * rows > 4096 ||
    !Number.isFinite(fps) ||
    fps <= 0 ||
    fps > 120
  )
    throw new Error("Sprite grid requires positive rows/columns and 1–120 FPS");
}
export async function importAsset(file: File): Promise<StudioAsset> {
  if (file.size > 100 * 1024 * 1024)
    throw new Error("Choose a file smaller than 100 MB");
  const ext = file.name.split(".").pop()?.toLowerCase();
  let type: StudioAsset["type"];
  if (ext === "riv") type = "rive";
  else if (ext === "json") type = "lottie";
  else if (ext === "svg") type = "svg";
  else if (["png", "jpg", "jpeg", "webp"].includes(ext ?? "")) type = "image";
  else if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext ?? ""))
    type = "audio";
  else
    throw new Error(
      "Supported: SVG, PNG, JPG, WebP, Lottie JSON, Rive, MP3, WAV, OGG, M4A",
    );
  const asset: StudioAsset = {
    id: crypto.randomUUID(),
    name: file.name,
    type,
    dataUrl: await dataURL(file),
    width: 240,
    height: 400,
  };
  if (type === "svg") {
    const text = await file.text(),
      doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (
      doc.querySelector("parsererror") ||
      doc.documentElement.localName !== "svg"
    )
      throw new Error("Invalid SVG document");
    if (
      doc.querySelector("script,foreignObject,iframe") ||
      Array.from(doc.querySelectorAll("*")).some((e) =>
        Array.from(e.attributes).some(
          (a) =>
            /^on/i.test(a.name) ||
            (/href$/i.test(a.name) &&
              !a.value.startsWith("#") &&
              !a.value.startsWith("data:")),
        ),
      )
    )
      throw new Error(
        "SVG must be self-contained with no scripts or external references",
      );
  }
  if (type === "image" || type === "svg")
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        asset.width = img.naturalWidth || 240;
        asset.height = img.naturalHeight || 240;
        resolve();
      };
      img.onerror = () => reject(new Error("Image could not be decoded"));
      img.src = asset.dataUrl;
    });
  if (type === "lottie") {
    const value = validateLottie(JSON.parse(await file.text()));
    asset.lottie = value;
    asset.width = value.w || 240;
    asset.height = value.h || 400;
    asset.duration = (value.op - value.ip) / value.fr;
  }
  if (type === "audio") {
    const ctx = new AudioContext();
    try {
      const audio = await ctx.decodeAudioData(await file.arrayBuffer());
      asset.duration = audio.duration;
      const channel = audio.getChannelData(0);
      asset.waveform = Array.from({ length: 160 }, (_, i) => {
        const start = Math.floor((i * channel.length) / 160),
          end = Math.floor(((i + 1) * channel.length) / 160);
        let peak = 0;
        for (
          let j = start;
          j < end;
          j += Math.max(1, Math.floor((end - start) / 100))
        )
          peak = Math.max(peak, Math.abs(channel[j]));
        return peak;
      });
    } finally {
      await ctx.close();
    }
  }
  if (type === "rive") {
    const r = await riveRuntime(),
      f = await riveFile(asset),
      art = f.defaultArtboard();
    if (!art) throw new Error("Rive contains no artboard");
    try {
      asset.width = art.bounds.maxX - art.bounds.minX;
      asset.height = art.bounds.maxY - art.bounds.minY;
      const animations = Array.from({ length: art.animationCount() }, (_, i) =>
        String(riveValue(art.animationByIndex(i), "name")),
      ) as string[];
      const stateMachines = Array.from(
        { length: art.stateMachineCount() },
        (_, i) => {
          const sm = new r.StateMachineInstance(
            art.stateMachineByIndex(i),
            art,
          );
          try {
            return {
              name: String(riveValue(art.stateMachineByIndex(i), "name")),
              inputs: Array.from({ length: sm.inputCount() }, (_, j) => {
                const v = sm.input(j);
                return {
                  name: String(riveValue(v, "name")),
                  type:
                    riveValue(v, "type") === r.SMIInput.bool
                      ? "boolean"
                      : riveValue(v, "type") === r.SMIInput.number
                        ? "number"
                        : "trigger",
                };
              }),
            };
          } finally {
            sm.delete();
          }
        },
      );
      asset.rive = { animations, stateMachines };
    } finally {
      art.delete();
    }
  }
  return asset;
}
