import React from "react";
import { presenterGaze } from "../../../lib/studio/whiteboard-text";
import {
  whiteboardFrame,
  whiteboardPresenterPose,
} from "../../../lib/studio/whiteboard";
export default function WhiteboardPresenter({
  text,
  content,
  time,
  duration,
  shirt,
  ink,
  width,
  height,
}: {
  text: string;
  content?: import("../../../lib/studio/whiteboard").WhiteboardContent;
  time: number;
  duration: number;
  shirt: string;
  ink: string;
  width: number;
  height: number;
}) {
  const lastCommand = content?.liveCommands?.slice(-1)[0];
  if (lastCommand) duration = lastCommand.start + lastCommand.duration - 0.5;
  const f = whiteboardFrame(text, time, duration, content);
  // Average a short stretch of the ink path for the body; the hand still tracks
  // the exact current point. This is deterministic for projector and exports.
  const bodySamples = [-18, -9, 0, 9, 18].map((offset) => {
    const d = Math.max(0, f.distance + offset);
    const segment =
      f.segments.find((s) => d <= s.start + s.length) ??
      f.segments[f.segments.length - 1];
    if (!segment) return f.tip[0];
    const p = Math.max(
      0,
      Math.min(1, (d - segment.start) / Math.max(0.001, segment.length)),
    );
    return segment.from[0] + (segment.to[0] - segment.from[0]) * p;
  });
  const bodyTarget =
    98 +
    (bodySamples.reduce((a, b) => a + b, 0) / bodySamples.length - 145) * 1.37 -
    72;
  const {
    x,
    marker: [tx, ty],
    hand,
    elbow,
    shoulder,
  } = whiteboardPresenterPose(
    [98 + (f.tip[0] - 145) * 1.37, 22 + (f.tip[1] - 42) * 1.48],
    content?.liveCommands?.length === 0 ? duration + 4 : time,
    duration,
    bodyTarget,
  );
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 400 230"
      aria-label="Presenter writing on a whiteboard"
    >
      <defs>
        <linearGradient id={`${id}skin`}>
          <stop stopColor="#ffc999" />
          <stop offset="1" stopColor="#f5ad78" />
        </linearGradient>
        <linearGradient id={`${id}shirt`} x2="1" y2="1">
          <stop stopColor={shirt} />
          <stop offset="1" stopColor="#5340dc" />
        </linearGradient>
        <linearGradient id={`${id}hair`}>
          <stop stopColor="#724322" />
          <stop offset="1" stopColor="#39291f" />
        </linearGradient>
      </defs>
      <rect width="400" height="230" rx="12" fill="#eef1f6" />
      <rect
        x="10"
        y="8"
        width="382"
        height="207"
        rx="8"
        fill="#ffffff"
        stroke="#c9d0da"
        strokeWidth="2"
      />
      <path d="M24 214H378" stroke="#d5cec4" strokeWidth="3" />
      <g
        transform="translate(98 22) scale(1.37 1.48) translate(-145 -42)"
        fill="none"
        stroke={ink}
        strokeWidth={
          content?.liveCommands?.some((e) =>
            /^draw (?:(?:first|second|third|fourth|fifth|sixth) layer|vertical architecture diagram)$/.test(
              e.command,
            ),
          )
            ? 0.65
            : 2.2
        }
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {f.segments
          .filter((s) => s.draw && f.distance > s.start)
          .map((s, i) => {
            const p = Math.min(1, (f.distance - s.start) / s.length);
            return (
              <path
                key={i}
                stroke={s.color ?? ink}
                strokeWidth={s.penWidth}
                d={`M${s.from.join(",")} L${s.from[0] + (s.to[0] - s.from[0]) * p},${s.from[1] + (s.to[1] - s.from[1]) * p}`}
              />
            );
          })}
      </g>
      <g data-presenter-view="rear-three-quarter">
        <ellipse cx={x} cy="223" rx="27" ry="3" fill="#1e293b" opacity=".12" />
        <path
          d={`M${x - 20} 184L${x - 22} 220H${x - 3}L${x} 199L${x + 4} 220H${x + 23}L${x + 19} 184Z`}
          fill="#202938"
        />
        <path
          d={`M${x - 20} 120Q${x - 25} 139 ${x - 22} 187Q${x} 193 ${x + 24} 186L${x + 20} 126Q${x} 114 ${x - 20} 120Z`}
          fill={`url(#${id}shirt)`}
        />
        <path
          d={`M${x - 21} 131 Q${x - 36} 156 ${x - 33} 187`}
          stroke={`url(#${id}skin)`}
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx={x - 33} cy="189" rx="7" ry="10" fill="#ffc394" />
        <rect x={x - 8} y="104" width="16" height="21" rx="7" fill="#f6ae79" />
        <g
          transform={`rotate(${presenterGaze([tx, ty], x)} ${x} 102)`}
          data-presenter-gaze="marker"
        >
          <ellipse cx={x} cy="82" rx="29" ry="33" fill={`url(#${id}skin)`} />
          {/* One fixed rear three-quarter silhouette for writing and resting. */}
          <path
            d={`M${x - 29} 89Q${x - 40} 67 ${x - 28} 55Q${x - 29} 44 ${x - 18} 46Q${x - 12} 31 ${x + 1} 40Q${x + 17} 28 ${x + 23} 43Q${x + 39} 43 ${x + 31} 59L${x + 21} 68L${x + 20} 85Q${x + 10} 98 ${x - 1} 107Q${x - 19} 116 ${x - 30} 99Z`}
            fill={`url(#${id}hair)`}
          />
          <ellipse cx={x + 18} cy="84" rx="7" ry="9" fill="#ffc394" />
        </g>
        <path
          d={`M${shoulder.join(",")} L${elbow.join(",")} L${hand.join(",")}`}
          fill="none"
          stroke="#ffc394"
          strokeWidth="13"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={`M${hand[0] - 2} ${hand[1] + 6}L${tx - 1} ${ty + 3}`}
          stroke="#343740"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={`M${tx - 1} ${ty + 3}L${tx} ${ty}`}
          stroke={ink}
          strokeWidth="2"
        />
        {f.erasing && (
          <rect
            x={tx - 7}
            y={ty - 5}
            width="14"
            height="10"
            rx="3"
            fill="#94a3b8"
            stroke="#475569"
            strokeWidth="1"
          />
        )}
        <circle cx={hand[0]} cy={hand[1]} r="6" fill="#ffc394" />
      </g>
    </svg>
  );
}
