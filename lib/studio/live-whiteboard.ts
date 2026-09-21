import {
  ARCHITECTURE_LAYERS,
  architectureLayerIndex,
  architectureLayerStrokes,
} from "./architecture-library";
import { libraryDrawing, normalizeBoardName } from "./drawing-library";
import { whiteboardStrokes, type WhiteboardContent } from "./whiteboard";
type Point = [number, number];
export type BoardCommand = {
  eraseTargets?: number[];
  command: string;
  start: number;
  duration: number;
  strokes: Point[][];
};
const rect = (x: number, y: number, w: number, h: number): Point[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
const computer: Point[][] = [
  rect(0.04, 0.49, 0.32, 0.32),
  [
    [0.2, 0.81],
    [0.2, 0.9],
  ],
  [
    [0.1, 0.9],
    [0.3, 0.9],
  ],
];
const browser: Point[][] = [
  rect(0.07, 0.53, 0.26, 0.23),
  [
    [0.07, 0.59],
    [0.33, 0.59],
  ],
  [
    [0.1, 0.56],
    [0.12, 0.56],
  ],
  [
    [0.15, 0.56],
    [0.17, 0.56],
  ],
];
const server: Point[][] = [
  rect(0.76, 0.48, 0.2, 0.44),
  rect(0.79, 0.54, 0.14, 0.07),
  rect(0.79, 0.68, 0.14, 0.07),
  [
    [0.8, 0.85],
    [0.83, 0.85],
  ],
];
export function visibleBoardItems(events: BoardCommand[]) {
  const removed = new Set(events.flatMap((e) => e.eraseTargets ?? []));
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event, index }) => !event.eraseTargets && !removed.has(index));
}
export function eraseBoardCommand(
  input: string,
  events: BoardCommand[],
  start: number,
): BoardCommand {
  const name = normalizeBoardName(
    input.replace(/^(delete|remove|erase|undo)\s*/i, ""),
  )
    .replace(/^(drawing|text)\s+/, "")
    .replace(/^["“]|["”]$/g, "");
  const active = visibleBoardItems(events);
  const layerIndex = architectureLayerIndex(name);
  const canonical =
    layerIndex >= 0
      ? ARCHITECTURE_LAYERS[layerIndex].name
      : (libraryDrawing(name)?.name ?? name);
  const matches =
    !name || /^(last|last one|last item|last drawing)$/.test(name)
      ? active.slice(-1)
      : active.filter(({ event }) => {
          const label = normalizeBoardName(
            event.command.replace(/^(write|draw)\s+/i, ""),
          );
          return label === canonical || label === name;
        });
  if (!matches.length)
    throw new Error(
      name
        ? `No item named “${name}” is on the board.`
        : "The board is already empty.",
    );
  if (matches.length > 1)
    throw new Error(
      "More than one item matches. Say “remove” to erase the most recent item.",
    );
  return {
    command: `erase ${matches[0].event.command.replace(/^(write|draw)\s+/i, "")}`,
    start,
    duration: 2,
    eraseTargets: matches.map((m) => m.index),
    strokes: matches.flatMap((m) => m.event.strokes),
  };
}
export class UnsupportedDrawingError extends Error {}
export function createBoardCommand(
  input: string,
  previous: BoardCommand[],
  start: number,
): BoardCommand {
  if (/^(delete|remove|erase|undo)\b/i.test(input.trim()))
    return eraseBoardCommand(input.trim(), previous, start);
  previous = visibleBoardItems(previous).map((item) => item.event);
  const raw = input.trim(),
    command = raw
      .toLowerCase()
      .replace(/[.!?]+$/, "")
      .replace(/\b(the|a|an)\s+/g, "")
      .replace(/\s+/g, " ");
  let strokes: Point[][] = [];
  const has = (name: string) =>
    previous.some(
      (e) =>
        e.command === `draw ${name}` ||
        e.command.startsWith("connect ") ||
        (name === "computer" && e.command === "draw browser"),
    );
  let canonical = command;
  const layerIndex = architectureLayerIndex(command.replace(/^draw\s+/, ""));
  const fullArchitecture =
    /^draw (?:vertical )?(?:architecture|architecture diagram)$/.test(command);
  if (command.startsWith("draw ") && (layerIndex >= 0 || fullArchitecture)) {
    if (
      previous.some(
        (e) =>
          e.command === "draw vertical architecture diagram" ||
          (fullArchitecture
            ? architectureLayerIndex(e.command.replace(/^draw /, "")) >= 0
            : e.command === `draw ${ARCHITECTURE_LAYERS[layerIndex].name}`),
      )
    )
      throw new Error(
        "That architecture layer is already on the board. Remove it before drawing it again.",
      );
    if (
      previous.some(
        (e) => architectureLayerIndex(e.command.replace(/^draw /, "")) < 0,
      )
    )
      throw new Error(
        "The vertical diagram needs a clear board. Remove existing items or reset the live board first.",
      );
    strokes = fullArchitecture
      ? ARCHITECTURE_LAYERS.flatMap((_, i) => architectureLayerStrokes(i))
      : architectureLayerStrokes(layerIndex);
    canonical = fullArchitecture
      ? "draw vertical architecture diagram"
      : `draw ${ARCHITECTURE_LAYERS[layerIndex].name}`;
  } else if (/^write\s+/i.test(raw)) {
    const text = raw.replace(/^write\s+/i, "").trim(),
      row =
        [0, 1, 2].find(
          (row) =>
            !previous.some(
              (e) =>
                e.command.startsWith("write ") &&
                Math.abs(
                  Math.min(...e.strokes.flat().map((p) => p[1])) -
                    (row * 17) / 118,
                ) < 0.08,
            ),
        ) ?? 3;
    if (!text || text.length > 100)
      throw new Error("Say “write” followed by up to 100 characters.");
    if (row >= 3)
      throw new Error(
        "The text area is full. Start a new live board to continue.",
      );
    const data = whiteboardStrokes(text, { mode: "text" });
    const maxX = Math.max(1, ...data.segments.map((s) => s.to[0] - 145)),
      maxY = Math.max(1, ...data.segments.map((s) => s.to[1] - 42));
    const scale = Math.min(1, 205 / maxX, 12 / maxY);
    strokes = data.segments
      .filter((s) => s.draw)
      .map((s) =>
        [s.from, s.to].map(
          ([x, y]) =>
            [
              ((x - 145) * scale) / 205,
              ((y - 42) * scale + row * 17) / 118,
            ] as Point,
        ),
      );
    canonical = `write ${text}`;
  } else if (command === "draw computer") {
    if (has("computer"))
      throw new Error("The computer is already on this board.");
    strokes = computer;
  } else if (command === "draw browser") {
    if (previous.some((e) => e.command === "draw browser"))
      throw new Error("The browser is already on this board.");
    strokes = [...(!has("computer") ? computer : []), ...browser];
  } else if (command === "draw server") {
    if (has("server")) throw new Error("The server is already on this board.");
    strokes = server;
  } else if (
    /^(draw )?connect (computer to server|server to computer)$/.test(command)
  ) {
    canonical = command.replace(/^draw /, "");
    if (previous.some((e) => e.command === canonical))
      throw new Error("That connection is already on this board.");
    const right = canonical === "connect computer to server",
      y = right ? 0.6 : 0.8,
      a = right ? 0.39 : 0.73,
      b = right ? 0.73 : 0.39,
      d = right ? -0.035 : 0.035;
    strokes = [
      ...(!has("computer") ? computer : []),
      ...(!has("server") ? server : []),
      [
        [a, y],
        [b, y],
        [b + d, y - 0.04],
        [b, y],
        [b + d, y + 0.04],
      ],
    ];
  } else if (command.startsWith("draw ") && libraryDrawing(command.slice(5))) {
    const item = libraryDrawing(command.slice(5))!;
    if (previous.some((e) => e.command === `draw ${item.name}`))
      throw new Error(`The ${item.name} is already on the board.`);
    const count = previous.filter(
      (e) =>
        e.command.startsWith("draw ") && libraryDrawing(e.command.slice(5)),
    ).length;
    if (count >= 6)
      throw new Error(
        "The drawing area is full. Remove an item or reset the board.",
      );
    const slot = Array.from({ length: 6 }, (_, i) => i).find(
      (i) =>
        !previous.some((e) => {
          if (e.command.startsWith("write ")) return false;
          const points = e.strokes.flat(),
            xs = points.map((p) => p[0]),
            ys = points.map((p) => p[1]);
          const x = 0.02 + (i % 3) * 0.33,
            y = 0.45 + Math.floor(i / 3) * 0.27;
          return (
            Math.max(...xs) > x &&
            Math.min(...xs) < x + 0.28 &&
            Math.max(...ys) > y &&
            Math.min(...ys) < y + 0.24
          );
        }),
    );
    if (slot === undefined)
      throw new Error(
        "No free drawing space. Remove a drawing or reset the board.",
      );
    strokes = item.strokes.map((path) =>
      path.map(([x, y]) => [
        0.02 + (slot % 3) * 0.33 + x * 0.16,
        0.45 + Math.floor(slot / 3) * 0.27 + y * 0.24,
      ]),
    );
    canonical = `draw ${item.name}`;
  } else
    throw new UnsupportedDrawingError(
      "Try “write Hello”, “draw browser”, “draw computer”, “draw server”, or “connect computer to server” (either direction).",
    );
  if (previous.length >= 30)
    throw new Error("This board is full. Start a new live board.");
  return {
    command: canonical,
    start,
    duration: Math.max(2, Math.min(10, strokes.length * 0.12)),
    strokes,
  };
}
export function validLiveCommands(events: WhiteboardContent["liveCommands"]) {
  return (
    Array.isArray(events) &&
    events.length <= 120 &&
    events.every(
      (e, i) =>
        e &&
        (e.eraseTargets === undefined ||
          (Array.isArray(e.eraseTargets) &&
            e.eraseTargets.length > 0 &&
            e.eraseTargets.every(
              (target) =>
                Number.isInteger(target) &&
                target >= 0 &&
                target < i &&
                !events[target].eraseTargets,
            ))) &&
        typeof e.command === "string" &&
        e.command.length <= 500 &&
        Number.isFinite(e.start) &&
        e.start >= 0 &&
        e.start <= 3600 &&
        Number.isFinite(e.duration) &&
        e.duration >= 0.1 &&
        e.duration <= 60 &&
        (!i || e.start >= events[i - 1].start + events[i - 1].duration) &&
        Array.isArray(e.strokes) &&
        e.strokes.length <= 2000 &&
        e.strokes.every(
          (s) =>
            Array.isArray(s) &&
            s.length >= 2 &&
            s.length <= 512 &&
            s.every(
              (p) =>
                Array.isArray(p) &&
                p.length === 2 &&
                p.every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
            ),
        ),
    )
  );
}
