"use client";
import React, { useEffect, useState } from "react";
import {
  staticFile,
  delayRender,
  continueRender,
  cancelRender,
} from "remotion";
import { presenterSpriteFrame } from "../../../lib/studio/whiteboard";
export default function SpritePresenter({
  x,
  turn,
  hand,
  elbow,
  marker,
  ink,
}: {
  x: number;
  turn: number;
  hand: number[];
  elbow: number[];
  marker: number[];
  ink: string;
}) {
  const src = staticFile(
    "studio/characters/whiteboard/presenter-sprites-v1.png",
  );
  const [handle] = useState(() => delayRender("Loading presenter sprites"));
  useEffect(() => {
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (active) continueRender(handle);
    };
    image.onerror = () => {
      if (active) cancelRender(new Error("Could not load presenter sprites"));
    };
    image.src = src;
    return () => {
      active = false;
      continueRender(handle);
    };
  }, [src, handle]);
  const frame = presenterSpriteFrame(turn),
    mirror = frame.view === "front" ? -1 : 1;
  const hx = hand[0] - x,
    hy = hand[1],
    tx = marker[0] - x,
    ty = marker[1];
  return (
    <g
      transform={`translate(${x},0) scale(${frame.widthScale},1)`}
      aria-label={`${frame.view} presenter sprite`}
    >
      <g transform={`scale(${mirror},1)`}>
        <path
          d="M-48 152 Q-47 175 -42 192"
          fill="none"
          stroke="#f0c3a2"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M48 152 Q${Math.max(48, elbow[0] - x)} ${elbow[1]} ${hx} ${hy}`}
          fill="none"
          stroke="#f0c3a2"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>
      <svg
        x="-76.8"
        y="22"
        width="153.6"
        height="204.8"
        viewBox={`${frame.view === "back" ? 16 : 746} 0 768 1024`}
        overflow="hidden"
      >
        <image href={src} width="1536" height="1024" />
      </svg>
      <g transform={`scale(${mirror},1)`}>
        <path
          d={`M${hx - 2} ${hy + 6}L${tx - 1} ${ty + 3}`}
          fill="none"
          stroke="#343740"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={`M${tx - 1} ${ty + 3}L${tx} ${ty}`}
          fill="none"
          stroke={ink}
          strokeWidth="2"
        />
        <circle cx={hx} cy={hy} r="6" fill="#f0c3a2" />
      </g>
    </g>
  );
}
