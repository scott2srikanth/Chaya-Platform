// Compact single-line capitals: the marker follows the same geometry as the ink.
const glyphs: Record<string, string> = {
  A: "0,6 2,0 4,6|1,4 3,4",
  B: "0,6 0,0 3,0 4,1 3,3 0,3|3,3 4,4 4,5 3,6 0,6",
  C: "4,0 1,0 0,1 0,5 1,6 4,6",
  D: "0,6 0,0 2,0 4,2 4,4 2,6 0,6",
  E: "4,0 0,0 0,6 4,6|0,3 3,3",
  F: "0,6 0,0 4,0|0,3 3,3",
  G: "4,1 3,0 1,0 0,1 0,5 1,6 4,6 4,3 2,3",
  H: "0,0 0,6|4,0 4,6|0,3 4,3",
  I: "0,0 4,0|2,0 2,6|0,6 4,6",
  J: "4,0 4,5 3,6 1,6 0,5",
  K: "0,0 0,6|4,0 0,3 4,6",
  L: "0,0 0,6 4,6",
  M: "0,6 0,0 2,3 4,0 4,6",
  N: "0,6 0,0 4,6 4,0",
  O: "1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0",
  P: "0,6 0,0 3,0 4,1 4,2 3,3 0,3",
  Q: "1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0|2,4 4,6",
  R: "0,6 0,0 3,0 4,1 4,2 3,3 0,3|2,3 4,6",
  S: "4,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 0,6",
  T: "0,0 4,0|2,0 2,6",
  U: "0,0 0,5 1,6 3,6 4,5 4,0",
  V: "0,0 2,6 4,0",
  W: "0,0 1,6 2,3 3,6 4,0",
  X: "0,0 4,6|4,0 0,6",
  Y: "0,0 2,3 4,0|2,3 2,6",
  Z: "0,0 4,0 0,6 4,6",
  "0": "0,0 4,0 4,6 0,6 0,0",
  "1": "1,1 2,0 2,6|0,6 4,6",
  "2": "0,1 1,0 3,0 4,1 4,2 0,6 4,6",
  "3": "0,0 4,0 2,3 4,4 4,5 3,6 0,6",
  "4": "3,6 3,0 0,4 4,4",
  "5": "4,0 0,0 0,3 3,3 4,4 4,5 3,6 0,6",
  "6": "4,0 1,0 0,2 0,6 4,6 4,3 0,3",
  "7": "0,0 4,0 1,6",
  "8": "0,3 0,0 4,0 4,6 0,6 0,3 4,3",
  "9": "4,3 0,3 0,0 4,0 4,5 3,6 0,6",
  ".": "2,6 2.1,6",
  "!": "2,0 2,4|2,6 2.1,6",
  "-": "0,3 4,3",
  "?": "0,1 1,0 3,0 4,1 4,2 2,3 2,4|2,6 2.1,6",
};
export type InkSegment = {
  from: [number, number];
  to: [number, number];
  start: number;
  length: number;
  draw: boolean;
};
export type WhiteboardContent = {
  liveMode?: boolean;
  mode?: "text" | "code" | "drawing";
  code?: string;
  liveCommands?: import("./live-whiteboard").BoardCommand[];
  strokes?: [number, number][][];
};
Object.assign(glyphs, {
  a: "0,3 1,2 3,2 4,3 4,6|4,4 1,4 0,5 1,6 4,6",
  b: "0,0 0,6 3,6 4,5 4,3 3,2 0,2",
  c: "4,2 1,2 0,3 0,5 1,6 4,6",
  d: "4,0 4,6 1,6 0,5 0,3 1,2 4,2",
  e: "0,4 4,4 4,3 3,2 1,2 0,3 0,5 1,6 4,6",
  f: "1,6 1,1 2,0 4,0|0,2 3,2",
  g: "4,2 1,2 0,3 0,5 1,6 4,6|4,2 4,7 3,8 0,8",
  h: "0,0 0,6|0,3 1,2 3,2 4,3 4,6",
  i: "2,0 2.1,0|2,2 2,6",
  j: "3,0 3.1,0|3,2 3,7 2,8 0,8",
  k: "0,0 0,6|4,2 0,4 4,6",
  l: "1,0 2,0 2,6 3,6",
  m: "0,6 0,2 2,2 2,6|2,2 4,2 4,6",
  n: "0,6 0,2 3,2 4,3 4,6",
  o: "1,2 3,2 4,3 4,5 3,6 1,6 0,5 0,3 1,2",
  p: "0,8 0,2 3,2 4,3 4,5 3,6 0,6",
  q: "4,8 4,2 1,2 0,3 0,5 1,6 4,6",
  r: "0,6 0,2|0,3 1,2 4,2",
  s: "4,2 1,2 0,3 1,4 3,4 4,5 3,6 0,6",
  t: "2,0 2,5 3,6 4,6|0,2 4,2",
  u: "0,2 0,5 1,6 4,6 4,2",
  v: "0,2 2,6 4,2",
  w: "0,2 1,6 2,4 3,6 4,2",
  x: "0,2 4,6|4,2 0,6",
  y: "0,2 2,6 4,2|2,6 1,8 0,8",
  z: "0,2 4,2 0,6 4,6",
  "(": "3,0 1,2 1,4 3,6",
  ")": "1,0 3,2 3,4 1,6",
  "[": "3,0 1,0 1,6 3,6",
  "]": "1,0 3,0 3,6 1,6",
  "{": "3,0 2,0 2,2 1,3 2,4 2,6 3,6",
  "}": "1,0 2,0 2,2 3,3 2,4 2,6 1,6",
  "=": "0,2 4,2|0,4 4,4",
  "+": "0,3 4,3|2,1 2,5",
  _: "0,7 4,7",
  ":": "2,2 2.1,2|2,5 2.1,5",
  ";": "2,2 2.1,2|2,5 1,7",
  ",": "2,6 1,8",
  "'": "2,0 2,2",
  '"': "1,0 1,2|3,0 3,2",
  "/": "0,6 4,0",
  "\\": "0,0 4,6",
  "<": "4,1 0,3 4,5",
  ">": "0,1 4,3 0,5",
  "*": "0,1 4,5|4,1 0,5|2,0 2,6",
  "#": "1,0 1,6|3,0 3,6|0,2 4,2|0,4 4,4",
  "|": "2,0 2,6",
  "&": "4,6 0,2 1,0 3,0 3,2 0,4 0,6 2,6 4,3",
  "%": "0,6 4,0|0,0 1,0 1,1 0,1 0,0|3,5 4,5 4,6 3,6 3,5",
  "^": "0,2 2,0 4,2",
  "~": "0,3 1,2 3,4 4,3",
  $: "4,1 0,1 0,3 4,3 4,5 0,5|2,0 2,6",
  "@": "4,6 1,6 0,5 0,1 1,0 4,0 4,4 2,4 2,2 4,2",
  "`": "1,0 2,1",
});
export function whiteboardStrokes(text: string, content?: WhiteboardContent) {
  const source =
    content?.mode === "drawing"
      ? ""
      : content?.mode === "code"
        ? (content.code ?? "")
        : text;
  const lines = (content ? source : source.toUpperCase())
    .replace(/\t/g, "  ")
    .split("\n");
  const scale = content
    ? Math.min(
        2.5,
        205 / Math.max(1, ...lines.map((l) => l.length * 5.6)),
        118 / Math.max(1, lines.length * 10),
      )
    : 2.5;
  const segments: InkSegment[] = [];
  let total = 0,
    cursor: [number, number] | undefined;
  const path = (points: [number, number][]) => {
    points.forEach((next, i) => {
      if (cursor) {
        const length = Math.hypot(next[0] - cursor[0], next[1] - cursor[1]);
        if (length) {
          segments.push({
            from: cursor,
            to: next,
            start: total,
            length,
            draw: i > 0,
          });
          total += length;
        }
      }
      cursor = next;
    });
  };
  (content ? lines : lines.slice(0, 3).map((l) => l.slice(0, 14))).forEach(
    (line, row) => {
      Array.from(line).forEach((char, column) => {
        if (char === " " || char === "\r") return;
        for (const stroke of (glyphs[char] ?? glyphs["?"]).split("|"))
          path(
            stroke.split(" ").map((pair) => {
              const [x, y] = pair.split(",").map(Number);
              return [
                145 + column * 5.6 * scale + x * scale,
                42 + row * (content ? 10 * scale : 32) + y * scale,
              ];
            }),
          );
      });
    },
  );
  for (const stroke of content?.strokes ?? [])
    path(stroke.map(([x, y]) => [145 + x * 205, 42 + y * 118]));
  return { segments, total };
}
export function whiteboardFrame(
  text: string,
  time: number,
  duration: number,
  content?: WhiteboardContent,
) {
  if (content?.liveCommands) {
    const segments: InkSegment[] = [];
    let distance = 0,
      total = 0;
    let tip: [number, number] = [150, 65];
    for (let index=0;index<content.liveCommands.length;index++) {
      const event=content.liveCommands[index];
      const data = whiteboardStrokes("", {
        mode: "drawing",
        strokes: event.strokes,
      });
      const progress = Math.max(
        0,
        Math.min(1, (time - event.start) / event.duration),
      );
      const frame = whiteboardFrame(
        "",
        0.5 + progress * event.duration,
        event.duration,
        { mode: "drawing", strokes: event.strokes },
      );
      const erase = content.liveCommands.find((e) =>
        e.eraseTargets?.includes(index),
      );
      const erased = erase
        ? Math.max(0, Math.min(1, (time - erase.start) / erase.duration)) *
          data.total
        : 0;
      segments.push(
        ...data.segments.map((s) => {
          const cut = Math.min(s.length, Math.max(0, erased - s.start));
          const ratio = s.length ? cut / s.length : 0;
          return {
            ...s,
            from: s.from.map((v, i) => v + (s.to[i] - v) * ratio) as [
              number,
              number,
            ],
            length: s.length - cut,
            start: s.start + total + cut,
            draw: s.draw && !event.eraseTargets && cut < s.length,
          };
        }),
      );
      distance += data.total * progress;
      total += data.total;
      if (time >= event.start) tip = frame.tip;
    }
    return {
      segments,
      distance,
      tip,
      erasing: content.liveCommands.some(
        (e) => e.eraseTargets && time >= e.start && time < e.start + e.duration,
      ),
      writing: content.liveCommands.some(
        (e) => time >= e.start && time < e.start + e.duration,
      ),
    };
  }
  const { segments, total } = whiteboardStrokes(text, content),
    distance =
      Math.max(0, Math.min(1, (time - 0.5) / Math.max(0.1, duration))) * total;
  const segment =
    segments.find((s) => distance <= s.start + s.length) ??
    segments[segments.length - 1];
  const progress = segment
    ? Math.max(0, Math.min(1, (distance - segment.start) / segment.length))
    : 0;
  const tip = segment
    ? (segment.from.map((v, i) => v + (segment.to[i] - v) * progress) as [
        number,
        number,
      ])
    : ([150, 65] as [number, number]);
  return {
    segments,
    distance,
    tip,
    erasing: false,
    writing: !!segment && segment.draw && time >= 0.5 && time < duration + 0.5,
  };
}

export function whiteboardPresenterPose(
  tip: [number, number],
  time: number,
  duration: number,
) {
  const smooth = (v: number) => {
    const p = Math.max(0, Math.min(1, v));
    return p * p * (3 - 2 * p);
  };
  const move = smooth((time - (duration + 0.5)) / 1.2),
    face = smooth((time - (duration + 1.1)) / 1.5);
  const initialX = Math.max(95, Math.min(285, tip[0] - 55));
  const x = initialX + (50 - initialX) * move;
  const marker: [number, number] = [
    tip[0] + (x + 35 - tip[0]) * move,
    tip[1] + (174 - tip[1]) * move,
  ];
  const hand: [number, number] = [marker[0] - 4, marker[1] + 18];
  const elbow: [number, number] = [
    x + 43,
    ((tip[1] + 140) / 2 + 18) * (1 - move) + 170 * move,
  ];
  return { x, marker, hand, elbow, face, move };
}

/** Switch complete front/back artwork at the narrowest point, never fade facial features. */
export function presenterSpriteFrame(turn: number) {
  const progress = Math.max(0, Math.min(1, turn));
  return {
    view: progress < 0.5 ? ("back" as const) : ("front" as const),
    widthScale: Math.max(0.07, Math.abs(Math.cos(progress * Math.PI))),
  };
}
