import { test } from "node:test";
import assert from "node:assert/strict";
import { conversationProject } from "../../lib/studio/templates";
import { dialogueSignature, dialogueTracks } from "../../lib/studio/dialogue";
import { camera3DAt, spatialShot } from "../../lib/studio/stage3d";
import { cameraAt } from "../../lib/studio/frame";
import { parseProject, serializeProject } from "../../lib/studio/project";
import { wavDuration, resolveVoiceName } from "../../scripts/studio/voices";
test("3D camera cuts exactly at the dialogue boundary and reverse seeking is deterministic", () => {
  const scene = conversationProject().scenes[0];
  const wide = camera3DAt(scene, 0),
    second = spatialShot(scene.elements[1], "medium");
  assert.deepEqual(camera3DAt(scene, 4.499), wide);
  assert.deepEqual(camera3DAt(scene, 4.5), second);
  camera3DAt(scene, 12);
  assert.deepEqual(camera3DAt(scene, 4.5), second);
  assert.deepEqual(
    camera3DAt(scene, 20),
    spatialShot(scene.elements[1], "closeup"),
  );
});
test("named cameras override automatic shots and blend on a new line", () => {
  const scene = conversationProject().scenes[0];
  const cam = {
    id: "custom",
    name: "Custom",
    x: 500,
    y: 200,
    viewWidth: 800,
    viewHeight: 450,
    transition: "smooth" as const,
    transitionDuration: 1,
    spatial: {
      position: [0, 2, 4] as [number, number, number],
      target: [0, 1, 0] as [number, number, number],
    },
  };
  scene.cameras.push(cam);
  scene.script[1].cameraId = cam.id;
  const start = camera3DAt(scene, 0);
  assert.deepEqual(camera3DAt(scene, 4.5), start);
  assert.deepEqual(camera3DAt(scene, 5.5), cam.spatial);
  const middle = camera3DAt(scene, 5);
  assert.equal(middle.position[0], start.position[0] / 2);
  assert.equal(cameraAt(scene, 5.5, 1920, 1080).zoom, 1920 / 800);
});
test("recorded dialogue follows reordering and excludes stale voices or lines past the scene", () => {
  const p = conversationProject(),
    scene = p.scenes[0],
    line = scene.script[0];
  p.assets = [
    {
      id: "voice",
      name: "Voice",
      type: "audio",
      dataUrl: "data:audio/wav;base64,AA==",
      width: 0,
      height: 0,
      duration: 3,
    },
  ];
  line.audioAssetId = "voice";
  line.audioSignature = dialogueSignature(line, scene.elements[0]);
  assert.equal(dialogueTracks(p)[0].start, 0);
  [scene.script[0], scene.script[1]] = [scene.script[1], scene.script[0]];
  assert.equal(dialogueTracks(p)[0].start, 5);
  scene.duration = 6;
  assert.equal(dialogueTracks(p)[0].duration, 1);
  scene.duration = 4;
  assert.equal(dialogueTracks(p).length, 0);
  scene.duration = 18;
  scene.elements[0].voice!.rate = 200;
  assert.equal(dialogueTracks(p).length, 0);
});
test("spatial cast, captions and voice assignments survive portable project serialization", () => {
  const p = conversationProject(),
    roundtrip = parseProject(JSON.parse(serializeProject(p)));
  assert.deepEqual(roundtrip.scenes, parseProject(p).scenes);
});
test("WAV duration uses PCM data size and byte rate", () => {
  const b = Buffer.alloc(1044);
  b.write("RIFF");
  b.writeUInt32LE(1036, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt32LE(1000, 28);
  b.write("data", 36);
  b.writeUInt32LE(1000, 40);
  assert.equal(wavDuration(b), 1);
  assert.throws(() => wavDuration(Buffer.alloc(44)), /WAV/);
});

test("system voice aliases resolve across macOS display-name variants without guessing ambiguous languages", () => {
  assert.equal(
    resolveVoiceName("Samantha", [{ name: "Samantha (English (US))" }]),
    "Samantha (English (US))",
  );
  assert.equal(
    resolveVoiceName("Daniel (English (UK))", [{ name: "Daniel" }]),
    "Daniel",
  );
  assert.throws(
    () =>
      resolveVoiceName("Eddy", [
        { name: "Eddy (English (UK))" },
        { name: "Eddy (English (US))" },
      ]),
    /ambiguous/,
  );
});
