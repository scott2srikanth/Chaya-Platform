import React from "react";
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
  const {
    x,
    marker: [tx, ty],
    hand,
    elbow,
  } = whiteboardPresenterPose(
    [98 + (f.tip[0] - 145) * 1.37, 22 + (f.tip[1] - 42) * 1.48],
    content?.liveCommands?.length === 0 ? duration + 4 : time,
    duration,
  );
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 400 230"
      aria-label="Presenter writing on a whiteboard"
    >
      <rect width="400" height="230" rx="20" fill="#e8e1d7" />
      <rect x="10" y="8" width="382" height="207" rx="22" fill="#fbfaf7" />
      <path d="M24 214H378" stroke="#d5cec4" strokeWidth="3" />
      <g
        transform="translate(98 22) scale(1.37 1.48) translate(-145 -42)"
        fill="none"
        stroke={ink}
        strokeWidth={content?.liveCommands?.some(e=>/^draw (?:(?:first|second|third|fourth|fifth|sixth) layer|vertical architecture diagram)$/.test(e.command)) ? 0.65 : 2.2}
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
                d={`M${s.from.join(",")} L${s.from[0] + (s.to[0] - s.from[0]) * p},${s.from[1] + (s.to[1] - s.from[1]) * p}`}
              />
            );
          })}
      </g>
      <g>
        <path
          d={`M${x - 13} 120 Q${x - 25} 125 ${x - 26} 145 L${x - 28} 210 Q${x} 218 ${x + 28} 210 L${x + 24} 140 Q${x + 22} 122 ${x + 10} 120Z`}
          fill={shirt}
        />
        <path
          d={`M${x - 24} 139 L${x - 42} 192`}
          stroke="#f0c3a2"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <rect x={x - 8} y="104" width="16" height="21" rx="7" fill="#f0c3a2" />
        <ellipse cx={x} cy="82" rx="29" ry="33" fill="#f0c3a2" />
        <path
          d={`M${x - 29} 77 Q${x - 30} 40 ${x - 9} 47 Q${x - 3} 40 ${x + 6} 48 Q${x + 30} 44 ${x + 29} 77Z`}
          fill="#59402e"
        />
        <path
          d={`M${x + 23} 137 Q${elbow[0]} ${elbow[1]} ${hand[0]} ${hand[1]}`}
          fill="none"
          stroke="#f0c3a2"
          strokeWidth="15"
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
        <circle cx={hand[0]} cy={hand[1]} r="6" fill="#f0c3a2" />
      </g>
    </svg>
  );
}
