import { writeFile, mkdir } from "node:fs/promises";
import { goldenProject, presenterProject, conversationProject } from "../../lib/studio/templates";
import { createDefaultProject, createElement } from "../../lib/studio/types";
import { serializeProject, nativeCharacters } from "../../lib/studio/project";
import { PRESETS } from "../../lib/studio/presets";
import { createClip, createKeyframe } from "../../lib/studio/clip-engine";
async function main() {
  await mkdir("examples/studio", { recursive: true });
  const golden = goldenProject();
  await writeFile(
    "examples/studio/website-request.json",
    serializeProject(golden),
  );
  const basic = createDefaultProject("Basic transforms");
  const el = createElement("rectangle", { x: 100, y: 200 });
  el.animations = PRESETS.slideLeft.generate(el, 0, 2);
  basic.scenes[0].elements = [el];
  const text = createDefaultProject("Text reveal");
  text.scenes[0].elements = [
    createElement("text", {
      text: "Design scalable\nsystems",
      textEffect: "typewriter",
      revealDuration: 3,
    }),
  ];
  const camera = createDefaultProject("Camera");
  camera.scenes = [golden.scenes[0]];
  camera.characters = nativeCharacters();
  const audio = createDefaultProject("Audio");
  audio.scenes[0].duration = 2;
  // An original generated sine tone makes the example self-contained and tests audio export.
  const rate = 22050,
    n = rate * 2,
    b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
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
  for (let i = 0; i < n; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 440 * Math.PI * 2) * 1500),
      44 + i * 2,
    );
  audio.assets = [
    {
      id: "tone",
      name: "440 Hz tone",
      type: "audio",
      width: 0,
      height: 0,
      duration: 2,
      dataUrl: "data:audio/wav;base64," + b.toString("base64"),
    },
  ];
  audio.audio = [
    {
      id: "voice",
      name: "Tone",
      kind: "sfx",
      assetId: "tone",
      start: 0,
      offset: 0,
      duration: 2,
      volume: 0.5,
      muted: false,
      fadeIn: 0.2,
      fadeOut: 0.2,
    },
  ];
  audio.scenes[0].elements = [
    createElement("text", {
      text: "Audio + motion",
      textEffect: "words",
      revealDuration: 1,
    }),
  ];
  const character = createDefaultProject("Character poses");
  character.characters = nativeCharacters();
  const alex = createElement("character", {
    characterId: "alex-rigged",
    x: 600,
    y: 300,
  });
  character.scenes[0].elements = [alex];
  character.clips = [
    createClip(alex.id, "Wave", 3, [
      createKeyframe(0, "idle"),
      createKeyframe(1, "wave"),
      createKeyframe(2.5, "idle"),
    ]),
  ];
  for (const [name, project] of Object.entries({
    basic,
    text,
    camera,
    audio,
    character,
    architecture: golden,
    presenter: presenterProject(),
    conversation: conversationProject(),
  }))
    await writeFile(
      "examples/studio/" + name + ".json",
      serializeProject(project),
    );
}
main();
