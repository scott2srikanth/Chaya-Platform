"use client";

import { useMemo } from "react";
import type {
  RiggedCharacter,
  BoneVisual,
  CharacterAppearance,
  BoneTransform,
  Bone,
} from "@/lib/studio/rig";
import { computeWorldTransforms, resolveVisualColor } from "@/lib/studio/rig";

const BASE_W = 240;
const BASE_H = 400;

function renderVisual(
  visual: BoneVisual,
  idx: number,
  token: string | undefined,
  appearance: CharacterAppearance,
) {
  const fill = resolveVisualColor(visual, token, appearance);
  const stroke = visual.stroke ?? "none";
  const sw = visual.strokeWidth ?? 0;
  const opacity = visual.opacity ?? 1;
  const key = idx;

  switch (visual.type) {
    case "image":
      return (
        <image
          key={key}
          href={visual.src}
          x={visual.offsetX ?? 0}
          y={visual.offsetY ?? 0}
          width={visual.width ?? 50}
          height={visual.height ?? 50}
          opacity={opacity}
        />
      );
    case "ellipse":
      return (
        <ellipse
          key={key}
          cx={visual.cx ?? 0}
          cy={visual.cy ?? 0}
          rx={visual.rx ?? 10}
          ry={visual.ry ?? 10}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={visual.cx ?? 0}
          cy={visual.cy ?? 0}
          r={visual.r ?? 5}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          x={visual.offsetX ?? 0}
          y={visual.offsetY ?? 0}
          width={visual.width ?? 20}
          height={visual.height ?? 20}
          rx={visual.borderRadius ?? 0}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
        />
      );
    case "path":
      return (
        <path
          key={key}
          d={visual.d ?? ""}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          opacity={opacity}
        />
      );
    default:
      return null;
  }
}

interface Props {
  character: RiggedCharacter;
  poseTransforms?: Record<string, Partial<BoneTransform>>;
  width: number;
  height: number;
  facingRight?: boolean;
  selectedBoneId?: string | null;
  onBoneClick?: (boneId: string) => void;
  showBones?: boolean;
}

export default function RigRenderer({
  character,
  poseTransforms = {},
  width,
  height,
  facingRight = true,
  selectedBoneId,
  onBoneClick,
  showBones = false,
}: Props) {
  const sx = width / BASE_W;
  const sy = height / BASE_H;
  const flip = facingRight ? 1 : -1;

  const worldTransforms = useMemo(
    () => computeWorldTransforms(character.rig.bones, poseTransforms),
    [character.rig.bones, poseTransforms],
  );

  const sortedBones = useMemo(() => {
    return [...character.rig.bones].sort((a, b) => a.zIndex - b.zIndex);
  }, [character.rig.bones]);

  return (
    <g
      transform={`translate(${facingRight ? 0 : width},0) scale(${sx * flip}, ${sy})`}
    >
      {sortedBones.map((bone) => {
        const wt = worldTransforms.get(bone.id);
        if (!wt || bone.visuals.length === 0) {
          if (!showBones) return null;
        }

        const tx = facingRight ? wt!.x : BASE_W - wt!.x;
        const rot = facingRight ? wt!.rotation : -wt!.rotation;

        return (
          <g
            key={bone.id}
            transform={`translate(${wt!.x}, ${wt!.y}) rotate(${wt!.rotation}) scale(${wt!.scaleX},${wt!.scaleY}) translate(${-(bone.pivotX ?? 0)},${-(bone.pivotY ?? 0)})`}
            opacity={poseTransforms[bone.id]?.opacity ?? 1}
            data-bone-id={bone.id}
            onClick={
              onBoneClick
                ? (e) => {
                    e.stopPropagation();
                    onBoneClick(bone.id);
                  }
                : undefined
            }
            style={onBoneClick ? { cursor: "pointer" } : undefined}
          >
            {(bone.id === "hair" &&
            !bone.visuals.some((v) => v.type === "image")
              ? [
                  {
                    type: "path" as const,
                    fill: character.appearance.hairColor,
                    d:
                      character.appearance.hairStyle === "long"
                        ? "M-32 -20 L-35 -56 Q-30 -85 0 -78 Q35 -83 35 -48 L32 -15 L25 -53 Q0 -67 -25 -48 Z"
                        : character.appearance.hairStyle === "spiky"
                          ? "M-32 -48 L-38 -76 L-17 -68 L-4 -90 L10 -70 L34 -80 L32 -47 Q0 -64 -32 -48"
                          : character.appearance.hairStyle === "curly"
                            ? "M-32 -48 Q-42 -65 -25 -72 Q-20 -90 -3 -78 Q13 -90 22 -73 Q42 -71 32 -46 Q0 -65 -32 -48"
                            : "M-32 -48 Q-35 -83 0 -78 Q34 -82 32 -48 Q10 -64 -10 -56 Z",
                  },
                ]
              : bone.visuals
            ).map((vis, i) =>
              renderVisual(vis, i, bone.colorToken, character.appearance),
            )}

            {showBones && bone.length > 0 && (
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={bone.length}
                stroke={selectedBoneId === bone.id ? "#f59e0b" : "#3b82f6"}
                strokeWidth={selectedBoneId === bone.id ? 2.5 : 1.5}
                opacity={0.6}
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            )}

            {showBones && (
              <circle
                cx={0}
                cy={0}
                r={selectedBoneId === bone.id ? 4 : 3}
                fill={selectedBoneId === bone.id ? "#f59e0b" : "#3b82f6"}
                stroke="white"
                strokeWidth={1}
                opacity={0.8}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

export function RigPreview({
  character,
  poseTransforms = {},
  size = 120,
}: {
  character: RiggedCharacter;
  poseTransforms?: Record<string, Partial<BoneTransform>>;
  size?: number;
}) {
  const aspect = BASE_W / BASE_H;
  const w = size * aspect;
  const h = size;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
      <RigRenderer
        character={character}
        poseTransforms={poseTransforms}
        width={BASE_W}
        height={BASE_H}
        facingRight={true}
      />
    </svg>
  );
}
