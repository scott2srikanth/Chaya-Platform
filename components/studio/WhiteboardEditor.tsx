"use client";
import LiveWhiteboardCommands from "./LiveWhiteboardCommands";
import { useRef, useState } from "react";
import type { SceneElement } from "../../lib/studio/types";
import {
  whiteboardStrokes,
  type WhiteboardContent,
} from "../../lib/studio/whiteboard";
import { Field, Num } from "./StudioControls";
type Point = [number, number];
export default function WhiteboardEditor({
  element,
  update,
}: {
  element: SceneElement;
  update: (patch: Partial<SceneElement>) => void;
}) {
  const content = element.whiteboard ?? { mode: "text" },
    [tool, setTool] = useState("pen"),
    [draft, setDraft] = useState<Point[]>([]),
    drawing = useRef<Point[]>([]);
  const change = (patch: Partial<WhiteboardContent>) =>
    update({ whiteboard: { ...content, ...patch } });
  const point = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const r = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)),
    ];
  };
  const shape = (a: Point, b: Point): Point[] => {
    if (tool === "rectangle") return [a, [b[0], a[1]], b, [a[0], b[1]], a];
    if (tool === "ellipse")
      return Array.from(
        { length: 49 },
        (_, i) =>
          [
            (a[0] + b[0]) / 2 +
              (Math.abs(b[0] - a[0]) / 2) * Math.cos((i * Math.PI) / 24),
            (a[1] + b[1]) / 2 +
              (Math.abs(b[1] - a[1]) / 2) * Math.sin((i * Math.PI) / 24),
          ] as Point,
      );
    if (tool === "arrow") {
      const dx = (b[0] - a[0]) * 205,
        dy = (b[1] - a[1]) * 118,
        angle = Math.atan2(dy, dx);
      return [
        a,
        b,
        [
          b[0] - (8 * Math.cos(angle - 0.5)) / 205,
          b[1] - (8 * Math.sin(angle - 0.5)) / 118,
        ],
        b,
        [
          b[0] - (8 * Math.cos(angle + 0.5)) / 205,
          b[1] - (8 * Math.sin(angle + 0.5)) / 118,
        ],
      ];
    }
    return [a, b];
  };
  const preview = whiteboardStrokes(element.text, content);
  return (
    <>
      <LiveWhiteboardCommands elementId={element.id} />
      {content.liveCommands && (
        <p>
          Live commands are shown on the stage. Reset the live board above to
          show manual edits.
        </p>
      )}
      <Field label="Whiteboard content">
        <select
          aria-label="Whiteboard content"
          value={content.mode ?? "text"}
          onChange={(e) =>
            change({ mode: e.target.value as WhiteboardContent["mode"] })
          }
        >
          <option value="text">Text + drawings</option>
          <option value="code">Code + drawings</option>
          <option value="drawing">Drawings only</option>
        </select>
      </Field>
      {content.mode !== "drawing" && (
        <Field
          label={content.mode === "code" ? "Code to write" : "Whiteboard text"}
        >
          <textarea
            aria-label={
              content.mode === "code" ? "Code to write" : "Whiteboard text"
            }
            spellCheck={false}
            maxLength={4000}
            style={{
              fontFamily: content.mode === "code" ? "monospace" : undefined,
              minHeight: 130,
            }}
            value={
              content.mode === "code" ? (content.code ?? "") : element.text
            }
            onChange={(e) =>
              content.mode === "code"
                ? change({ code: e.target.value })
                : update({ text: e.target.value, whiteboard: content })
            }
          />
        </Field>
      )}
      <p>
        Letters, punctuation and indentation are preserved. Content fits the
        board automatically; short snippets are easiest to read. Code is
        displayed, never executed. Non-ASCII characters use a ? fallback.
      </p>
      {((content.mode === "code" ? (content.code ?? "") : element.text).split(
        "\n",
      ).length > 10 ||
        (content.mode === "code" ? (content.code ?? "") : element.text)
          .split("\n")
          .some((l) => l.length > 40)) && (
        <p role="status">
          This content will appear small. Split it across scenes for better
          readability.
        </p>
      )}
      <Field label="Drawing tool">
        <select
          aria-label="Drawing tool"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
        >
          <option value="pen">Freehand pen</option>
          <option value="line">Line</option>
          <option value="arrow">Arrow</option>
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
      </Field>
      <svg
        aria-label="Whiteboard drawing canvas"
        role="img"
        viewBox="145 42 205 118"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 180,
          background: "#fbfaf7",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          touchAction: "none",
          cursor: "crosshair",
        }}
        onPointerDown={(e) => {
          if ((content.strokes?.length ?? 0) >= 100) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = [point(e)];
          setDraft(drawing.current);
        }}
        onPointerMove={(e) => {
          if (!drawing.current.length) return;
          const p = point(e);
          if (tool === "pen") {
            if (drawing.current.length < 512)
              drawing.current = [...drawing.current, p];
          } else drawing.current = [drawing.current[0], p];
          setDraft(
            tool === "pen" ? drawing.current : shape(drawing.current[0], p),
          );
        }}
        onPointerUp={(e) => {
          if (!drawing.current.length) return;
          const start = drawing.current[0],
            end = point(e);
          const stroke =
            tool === "pen"
              ? drawing.current.length > 1
                ? drawing.current
                : [start, [Math.min(1, start[0] + 0.001), start[1]] as Point]
              : shape(start, end);
          change({
            strokes: [
              ...(content.strokes ?? []),
              stroke.map(
                ([x, y]) =>
                  [
                    Math.max(0, Math.min(1, x)),
                    Math.max(0, Math.min(1, y)),
                  ] as Point,
              ),
            ],
          });
          drawing.current = [];
          setDraft([]);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drawing.current = [];
          setDraft([]);
        }}
      >
        {preview.segments
          .filter((s) => s.draw)
          .map((s, i) => (
            <path
              key={i}
              d={`M${s.from.join(",")}L${s.to.join(",")}`}
              fill="none"
              stroke={element.stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        <polyline
          points={draft
            .map(([x, y]) => `${145 + x * 205},${42 + y * 118}`)
            .join(" ")}
          fill="none"
          stroke="#7160ee"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <p>
        Drag on the board to draw. Drawings animate after the text/code, in the
        order you add them. {content.strokes?.length ?? 0}/100 strokes.
      </p>
      <div className="ms-row">
        <button
          disabled={!content.strokes?.length}
          onClick={() => change({ strokes: content.strokes!.slice(0, -1) })}
        >
          Undo last stroke
        </button>
        <button
          disabled={!content.strokes?.length}
          onClick={() => change({ strokes: [] })}
        >
          Clear drawings
        </button>
      </div>
      <Num
        label="Writing duration"
        value={element.revealDuration ?? 8}
        min={0.1}
        onChange={(revealDuration) => update({ revealDuration })}
      />
      <p>
        Fill changes the shirt; stroke changes the ink. Leave at least 2 seconds
        after writing for the presenter to step aside.
      </p>
    </>
  );
}
