"use client";
import { useStudioStore } from "@/lib/studio/store";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type {
  RiggedCharacter,
  Pose,
  BoneTransform,
  Bone,
} from "@/lib/studio/rig";
import {
  interpolatePoseTransforms,
  computeWorldTransforms,
} from "@/lib/studio/rig";
import {
  getRiggedCharacter,
  getCharacterPose,
} from "@/lib/studio/built-in-rigs";
import RigRenderer, { RigPreview } from "./RigRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RotateCcw,
  Save,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Plus,
  Play,
  Pause,
} from "lucide-react";

const BASE_W = 240;
const BASE_H = 400;
const CANVAS_PAD = 40;

interface Props {
  characterId: string;
  onBack: () => void;
  onSavePose?: (charId: string, pose: Pose) => void;
}

export default function PoseEditor(props: Props) {
  const character = useStudioStore((s) => s.character(props.characterId));
  if (!character) return <p>Character not found</p>;
  return <PoseEditorBody {...props} character={character} />;
}
function PoseEditorBody({
  characterId,
  onBack,
  onSavePose,
  character,
}: Props & { character: RiggedCharacter }) {
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [activePoseId, setActivePoseId] = useState<string>("idle");
  const [customTransforms, setCustomTransforms] = useState<
    Record<string, Partial<BoneTransform>>
  >({});
  const [isNewPose, setIsNewPose] = useState(false);
  const [newPoseName, setNewPoseName] = useState("");
  const [expandedBones, setExpandedBones] = useState(true);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewT, setPreviewT] = useState(0);
  const animRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startY: number; startRot: number } | null>(null);

  const activePose = getCharacterPose(character, activePoseId);
  const currentTransforms = isNewPose
    ? customTransforms
    : (activePose?.boneTransforms ?? {});

  const selectedBone = character.rig.bones.find((b) => b.id === selectedBoneId);
  const selectedTransform = selectedBoneId
    ? (currentTransforms[selectedBoneId] ?? {})
    : {};

  const updateBoneTransform = useCallback(
    (boneId: string, update: Partial<BoneTransform>) => {
      setCustomTransforms((prev) => ({
        ...prev,
        [boneId]: { ...(prev[boneId] ?? {}), ...update },
      }));
      if (!isNewPose) setIsNewPose(true);
    },
    [isNewPose],
  );

  const resetBoneTransform = useCallback((boneId: string) => {
    setCustomTransforms((prev) => {
      const next = { ...prev };
      delete next[boneId];
      return next;
    });
  }, []);

  const loadPose = useCallback(
    (poseId: string) => {
      const pose = getCharacterPose(character!, poseId);
      if (pose) {
        setActivePoseId(poseId);
        setCustomTransforms(JSON.parse(JSON.stringify(pose.boneTransforms)));
        setIsNewPose(false);
      }
    },
    [character],
  );

  const handleSavePose = useCallback(() => {
    const name = newPoseName.trim() || `Custom Pose ${Date.now()}`;
    const pose: Pose = {
      id: `custom-${Date.now()}`,
      name,
      category: "custom",
      boneTransforms: { ...customTransforms },
    };
    onSavePose?.(characterId, pose);
    setNewPoseName("");
    setIsNewPose(false);
  }, [customTransforms, newPoseName, characterId, onSavePose]);

  // Drag to rotate bone
  const handleBoneDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!selectedBoneId) return;
      const startY = e.clientY;
      const startRot = customTransforms[selectedBoneId]?.rotation ?? 0;
      dragRef.current = { startY, startRot };

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dy = ev.clientY - dragRef.current.startY;
        const newRot = dragRef.current.startRot + dy * 0.8;
        setCustomTransforms((prev) => ({
          ...prev,
          [selectedBoneId]: {
            ...(prev[selectedBoneId] ?? {}),
            rotation: Math.round(newRot * 10) / 10,
          },
        }));
        if (!isNewPose) setIsNewPose(true);
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [selectedBoneId, customTransforms, isNewPose],
  );

  // Pose preview animation
  useEffect(() => {
    if (!previewPlaying) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPreviewT((t) => (t + dt * 0.5) % 1);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [previewPlaying]);

  const viewW = BASE_W + CANVAS_PAD * 2;
  const viewH = BASE_H + CANVAS_PAD * 2;

  const editableBones = character.rig.bones.filter(
    (b) => b.id !== "root" && b.id !== "nose" && b.id !== "hair",
  );

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            Pose Editor -- {character.name}
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          className="flex-1 flex items-center justify-center bg-slate-800/50 relative"
          onPointerDown={handleBoneDrag}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${viewW} ${viewH}`}
            style={{ maxWidth: 500, maxHeight: 600 }}
          >
            {/* Grid */}
            <defs>
              <pattern
                id="pose-grid"
                width={20}
                height={20}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth={0.5}
                />
              </pattern>
            </defs>
            <rect width={viewW} height={viewH} fill="url(#pose-grid)" />

            {/* Center line */}
            <line
              x1={viewW / 2}
              y1={0}
              x2={viewW / 2}
              y2={viewH}
              stroke="rgba(59,130,246,0.1)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            <g transform={`translate(${CANVAS_PAD}, ${CANVAS_PAD})`}>
              <RigRenderer
                character={character}
                poseTransforms={
                  previewPlaying
                    ? interpolatePoseTransforms(
                        character.poses[0]?.boneTransforms ?? {},
                        currentTransforms,
                        (Math.sin(previewT * Math.PI * 2) + 1) / 2,
                      )
                    : currentTransforms
                }
                width={BASE_W}
                height={BASE_H}
                facingRight={true}
                selectedBoneId={selectedBoneId}
                onBoneClick={setSelectedBoneId}
                showBones={true}
              />
            </g>
          </svg>

          {selectedBoneId && (
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
              <span className="text-blue-400 font-medium">
                {selectedBone?.name}
              </span>
              <span className="text-slate-500 mx-2">|</span>
              Drag up/down to rotate
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-56 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Pose selector */}
          <div className="p-2 border-b border-slate-700/50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Poses
            </p>
            <div className="flex flex-wrap gap-1">
              {character.poses.map((pose) => (
                <button
                  key={pose.id}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    activePoseId === pose.id && !isNewPose
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                  onClick={() => loadPose(pose.id)}
                >
                  {pose.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bone controls */}
          <div className="flex-1 overflow-y-auto">
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50"
              onClick={() => setExpandedBones(!expandedBones)}
            >
              Bone Controls
              {expandedBones ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {expandedBones && (
              <div className="px-2 pb-2 space-y-1">
                {editableBones.map((bone) => {
                  const bt = currentTransforms[bone.id];
                  const isActive = selectedBoneId === bone.id;
                  const hasOverride = bt && (bt.rotation || bt.x || bt.y);
                  return (
                    <div
                      key={bone.id}
                      className={`rounded-md border px-2 py-1.5 transition-all cursor-pointer ${
                        isActive
                          ? "border-blue-500/50 bg-blue-950/30"
                          : hasOverride
                            ? "border-amber-500/30 bg-amber-950/10"
                            : "border-slate-700/30 hover:border-slate-600/50"
                      }`}
                      onClick={() =>
                        setSelectedBoneId(isActive ? null : bone.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-medium ${isActive ? "text-blue-300" : hasOverride ? "text-amber-300" : "text-slate-400"}`}
                        >
                          {bone.name}
                        </span>
                        {hasOverride && (
                          <button
                            className="text-slate-600 hover:text-red-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetBoneTransform(bone.id);
                            }}
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {isActive && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-slate-500 w-6">
                              Rot
                            </span>
                            <input
                              type="range"
                              min={-180}
                              max={180}
                              step={1}
                              value={bt?.rotation ?? 0}
                              onChange={(e) =>
                                updateBoneTransform(bone.id, {
                                  rotation: Number(e.target.value),
                                })
                              }
                              className="flex-1 h-1 accent-blue-500"
                            />
                            <span className="text-[9px] text-slate-400 w-8 text-right font-mono">
                              {(bt?.rotation ?? 0).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-slate-500 w-6">
                              X
                            </span>
                            <input
                              type="range"
                              min={-50}
                              max={50}
                              step={1}
                              value={bt?.x ?? 0}
                              onChange={(e) =>
                                updateBoneTransform(bone.id, {
                                  x: Number(e.target.value),
                                })
                              }
                              className="flex-1 h-1 accent-blue-500"
                            />
                            <span className="text-[9px] text-slate-400 w-8 text-right font-mono">
                              {(bt?.x ?? 0).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-slate-500 w-6">
                              Y
                            </span>
                            <input
                              type="range"
                              min={-50}
                              max={50}
                              step={1}
                              value={bt?.y ?? 0}
                              onChange={(e) =>
                                updateBoneTransform(bone.id, {
                                  y: Number(e.target.value),
                                })
                              }
                              className="flex-1 h-1 accent-blue-500"
                            />
                            <span className="text-[9px] text-slate-400 w-8 text-right font-mono">
                              {(bt?.y ?? 0).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save area */}
          {isNewPose && (
            <div className="p-2 border-t border-slate-700 space-y-1.5">
              <Input
                value={newPoseName}
                onChange={(e) => setNewPoseName(e.target.value)}
                placeholder="Pose name..."
                className="h-7 text-[11px] bg-slate-800 border-slate-600 text-slate-200"
              />
              <Button
                size="sm"
                className="w-full h-7 text-[10px] bg-amber-600 hover:bg-amber-500"
                onClick={handleSavePose}
              >
                <Save className="w-3 h-3 mr-1" />
                Save Pose
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
