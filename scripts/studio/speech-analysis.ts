import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import path from "node:path";
import type { SpeechPerformance } from "../../lib/studio/performance";
const exec = promisify(execFile);
export function audioEnergy(buffer: Buffer) {
  let rate = 0,
    channels = 0,
    bits = 0,
    format = 0,
    start = 0,
    length = 0;
  for (let p = 12; p + 8 <= buffer.length;) {
    const size = buffer.readUInt32LE(p + 4),
      id = buffer.toString("ascii", p, p + 4);
    if (p + 8 + size > buffer.length) throw new Error("Invalid WAV chunk");
    if (id === "fmt ") {
      format = buffer.readUInt16LE(p + 8);
      channels = buffer.readUInt16LE(p + 10);
      rate = buffer.readUInt32LE(p + 12);
      bits = buffer.readUInt16LE(p + 22);
    }
    if (id === "data") {
      start = p + 8;
      length = size;
    }
    p += 8 + size + (size % 2);
  }
  if (format !== 1 || bits !== 16 || !rate || !channels || !length)
    throw new Error("Speech analysis requires PCM 16-bit WAV");
  const sampleRate = 50,
    step = Math.round(rate / sampleRate),
    frames = length / (2 * channels),
    energy: number[] = [];
  for (let f = 0; f < frames; f += step) {
    let sum = 0,
      count = 0;
    for (let j = f; j < Math.min(frames, f + step); j++) {
      for (let c = 0; c < channels; c++) {
        const v = buffer.readInt16LE(start + (j * channels + c) * 2) / 32768;
        sum += v * v;
        count++;
      }
    }
    energy.push(Math.sqrt(sum / count));
  }
  const peak = Math.max(0.01, ...energy);
  const normalized = energy.map(
    (v) =>
      Math.round(Math.max(0, Math.min(1, (v - 0.008) / (peak * 0.75))) * 1000) /
      1000,
  );
  const beats: number[] = [];
  let last = -2;
  for (let i = 1; i < normalized.length - 1; i++) {
    const t = i / sampleRate;
    if (
      normalized[i] > 0.5 &&
      normalized[i] >= normalized[i - 1] &&
      normalized[i] > normalized[i + 1] &&
      t - last > 1.15
    ) {
      beats.push(t);
      last = t;
    }
  }
  return { energy: normalized, sampleRate, beats };
}
export async function analyzeSpeech(
  wav: string,
  transcript: string,
  buffer: Buffer,
  language: string,
): Promise<SpeechPerformance> {
  const folder =
    process.platform === "darwin"
      ? "macOS"
      : process.platform === "win32"
        ? "Windows"
        : "Linux";
  const native = path.resolve(".studio-tools/rhubarb-build/rhubarb/rhubarb");
  let nativeExists = false;
  try {
    await access(native);
    nativeExists = true;
  } catch {}
  const bin =
    process.env.STUDIO_RHUBARB_PATH ??
    (nativeExists
      ? native
      : path.resolve(
          ".studio-tools",
          `Rhubarb-Lip-Sync-1.14.0-${folder}`,
          "rhubarb" + (process.platform === "win32" ? ".exe" : ""),
        ));
  try {
    await access(bin);
  } catch {
    throw new Error(
      "Lip sync engine is missing. Run npm run studio:setup-lipsync, then generate voices again.",
    );
  }
  const { stdout } = await exec(
    bin,
    [
      "-f",
      "json",
      "--quiet",
      "-r",
      language.startsWith("en") ? "pocketSphinx" : "phonetic",
      "-d",
      transcript,
      wav,
    ],
    { timeout: 120000, maxBuffer: 8 * 1024 * 1024 },
  );
  const result = JSON.parse(stdout);
  if (!Array.isArray(result.mouthCues) || !result.mouthCues.length)
    throw new Error("No mouth timing was produced");
  return {
    source: "rhubarb",
    duration: result.metadata.duration,
    mouthCues: result.mouthCues,
    ...audioEnergy(buffer),
  };
}
