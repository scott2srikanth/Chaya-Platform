import { test } from "node:test";
import assert from "node:assert/strict";
import { conversationProject } from "../../lib/studio/templates";
import { parseProject, serializeProject } from "../../lib/studio/project";
import { createHuman } from "../../components/studio/render/HumanActor";
import {
  rebasePosePosture,
  animationPoseSettings,
  editAnimationPose,
  captureJointPose,
  previewPose,
} from "../../lib/studio/pose3d";
test("saved 3D pose roundtrips with per-character overrides", () => {
  const p = conversationProject(),
    a = p.scenes[0].elements[0].actor3d!;
  a.jointPose = { head: [0.2, 0.3, 0] };
  a.savedPoses = [
    {
      id: "pose1",
      name: "Listening",
      pose: "relaxed",
      joints: a.jointPose,
      seated: true,
    },
  ];
  const restored = parseProject(JSON.parse(serializeProject(p)));
  assert.deepEqual(restored.scenes[0].elements[0].actor3d, a);
});
test("invalid joint rotations and malformed saved poses are rejected", () => {
  for (const joints of [
    { head: [Infinity, 0, 0] },
    { unknown: [0, 0, 0] },
    { head: [0, 0] },
    { head: [4, 0, 0] },
  ]) {
    const p = conversationProject();
    p.scenes[0].elements[0].actor3d!.jointPose = joints as any;
    assert.throws(() => parseProject(p));
  }
});
test("preview pose scrubs deterministically and overrides seated joints", () => {
  const el = conversationProject().scenes[0].elements[0],
    actor = createHuman(el),
    config = {
      ...el.actor3d!,
      motion: "wave",
      manualPose: false,
      jointPose: { head: [0.2, 0.3, 0] as [number, number, number] },
    };
  previewPose(actor, config, true, 0.7);
  const q = actor.arms![1].quaternion.clone();
  previewPose(actor, config, true, 2);
  previewPose(actor, config, true, 0.7);
  assert.ok(q.angleTo(actor.arms![1].quaternion) < 1e-7);
  assert.equal(actor.head!.rotation.y, 0.3);
  assert.equal(actor.legs![0].rotation.x, -Math.PI / 2);
  previewPose(actor, { ...config, manualPose: true }, false, 0.2);
  const staticQ = actor.arms![1].quaternion.clone();
  previewPose(actor, { ...config, manualPose: true }, false, 2);
  assert.ok(staticQ.angleTo(actor.arms![1].quaternion) < 1e-7);
});

test("a custom pose holds edited joints while other animation joints continue", () => {
  const el = conversationProject().scenes[0].elements[0],
    actor = createHuman(el);
  const config = {
    ...el.actor3d!,
    motion: "wave",
    manualPose: false,
    jointPose: { head: [0.2, 0.3, 0] as [number, number, number] },
  };
  previewPose(actor, config, false, 0.1);
  const wrist = actor.wrists![1].rotation.z;
  previewPose(actor, config, false, 0.5);
  assert.equal(actor.head!.rotation.y, 0.3);
  assert.notEqual(actor.wrists![1].rotation.z, wrist);
  previewPose(
    actor,
    { ...config, motion: "look", jointPose: undefined },
    false,
    0.5,
  );
  assert.notEqual(actor.head!.rotation.y, 0.3);
});

test("full-body saved pose preserves animated joint motion and reverse scrubbing", () => {
  const el = conversationProject().scenes[0].elements[0],
    actor = createHuman(el);
  const base = { ...el.actor3d!, motion: "wave", manualPose: false };
  previewPose(actor, base, false, 0);
  const joints = captureJointPose(actor);
  joints.head = [0.2, 0.3, 0];
  const config = { ...base, jointPose: joints };
  previewPose(actor, config, false, 0.2);
  const first = actor.wrists![1].rotation.z;
  previewPose(actor, config, false, 0.6);
  const second = actor.wrists![1].rotation.z;
  assert.notEqual(first, second);
  assert.equal(actor.head!.rotation.y, 0.3);
  previewPose(actor, config, false, 0.2);
  assert.equal(actor.wrists![1].rotation.z, first);
  previewPose(actor, { ...config, manualPose: true }, false, 0.6);
  assert.equal(actor.wrists![1].rotation.z, joints.leftWrist![2]);
});

test("animation poses are isolated, restored on switching back and survive save/load", () => {
  const p = conversationProject(),
    el = p.scenes[0].elements[0];
  let config: import("../../lib/studio/types").Actor3D = {
    ...el.actor3d!,
    motion: "wave",
    manualPose: false,
    jointPose: { head: [0.2, 0.3, 0] as [number, number, number] },
  };
  config = { ...config, ...editAnimationPose(config, { motion: "walk" }) };
  assert.equal(animationPoseSettings(config).jointPose, undefined);
  config = {
    ...config,
    ...editAnimationPose(config, { jointPose: { head: [0, -0.2, 0] } }),
  };
  assert.equal(animationPoseSettings(config).jointPose!.head![1], -0.2);
  config = { ...config, ...editAnimationPose(config, { motion: "wave" }) };
  assert.equal(animationPoseSettings(config).jointPose!.head![1], 0.3);
  el.actor3d = config;
  const restored = parseProject(JSON.parse(serializeProject(p))).scenes[0]
    .elements[0].actor3d!;
  assert.equal(animationPoseSettings(restored).jointPose!.head![1], 0.3);
  assert.equal(
    animationPoseSettings({ ...restored, motion: "walk" }).jointPose!.head![1],
    -0.2,
  );
  config = {
    ...config,
    ...editAnimationPose(config, { jointPose: undefined }),
  };
  assert.equal(animationPoseSettings(config).jointPose, undefined);
  assert.equal(
    animationPoseSettings({ ...config, motion: "walk" }).jointPose!.head![1],
    -0.2,
  );
});

test("saved poses adapt to current posture without changing upper-body edits", () => {
  const standing = {
    head: [0.2, 0.3, 0] as [number, number, number],
    leftLeg: [0, 0, 0] as [number, number, number],
    leftKnee: [0, 0, 0] as [number, number, number],
  };
  const seated = rebasePosePosture(standing, false, true)!;
  assert.equal(seated.leftLeg![0], -Math.PI / 2);
  assert.equal(seated.leftKnee![0], Math.PI / 2);
  assert.deepEqual(seated.head, standing.head);
  assert.equal(standing.leftLeg[0], 0);
  assert.deepEqual(rebasePosePosture(seated, true, false), standing);
  const el = conversationProject().scenes[0].elements[0],
    actor = createHuman(el);
  previewPose(
    actor,
    { ...el.actor3d!, manualPose: true, jointPose: seated },
    true,
    0,
  );
  assert.equal(actor.body!.position.y, -0.43);
  assert.equal(actor.legs![1].rotation.x, -Math.PI / 2);
});
