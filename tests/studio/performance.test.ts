import { test } from "node:test";
import assert from "node:assert/strict";
import { speechPose } from "../../lib/studio/performance";
import { dialogueSignature } from "../../lib/studio/dialogue";
import { conversationProject } from "../../lib/studio/templates";
import { audioEnergy } from "../../scripts/studio/speech-analysis";
function fixture() {
  const scene = conversationProject().scenes[0],
    actor = scene.elements[0],
    line = scene.script[0];
  line.audioSignature = dialogueSignature(line, actor);
  line.performance = {
    source: "rhubarb",
    duration: 2,
    sampleRate: 10,
    energy: Array(20).fill(0.5),
    beats: [0.5],
    mouthCues: [
      { start: 0, end: 0.2, value: "X" },
      { start: 0.2, end: 0.4, value: "A" },
      { start: 0.4, end: 0.8, value: "D" },
      { start: 0.8, end: 1.2, value: "F" },
      { start: 1.2, end: 2, value: "X" },
    ],
  };
  return { line, actor };
}
test("lip shapes follow the recording and settle closed during silence", () => {
  const { line, actor } = fixture();
  assert.equal(speechPose(line, actor, 0.1).open, 0);
  assert.equal(speechPose(line, actor, 0.3).open, 0);
  assert.ok(speechPose(line, actor, 0.6).open > 0.8);
  assert.equal(speechPose(line, actor, 1).round, 1);
  assert.equal(speechPose(line, actor, 1.4).open, 0);
  assert.equal(speechPose(line, actor, 2.1).beat, 0);
});
test("speech gestures recover to rest and seeking has no accumulated state", () => {
  const { line, actor } = fixture();
  const a = speechPose(line, actor, 0.6);
  assert.ok(a.beat > 0.5);
  assert.equal(speechPose(line, actor, 1.5).beat, 0);
  assert.deepEqual(speechPose(line, actor, 0.6), a);
  line.text = "Changed";
  assert.equal(speechPose(line, actor, 0.6).open, 0);
  assert.equal(speechPose(undefined, actor, 0.6).gesture, 0);
});
test("PCM analysis distinguishes silence from spoken energy and spaces gesture beats", () => {
  const rate = 1000,
    n = 3000,
    b = Buffer.alloc(44 + n * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 500; i < 2500; i++)
    b.writeInt16LE(
      Math.round(Math.sin(i * 0.31) * Math.sin(i * 0.017) * 16000),
      44 + i * 2,
    );
  const result = audioEnergy(b);
  assert.equal(result.energy[0], 0);
  assert.equal(result.energy[149], 0);
  assert.ok(Math.max(...result.energy) > 0.8);
  assert.ok(result.beats.every((v, i) => !i || v - result.beats[i - 1] > 1.15));
});
