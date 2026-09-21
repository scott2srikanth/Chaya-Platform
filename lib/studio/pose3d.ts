import type { HumanActor } from "../../components/studio/render/HumanActor";
import {
  actorMotionTime,
  directedPose,
  safeArmPose,
} from "./character-directing";
import type { Actor3D } from "./types";
export const JOINTS = [
  "head",
  "body",
  "leftArm",
  "rightArm",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftLeg",
  "rightLeg",
  "leftKnee",
  "rightKnee",
] as const;
export type JointName = (typeof JOINTS)[number];
export type JointPose = Partial<Record<JointName, [number, number, number]>>;
export interface SavedPose3D {
  id: string;
  name: string;
  pose: string;
  joints: JointPose;
  seated: boolean;
}
export function jointNodes(actor: HumanActor) {
  return {
    head: actor.head,
    body: actor.body,
    leftArm: actor.arms?.[1],
    rightArm: actor.arms?.[0],
    leftElbow: actor.elbows?.[1],
    rightElbow: actor.elbows?.[0],
    leftWrist: actor.wrists?.[1],
    rightWrist: actor.wrists?.[0],
    leftLeg: actor.legs?.[1],
    rightLeg: actor.legs?.[0],
    leftKnee: actor.knees?.[1],
    rightKnee: actor.knees?.[0],
  };
}
export function captureJointPose(actor: HumanActor): JointPose {
  const nodes = jointNodes(actor),
    pose: JointPose = {};
  for (const key of JOINTS) {
    const r = nodes[key]?.rotation;
    if (r) pose[key] = [r.x, r.y, r.z];
  }
  return pose;
}
/** Layer saved rotations onto the clip's movement from its first frame.
 * Full-body pose snapshots must not pin every animated joint in place. */
export function applyJointPose(
  actor: HumanActor,
  pose?: JointPose,
  animation?: { config: Actor3D; seated: boolean; time: number },
) {
  const nodes = jointNodes(actor);
  let reference: JointPose | undefined;
  if (
    animation &&
    animation.config.motion &&
    !animation.config.manualPose &&
    actorMotionTime(animation.config, animation.time).active
  ) {
    const d = directedPose(animation.config.pose, animation.config.motion, 0);
    reference = {
      head: d.head as [number, number, number],
      body: [0, 0, animation.seated ? 0 : d.body],
    };
    for (const [side, i] of [
      ["left", 1],
      ["right", 0],
    ] as const) {
      reference[`${side}Arm`] = d.arms[i];
      reference[`${side}Elbow`] = [d.elbows[i], 0, 0];
      reference[`${side}Wrist`] = [0, 0, d.wrists[i]];
      reference[`${side}Leg`] = [
        animation.seated ? -Math.PI / 2 : d.legs[i],
        0,
        0,
      ];
      reference[`${side}Knee`] = [
        animation.seated ? Math.PI / 2 : d.knees[i],
        0,
        0,
      ];
    }
  }
  for (const key of JOINTS) {
    const value = pose?.[key],
      node = nodes[key],
      base = reference?.[key];
    if (value && node) {
      if (base)
        node.rotation.set(
          node.rotation.x + value[0] - base[0],
          node.rotation.y + value[1] - base[1],
          node.rotation.z + value[2] - base[2],
        );
      else node.rotation.set(...value);
    }
  }
}
export function protectArms(actor: HumanActor) {
  actor.arms?.forEach((arm, i) => {
    const elbow = actor.elbows?.[i];
    if (!elbow) return;
    const safe = safeArmPose(
      [arm.rotation.x, arm.rotation.y, arm.rotation.z],
      elbow.rotation.x,
      i,
    );
    arm.rotation.set(...safe.arm);
    elbow.rotation.x = safe.elbow;
  });
}
/** Same deterministic directing, seated posture, overrides and arm guard as the scene renderer. */
export function previewPose(
  actor: HumanActor,
  config: Actor3D,
  seated: boolean,
  time: number,
) {
  config = animationPoseSettings(config);
  const clock = actorMotionTime(config, time);
  const d = directedPose(
    config.pose,
    !config.manualPose && clock.active ? config.motion : undefined,
    config.motionLoop === false ? Math.min(clock.time, 3.19999) : clock.time,
  );
  actor.arms?.forEach((v, i) => v.rotation.set(...d.arms[i]));
  actor.elbows?.forEach((v, i) => v.rotation.set(d.elbows[i], 0, 0));
  actor.wrists?.forEach((v, i) => v.rotation.set(0, 0, d.wrists[i]));
  actor.legs?.forEach((v, i) =>
    v.rotation.set(seated ? -Math.PI / 2 : d.legs[i], 0, 0),
  );
  actor.knees?.forEach((v, i) =>
    v.rotation.set(seated ? Math.PI / 2 : d.knees[i], 0, 0),
  );
  actor.head?.rotation.set(d.head[0], d.head[1], d.head[2]);
  if (actor.body) {
    actor.body.rotation.set(0, 0, seated ? 0 : d.body);
    actor.body.position.y = seated ? -0.43 : d.lift;
  }
  applyJointPose(actor, config.jointPose, { config, seated, time });
  protectArms(actor);
  actor.updateRig?.(0, 0, 0);
}
export function validateJointPose(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid 3D joint pose");
  for (const [key, angles] of Object.entries(value))
    if (
      !JOINTS.includes(key as JointName) ||
      !Array.isArray(angles) ||
      angles.length !== 3 ||
      angles.some((v) => !Number.isFinite(v) || Math.abs(v) > Math.PI)
    )
      throw new Error("Invalid 3D joint rotation");
}

export function animationPoseSettings(config: Actor3D): Actor3D {
  if (!config.motion || config.manualPose || !config.animationPoses)
    return config;
  const saved = config.animationPoses[config.motion];
  return {
    ...config,
    pose: saved?.pose ?? "neutral",
    jointPose: saved?.joints,
  };
}
/** Migrate the old shared override to its current clip, then edit only that clip. */
export function editAnimationPose(
  config: Actor3D,
  patch: Partial<Actor3D>,
): Partial<Actor3D> {
  const animationPoses = { ...config.animationPoses };
  if (!config.animationPoses && config.motion)
    animationPoses[config.motion] = {
      pose: config.pose,
      joints: config.jointPose,
    };
  const motion = config.motion;
  const result = { ...patch, animationPoses };
  if (motion && ("jointPose" in patch || "pose" in patch)) {
    animationPoses[motion] = {
      ...animationPoses[motion],
      ...("jointPose" in patch ? { joints: patch.jointPose } : {}),
      ...("pose" in patch ? { pose: patch.pose } : {}),
    };
    delete result.jointPose;
    delete result.pose;
  }
  return result;
}

/** Keep pose refinements relative to the chosen standing/seated leg posture. */
export function rebasePosePosture(
  pose: JointPose | undefined,
  fromSeated: boolean,
  toSeated: boolean,
): JointPose | undefined {
  if (!pose) return undefined;
  const result = structuredClone(pose);
  if (fromSeated === toSeated) return result;
  const shift = ((toSeated ? 1 : -1) * Math.PI) / 2;
  for (const side of ["left", "right"] as const) {
    const leg = result[`${side}Leg`],
      knee = result[`${side}Knee`];
    if (leg) leg[0] = Math.max(-Math.PI, Math.min(Math.PI, leg[0] - shift));
    if (knee) knee[0] = Math.max(-Math.PI, Math.min(Math.PI, knee[0] + shift));
  }
  return result;
}
