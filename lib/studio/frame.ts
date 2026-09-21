import type { Project, Scene, SceneElement, CameraState } from "./types";
import { getAnimatedState } from "./animation-engine";
import { applyEasing } from "./easing";
import { evaluateClip } from "./clip-engine";
import {
  interpolatePoseTransforms,
  computeWorldTransforms,
  solveTwoBoneIK,
  BoneTransform,
} from "./rig";
import { frameCamera } from "./dialogue";
import { locateScene, resolveCharacter } from "./project";

export function scriptAt(scene: Scene, time: number) {
  let start = 0;
  for (const line of scene.script) {
    if (time >= start && time < start + line.duration)
      return { line, start, progress: (time - start) / line.duration };
    start += line.duration;
  }
  return null;
}
export function cameraAt(
  scene: Scene,
  time: number,
  w: number,
  h: number,
): CameraState {
  const keys = [...(scene.cameraKeys ?? [])].sort((a, b) => a.time - b.time);
  if (keys.length && scene.cameraMode !== "dialogue") {
    let a = keys[0],
      b = keys[0];
    for (const key of keys) {
      if (key.time <= time) a = key;
      if (key.time >= time) {
        b = key;
        break;
      }
      b = key;
    }
    const t =
      b.time === a.time
        ? 0
        : applyEasing((time - a.time) / (b.time - a.time), b.easing);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      zoom: a.zoom + (b.zoom - a.zoom) * t,
      rotation: a.rotation + (b.rotation - a.rotation) * t,
    };
  }
  const current = scriptAt(scene, time);
  if (current && (scene.cameraMode === "dialogue" || current.line.cameraId)) {
    const shot = (line: typeof current.line) =>
      scene.cameras.find((c) => c.id === line.cameraId) ??
      frameCamera(
        scene,
        scene.elements.find((e) => e.id === line.characterElementId),
        w,
        h,
        line.shot,
      );
    const target = shot(current.line),
      previous =
        current.start > 0 ? scriptAt(scene, current.start - 0.001) : null;
    const source = previous ? shot(previous.line) : target;
    const t =
      target.transition === "cut"
        ? 1
        : applyEasing(
            Math.max(
              0,
              Math.min(
                1,
                (time - current.start) /
                  Math.max(0.001, target.transitionDuration),
              ),
            ),
            "easeInOut",
          );
    const from = { x: source.x, y: source.y, zoom: w / source.viewWidth },
      to = { x: target.x, y: target.y, zoom: w / target.viewWidth };
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      zoom: from.zoom + (to.zoom - from.zoom) * t,
      rotation: 0,
    };
  }
  return scene.camera;
}
export function elementAt(
  project: Project,
  scene: Scene,
  el: SceneElement,
  time: number,
) {
  const state = getAnimatedState(el, time);
  const character = el.characterId
    ? resolveCharacter(project, el.characterId)
    : undefined;
  const current = scriptAt(scene, time);
  let facingRight = el.facingRight ?? true;
  let gesture = el.characterGesture ?? "idle";
  if (current?.line.characterElementId === el.id)
    gesture = current.line.gesture;
  const names: Record<string, string> = {
    idle: "idle",
    talking: "talk",
    pointing: "point",
    waving: "wave",
    thinking: "think",
    celebrating: "celebrate",
  };
  let pose: Record<string, Partial<BoneTransform>> = character?.poses.find(
    (p) => p.id === (el.activePose ?? (el.seated ? "sit" : names[gesture])),
  )?.boneTransforms ?? {};
  const clips = (project.clips ?? [])
    .filter((c) => c.elementId === el.id)
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));
  for (const clip of clips) {
    const start = clip.startTime ?? 0;
    if (time < start) break;
    if (character) {
      const next = evaluateClip(
        clip,
        (time - start) * (clip.speed ?? 1) * (el.characterSpeed ?? 1),
        character,
      );
      const blend = Math.min(
        1,
        (time - start) / Math.max(0.001, clip.blendIn ?? 0.2),
      );
      pose = interpolatePoseTransforms(pose, next, blend);
    }
  }
  for (const action of [...(el.actions ?? [])].sort(
    (a, b) => a.startTime - b.startTime,
  )) {
    if (time < action.startTime) continue;
    const t = Math.min(
      1,
      (time - action.startTime) / Math.max(0.001, action.duration),
    );
    const target = scene.elements.find((e) => e.id === action.targetId);
    const tx = target ? target.x : (action.x ?? el.x),
      ty = target ? target.y : (action.y ?? el.y);
    if (action.type === "walkTo" || action.type === "runTo") {
      state.x = state.x + (tx - state.x) * applyEasing(t, "easeInOut");
      state.y = state.y + (ty - state.y) * applyEasing(t, "easeInOut");
      if (t < 1 && character) {
        const phase =
          (time - action.startTime) * (action.type === "runTo" ? 4 : 2);
        pose = interpolatePoseTransforms(
          character.poses.find((p) => p.id === "walkA")?.boneTransforms ?? {},
          character.poses.find((p) => p.id === "walkB")?.boneTransforms ?? {},
          (Math.sin(phase * Math.PI * 2) + 1) / 2,
        );
      }
    } else if (t < 1) {
      const id = {
        pointAt: "point",
        lookAt: "idle",
        turnTo: "idle",
        sit: "sit",
        stand: "idle",
        wave: "wave",
        talk: "talk",
        think: "think",
        celebrate: "celebrate",
      }[action.type];
      pose = {
        ...(character?.poses.find((p) => p.id === id)?.boneTransforms ?? pose),
      };
      if (action.type === "turnTo") facingRight = tx >= state.x;
      if (action.type === "pointAt" && character) {
        const world = computeWorldTransforms(character.rig.bones, pose),
          upper = character.rig.bones.find((b) => b.id === "upperArmR"),
          lower = character.rig.bones.find((b) => b.id === "lowerArmR");
        if (upper && lower) {
          const root = world.get(upper.id)!;
          const targetX =
            ((tx + (target?.width ?? 0) / 2 - state.x) * 240) /
            Math.max(1, state.width);
          const targetY =
            ((ty + (target?.height ?? 0) / 2 - state.y) * 400) /
            Math.max(1, state.height);
          const solved = solveTwoBoneIK(
            root,
            { x: facingRight ? targetX : 240 - targetX, y: targetY },
            upper.length,
            lower.length,
          );
          pose.upperArmR = {
            rotation:
              solved.upper -
              upper.rotation -
              (world.get(upper.parentId ?? "")?.rotation ?? 0),
          };
          pose.lowerArmR = { rotation: solved.lower - lower.rotation };
        }
      }
      if (["lookAt", "pointAt", "turnTo"].includes(action.type))
        pose.head = {
          ...pose.head,
          rotation: Math.max(
            -35,
            Math.min(
              35,
              (Math.atan2(ty - el.y, Math.abs(tx - el.x) || 1) * 180) / Math.PI,
            ),
          ),
        };
    }
  }
  const expression =
    [...(el.expressionKeys ?? [])]
      .sort((a, b) => a.time - b.time)
      .filter((k) => k.time <= time)
      .pop()?.expression ??
    el.expression ??
    "neutral";
  const transforms =
    character?.expressions?.find((e) => e.id === expression)?.boneTransforms ??
    {};
  pose = { ...pose };
  for (const [bone, value] of Object.entries(transforms))
    pose[bone] = { ...pose[bone], ...value };
  const talking =
    current?.line.characterElementId === el.id ||
    (el.actions ?? []).some(
      (a) =>
        a.type === "talk" &&
        time >= a.startTime &&
        time < a.startTime + a.duration,
    );
  if (talking)
    pose.mouth = {
      ...pose.mouth,
      scaleY: 0.5 + Math.abs(Math.sin(time * 18)) * 1.5,
    };
  const blink = Math.pow(Math.max(0, Math.cos(time * 1.7)), 35);
  for (const id of ["eyeL", "eyeR"])
    if (character?.rig.bones.some((b) => b.id === id))
      pose[id] = { ...pose[id], scaleY: 1 - blink * 0.9 };
  const start = el.startTime ?? 0,
    end = el.endTime ?? scene.duration;
  return {
    state,
    facingRight,
    character: character
      ? {
          ...character,
          appearance: { ...character.appearance, ...el.appearanceOverride },
        }
      : undefined,
    pose,
    visible: el.visible && time >= start && time <= end,
    talking,
  };
}
export function frameAt(project: Project, time: number) {
  const located = locateScene(project, time);
  const scene = located.scene;
  return {
    ...located,
    camera: cameraAt(
      scene,
      located.time,
      project.settings.width,
      project.settings.height,
    ),
    elements: scene.elements.map((e) => ({
      element: e,
      ...elementAt(project, scene, e, located.time),
    })),
  };
}
