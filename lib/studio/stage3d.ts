import type { Actor3D, Scene, SceneElement, SceneCamera } from "./types";
import { scriptAt } from "./frame";
export function actorSettings(el: SceneElement): Actor3D {
  return (
    el.actor3d ?? {
      x: (el.x + el.width / 2 - 960) / 400,
      z: 0,
      rotation: 0,
      shirt: el.characterId?.includes("sarah") ? "#c46c45" : "#557789",
      skin: "#d7a47e",
      hair: "#332b2a",
    }
  );
}
export function spatialShot(
  el: SceneElement | undefined,
  kind: string,
): NonNullable<SceneCamera["spatial"]> {
  if (el?.seated && kind !== "wide") {
    const a = actorSettings(el);
    return { position: [a.x + (a.x < 0 ? 1.7 : -1.7), 1.38, a.z + 2.1], target: [a.x, 1.16, a.z] };
  }
  if (!el || kind === "wide")
    return { position: [3.6, 2.5, 7.5], target: [0, 1.05, 0] };
  const a = actorSettings(el),
    distance = kind === "closeup" ? 1.65 : 3;
  return {
    position: [a.x + (a.x < 0 ? 0.3 : -0.3), 1.65, a.z + distance],
    target: [a.x, kind === "closeup" ? 1.66 : 1.35, a.z],
  };
}
export function camera3DAt(scene: Scene, time: number) {
  const end = scene.script.reduce((n, l) => n + l.duration, 0);
  const current = scriptAt(scene, Math.min(time, Math.max(0, end - 0.000001)));
  const shot = (line: NonNullable<typeof current>["line"]) => {
    const cam = scene.cameras.find((c) => c.id === line.cameraId);
    return {
      spatial:
        cam?.spatial ??
        (scene.stageSet === "interview" && line.shot === "wide" ? {position: [0, 2.1, 5.6] as [number, number, number], target: [0, 0.95, 0] as [number, number, number]} : spatialShot(
          scene.elements.find((e) => e.id === line.characterElementId),
          line.shot,
        )),
      transition: cam?.transition ?? "cut",
      duration: cam?.transitionDuration ?? 0,
    };
  };
  if (!current) return scene.stageSet === "interview" ? {position: [0, 2.1, 5.6] as [number, number, number], target: [0, 0.95, 0] as [number, number, number]} : spatialShot(undefined, "wide");
  const target = shot(current.line),
    previous =
      current.start > 0 ? scriptAt(scene, current.start - 0.001) : null;
  const source = previous ? shot(previous.line) : target;
  let t =
    target.transition === "cut"
      ? 1
      : Math.min(1, (time - current.start) / Math.max(0.001, target.duration));
  t = t * t * (3 - 2 * t);
  const mix = (a: number[], b: number[]) =>
    a.map((x, i) => x + (b[i] - x) * t) as [number, number, number];
  return {
    position: mix(source.spatial.position, target.spatial.position),
    target: mix(source.spatial.target, target.spatial.target),
  };
}
