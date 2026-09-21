"use client";
import { useEffect, useRef, useState } from "react";
import {
  visibleBoardItems,
  type BoardCommand,
} from "../../lib/studio/live-whiteboard";
import { whiteboardFrame } from "../../lib/studio/whiteboard";
type Point = [number, number];
export default function LiveDrawingPad({
  events,
  disabled,
  onDraw,
  onErase,
  onClear,
}: {
  events: BoardCommand[];
  disabled: boolean;
  onDraw: (points: Point[], color: string, penWidth: number) => void;
  onErase: (name: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false),
    [color, setColor] = useState("#304b65"),
    [penWidth, setPenWidth] = useState(1.6);
  const openButton = useRef<HTMLButtonElement>(null),
    closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
      if (e.key === "Tab") {
        const dialog = closeButton.current?.closest("section");
        const items = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ) ?? [],
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
      openButton.current?.focus();
    };
  }, [expanded]);
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
    <section
      className={`drawing-workspace ${expanded ? "drawing-expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label="Drawing workspace"
    >
      <div className="section-heading">
        <div>
          <span className="live-eyebrow">CANVAS</span>
          <h2>Draw on the board</h2>
        </div>
        <button
          ref={expanded ? closeButton : openButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Close full screen" : "Open full screen"}
        </button>
      </div>
      <p>
        Use a finger, stylus or mouse. Each stroke is sent live and added to the
        timeline.
      </p>
      <div
        className="drawing-toolbar"
        role="toolbar"
        aria-label="Drawing tools"
      >
        {["pen", "line", "arrow", "rectangle", "ellipse", "eraser"].map(
          (name) => (
            <button
              key={name}
              aria-pressed={tool === name}
              onClick={() => setTool(name)}
            >
              {name}
            </button>
          ),
        )}
        <label className="color-picker">
          Ink{" "}
          <input
            aria-label="Pen color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          Size{" "}
          <select
            aria-label="Pen thickness"
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
          >
            <option value="0.8">Fine</option>
            <option value="1.6">Medium</option>
            <option value="3">Bold</option>
            <option value="5">Heavy</option>
          </select>
        </label>
        <button disabled={disabled || !ink.length} onClick={() => onErase("")}>
          Undo last
        </button>
        <button
          className="danger-button"
          disabled={disabled || !ink.length}
          onClick={onClear}
        >
          Clear board
        </button>
      </div>
      <div className="drawing-surface">
        <svg
          role="img"
          aria-label="Live drawing canvas"
          viewBox="0 0 281 175"
          preserveAspectRatio="none"
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "281 / 175",
            maxHeight: expanded ? "calc(100dvh - 230px)" : undefined,
            background: "#fbfaf7",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
          onPointerDown={(e) => {
            if (disabled || pointer.current !== null || e.button !== 0) return;
            e.preventDefault();
            if (tool === "eraser") {
              const p = position(e);
              let hit = "",
                best = 0.035;
              for (const { event } of visibleBoardItems(events).reverse())
                for (const stroke of event.strokes)
                  for (let i = 1; i < stroke.length; i++) {
                    const a = stroke[i - 1],
                      b = stroke[i],
                      dx = b[0] - a[0],
                      dy = b[1] - a[1],
                      t = Math.max(
                        0,
                        Math.min(
                          1,
                          ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
                            (dx * dx + dy * dy || 1),
                        ),
                      );
                    const d = Math.hypot(
                      p[0] - a[0] - t * dx,
                      p[1] - a[1] - t * dy,
                    );
                    if (d < best) {
                      best = d;
                      hit = event.command.replace(/^(draw|write)\s+/i, "");
                    }
                  }
              if (hit) onErase(hit);
              return;
            }
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
              onDraw(stroke, color, penWidth);
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
              stroke={s.color ?? "#304b65"}
              strokeWidth={((s.penWidth ?? 1) * 281) / 205}
              strokeLinecap="round"
            />
          ))}
          <polyline
            points={draft.map(([x, y]) => `${x * 281},${y * 175}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={(penWidth * 281) / 205}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="drawing-hint">
        {tool === "eraser"
          ? "Tap a line to erase its whole drawing or text item. Erasing is recorded."
          : "Release to send · drawings play after queued text and code."}
      </p>
    </section>
  );
}
