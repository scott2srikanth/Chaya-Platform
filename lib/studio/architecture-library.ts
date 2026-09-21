import { whiteboardStrokes } from "./whiteboard";
import type { DrawingPoint } from "./drawing-library";
export const ARCHITECTURE_LAYERS = [
  {
    name: "first layer",
    title: "Collection of data set",
    lines: ["1. Dataset collection"],
  },
  {
    name: "second layer",
    title: "Data pre-processing",
    lines: ["2. Data pre-processing"],
  },
  {
    name: "third layer",
    title:
      "Identify the algorithm or architecture; design the machine learning or deep learning model",
    lines: ["3. Algorithm / architecture", "ML / DL model design"],
  },
  {
    name: "fourth layer",
    title: "Training the model and choosing the right optimizer",
    lines: ["4. Model training", "Choose the right optimizer"],
  },
  {
    name: "fifth layer",
    title: "Evaluation, including the evaluation matrix and model accuracy",
    lines: ["5. Evaluation matrix / metrics", "Assess model accuracy"],
  },
  {
    name: "sixth layer",
    title: "Model ready for deployment on the cloud",
    lines: ["6. Model ready", "Cloud deployment"],
  },
];
export function architectureLayerIndex(name: string): number {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/[.!?]+$/, "");
  const index = ARCHITECTURE_LAYERS.findIndex((layer, i) =>
    [
      layer.name,
      `layer ${i + 1}`,
      `${i + 1}${["st", "nd", "rd", "th", "th", "th"][i]} layer`,
    ].includes(clean),
  );
  return index;
}
export function architectureLayerStrokes(index: number): DrawingPoint[][] {
  const layer = ARCHITECTURE_LAYERS[index];
  if (!layer) throw new Error("Choose one of the six architecture layers.");
  const y = 0.015 + index * 0.165,
    h = 0.135;
  const paths: DrawingPoint[][] = [
    [
      [0.02, y],
      [0.98, y],
      [0.98, y + h],
      [0.02, y + h],
      [0.02, y],
    ],
  ];
  const ink = whiteboardStrokes(layer.lines.join("\n"), {
    mode: "text",
  }).segments.filter((s) => s.draw);
  const xs = ink.flatMap((s) => [s.from[0], s.to[0]]),
    ys = ink.flatMap((s) => [s.from[1], s.to[1]]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    w = Math.max(...xs) - minX,
    inkH = Math.max(...ys) - minY;
  // Preserve the glyph aspect ratio in the enlarged 281 × 175 ink area.
  const scale = Math.min(
    (0.86 * 281) / Math.max(1, w),
    (0.095 * 175) / Math.max(40, inkH),
  );
  const left = 0.5 - (w * scale) / 281 / 2,
    top = y + h / 2 - (inkH * scale) / 175 / 2;
  paths.push(
    ...ink.map((s) =>
      [s.from, s.to].map(
        ([x, yy]) =>
          [
            left + ((x - minX) * scale) / 281,
            top + ((yy - minY) * scale) / 175,
          ] as DrawingPoint,
      ),
    ),
  );
  if (index < 5)
    paths.push([
      [0.5, y + h],
      [0.5, y + 0.16],
      [0.49, y + 0.15],
      [0.5, y + 0.16],
      [0.51, y + 0.15],
    ]);
  return paths;
}
