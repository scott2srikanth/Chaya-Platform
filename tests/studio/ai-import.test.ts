import { test } from "node:test";
import assert from "node:assert/strict";
import {
  importAIProject,
  applyRoomResponse,
  validateRoomResponse,
  projectPrompt,
  roomPrompt,
} from "../../lib/studio/ai-import";
import { parseProject, serializeProject } from "../../lib/studio/project";
import { Scene as ThreeScene, Mesh } from "three";
import { createGeneratedRoom } from "../../components/studio/render/GeneratedRoom";
const response = () =>
  JSON.parse(projectPrompt("A five scene explainer")).response;
test("AI multi-scene project creates actors, linked dialogue, voices and background briefs", () => {
  const data = response();
  data.scenes.push({ ...structuredClone(data.scenes[0]), id: "scene-2" });
  const project = importAIProject(JSON.stringify(data));
  assert.equal(project.scenes.length, 2);
  for (const scene of project.scenes) {
    assert.ok(scene.backgroundDescription);
    assert.equal(scene.elements.length, 2);
    assert.ok(scene.elements[0].voice?.name);
    assert.ok(
      scene.script.every((line) =>
        scene.elements.some((actor) => actor.id === line.characterElementId),
      ),
    );
    assert.equal(scene.script[0].cameraId, scene.cameras[0].id);
  }
});
test("room responses route by scene ID, preserve dialogue and survive serialization", () => {
  const data = response();
  data.scenes.push({ ...structuredClone(data.scenes[0]), id: "scene-2" });
  const p = importAIProject(JSON.stringify(data));
  const room = JSON.parse(roomPrompt(p, "scene-2", "Green room")).response;
  const next = applyRoomResponse(p, JSON.stringify(room));
  assert.equal(next.scenes[0].room3d, undefined);
  assert.ok(next.scenes[1].room3d);
  assert.equal(p.scenes[1].room3d, undefined);
  assert.deepEqual(next.scenes[1].script, p.scenes[1].script);
  const restored = parseProject(JSON.parse(serializeProject(next)));
  assert.deepEqual(restored.scenes[1].room3d, room.room);
  room.projectId = "wrong";
  assert.throws(() => validateRoomResponse(JSON.stringify(room), p));
  room.projectId = p.id;
  room.sceneId = "missing";
  assert.throws(() => validateRoomResponse(JSON.stringify(room), p));
});
test("AI rejects bad shapes, resource limits, speakers, timing and malformed JSON", () => {
  const p = importAIProject(JSON.stringify(response()));
  const room = JSON.parse(roomPrompt(p, p.scenes[0].id, "Test")).response;
  room.room.objects[0].shape = "script";
  assert.throws(() => validateRoomResponse(JSON.stringify(room), p));
  const bad = response();
  bad.scenes[0].dialogue[0].speaker = "other";
  assert.throws(() => importAIProject(JSON.stringify(bad)));
  const timing = response();
  timing.scenes[0].duration = 1;
  assert.throws(() => importAIProject(JSON.stringify(timing)));
  assert.throws(() => importAIProject("{"));
  const crowded = JSON.parse(roomPrompt(p, p.scenes[0].id, "Test")).response;
  crowded.room.objects = Array.from({ length: 251 }, (_, i) => ({
    ...crowded.room.objects[0],
    id: `obj-${i}`,
  }));
  assert.throws(() => validateRoomResponse(JSON.stringify(crowded), p));
});
test("room geometry uses full dimensions and degree rotation in the renderer", () => {
  const p = importAIProject(JSON.stringify(response()));
  const room = JSON.parse(roomPrompt(p, p.scenes[0].id, "Test")).response;
  room.room.objects[1].rotation = [0, 90, 0];
  const validated = validateRoomResponse(JSON.stringify(room), p);
  const world = new ThreeScene();
  createGeneratedRoom(world, validated.room);
  const wall = world.getObjectByName("Back wall") as Mesh;
  assert.equal(wall.rotation.y, Math.PI / 2);
  assert.equal(wall.scale.x, 10);
  assert.equal(wall.position.z, -3);
  world.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as any).dispose();
    }
  });
});
