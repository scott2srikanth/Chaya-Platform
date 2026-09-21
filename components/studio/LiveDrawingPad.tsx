"use client";
import { useRef, useState } from "react";
import type { BoardCommand } from "../../lib/studio/live-whiteboard";
import { whiteboardFrame } from "../../lib/studio/whiteboard";
type Point = [number, number];
export default function LiveDrawingPad({
  events,
  disabled,
  onDraw,
}: {
  events: BoardCommand[];
  disabled: boolean;
  onDraw: (points: Point[]) => void;
}) {
  const [tool, setTool] = useState("pen"),
    [draft, setDraft] = useState<Point[]>([]);
  const points = useRef<Point[]>([]),
    pointer = useRef<number | null>(null);
  const position = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    ];
  };
  const shape = (a: Point, b: Point): Point[] => {
    if (tool === "rectangle") return [a, [b[0], a[1]], b, [a[0], b[1]], a];
    if (tool === "ellipse")
      return Array.from({ length: 49 }, (_, i) => [
        (a[0] + b[0]) / 2 +
          (Math.abs(b[0] - a[0]) / 2) * Math.cos((i * Math.PI) / 24),
        (a[1] + b[1]) / 2 +
          (Math.abs(b[1] - a[1]) / 2) * Math.sin((i * Math.PI) / 24),
      ]);
    if (tool === "arrow") {
      const angle = Math.atan2((b[1] - a[1]) * 175, (b[0] - a[0]) * 281);
      return [
        a,
        b,
        [
          b[0] - (8 * Math.cos(angle - 0.5)) / 281,
          b[1] - (8 * Math.sin(angle - 0.5)) / 175,
        ],
        b,
        [
          b[0] - (8 * Math.cos(angle + 0.5)) / 281,
          b[1] - (8 * Math.sin(angle + 0.5)) / 175,
        ],
      ].map(([x, y]) => [
        Math.max(0, Math.min(1, x)),
        Math.max(0, Math.min(1, y)),
      ]);
    }
    return [a, b];
  };
  const ink = whiteboardFrame("", 1e9, 9, {
    liveCommands: events,
  }).segments.filter((s) => s.draw);
  return (
    <section>
      <h2>Draw on the board</h2>
      <p>
        Drag with your finger, stylus or mouse. Release to send. Drawings
        animate after queued text and other actions, in the order you add them.
      </p>
      <label>
        Drawing tool
        <select
          aria-label="Live drawing tool"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          style={{ margin: 8, padding: 10 }}
        >
          <option value="pen">Freehand pen</option>
          <option value="line">Line</option>
          <option value="arrow">Arrow</option>
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
      </label>
      <svg
        role="img"
        aria-label="Live drawing canvas"
        viewBox="0 0 281 175"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "281 / 175",
          background: "#fbfaf7",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          touchAction: "none",
          cursor: disabled ? "not-allowed" : "crosshair",
        }}
        onPointerDown={(e) => {
          if (disabled || pointer.current !== null || e.button !== 0) return;
          e.preventDefault();
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          points.current = [position(e)];
          setDraft(points.current);
        }}
        onPointerMove={(e) => {
          if (pointer.current !== e.pointerId) return;
          const p = position(e);
          if (tool === "pen") {
            if (points.current.length >= 140)
              points.current = points.current.filter((_, i) => i % 2 === 0);
            points.current = [...points.current, p];
            setDraft(points.current);
          } else {
            points.current = [points.current[0], p];
            setDraft(shape(points.current[0], p));
          }
        }}
        onPointerUp={(e) => {
          if (pointer.current !== e.pointerId) return;
          const p = position(e),
            start = points.current[0];
          const stroke =
            tool === "pen" ? [...points.current, p] : shape(start, p);
          if (
            stroke.some(
              (v) =>
                Math.hypot((v[0] - start[0]) * 281, (v[1] - start[1]) * 175) >
                1,
            )
          )
            onDraw(stroke);
          pointer.current = null;
          points.current = [];
          setDraft([]);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          points.current = [];
          setDraft([]);
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
          points.current = [];
          setDraft([]);
        }}
      >
        {ink.map((s, i) => (
          <path
            key={i}
            d={`M${((s.from[0] - 145) / 205) * 281},${((s.from[1] - 42) / 118) * 175} L${((s.to[0] - 145) / 205) * 281},${((s.to[1] - 42) / 118) * 175}`}
            fill="none"
            stroke="#304b65"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
        <polyline
          points={draft.map(([x, y]) => `${x * 281},${y * 175}`).join(" ")}
          fill="none"
          stroke="#7160ee"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p>
        The canvas shows the completed queue. Use “Erase last item” to remove
        the last drawing.
      </p>
    </section>
  );
}
