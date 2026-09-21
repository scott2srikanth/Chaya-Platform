import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultProject,
  createElement,
  createDefaultScene,
} from "../../lib/studio/types";
import {
  nativeCharacters,
  parseProject,
  serializeProject,
  locateScene,
  validateCharacter,
} from "../../lib/studio/project";
import { getAnimatedState } from "../../lib/studio/animation-engine";
import { frameAt, elementAt, cameraAt } from "../../lib/studio/frame";
import {
  createClip,
  createKeyframe,
  evaluateClip,
} from "../../lib/studio/clip-engine";
import {
  computeWorldTransforms,
  interpolatePoseTransforms,
  solveTwoBoneIK,
} from "../../lib/studio/rig";
import { useStudioStore } from "../../lib/studio/store";
import { goldenProject } from "../../lib/studio/templates";
import { validateLottie, validateSprite } from "../../lib/studio/assets";
test("animation sequence respects earlier animation until next begins", () => {
  const el = createElement("rectangle", {
    x: 0,
    animations: [
      {
        id: "a",
        property: "x",
        from: 0,
        to: 100,
        startTime: 0,
        duration: 1,
        easing: "linear",
      },
      {
        id: "b",
        property: "x",
        from: 100,
        to: 200,
        startTime: 2,
        duration: 1,
        easing: "linear",
      },
    ],
  });
  assert.equal(getAnimatedState(el, 0.5).x, 50);
  assert.equal(getAnimatedState(el, 1.5).x, 100);
  assert.equal(getAnimatedState(el, 2.5).x, 150);
});
test("project round trip includes assets, clips, character poses and audio", () => {
  const p = goldenProject();
  p.characters![0].poses.push({
    id: "custom",
    name: "Custom",
    category: "custom",
    boneTransforms: { head: { rotation: 20 } },
  });
  p.clips = [
    createClip(p.scenes[0].elements[5].id, "Custom", 2, [
      createKeyframe(0, "custom"),
    ]),
  ];
  const loaded = parseProject(JSON.parse(serializeProject(p)));
  assert.deepEqual(loaded.clips, p.clips);
  assert.deepEqual(loaded.characters, p.characters);
  assert.equal(loaded.version, "2.0");
});
test("migration fills missing version-one collections", () => {
  const p = createDefaultProject("Old");
  p.version = "1.0";
  delete p.characters;
  delete p.clips;
  delete p.audio;
  delete p.assets;
  const loaded = parseProject(p);
  assert.equal(loaded.characters?.length, 4);
  assert.deepEqual(loaded.audio, []);
});
test("reject malformed and future projects", () => {
  assert.throws(() => parseProject({}));
  const p = createDefaultProject("bad");
  p.version = "8";
  assert.throws(() => parseProject(p));
});
test("rig transform and shortest angle interpolation", () => {
  const bones = [
    {
      id: "root",
      name: "Root",
      parentId: null,
      x: 10,
      y: 20,
      length: 20,
      rotation: 90,
      zIndex: 0,
      visuals: [],
    },
    {
      id: "child",
      name: "Child",
      parentId: "root",
      x: 10,
      y: 0,
      length: 10,
      rotation: 0,
      zIndex: 1,
      visuals: [],
    },
  ];
  const map = computeWorldTransforms(bones);
  assert.ok(Math.abs(map.get("child")!.x - 10) < 0.0001);
  assert.equal(map.get("child")!.y, 30);
  assert.equal(
    interpolatePoseTransforms(
      { head: { rotation: 170 } },
      { head: { rotation: -170 } },
      0.5,
    ).head.rotation,
    180,
  );
});
test("reject rig cycle and missing parent", () => {
  const c = nativeCharacters()[0];
  c.rig.bones[0].parentId = c.rig.bones[1].id;
  assert.throws(() => validateCharacter(c));
});
test("two-bone IK reaches target", () => {
  const solution = solveTwoBoneIK({ x: 0, y: 0 }, { x: 60, y: 80 }, 75, 75);
  const a = ((solution.upper + 90) * Math.PI) / 180,
    b = ((solution.upper + 90 + solution.lower) * Math.PI) / 180;
  assert.ok(Math.abs(75 * Math.cos(a) + 75 * Math.cos(b) - 60) < 0.001);
  assert.ok(Math.abs(75 * Math.sin(a) + 75 * Math.sin(b) - 80) < 0.001);
});
test("clip pose interpolation, looping and instance sequencing", () => {
  const p = createDefaultProject("Clips");
  p.characters = nativeCharacters();
  const char = p.characters[0],
    el = createElement("character", { characterId: char.id });
  p.scenes[0].elements = [el];
  char.poses.push({
    id: "one",
    name: "One",
    category: "custom",
    boneTransforms: { head: { rotation: 40 } },
  });
  const c = createClip(el.id, "One", 1, [
    createKeyframe(0, "idle"),
    createKeyframe(1, "one", "linear"),
  ]);
  const c2 = createClip(el.id, "Two", 1, [createKeyframe(0, "one")]);
  c2.startTime = 1;
  c2.blendIn = 0;
  p.clips = [c, c2];
  assert.equal(elementAt(p, p.scenes[0], el, 1.5).pose.head.rotation, 40);
  c.loop = true;
  assert.deepEqual(evaluateClip(c, 0.5, char), evaluateClip(c, 1.5, char));
});
test("frame seeking is deterministic and scene boundaries resolve", () => {
  const p = goldenProject();
  const a = frameAt(p, 4.25);
  frameAt(p, 17);
  assert.deepEqual(frameAt(p, 4.25), a);
  assert.equal(locateScene(p, 5).index, 1);
  assert.equal(locateScene(p, 10000).index, p.scenes.length - 1);
});
test("playback advances object time and does not mutate authoring data", () => {
  const p = goldenProject();
  p.scenes.forEach(scene => scene.script = []); // Voice preparation is covered separately.
  useStudioStore.getState().replaceProject(p);
  const before = serializeProject(useStudioStore.getState().project!);
  useStudioStore.getState().previewScript();
  useStudioStore.getState().tickPlayback(0.5);
  assert.equal(useStudioStore.getState().currentTime, 0.5);
  assert.equal(serializeProject(useStudioStore.getState().project!), before);
  useStudioStore.getState().togglePlayback();
  useStudioStore.getState().previewScript();
  assert.equal(useStudioStore.getState().currentTime, 0.5);
});
test("undo and redo restore character and clip edits", () => {
  useStudioStore.getState().replaceProject(goldenProject());
  const name = useStudioStore.getState().project!.characters![0].name;
  useStudioStore.getState().editProject((p) => {
    p.characters![0].name = "Changed";
  });
  useStudioStore.getState().undo();
  assert.equal(useStudioStore.getState().project!.characters![0].name, name);
  useStudioStore.getState().redo();
  assert.equal(
    useStudioStore.getState().project!.characters![0].name,
    "Changed",
  );
});
test("sprite and lottie validation rejects invalid metadata", () => {
  assert.throws(() => validateSprite(0, 2, 12));
  assert.throws(() => validateLottie({}));
  assert.throws(() =>
    validateLottie({
      fr: 30,
      ip: 0,
      op: 20,
      layers: [],
      assets: [{ p: "http://remote/a.png" }],
    }),
  );
  validateSprite(4, 4, 12);
  validateLottie({ fr: 30, ip: 0, op: 20, layers: [] });
});

test("path motion and style interpolation survive reverse seeking", async () => {
  const { getAnimatedState, getAnimatedStyle } =
    await import("../../lib/studio/animation-engine");
  const e = createElement("rectangle", {
    motionPath: {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      duration: 2,
      startTime: 0,
      easing: "linear",
      loop: false,
    },
    styleKeys: [
      {
        id: "a",
        time: 0,
        fill: "#000000",
        stroke: "#000000",
        blur: 0,
        easing: "linear",
      },
      {
        id: "b",
        time: 2,
        fill: "#ffffff",
        stroke: "#ffffff",
        blur: 10,
        easing: "linear",
      },
    ],
  });
  assert.equal(getAnimatedState(e, 1.5).y, 50);
  assert.equal(getAnimatedState(e, 0.5).x, 50);
  assert.deepEqual(getAnimatedStyle(e, 1), {
    fill: "#808080",
    stroke: "#808080",
    blur: 5,
  });
});
test("reject runtime mutations and invalid camera values", () => {
  const p = goldenProject();
  (p.scenes[0] as any).runtime = () => {};
  assert.throws(() => parseProject(p), /serializable/);
  delete (p.scenes[0] as any).runtime;
  p.scenes[0].camera.zoom = 0;
  assert.throws(() => parseProject(p), /Camera/);
});

test("undoing scene creation preserves a valid active scene and clock", () => {
  const state = () => useStudioStore.getState();
  state().replaceProject(goldenProject());
  state().addScene();
  assert.ok(state().currentTime === 0);
  state().undo();
  assert.ok(state().activeScene());
  state().redo();
  assert.ok(state().activeScene());
});
