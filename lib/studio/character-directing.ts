import { Euler, Quaternion, Vector3 } from "three";
export const CHARACTER_POSES = [
  { id: "neutral", name: "Neutral" },
  { id: "relaxed", name: "Relaxed" },
  { id: "hips", name: "Hands on hips" },
  { id: "folded", name: "Arms folded" },
  { id: "point", name: "Point" },
  { id: "wave", name: "Greeting" },
  { id: "think", name: "Thinking" },
  { id: "celebrate", name: "Celebrate" },
];
export const CHARACTER_ANIMATIONS = [
  { id: "idle", name: "Idle / breathe" },
  { id: "walk", name: "Walk" },
  { id: "run", name: "Run" },
  { id: "clap", name: "Applaud" },
  { id: "shrug", name: "Shrug" },
  { id: "type", name: "Typing" },
  { id: "phone", name: "Phone call" },
  { id: "no", name: "Shake head" },
  { id: "point", name: "Present / point" },
  { id: "stretch", name: "Stretch" },
  { id: "dance", name: "Dance" },
  { id: "wave", name: "Wave" },
  { id: "talk", name: "Explain" },
  { id: "nod", name: "Nod" },
  { id: "look", name: "Look around" },
  { id: "celebrate", name: "Celebrate" },
];
export function directedPose(
  pose: string | undefined,
  motion: string | undefined,
  time: number,
) {
  const arms: [[number, number, number], [number, number, number]] = [
      [0, 0, -0.075],
      [0, 0, 0.075],
    ],
    elbows = [-0.08, -0.08],
    wrists = [0, 0],
    head = [0, 0, 0];
  let body = 0, lift = 0;
  const legs = [0, 0], knees = [0, 0];
  const apply = (name: string, strength = 1) => {
    switch (name) {
      case "relaxed":
        arms[0][2] = -0.18;
        arms[1][2] = 0.18;
        elbows[0] = -0.25;
        elbows[1] = -0.25;
        break;
      case "hips":
        arms[0] = [0, 0, -0.55];
        arms[1] = [0, 0, 0.55];
        elbows[0] = -1.2;
        elbows[1] = -1.2;
        break;
      case "folded":
        arms[0] = [-0.6, 0, -0.45];
        arms[1] = [-0.6, 0, 0.45];
        elbows[0] = -1.8;
        elbows[1] = -1.8;
        break;
      case "point":
        arms[1] = [-0.8, 0, 0.25];
        elbows[1] = -0.2;
        break;
      case "wave":
        arms[1] = [-0.15, 0, 1.9 * strength];
        elbows[1] = -0.85 * strength;
        break;
      case "think":
        arms[1] = [-0.5, 0, 0.18];
        elbows[1] = -2.2;
        head[0] = 0.12;
        break;
      case "celebrate":
        arms[0] = [-0.15, 0, -2.1 * strength];
        arms[1] = [-0.15, 0, 2.1 * strength];
        elbows[0] = -0.5;
        elbows[1] = -0.5;
        break;
    }
  };
  apply(pose ?? "neutral");
  if (motion) {
    const t = Math.max(0, time),
      cycle = t % 3.2,
      envelope = Math.sin(Math.PI * Math.min(1, cycle / 2.4)) ** 2;
    if (motion === "idle") lift = Math.sin(t * 1.8) * 0.006;
    if (motion === "walk" || motion === "run") {
      const run = motion === "run", phase = t * (run ? 9 : 5.5);
      for (let i = 0; i < 2; i++) {
        const swing = Math.sin(phase + i * Math.PI);
        legs[i] = swing * (run ? 0.8 : 0.45);
        knees[i] = Math.max(0, -swing) * (run ? 1.25 : 0.65);
        arms[i][0] = -swing * (run ? 0.65 : 0.35);
        elbows[i] = run ? -1.2 : -0.25;
      }
      lift = Math.abs(Math.sin(phase)) * (run ? 0.065 : 0.025);
    }
    if (motion === "clap") {
      arms[0] = [-0.9, -0.45, -0.22]; arms[1] = [-0.9, 0.45, 0.22];
      elbows[0] = elbows[1] = -0.8;
      arms[0][1] -= Math.sin(t * 9) * 0.15; arms[1][1] += Math.sin(t * 9) * 0.15;
    }
    if (motion === "shrug") {
      arms[0][2] = -0.55 * envelope; arms[1][2] = 0.55 * envelope;
      elbows[0] = elbows[1] = -1.1 * envelope; head[2] = envelope * 0.1;
    }
    if (motion === "type") {
      arms[0][0] = arms[1][0] = -0.35; elbows[0] = elbows[1] = -1.1;
      wrists[0] = Math.sin(t * 12) * 0.08; wrists[1] = Math.cos(t * 12) * 0.08; head[0] = 0.2;
    }
    if (motion === "phone") { apply("think"); head[2] = 0.1; arms[1][2] = 0.25; }
    if (motion === "no") head[1] = Math.sin(t * 4) * 0.2;
    if (motion === "point") { apply("point"); elbows[1] -= envelope * 0.3; }
    if (motion === "stretch") { apply("celebrate"); body = Math.sin(t * 1.3) * 0.09; }
    if (motion === "dance") {
      apply("relaxed"); body = Math.sin(t * 4) * 0.08;
      legs[0] = Math.sin(t * 4) * 0.2; legs[1] = -legs[0];
      elbows[0] = -0.7 + Math.sin(t * 4) * 0.4; elbows[1] = -0.7 - Math.sin(t * 4) * 0.4;
      lift = Math.abs(Math.sin(t * 4)) * 0.04;
    }
    if (motion === "wave") {
      apply("wave", 0.85 + 0.15 * envelope);
      wrists[1] = Math.sin(t * 9) * 0.3;
    }
    if (motion === "talk") {
      arms[1] = [-0.25 * envelope, 0, 0.15 + 0.2 * envelope];
      elbows[1] = -0.2 - 0.9 * envelope;
      elbows[0] = -0.1 - 0.3 * envelope;
      body = envelope * 0.025;
    }
    if (motion === "nod") head[0] = Math.sin(t * 3.5) * 0.1;
    if (motion === "look") head[1] = Math.sin(t * 1.4) * 0.35;
    if (motion === "celebrate") {
      apply("celebrate", 0.85 + 0.15 * envelope);
      body = Math.sin(t * 3) * 0.025;
    }
  }
  return { arms, elbows, wrists, head, body, legs, knees, lift };
}

/** Scene-clock evaluation is deterministic when scrubbing or exporting out of order. */
export function actorMotionTime(actor: import("./types").Actor3D, time: number) {
  const start = actor.motionStart ?? 0;
  const end = actor.motionEnd ?? Infinity;
  return { active: time >= start && time < end,
    time: Math.max(0, time - start) * Math.max(0.1, actor.motionSpeed ?? 1) };
}
export function actorTravel(actor: import("./types").Actor3D, time: number) {
  const path = actor.travel;
  const progress = path ? Math.max(0, Math.min(1, (time - path.start) / Math.max(0.01, path.duration))) : 0;
  return { x: actor.x + ((path?.x ?? actor.x) - actor.x) * progress,
    z: actor.z + ((path?.z ?? actor.z) - actor.z) * progress };
}

/** Sample the forearm and hand against the native torso, in body-local space.
 * Includes hand thickness; shoulder/sleeve contact is intentional. */
export function armIntersectsTorso(arm: [number, number, number], elbow: number, index: number) {
  const shoulder = new Vector3(index ? 0.215 : -0.215, 1.405, 0);
  const upper = new Quaternion().setFromEuler(new Euler(...arm));
  const lower = upper.clone().multiply(new Quaternion().setFromEuler(new Euler(elbow, 0, 0)));
  const joint = new Vector3(0, -0.33, 0).applyQuaternion(upper).add(shoulder);
  for (let i = 0; i <= 12; i++) {
    const point = new Vector3(0, -i * 0.032, 0).applyQuaternion(lower).add(joint);
    if (point.y > 0.94 && point.y < 1.47 && Math.abs(point.x) < 0.255 && Math.abs(point.z) < 0.205) return true;
  }
  return false;
}
export function safeArmPose(arm: [number, number, number], elbow: number, index: number) {
  if (!armIntersectsTorso(arm, elbow, index)) return {arm, elbow};
  // Forearms forward, elbows outside the torso; deterministic, no stateful solver.
  return {arm: [-0.45, 0, (index ? 1 : -1) * 0.3] as [number, number, number], elbow: -0.85};
}
