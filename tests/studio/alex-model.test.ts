import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usesAlexModel } from "../../lib/studio/character-models";
import { conversationProject } from "../../lib/studio/templates";
import { parseProject, serializeProject } from "../../lib/studio/project";

test("Alex upgrades old UV projects without replacing Sarah or custom imports; opt-out persists", () => {
  const p = conversationProject(), alex = p.scenes[0].elements.find(e => e.characterId === "alex")!;
  assert.ok(alex);
  alex.actor3d!.faceTexture = "data:image/png;base64,legacy";
  assert.equal(usesAlexModel(alex), true);
  assert.equal(usesAlexModel(p.scenes[0].elements.find(e => e.characterId === "sarah")!), false);
  alex.actor3d!.modelUrl = "data:model/gltf-binary;base64,custom";
  assert.equal(usesAlexModel(alex), false);
  delete alex.actor3d!.modelUrl;
  alex.actor3d!.characterModel = "procedural";
  const restored = parseProject(JSON.parse(serializeProject(p))).scenes[0].elements.find(e => e.id === alex.id)!;
  assert.equal(usesAlexModel(restored), false);
});

test("bundled Alex has embedded UV textures, skinning and bounded mouth morphs", () => {
  const buffer = readFileSync("public/studio/characters/alex/alex.glb");
  assert.ok(buffer.byteLength < 6 * 1024 * 1024, "Keep Alex's browser download below 6 MB");
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const length = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + length).toString());
  assert.ok(gltf.images.every((image: any) => image.uri === undefined && Number.isInteger(image.bufferView)));
  assert.ok(gltf.nodes.some((node: any) => node.name === "Head"));
  assert.ok(gltf.nodes.some((node: any) => node.name === "Alex_Parted_Hair"));
  assert.ok(gltf.skins[0].joints.length > 50);
  const body = gltf.meshes.find((mesh: any) => mesh.extras?.targetNames?.includes("jawOpen"));
  assert.deepEqual(body.extras.targetNames, ["jawOpen", "mouthPucker"]);
  for (const primitive of body.primitives) {
    assert.ok(primitive.attributes.TEXCOORD_0 !== undefined);
    assert.ok(primitive.attributes.JOINTS_0 !== undefined);
    for (const target of primitive.targets) {
      const accessor = gltf.accessors[target.POSITION];
      assert.equal(accessor.count, gltf.accessors[primitive.attributes.POSITION].count);
      assert.ok([...accessor.min, ...accessor.max].every(v => Number.isFinite(v) && Math.abs(v) <= .03));
    }
  }
});

test("Sarah upgrades independently and explicit/custom appearances survive a project round trip", async () => {
  const { sculptedCharacter } = await import("../../lib/studio/character-models");
  const p = conversationProject(), sarah = p.scenes[0].elements.find(e => e.characterId === "sarah")!;
  assert.equal(sculptedCharacter(sarah), "sarah");
  assert.equal(sculptedCharacter(p.scenes[0].elements.find(e => e.characterId === "alex")!), "alex");
  sarah.actor3d!.characterModel = "procedural";
  assert.equal(sculptedCharacter(parseProject(JSON.parse(serializeProject(p))).scenes[0].elements.find(e => e.id === sarah.id)!), undefined);
  sarah.actor3d!.characterModel = "sarah-v1";
  assert.equal(sculptedCharacter(sarah), "sarah");
  sarah.actor3d!.modelUrl = "data:model/gltf-binary;base64,custom";
  assert.equal(sculptedCharacter(sarah), undefined);
});

test("Sarah's asset has embedded textures, female geometry, rigged hair and compatible speech targets", () => {
  const buffer = readFileSync("public/studio/characters/sarah/sarah.glb");
  assert.ok(buffer.byteLength < 7 * 1024 * 1024);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
  assert.ok(gltf.images.every((image: any) => image.uri === undefined && Number.isInteger(image.bufferView)));
  assert.ok(gltf.nodes.some((node: any) => node.name === "Sarah_Long_Hair" && node.skin === 0));
  assert.ok(gltf.meshes.some((mesh: any) => mesh.name === "Superhero_Female"));
  assert.ok(gltf.skins[0].joints.length > 50);
  const body = gltf.meshes.find((mesh: any) => mesh.extras?.targetNames?.includes("jawOpen"));
  assert.deepEqual(body.extras.targetNames, ["jawOpen", "mouthPucker"]);
  for (const primitive of body.primitives) {
    for (const target of primitive.targets) {
      const a = gltf.accessors[target.POSITION];
      assert.equal(a.count, gltf.accessors[primitive.attributes.POSITION].count);
      assert.ok([...a.min, ...a.max].every(v => Number.isFinite(v) && Math.abs(v) <= .03));
    }
  }
});
