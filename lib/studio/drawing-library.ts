export type DrawingPoint = [number, number];
const box = (x: number, y: number, w: number, h: number): DrawingPoint[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
const oval = (x: number, y: number, rx: number, ry: number): DrawingPoint[] =>
  Array.from({ length: 33 }, (_, i) => [
    x + rx * Math.cos((i * Math.PI) / 16),
    y + ry * Math.sin((i * Math.PI) / 16),
  ]);
export const DRAWING_LIBRARY: {
  name: string;
  aliases: string[];
  strokes: DrawingPoint[][];
}[] = [
  {
    name: "house",
    aliases: ["home", "building"],
    strokes: [
      [
        [0.1, 0.45],
        [0.5, 0.08],
        [0.9, 0.45],
      ],
      box(0.2, 0.4, 0.6, 0.5),
      box(0.43, 0.62, 0.15, 0.28),
      box(0.27, 0.52, 0.1, 0.12),
    ],
  },
  {
    name: "tree",
    aliases: ["plant"],
    strokes: [
      oval(0.5, 0.32, 0.32, 0.27),
      [
        [0.45, 0.58],
        [0.45, 0.95],
        [0.55, 0.95],
        [0.55, 0.58],
      ],
    ],
  },
  {
    name: "cloud",
    aliases: ["internet"],
    strokes: [
      [
        [0.12, 0.7],
        [0.04, 0.6],
        [0.04, 0.45],
        [0.15, 0.35],
        [0.28, 0.35],
        [0.3, 0.16],
        [0.44, 0.08],
        [0.59, 0.1],
        [0.7, 0.3],
        [0.82, 0.27],
        [0.96, 0.43],
        [0.96, 0.6],
        [0.86, 0.7],
        [0.12, 0.7],
      ],
    ],
  },
  {
    name: "database",
    aliases: ["db", "storage"],
    strokes: [
      oval(0.5, 0.18, 0.35, 0.13),
      [
        [0.15, 0.18],
        [0.15, 0.8],
      ],
      [
        [0.85, 0.18],
        [0.85, 0.8],
      ],
      oval(0.5, 0.8, 0.35, 0.13),
      [
        [0.15, 0.45],
        [0.3, 0.54],
        [0.7, 0.54],
        [0.85, 0.45],
      ],
    ],
  },
  {
    name: "phone",
    aliases: ["mobile", "smartphone"],
    strokes: [
      box(0.27, 0.05, 0.46, 0.9),
      box(0.32, 0.15, 0.36, 0.63),
      [
        [0.44, 0.86],
        [0.56, 0.86],
      ],
    ],
  },
  {
    name: "person",
    aliases: ["user", "human", "customer"],
    strokes: [
      oval(0.5, 0.2, 0.14, 0.17),
      [
        [0.5, 0.37],
        [0.5, 0.67],
        [0.27, 0.94],
      ],
      [
        [0.5, 0.67],
        [0.73, 0.94],
      ],
      [
        [0.2, 0.57],
        [0.5, 0.43],
        [0.8, 0.57],
      ],
    ],
  },
  { name: "circle", aliases: ["oval"], strokes: [oval(0.5, 0.5, 0.35, 0.4)] },
  {
    name: "rectangle",
    aliases: ["box", "square"],
    strokes: [box(0.1, 0.1, 0.8, 0.8)],
  },
  {
    name: "triangle",
    aliases: [],
    strokes: [
      [
        [0.5, 0.1],
        [0.9, 0.9],
        [0.1, 0.9],
        [0.5, 0.1],
      ],
    ],
  },
  {
    name: "arrow",
    aliases: [],
    strokes: [
      [
        [0.1, 0.5],
        [0.9, 0.5],
        [0.7, 0.25],
        [0.9, 0.5],
        [0.7, 0.75],
      ],
    ],
  },
  {
    name: "star",
    aliases: [],
    strokes: [
      Array.from({ length: 11 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 0.19 : 0.45;
        return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)] as DrawingPoint;
      }),
    ],
  },
];
export function normalizeBoardName(text: string) {
  return text
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/^(?:the|a|an)\s+/, "")
    .trim();
}
export function libraryDrawing(name: string) {
  const key = normalizeBoardName(name);
  return DRAWING_LIBRARY.find((d) => d.name === key || d.aliases.includes(key));
}
export type DictationMode = "write" | "draw" | null;
export function interpretPresenterSpeech(
  text: string,
  mode: DictationMode,
): { command?: string; mode: DictationMode; message?: string } {
  const clean = text.trim(),
    key = normalizeBoardName(clean);
  if (key === "write" || key === "draw")
    return {
      mode: key,
      message:
        key === "write"
          ? "Writing mode — dictate your text. Say “stop writing” when finished."
          : "Drawing mode — say a library item name.",
    };
  if (/^(stop writing|stop drawing|stop dictation|stop)$/.test(key))
    return { mode: null, message: "Dictation stopped." };
  if (/^(delete|remove|erase|undo)\b/i.test(clean))
    return { mode, command: clean };
  if (/^write\s+/i.test(clean)) return { mode: "write", command: clean };
  if (/^(draw|connect)\s+/i.test(clean)) return { mode: null, command: clean };
  return { mode, command: mode ? `${mode} ${clean}` : clean };
}
