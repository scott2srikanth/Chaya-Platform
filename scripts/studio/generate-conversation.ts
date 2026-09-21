import { writeFile, mkdir } from "node:fs/promises";
import { conversationProject } from "../../lib/studio/templates";
import { generateDialogue } from "./voices";
async function main() {
  const project = conversationProject();
  const scene = project.scenes[0];
  const recordings = await generateDialogue(project, scene.id);
  for (const result of recordings) {
    const line = scene.script.find((l) => l.id === result.lineId)!;
    const id = crypto.randomUUID();
    (project.assets ??= []).push({
      id,
      name: line.text,
      type: "audio",
      width: 0,
      height: 0,
      dataUrl: result.dataUrl,
      duration: result.duration,
    });
    line.audioAssetId = id;
    line.audioSignature = result.signature;
    line.performance = result.performance;
    line.duration =
      Math.ceil((result.duration + 0.25) * project.settings.fps) /
      project.settings.fps;
  }
  scene.duration = scene.script.reduce((n, l) => n + l.duration, 0);
  await mkdir("artifacts/studio", { recursive: true });
  await writeFile(
    "artifacts/studio/conversation-voiced.json",
    JSON.stringify(project),
  );
  console.log(
    JSON.stringify({ duration: scene.duration, voices: recordings.length }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
