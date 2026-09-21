"use client";
import { useState } from "react";
import type { HumanActor } from "./render/HumanActor";
import type { Actor3D, SceneElement } from "../../lib/studio/types";
import {
  animationPoseSettings,
  editAnimationPose,
  rebasePosePosture,
  captureJointPose,
  JOINTS,
  jointNodes,
  type JointName,
} from "../../lib/studio/pose3d";
import {
  CHARACTER_POSES,
  CHARACTER_ANIMATIONS,
} from "../../lib/studio/character-directing";
import { actorSettings } from "../../lib/studio/stage3d";
import { Field } from "./StudioControls";
export default function PoseControls3D({
  element,
  actor,
  section,
  change: commit,
  posture,
  animationEditing = false,
}: {
  animationEditing?: boolean;
  element: SceneElement;
  actor: () => HumanActor | undefined;
  section: string;
  change: (patch: Partial<Actor3D>) => void;
  posture: (seated: boolean) => void;
}) {
  const [joint, setJoint] = useState<JointName>("head"),
    [name, setName] = useState(""),
    [editing, setEditing] = useState(false);
  const raw = actorSettings(element),
    config = animationPoseSettings(raw),
    saved = config.savedPoses ?? [];
  const change = (patch: Partial<Actor3D>) =>
    commit(
      animationEditing || section === "Animation"
        ? editAnimationPose(raw, patch)
        : patch,
    );
  const angles = config.jointPose?.[joint];
  const rotate = (axis: number, degrees: number) => {
    const node = actor();
    const rotation = node ? jointNodes(node)[joint]?.rotation : undefined;
    const next: [number, number, number] = angles
      ? [...angles]
      : [rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0];
    next[axis] = (degrees * Math.PI) / 180;
    change({
      manualPose: animationEditing ? !config.motion : true,
      motion: animationEditing ? config.motion : undefined,
      jointPose: { ...config.jointPose, [joint]: next },
    });
  };
  return (
    <>
      {!animationEditing && (
        <Field label="Posture">
          <select
            aria-label="Posture"
            value={element.seated ? "seated" : "standing"}
            onChange={(e) => posture(e.target.value === "seated")}
          >
            <option value="standing">Standing</option>
            <option value="seated">Seated</option>
          </select>
        </Field>
      )}
      {section === "Pose" ? (
        <>
          <Field label="Pose preset">
            <select
              aria-label="Pose preset"
              value={config.pose ?? "neutral"}
              onChange={(e) =>
                change({
                  pose: e.target.value,
                  manualPose: animationEditing ? !config.motion : true,
                  motion: animationEditing ? config.motion : undefined,
                  jointPose: undefined,
                })
              }
            >
              {CHARACTER_POSES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Joint">
            <select
              aria-label="Joint"
              value={joint}
              onChange={(e) => setJoint(e.target.value as JointName)}
            >
              {JOINTS.map((j) => (
                <option key={j} value={j}>
                  {j.replace(/([A-Z])/g, " $1")}
                </option>
              ))}
            </select>
          </Field>
          {["X", "Y", "Z"].map((axis, i) => {
            const current = actor();
            const r = current
              ? jointNodes(current)[joint]?.rotation
              : undefined;
            const degrees = Math.round(
              ((angles?.[i] ?? (r ? [r.x, r.y, r.z][i] : 0)) * 180) / Math.PI,
            );
            return (
              <Field key={axis} label={`${axis} rotation · ${degrees}°`}>
                <input
                  aria-label={`${axis} rotation`}
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={degrees}
                  onChange={(e) => rotate(i, +e.target.value)}
                />
              </Field>
            );
          })}
          <button
            onClick={() => {
              const next = { ...config.jointPose };
              delete next[joint];
              change({ jointPose: next });
            }}
          >
            Reset joint
          </button>
          <p>
            Rotate joints to refine your pose. Arm clearance protection may
            adjust poses that enter the torso.
          </p>
          <Field label="Pose name">
            <input
              aria-label="Pose name"
              value={name}
              placeholder="My interview pose"
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <button
            disabled={!name.trim()}
            onClick={() => {
              const current = actor();
              const joints = current
                ? captureJointPose(current)
                : structuredClone(config.jointPose ?? {});
              change({
                jointPose: joints,
                manualPose: animationEditing ? !config.motion : true,
                motion: animationEditing ? config.motion : undefined,
                savedPoses: [
                  ...saved,
                  {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    pose: config.pose ?? "neutral",
                    joints,
                    seated: !!element.seated,
                  },
                ],
              });
              setName("");
            }}
          >
            Save pose
          </button>
          {saved.map((p) => (
            <div className="ms-row" key={p.id}>
              <button
                onClick={() => {
                  change({
                    pose: p.pose,
                    jointPose: rebasePosePosture(
                      p.joints,
                      p.seated,
                      !!element.seated,
                    ),
                    manualPose: animationEditing ? !config.motion : true,
                    motion: animationEditing ? config.motion : undefined,
                  });
                }}
              >
                {p.name}
              </button>
              <button
                aria-label={`Delete ${p.name}`}
                onClick={() =>
                  change({ savedPoses: saved.filter((v) => v.id !== p.id) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              change({
                jointPose: undefined,
                pose: "neutral",
                manualPose: animationEditing ? !config.motion : true,
                motion: animationEditing ? config.motion : undefined,
              })
            }
          >
            Reset pose
          </button>
        </>
      ) : (
        <>
          <Field label="Animation">
            <select
              aria-label="Animation"
              value={config.motion ?? ""}
              onChange={(e) =>
                change({
                  motion: e.target.value || undefined,
                  manualPose: !e.target.value,
                })
              }
            >
              <option value="">None / static pose</option>
              {CHARACTER_ANIMATIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Speed · ${config.motionSpeed ?? 1}×`}>
            <input
              aria-label="Animation speed"
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={config.motionSpeed ?? 1}
              onChange={(e) => change({ motionSpeed: +e.target.value })}
            />
          </Field>
          <Field label="Start in scene (seconds)">
            <input
              aria-label="Animation start"
              type="number"
              min="0"
              step="0.1"
              value={config.motionStart ?? 0}
              onChange={(e) =>
                change({ motionStart: Math.max(0, +e.target.value) })
              }
            />
          </Field>
          <Field label="End in scene (optional)">
            <input
              aria-label="Animation end"
              type="number"
              min={(config.motionStart ?? 0) + 0.1}
              step="0.1"
              value={config.motionEnd ?? ""}
              onChange={(e) =>
                change({
                  motionEnd: e.target.value
                    ? Math.max((config.motionStart ?? 0) + 0.1, +e.target.value)
                    : undefined,
                })
              }
            />
          </Field>
          <label>
            <input
              type="checkbox"
              checked={config.motionLoop !== false}
              onChange={(e) => change({ motionLoop: e.target.checked })}
            />{" "}
            Loop animation
          </label>
          <Field label="Apply custom pose">
            <select
              aria-label="Apply custom pose"
              value=""
              onChange={(e) => {
                const pose = saved.find((p) => p.id === e.target.value);
                if (!pose) return;
                change({
                  pose: pose.pose,
                  jointPose: rebasePosePosture(
                    pose.joints,
                    pose.seated,
                    !!element.seated,
                  ),
                  manualPose: !config.motion,
                });
              }}
            >
              <option value="">
                {saved.length ? "Choose a saved pose…" : "No saved poses yet"}
              </option>
              {saved.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <button aria-expanded={editing} onClick={() => setEditing(!editing)}>
            {editing ? "Close pose editor" : "Edit animation pose"}
          </button>
          <button
            disabled={!config.jointPose}
            onClick={() => change({ jointPose: undefined })}
          >
            Clear custom pose
          </button>
          <p>
            Custom poses adjust the animation’s starting posture while keeping
            its movement. Reset a joint to restore its original movement.
            Changes affect the whole animation, not a single keyframe.
          </p>
          {editing && (
            <PoseControls3D
              key={element.id}
              element={element}
              actor={actor}
              section="Pose"
              change={commit}
              posture={posture}
              animationEditing
            />
          )}
        </>
      )}
      {!animationEditing && (
        <button
          onClick={() =>
            commit({
              manualPose: false,
              motion: undefined,
              jointPose: undefined,
            })
          }
        >
          Use automatic dialogue gestures
        </button>
      )}
    </>
  );
}
