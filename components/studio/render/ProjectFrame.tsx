import WhiteboardPresenter from "./WhiteboardPresenter";
import Stage3D from "./Stage3D";
import SpriteAsset from "./SpriteAsset";
import { getAnimatedStyle } from "../../../lib/studio/animation-engine";
import React from "react";
import type { Project, Scene, SceneElement } from "../../../lib/studio/types";
import {
  frameAt,
  cameraAt,
  elementAt,
  scriptAt,
} from "../../../lib/studio/frame";
import { getAnimatedState } from "../../../lib/studio/animation-engine";
import RigRenderer from "../RigRenderer";
import CharacterRenderer from "../CharacterRenderer";
import { getCharacter } from "../../../lib/studio/characters";
import { computeCharacterMotion } from "../../../lib/studio/character-animator";
import ExternalAsset from "./ExternalAsset";

export const COMPONENTS = [
  "User",
  "Browser",
  "Laptop",
  "Mobile",
  "Server",
  "Database",
  "Cloud",
  "API",
  "Load Balancer",
  "Queue",
  "Cache",
  "Container",
  "Terminal",
  "Code Window",
  "Notification",
  "DNS",
  "CDN",
];
function Explainer({
  kind,
  w,
  h,
  fill,
}: {
  kind: string;
  w: number;
  h: number;
  fill: string;
}) {
  const database = ["Database", "Cache"].includes(kind),
    cloud = ["Cloud", "CDN"].includes(kind);
  return (
    <g>
      <rect
        width={w}
        height={h}
        rx={18}
        fill={fill}
        stroke="#ffffff55"
        strokeWidth={2}
      />
      {database ? (
        <g fill="none" stroke="white" strokeWidth={3}>
          <ellipse cx={w / 2} cy={h * 0.28} rx={w * 0.2} ry={h * 0.075} />
          <path
            d={`M${w * 0.3},${h * 0.28}v${h * 0.28}a${w * 0.2},${h * 0.075} 0 0 0 ${w * 0.4},0v${-h * 0.28}`}
          />
        </g>
      ) : cloud ? (
        <path
          d={`M${w * 0.25},${h * 0.52}c${-w * 0.12},0 ${-w * 0.12},${-h * 0.25} 0,${-h * 0.25}c0,${-h * 0.2} ${w * 0.35},${-h * 0.2} ${w * 0.35},0c${w * 0.25},${-h * 0.1} ${w * 0.25},${h * 0.25} 0,${h * 0.25}Z`}
          fill="none"
          stroke="white"
          strokeWidth={3}
        />
      ) : kind === "User" ? (
        <g fill="white">
          <circle cx={w / 2} cy={h * 0.25} r={h * 0.1} />
          <path d={`M${w * 0.3},${h * 0.6}q0,${-h * 0.35} ${w * 0.4},0Z`} />
        </g>
      ) : (
        <g fill="none" stroke="white" strokeWidth={3}>
          <rect
            x={w * 0.2}
            y={h * 0.15}
            width={w * 0.6}
            height={h * 0.45}
            rx={5}
          />
          <path
            d={`M${w * 0.2},${h * 0.25}H${w * 0.8} M${w * 0.3},${h * 0.35}h${w * 0.4} M${w * 0.3},${h * 0.45}h${w * 0.25}`}
          />
        </g>
      )}
      <text
        x={w / 2}
        y={h * 0.83}
        textAnchor="middle"
        fontSize={Math.min(w / 9, 28)}
        fill="white"
        fontFamily="Arial, sans-serif"
        fontWeight={600}
      >
        {kind}
      </text>
    </g>
  );
}
function Element({
  project,
  scene,
  element: el,
  time,
}: {
  project: Project;
  scene: Scene;
  element: SceneElement;
  time: number;
}) {
  const {
    state: a,
    character,
    pose,
    visible,
    talking,
    facingRight,
  } = elementAt(project, scene, el, time);
  if (!visible) return null;
  el = { ...el, ...getAnimatedStyle(el, time) };
  const w = a.width,
    h = a.height,
    local = Math.max(0, time - (el.startTime ?? 0));
  let body: React.ReactNode;
  const asset = project.assets?.find(
    (asset) => asset.id === (character?.representation?.assetId ?? el.assetId),
  );
  if (asset && ["rive", "lottie"].includes(asset.type))
    body = (
      <ExternalAsset
        asset={asset}
        time={time}
        width={w}
        height={h}
        element={el}
      />
    );
  else if (asset?.type === "sprite" && asset.sprite) {
    body = (
      <SpriteAsset
        asset={asset}
        time={local}
        width={w}
        height={h}
        animation={el.mediaAnimation}
        loop={el.mediaLoop !== false}
        speed={el.characterSpeed ?? 1}
      />
    );
  } else if (asset)
    body = (
      <image
        href={asset.dataUrl}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  else if (character)
    body = (
      <RigRenderer
        character={character}
        poseTransforms={pose}
        width={w}
        height={h}
        facingRight={facingRight}
      />
    );
  else if (el.type === "character") {
    const def = getCharacter(el.characterId ?? "");
    const line = scriptAt(scene, time);
    const gesture =
      line?.line.characterElementId === el.id
        ? line.line.gesture
        : (el.characterGesture ?? "idle");
    body = def ? (
      <CharacterRenderer
        def={def}
        width={w}
        height={h}
        facingRight={facingRight}
        gesture={gesture}
        motion={computeCharacterMotion(
          time,
          gesture,
          talking,
          line?.line.text ?? "",
          line?.progress ?? 0,
          "none",
          { pupilOffsetX: 0, pupilOffsetY: 0 },
        )}
      />
    ) : null;
  } else if (el.type === "component" && el.componentKind === "Whiteboard presenter")
    body = <WhiteboardPresenter content={el.whiteboard} text={el.text} time={local} duration={el.revealDuration ?? 8} shirt={el.fill} ink={el.stroke} width={w} height={h}/>;
  else if (el.type === "component")
    body = (
      <Explainer
        kind={el.componentKind ?? "Server"}
        w={w}
        h={h}
        fill={el.fill}
      />
    );
  else if (el.type === "text") {
    let text = el.text;
    const progress = Math.min(
      1,
      local / Math.max(0.01, el.revealDuration ?? 1),
    );
    if (el.textEffect === "typewriter")
      text = text.slice(0, Math.ceil(text.length * progress));
    if (el.textEffect === "words") {
      const words = text.match(/\S+\s*/g) ?? [];
      text = words.slice(0, Math.ceil(words.length * progress)).join("");
    }
    if (el.textEffect === "lines") {
      const lines = text.split("\n");
      text = lines.slice(0, Math.ceil(lines.length * progress)).join("\n");
    }
    body = (
      <text
        x={el.textAlign === "left" ? 0 : el.textAlign === "right" ? w : w / 2}
        y={el.fontSize}
        textAnchor={
          el.textAlign === "left"
            ? "start"
            : el.textAlign === "right"
              ? "end"
              : "middle"
        }
        fill={el.fill === "transparent" ? "#0f172a" : el.fill}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fontWeight={el.fontWeight}
      >
        {text.split("\n").map((line, i) => (
          <tspan
            key={i}
            x={
              el.textAlign === "left" ? 0 : el.textAlign === "right" ? w : w / 2
            }
            dy={i ? el.fontSize * 1.25 : 0}
          >
            {line}
          </tspan>
        ))}
      </text>
    );
  } else if (el.type === "circle")
    body = (
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2}
        ry={h / 2}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
      />
    );
  else if (["connector", "packet"].includes(el.type)) {
    const source = scene.elements.find((e) => e.id === el.sourceId),
      target = scene.elements.find((e) => e.id === el.targetId);
    const sa = source ? getAnimatedState(source, time) : null,
      ta = target ? getAnimatedState(target, time) : null;
    const x1 = sa ? sa.x + sa.width / 2 - a.x : 0,
      y1 = sa ? sa.y + sa.height / 2 - a.y : 0,
      x2 = ta ? ta.x + ta.width / 2 - a.x : w,
      y2 = ta ? ta.y + ta.height / 2 - a.y : h;
    const path = `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    const p = Math.min(1, local / Math.max(0.01, el.drawDuration ?? 1));
    const q = p;
    const bx =
      (1 - q) ** 3 * x1 +
      (3 * (1 - q) ** 2 * q * (x1 + x2)) / 2 +
      (3 * (1 - q) * q * q * (x1 + x2)) / 2 +
      q ** 3 * x2;
    const by =
      (1 - q) ** 3 * y1 +
      3 * (1 - q) ** 2 * q * y1 +
      3 * (1 - q) * q * q * y2 +
      q ** 3 * y2;
    body =
      el.type === "packet" ? (
        <circle cx={bx} cy={by} r={14} fill={el.fill} />
      ) : (
        <g>
          <defs>
            <marker
              id={"arrow-" + el.id}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path
                d="M0,0 L7,3 L0,6"
                fill="none"
                stroke={el.stroke === "transparent" ? "#38bdf8" : el.stroke}
              />
            </marker>
          </defs>
          <path
            d={path}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - p}
            fill="none"
            stroke={el.stroke === "transparent" ? "#38bdf8" : el.stroke}
            strokeWidth={el.strokeWidth || 4}
            markerEnd={`url(#arrow-${el.id})`}
          />
        </g>
      );
  } else if (el.type === "line")
    body = (
      <line
        x1={0}
        y1={0}
        x2={w}
        y2={el.y2}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth || 3}
        pathLength={1}
        strokeDasharray={el.drawDuration ? "1" : undefined}
        strokeDashoffset={
          el.drawDuration ? 1 - Math.min(1, local / el.drawDuration) : 0
        }
      />
    );
  else
    body = (
      <rect
        width={w}
        height={h}
        rx={el.borderRadius}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
      />
    );
  return (
    <g
      data-element-id={el.id}
      opacity={a.opacity}
      transform={`translate(${a.x},${a.y}) rotate(${a.rotation},${w / 2},${h / 2}) translate(${w / 2},${h / 2}) scale(${a.scaleX},${a.scaleY}) translate(${-w / 2},${-h / 2})`}
      style={{ filter: el.blur ? `blur(${el.blur}px)` : undefined }}
    >
      {body}
    </g>
  );
}
function SceneFrame({
  project,
  scene,
  time,
  editable,
}: {
  project: Project;
  scene: Scene;
  time: number;
  editable?: boolean;
}) {
  const { width: w, height: h } = project.settings,
    c = cameraAt(scene, time, w, h);
  return (
    <g>
      <rect width={w} height={h} fill={scene.background} />
      {scene.stage3d ? (
        <>
          <Stage3D
            scene={scene}
            time={time}
            width={w}
            height={h}
            editable={editable}
          />
          {scene.elements
            .filter((e) => e.type !== "character")
            .map((el) => (
              <Element
                key={el.id}
                project={project}
                scene={scene}
                element={el}
                time={time}
              />
            ))}
        </>
      ) : (
        <g
          transform={`scale(${c.zoom}) rotate(${c.rotation},${w / 2},${h / 2}) translate(${-c.x},${-c.y})`}
        >
          {scene.elements.map((el) => (
            <Element
              key={el.id}
              project={project}
              scene={scene}
              element={el}
              time={time}
            />
          ))}
        </g>
      )}
      {scene.subtitles && (
        <Subtitles scene={scene} time={time} width={w} height={h} />
      )}
    </g>
  );
}
function Subtitles({
  scene,
  time,
  width,
  height,
}: {
  scene: Scene;
  time: number;
  width: number;
  height: number;
}) {
  const current = scriptAt(scene, time);
  if (!current?.line.text.trim()) return null;
  const speaker =
    scene.elements.find((e) => e.id === current.line.characterElementId)
      ?.name ?? "";
  const words = current.line.text.trim().split(/\s+/),
    chunks: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + word).length > 65 && line) {
      chunks.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) chunks.push(line);
  const page = Math.min(
    Math.floor(current.progress * Math.ceil(chunks.length / 2)),
    Math.ceil(chunks.length / 2) - 1,
  );
  const lines = chunks.slice(page * 2, page * 2 + 2);
  const fs = width / 45,
    boxHeight = fs * (lines.length * 1.3 + 1.6),
    y = height - boxHeight - height * 0.045;
  return (
    <g pointerEvents="none">
      <rect
        x={width * 0.1}
        y={y}
        width={width * 0.8}
        height={boxHeight}
        rx={14}
        fill="#101923"
        opacity={0.86}
      />
      <text
        x={width / 2}
        y={y + fs * 0.9}
        textAnchor="middle"
        fill="#b9d8cd"
        fontSize={fs * 0.62}
        fontWeight="700"
      >
        {speaker}
      </text>
      {lines.map((text, i) => (
        <text
          key={i}
          x={width / 2}
          y={y + fs * (2.05 + i * 1.3)}
          textAnchor="middle"
          fill="white"
          fontSize={fs}
          fontWeight="500"
        >
          {text}
        </text>
      ))}
    </g>
  );
}
export default function ProjectFrame({
  project,
  time,
  children,
  editable,
}: {
  project: Project;
  time: number;
  children?: React.ReactNode;
  editable?: boolean;
}) {
  const f = frameAt(project, time),
    { width: w, height: h } = project.settings,
    duration = f.scene.transitionDuration ?? 0.5;
  const progress = Math.min(1, f.time / Math.max(0.01, duration)),
    transition = f.index > 0 && progress < 1 ? f.scene.transition : "cut";
  let opacity = 1,
    transform = "";
  if (transition === "fade" || transition === "crossfade") opacity = progress;
  if (transition === "slide") transform = `translate(${w * (1 - progress)},0)`;
  if (transition === "zoom") {
    const z = 0.6 + 0.4 * progress;
    transform = `translate(${(w * (1 - z)) / 2},${(h * (1 - z)) / 2}) scale(${z})`;
    opacity = progress;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily: "Arial,sans-serif",
      }}
    >
      {transition !== "cut" && transition !== "fade" && (
        <SceneFrame
          project={project}
          scene={project.scenes[f.index - 1]}
          time={project.scenes[f.index - 1].duration}
        />
      )}
      {transition === "fade" && <rect width={w} height={h} fill="black" />}
      <g opacity={opacity} transform={transform}>
        <SceneFrame
          project={project}
          scene={f.scene}
          time={f.time}
          editable={editable}
        />
      </g>
      {children}
    </svg>
  );
}
