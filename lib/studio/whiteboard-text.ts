import { whiteboardStrokes } from "./whiteboard";
import type { BoardCommand } from "./live-whiteboard";
export function pastedTextCommand(input: unknown, start = 0.4): BoardCommand {
  if (typeof input !== "string" || !input.trim())
    throw new Error("Paste some text first.");
  const text = input.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").trim();
  if (text.length > 600) throw new Error("Use up to 600 characters per board.");
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      let rest = word;
      if (line && line.length + 1 + rest.length > 36) {
        lines.push(line);
        line = "";
      }
      while (rest.length > 36) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(rest.slice(0, 36));
        rest = rest.slice(36);
      }
      line += (line ? " " : "") + rest;
    }
    lines.push(line);
  }
  if (lines.length > 24)
    throw new Error("Use at most 24 wrapped lines per board.");
  const data = whiteboardStrokes(lines.join("\n"), { mode: "text" });
  const ink = data.segments.filter((s) => s.draw);
  if (!ink.length) throw new Error("The text has no visible characters.");
  const maxX = Math.max(
      ...ink.flatMap((s) => [s.from[0] - 145, s.to[0] - 145]),
    ),
    maxY = Math.max(...ink.flatMap((s) => [s.from[1] - 42, s.to[1] - 42]));
  // Uniform scaling keeps letters proportional. Long passages use the full height.
  const scale = Math.min(199 / Math.max(1, maxX), 112 / Math.max(1, maxY), 1.6);
  const strokes: [number, number][][] = [];
  let path: [number, number][] | undefined;
  const point = ([x, y]: [number, number]): [number, number] => [
    (3 + (x - 145) * scale) / 205,
    (3 + (y - 42) * scale) / 118,
  ];
  for (const segment of data.segments) {
    if (!segment.draw) {
      path = undefined;
      continue;
    }
    if (!path || path.length >= 512) {
      path = [point(segment.from)];
      strokes.push(path);
    }
    path.push(point(segment.to));
  }
  if (strokes.length > 2000)
    throw new Error(
      "This text is too detailed for one board. Split it into shorter passages.",
    );
  return {
    command: `write ${text.slice(0, 480)}`,
    start,
    duration: Math.max(2, Math.min(60, ink.length * 0.045)),
    strokes,
  };
}
export function presenterGaze(marker: [number, number], bodyX: number) {
  return Math.max(
    -12,
    Math.min(
      18,
      ((Math.atan2(marker[1] - 82, Math.max(35, marker[0] - bodyX)) * 180) /
        Math.PI) *
        0.3,
    ),
  );
}
