import type { ScriptLine, SceneElement } from "./types";
import { dialogueSignature } from "./dialogue";
export type MouthShape = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";
export interface SpeechPerformance {
  source: "rhubarb";
  duration: number;
  mouthCues: { start: number; end: number; value: MouthShape }[];
  energy: number[];
  sampleRate: number;
  beats: number[];
}
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
export const MOUTH_SHAPES: Record<
  MouthShape,
  { open: number; width: number; round: number }
> = {
  X: { open: 0, width: 1, round: 0 },
  A: { open: 0, width: 1, round: 0 },
  B: { open: 0.13, width: 1.15, round: 0 },
  C: { open: 0.45, width: 1.2, round: 0 },
  D: { open: 0.9, width: 1, round: 0 },
  E: { open: 0.5, width: 0.72, round: 0.65 },
  F: { open: 0.24, width: 0.58, round: 1 },
  G: { open: 0.09, width: 1, round: 0 },
  H: { open: 0.25, width: 1.1, round: 0 },
};
export function speechPose(
  line: ScriptLine | undefined,
  actor: SceneElement,
  time: number,
) {
  const p = line?.performance;
  const valid = !!p && line?.audioSignature === dialogueSignature(line, actor);
  const idle = {
    open: 0,
    width: 1,
    round: 0,
    energy: 0,
    beat: 0,
    side: 1,
    gesture: 0,
  };
  if (!valid || !p || time < 0 || time >= p.duration) return idle;
  const idx = p.mouthCues.findIndex((c) => time >= c.start && time < c.end);
  const cue = p.mouthCues[idx];
  const target = MOUTH_SHAPES[cue?.value ?? "X"];
  const previous = MOUTH_SHAPES[p.mouthCues[idx - 1]?.value ?? "X"];
  const blend = cue
    ? smooth((time - cue.start) / Math.min(0.045, (cue.end - cue.start) / 2))
    : 1;
  const sample = time * p.sampleRate,
    i = Math.floor(sample),
    energy =
      (p.energy[i] ?? 0) +
      ((p.energy[i + 1] ?? 0) - (p.energy[i] ?? 0)) * (sample - i);
  let beat = 0,
    side = 1;
  for (let n = 0; n < p.beats.length; n++) {
    const dt = time - p.beats[n];
    const value =
      dt >= -0.2 && dt < 0.85
        ? smooth((dt + 0.2) / 0.32) * (1 - smooth((dt - 0.15) / 0.7))
        : 0;
    if (value > beat) {
      beat = value;
      side = n % 2 ? 1 : -1;
    }
  }
  const audible = p.mouthCues.filter((c) => c.value !== "X");
  const first = audible[0]?.start ?? 0,
    last = audible[audible.length - 1]?.end ?? 0;
  const gesture =
    smooth((time - first + 0.12) / 0.35) *
    (1 - smooth((time - last + 0.2) / 0.4));
  return {
    open: previous.open + (target.open - previous.open) * blend,
    width: previous.width + (target.width - previous.width) * blend,
    round: previous.round + (target.round - previous.round) * blend,
    energy,
    beat,
    side,
    gesture,
  };
}
