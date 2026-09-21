import { writeFile, mkdir } from "node:fs/promises";
import { mixedExplainerProject } from "../../lib/studio/templates";
import { generateDialogue } from "./voices";
async function main() {
  const project = mixedExplainerProject();
  for (const scene of project.scenes) {
    const recordings = await generateDialogue(project, scene.id);
    for (const result of recordings) {
      const line = scene.script.find(l => l.id === result.lineId)!;
      const id = crypto.randomUUID();
      project.assets!.push({id, name: line.text, type: "audio", width: 0, height: 0, dataUrl: result.dataUrl, duration: result.duration});
      line.audioAssetId = id; line.audioSignature = result.signature; line.performance = result.performance;
      line.duration = Math.ceil((result.duration + 0.4) * 30) / 30;
    }
    scene.duration = scene.script.reduce((sum, l) => sum + l.duration, 0);
    for (const el of scene.elements) if (el.actor3d?.motion) {
      el.actor3d.motionEnd = scene.duration;
      if (el.actor3d.travel) el.actor3d.travel.duration = scene.duration;
    }
  }
  await mkdir("artifacts/studio", {recursive: true});
  await writeFile("artifacts/studio/mixed-explainer.json", JSON.stringify(project));
  console.log("Generated voiced mixed explainer:", project.scenes.map(s => s.duration));
}
main().catch(e => {console.error(e); process.exit(1);});
