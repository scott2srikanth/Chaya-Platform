import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { dialogueSignature, voiceSettings } from "../../lib/studio/dialogue";
import type { Project } from "../../lib/studio/types";
import { analyzeSpeech } from "./speech-analysis";
const exec = promisify(execFile);
export async function installedVoices() {
  if (process.platform !== "darwin")
    throw new Error(
      "Local speech generation currently requires macOS. Imported audio works on all platforms.",
    );
  const { stdout } = await exec("/usr/bin/say", ["-v", "?"]);
  return Array.from(
    new Map(
      stdout.split("\n").flatMap((line) => {
        const m = line.match(/^(.*?)\s+([a-z]{2}_[A-Za-z0-9_]+)\s+#/);
        return m
          ? [[m[1].trim(), { name: m[1].trim(), language: m[2] }] as const]
          : [];
      }),
    ).values(),
  );
}
export function resolveVoiceName(name: string, voices: { name: string }[]) {
  const exact = voices.find((v) => v.name === name);
  if (exact) return exact.name;
  const matches = voices.filter(
    (v) => v.name.startsWith(name + " (") || name.startsWith(v.name + " ("),
  );
  if (matches.length === 1) return matches[0].name;
  throw new Error("Voice is not installed or is ambiguous: " + name);
}
export function wavDuration(b: Buffer) {
  if (b.toString("ascii", 0, 4) !== "RIFF")
    throw new Error("Speech did not produce WAV audio");
  let rate = 0,
    size = 0;
  for (let pos = 12; pos + 8 <= b.length;) {
    const id = b.toString("ascii", pos, pos + 4),
      len = b.readUInt32LE(pos + 4);
    if (id === "fmt ") rate = b.readUInt32LE(pos + 16);
    if (id === "data") size = len;
    pos += 8 + len + (len % 2);
  }
  if (!rate || !size) throw new Error("Generated speech is empty");
  return size / rate;
}
let busy = false;
export async function generateDialogue(project: Project, sceneId: string) {
  if (busy) throw new Error("Speech generation is already running");
  busy = true;
  let dir = "";
  try {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new Error("Scene not found");
    if (
      scene.script.length > 100 ||
      scene.script.reduce((n, l) => n + l.text.length, 0) > 50000
    )
      throw new Error(
        "Generate at most 100 lines / 50,000 characters per scene",
      );
    const voices = await installedVoices();
    dir = await mkdtemp(path.join(tmpdir(), "studio-speech-"));
    const results = [];
    for (const line of scene.script) {
      if (!line.text.trim()) continue;
      if (line.text.length > 5000)
        throw new Error("Each dialogue line must be under 5000 characters");
      const speaker = scene.elements.find(
        (e) => e.id === line.characterElementId,
      );
      if (!speaker) throw new Error("Choose a speaker for every line");
      const voice = voiceSettings(speaker);
      const installedName = resolveVoiceName(voice.name, voices);
      if (!Number.isFinite(voice.rate) || voice.rate < 80 || voice.rate > 300)
        throw new Error("Voice speed must be 80–300 words per minute");
      const input = path.join(dir, "line.txt"),
        output = path.join(dir, "line.wav");
      await writeFile(input, line.text);
      await exec(
        "/usr/bin/say",
        [
          "-v",
          installedName,
          "-r",
          String(voice.rate),
          "-f",
          input,
          "-o",
          output,
          "--file-format=WAVE",
          "--data-format=LEI16@22050",
        ],
        { timeout: 120000 },
      );
      const buffer = await readFile(output),
        duration = wavDuration(buffer);
      const performance = await analyzeSpeech(
        output,
        input,
        buffer,
        voices.find((v) => v.name === installedName)?.language ?? "en_US",
      );
      results.push({
        performance,
        lineId: line.id,
        signature: dialogueSignature(line, speaker),
        duration,
        dataUrl: "data:audio/wav;base64," + buffer.toString("base64"),
      });
    }
    return results;
  } finally {
    busy = false;
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}
