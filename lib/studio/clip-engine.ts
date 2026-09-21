import type { BoneTransform, Pose, RiggedCharacter } from "./rig";
import { interpolatePoseTransforms } from "./rig";
import type { EasingType } from "./types";
import { applyEasing } from "./easing";

// ─── Data Model ─────────────────────────────────────────────────────

export interface Keyframe {
  id: string;
  time: number; // seconds from clip start
  poseId: string;
  transforms?: Record<string, Partial<BoneTransform>>;
  easing: EasingType; // easing curve INTO this keyframe
}

export interface AnimationClip {
  id: string;
  name: string;
  elementId: string; // which scene element this clip controls
  duration: number; // total clip duration in seconds
  loop: boolean;
  startTime?: number;
  speed?: number;
  characterId?: string;
  blendIn?: number;
  keyframes: Keyframe[]; // sorted by time
}

// ─── Helpers ────────────────────────────────────────────────────────

export function createKeyframe(
  time: number,
  poseId: string,
  easing: EasingType = "easeInOut",
): Keyframe {
  return { id: crypto.randomUUID(), time, poseId, easing };
}

export function createClip(
  elementId: string,
  name: string,
  duration: number,
  keyframes: Keyframe[] = [],
): AnimationClip {
  return {
    id: crypto.randomUUID(),
    name,
    elementId,
    duration,
    loop: false,
    keyframes: [...keyframes].sort((a, b) => a.time - b.time),
  };
}

export function insertKeyframe(
  clip: AnimationClip,
  kf: Keyframe,
): AnimationClip {
  const keyframes = [...clip.keyframes, kf].sort((a, b) => a.time - b.time);
  return { ...clip, keyframes };
}

export function removeKeyframe(
  clip: AnimationClip,
  keyframeId: string,
): AnimationClip {
  return {
    ...clip,
    keyframes: clip.keyframes.filter((k) => k.id !== keyframeId),
  };
}

export function updateKeyframe(
  clip: AnimationClip,
  keyframeId: string,
  updates: Partial<Keyframe>,
): AnimationClip {
  const keyframes = clip.keyframes.map((k) =>
    k.id === keyframeId ? { ...k, ...updates } : k,
  );
  if (updates.time !== undefined) keyframes.sort((a, b) => a.time - b.time);
  return { ...clip, keyframes };
}

// ─── Clip Evaluation ────────────────────────────────────────────────

function resolvePoseTransforms(
  character: RiggedCharacter,
  poseId: string,
): Record<string, Partial<BoneTransform>> {
  const pose = character.poses.find((p) => p.id === poseId);
  return pose?.boneTransforms ?? {};
}

export function evaluateClip(
  clip: AnimationClip,
  time: number,
  character: RiggedCharacter,
): Record<string, Partial<BoneTransform>> {
  const { keyframes, duration, loop } = clip;

  if (keyframes.length === 0) return {};

  let t = time;
  if (loop && duration > 0) {
    t = t % duration;
  } else {
    t = Math.max(0, Math.min(t, duration));
  }

  // Single keyframe - use it directly
  if (keyframes.length === 1) {
    return (
      keyframes[0].transforms ??
      resolvePoseTransforms(character, keyframes[0].poseId)
    );
  }

  // Before first keyframe
  if (t <= keyframes[0].time) {
    return (
      keyframes[0].transforms ??
      resolvePoseTransforms(character, keyframes[0].poseId)
    );
  }

  // After last keyframe
  const last = keyframes[keyframes.length - 1];
  if (t >= last.time) {
    if (loop && duration > 0) {
      // Interpolate from last keyframe back to first
      const segDuration = duration - last.time + keyframes[0].time;
      if (segDuration <= 0)
        return last.transforms ?? resolvePoseTransforms(character, last.poseId);
      const elapsed = t - last.time;
      const raw = elapsed / segDuration;
      const eased = applyEasing(raw, keyframes[0].easing);
      const fromPose =
        last.transforms ?? resolvePoseTransforms(character, last.poseId);
      const toPose =
        keyframes[0].transforms ??
        resolvePoseTransforms(character, keyframes[0].poseId);
      return interpolatePoseTransforms(fromPose, toPose, eased);
    }
    return last.transforms ?? resolvePoseTransforms(character, last.poseId);
  }

  // Between two keyframes - find the segment
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kfA = keyframes[i];
    const kfB = keyframes[i + 1];
    if (t >= kfA.time && t <= kfB.time) {
      const segDuration = kfB.time - kfA.time;
      if (segDuration <= 0)
        return kfB.transforms ?? resolvePoseTransforms(character, kfB.poseId);
      const raw = (t - kfA.time) / segDuration;
      const eased = applyEasing(raw, kfB.easing);
      const fromPose =
        kfA.transforms ?? resolvePoseTransforms(character, kfA.poseId);
      const toPose =
        kfB.transforms ?? resolvePoseTransforms(character, kfB.poseId);
      return interpolatePoseTransforms(fromPose, toPose, eased);
    }
  }

  return last.transforms ?? resolvePoseTransforms(character, last.poseId);
}

// ─── Built-in Demo Clips ────────────────────────────────────────────

export function createWalkCycleClip(elementId: string): AnimationClip {
  return createClip(elementId, "Walk Cycle", 2, [
    createKeyframe(0, "idle", "easeInOut"),
    createKeyframe(0.5, "walkA", "easeInOut"),
    createKeyframe(1.0, "idle", "easeInOut"),
    createKeyframe(1.5, "walkB", "easeInOut"),
  ]);
}

export function createGreetingClip(elementId: string): AnimationClip {
  return createClip(elementId, "Greeting", 4, [
    createKeyframe(0, "idle", "easeInOut"),
    createKeyframe(0.8, "wave", "easeOut"),
    createKeyframe(2.0, "talk", "easeInOut"),
    createKeyframe(3.2, "present", "easeInOut"),
    createKeyframe(3.8, "idle", "easeOut"),
  ]);
}

export function createPresentationClip(elementId: string): AnimationClip {
  return createClip(elementId, "Presentation", 6, [
    createKeyframe(0, "idle", "easeInOut"),
    createKeyframe(1.0, "talk", "easeInOut"),
    createKeyframe(2.0, "point", "easeOut"),
    createKeyframe(3.0, "talk", "easeInOut"),
    createKeyframe(4.0, "think", "easeInOut"),
    createKeyframe(5.0, "celebrate", "easeOut"),
    createKeyframe(5.6, "idle", "easeInOut"),
  ]);
}

export function createConversationClip(
  elementId: string,
  role: "speaker" | "listener",
): AnimationClip {
  if (role === "speaker") {
    return createClip(elementId, "Speaker", 5, [
      createKeyframe(0, "idle", "easeInOut"),
      createKeyframe(0.5, "talk", "easeOut"),
      createKeyframe(1.5, "point", "easeInOut"),
      createKeyframe(2.5, "talk", "easeInOut"),
      createKeyframe(3.5, "think", "easeInOut"),
      createKeyframe(4.5, "idle", "easeOut"),
    ]);
  }
  return createClip(elementId, "Listener", 5, [
    createKeyframe(0, "idle", "easeInOut"),
    createKeyframe(1.0, "talk", "easeInOut"),
    createKeyframe(2.0, "idle", "easeInOut"),
    createKeyframe(3.5, "celebrate", "easeOut"),
    createKeyframe(4.5, "idle", "easeInOut"),
  ]);
}

export const CLIP_PRESETS = [
  { id: "walk-cycle", name: "Walk Cycle", create: createWalkCycleClip },
  { id: "greeting", name: "Greeting", create: createGreetingClip },
  { id: "presentation", name: "Presentation", create: createPresentationClip },
  {
    id: "speaker",
    name: "Speaker",
    create: (eid: string) => createConversationClip(eid, "speaker"),
  },
  {
    id: "listener",
    name: "Listener",
    create: (eid: string) => createConversationClip(eid, "listener"),
  },
] as const;
