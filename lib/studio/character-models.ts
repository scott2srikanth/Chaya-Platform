import type { SceneElement } from "./types";
/** Upgrade starter cast while preserving custom imports and explicit appearance choices. */
export function sculptedCharacter(el: SceneElement): "alex" | "sarah" | undefined {
  const settings = el.actor3d;
  if (settings?.modelUrl || settings?.characterModel === "procedural") return undefined;
  if (settings?.characterModel === "alex-v1") return "alex";
  if (settings?.characterModel === "sarah-v1") return "sarah";
  if (/^alex(?:-|$)/i.test(el.characterId ?? "")) return "alex";
  if (/^sarah(?:-|$)/i.test(el.characterId ?? "")) return "sarah";
  return undefined;
}
export const usesAlexModel = (el: SceneElement) => sculptedCharacter(el) === "alex";
