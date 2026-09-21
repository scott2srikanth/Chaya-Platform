import type { Project, Scene } from "./types";
export function presenterActions(scene: Scene) {
  return scene.elements
    .flatMap((element) =>
      (element.whiteboard?.liveCommands ?? []).map((action, index) => ({
        element,
        index,
        action,
        start: (element.startTime ?? 0) + action.start,
        end: (element.startTime ?? 0) + action.start + action.duration,
      })),
    )
    .sort((a, b) => a.start - b.start);
}
/** A standalone scene timeline with audio rebased from the full project. */
export function presenterTimelineProject(
  project: Project,
  sceneId: string,
): Project {
  const scene = project.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error("Select a presenter scene.");
  const actions = presenterActions(scene);
  if (!actions.length)
    throw new Error(
      "Record a presenter command before exporting its timeline.",
    );
  const duration = Math.max(...actions.map((a) => a.end)) + 3;
  const offset = project.scenes
    .slice(0, project.scenes.indexOf(scene))
    .reduce((n, s) => n + s.duration, 0);
  const result = structuredClone(project);
  result.metadata.name = `${project.metadata.name} — ${scene.name}`;
  result.scenes = [structuredClone(scene)];
  result.scenes[0].duration = duration;
  result.scenes[0].elements = result.scenes[0].elements.map((e) => ({
    ...e,
    endTime: Math.min(e.endTime ?? duration, duration),
  }));
  const ids = new Set(scene.elements.map((e) => e.id));
  result.clips = result.clips?.filter((c) => ids.has(c.elementId));
  result.audio = project.audio?.flatMap((a) => {
    const start = Math.max(a.start, offset),
      end = Math.min(a.start + a.duration, offset + duration);
    return end > start
      ? [
          {
            ...a,
            start: start - offset,
            offset: a.offset + start - a.start,
            duration: end - start,
          },
        ]
      : [];
  });
  return result;
}
