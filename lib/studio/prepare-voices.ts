import type { Project, ScriptLine } from "./types";
import { dialogueSignature } from "./dialogue";

export function missingVoiceLines(project: Project, sceneId: string): ScriptLine[] {
  const scene = project.scenes.find(s => s.id === sceneId);
  return scene?.script.filter(line => {
    if (!line.text.trim()) return false;
    const speaker = scene.elements.find(e => e.id === line.characterElementId);
    const asset = project.assets?.find(a => a.id === line.audioAssetId && a.type === "audio");
    return !asset || !line.performance || line.audioSignature !== dialogueSignature(line, speaker);
  }) ?? [];
}
export interface RecordedLine {
  lineId: string; signature: string; dataUrl: string; duration: number;
  performance: ScriptLine["performance"];
}
export function applyRecordedVoices(project: Project, sceneId: string, lines: RecordedLine[]) {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene || lines.some(result => {
    const line = scene.script.find(l => l.id === result.lineId);
    return !line || dialogueSignature(line, scene.elements.find(e => e.id === line.characterElementId)) !== result.signature;
  })) throw new Error("The script or voice changed while preparing speech. Press Play again.");
  for (const result of lines) {
    const line = scene.script.find(l => l.id === result.lineId)!;
    const speaker = scene.elements.find(e => e.id === line.characterElementId);
    const id = crypto.randomUUID();
    (project.assets ??= []).push({id, name: `${speaker?.name ?? "Voice"} — ${line.text.slice(0,32)}`, type: "audio", width: 0, height: 0, dataUrl: result.dataUrl, duration: result.duration});
    line.audioAssetId = id; line.audioSignature = result.signature; line.performance = result.performance;
    line.duration = Math.ceil((result.duration + .25) * project.settings.fps) / project.settings.fps;
  }
  scene.duration = Math.max(scene.duration, scene.script.reduce((n,l) => n+l.duration,0));
}
export async function recordMissingVoices(project: Project, sceneId: string): Promise<RecordedLine[]> {
  const missing = missingVoiceLines(project, sceneId);
  if (!missing.length) return [];
  const scene = project.scenes.find(s => s.id === sceneId)!;
  if (missing.some(l => !scene.elements.some(e => e.type === "character" && e.id === l.characterElementId)))
    throw new Error("Assign a character to each script line before playing.");
  // Send only the lines that need recording; keep each character's assigned voice.
  const requestProject = {...project, scenes: project.scenes.map(s => s.id === sceneId ? {...s, script: missing} : s)};
  let response: Response;
  try {
    response = await fetch("http://127.0.0.1:4319/narration", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({project: requestProject, sceneId}), signal: AbortSignal.timeout(180000)});
  } catch { throw new Error("Could not reach the local voice service. Start npm run studio, then press Play again."); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not prepare character voices.");
  return data.lines;
}
