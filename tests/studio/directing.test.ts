import { test } from "node:test";
import assert from "node:assert/strict";
import { directedPose } from "../../lib/studio/character-directing";
import { conversationProject } from "../../lib/studio/templates";
import { useStudioStore } from "../../lib/studio/store";
import { parseProject, serializeProject } from "../../lib/studio/project";
test("selected poses hold while animations vary deterministically across forward and reverse seeking", () => {
  assert.deepEqual(
    directedPose("think", undefined, 0),
    directedPose("think", undefined, 8),
  );
  assert.notDeepEqual(
    directedPose(undefined, "wave", 0.3),
    directedPose(undefined, "wave", 0.9),
  );
  const pose = directedPose(undefined, "wave", 0.3);
  directedPose(undefined, "wave", 10);
  assert.deepEqual(directedPose(undefined, "wave", 0.3), pose);
});
test("one transform drag undoes together and pose/motion settings survive serialization", () => {
  const p = conversationProject(),
    id = p.scenes[0].elements[0].id;
  useStudioStore.getState().replaceProject(p);
  const s = useStudioStore.getState();
  s.beginEdit();
  s.updateElement(id, {
    actor3d: { ...p.scenes[0].elements[0].actor3d!, x: 2, scale: 1.4 },
  });
  s.updateElement(id, {
    actor3d: {
      ...p.scenes[0].elements[0].actor3d!,
      x: 3,
      scale: 1.6,
      rotation: 1,
    },
  });
  s.endEdit();
  s.undo();
  assert.equal(
    useStudioStore.getState().activeScene()!.elements[0].actor3d!.x,
    -0.95,
  );
  s.redo();
  assert.equal(
    useStudioStore.getState().activeScene()!.elements[0].actor3d!.scale,
    1.6,
  );
  s.updateElement(id, {
    actor3d: {
      ...useStudioStore.getState().activeScene()!.elements[0].actor3d!,
      pose: "think",
      manualPose: true,
    },
  });
  const result = parseProject(
    JSON.parse(serializeProject(useStudioStore.getState().project!)),
  );
  assert.equal(result.scenes[0].elements[0].actor3d!.pose, "think");
  assert.equal(result.scenes[0].elements[0].actor3d!.manualPose, true);
});

test("background actions use independent clocks and travel clamps across seeking", async () => {
  const {actorMotionTime, actorTravel} = await import("../../lib/studio/character-directing");
  const a = {...conversationProject().scenes[0].elements[0].actor3d!, motionStart: 2, motionEnd: 6, motionSpeed: 2, travel: {x: 4, z: 2, start: 2, duration: 4}};
  assert.equal(actorMotionTime(a, 1).active, false);
  assert.deepEqual(actorMotionTime(a, 3), {active: true, time: 2});
  assert.equal(actorMotionTime(a, 6).active, false);
  assert.deepEqual(actorTravel(a, 0), {x: a.x, z: a.z});
  assert.deepEqual(actorTravel(a, 9), {x: 4, z: 2});
  assert.notEqual(directedPose(undefined, "walk", 0.3).legs[0], 0);
});
test("bundled CC0 library contains every catalogued clip and embedded geometry", async () => {
  const {readFile} = await import("node:fs/promises");
  const buffer = await readFile("public/studio/animations/quaternius/human-library.glb");
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const data = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
  const names = JSON.parse(await readFile("lib/studio/animation-library.json", "utf8"));
  assert.deepEqual(data.animations.map((a: {name: string}) => a.name), names);
  assert.equal(names.length, 46); assert.ok(data.skins.length); assert.ok(data.meshes.length);
  assert.equal(data.buffers[0].uri, undefined);
});
test("mixed explainer round-trips with 3D, 2D, overlays and an independent background actor", async () => {
  const {mixedExplainerProject} = await import("../../lib/studio/templates");
  const p = parseProject(JSON.parse(serializeProject(mixedExplainerProject())));
  assert.deepEqual(p.scenes.map(s => s.stage3d), [true, false, true]);
  assert.ok(p.scenes[0].elements.some(e => e.actor3d?.travel));
  assert.ok(p.scenes.every(s => s.elements.some(e => e.type === "text" && e.animations.length)));
});

test("native pose and animation forearms stay outside the torso clearance volume", async () => {
  const {CHARACTER_POSES, CHARACTER_ANIMATIONS, safeArmPose, armIntersectsTorso} = await import("../../lib/studio/character-directing");
  for (const pose of CHARACTER_POSES) for (const motion of [undefined, ...CHARACTER_ANIMATIONS.map(a => a.id)]) for (const time of [0, 0.3, 0.8, 1.4, 2.1, 3]) {
    const p = directedPose(pose.id, motion, time);
    p.arms.forEach((arm, i) => {
      const safe = safeArmPose(arm, p.elbows[i], i);
      assert.equal(armIntersectsTorso(safe.arm, safe.elbow, i), false, `${pose.id}/${motion}/${time}/${i}`);
    });
  }
});
test("interview has two seated actors facing each other with seated camera coverage", async () => {
  const {interviewProject} = await import("../../lib/studio/templates");
  const {camera3DAt} = await import("../../lib/studio/stage3d");
  const p = parseProject(JSON.parse(serializeProject(interviewProject())));
  const scene = p.scenes[0];
  assert.equal(scene.stageSet, "interview");
  assert.ok(scene.elements.every(e => e.seated));
  assert.equal(scene.elements[0].actor3d!.rotation, Math.PI / 2);
  assert.equal(scene.elements[1].actor3d!.rotation, -Math.PI / 2);
  assert.ok(camera3DAt(scene, 9).target[1] < 1.3);
});
