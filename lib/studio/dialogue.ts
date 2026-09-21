import type {
  Project,
  Scene,
  ScriptLine,
  SceneElement,
  AudioTrack,
  SceneCamera,
} from "./types";
export function voiceSettings(character?: SceneElement) {
  return {
    name:
      character?.voice?.name ??
      (character?.characterId?.includes("sarah") ||
      character?.characterId?.includes("mia")
        ? "Samantha"
        : "Daniel (English (UK))"),
    rate: character?.voice?.rate ?? 165,
  };
}
export function dialogueSignature(line: ScriptLine, character?: SceneElement) {
  return JSON.stringify([line.text.trim(), voiceSettings(character)]);
}
export function dialogueTracks(project: Project): AudioTrack[] {
  const tracks: AudioTrack[] = [];
  let sceneStart = 0;
  for (const scene of project.scenes) {
    let start = sceneStart;
    for (const line of scene.script) {
      const character = scene.elements.find(
        (e) => e.id === line.characterElementId,
      );
      const asset = project.assets?.find((a) => a.id === line.audioAssetId);
      if (
        asset?.type === "audio" &&
        start < sceneStart + scene.duration &&
        line.audioSignature === dialogueSignature(line, character)
      )
        tracks.push({
          id: "dialogue-" + line.id,
          name: character?.name ?? "Dialogue",
          assetId: asset.id,
          start,
          offset: 0,
          duration: Math.min(
            line.duration,
            asset.duration ?? line.duration,
            sceneStart + scene.duration - start,
          ),
          volume: 1,
          muted: false,
          kind: "voice",
          fadeIn: 0,
          fadeOut: 0,
        });
      start += line.duration;
    }
    sceneStart += scene.duration;
  }
  return tracks;
}
export function frameCamera(
  scene: Scene,
  character: SceneElement | undefined,
  width: number,
  height: number,
  kind: "wide" | "medium" | "closeup",
): Omit<SceneCamera, "id" | "name"> {
  if (!character || kind === "wide")
    return {
      x: 0,
      y: 0,
      viewWidth: width,
      viewHeight: height,
      transition: "cut",
      transitionDuration: 0,
    };
  const viewHeight = Math.min(
    height,
    character.height * (kind === "closeup" ? 0.7 : 1.35),
  );
  const viewWidth = (viewHeight * width) / height;
  return {
    x: character.x + character.width / 2 - viewWidth / 2,
    y:
      character.y +
      character.height * (kind === "closeup" ? 0.22 : 0.5) -
      viewHeight / 2,
    viewWidth,
    viewHeight,
    transition: "cut",
    transitionDuration: 0,
  };
}
