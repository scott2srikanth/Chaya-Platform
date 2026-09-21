import type { SceneElement, Animation } from "./types";
import { interpolate, applyEasing } from "./easing";

export interface AnimatedState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
}

export function getAnimatedState(
  el: SceneElement,
  time: number,
): AnimatedState {
  const state: AnimatedState = {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    opacity: el.opacity,
    scaleX: el.scaleX,
    scaleY: el.scaleY,
  };

  for (const anim of [...el.animations].sort(
    (a, b) => a.startTime - b.startTime,
  )) {
    const endTime = anim.startTime + anim.duration;

    if (time < anim.startTime) {
      if (
        !el.animations.some(
          (a) => a.property === anim.property && a.startTime < anim.startTime,
        )
      )
        applyProperty(state, anim.property, anim.from);
    } else if (time >= endTime) {
      applyProperty(state, anim.property, anim.to);
    } else {
      const progress = (time - anim.startTime) / anim.duration;
      const value = interpolate(anim.from, anim.to, progress, anim.easing);
      applyProperty(state, anim.property, value);
    }
  }

  const path = el.motionPath;
  if (path && path.points.length > 1 && time >= path.startTime) {
    const raw = (time - path.startTime) / Math.max(0.001, path.duration);
    const progress = applyEasing(
      path.loop ? raw % 1 : Math.min(1, raw),
      path.easing,
    );
    const lengths = path.points
      .slice(1)
      .map((p, i) =>
        Math.hypot(p.x - path.points[i].x, p.y - path.points[i].y),
      );
    let distance = lengths.reduce((a, b) => a + b, 0) * progress;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        const t = lengths[i] === 0 ? 0 : distance / lengths[i];
        state.x =
          path.points[i].x + (path.points[i + 1].x - path.points[i].x) * t;
        state.y =
          path.points[i].y + (path.points[i + 1].y - path.points[i].y) * t;
        break;
      }
      distance -= lengths[i];
    }
  }
  return state;
}

function applyProperty(
  state: AnimatedState,
  property: Animation["property"],
  value: number,
) {
  switch (property) {
    case "x":
      state.x = value;
      break;
    case "y":
      state.y = value;
      break;
    case "width":
      state.width = Math.max(1, value);
      break;
    case "height":
      state.height = Math.max(1, value);
      break;
    case "rotation":
      state.rotation = value;
      break;
    case "opacity":
      state.opacity = Math.max(0, Math.min(1, value));
      break;
    case "scale":
      state.scaleX = value;
      state.scaleY = value;
      break;
  }
}

export function getAnimatedStyle(el: SceneElement, time: number) {
  const keys = [...(el.styleKeys ?? [])].sort((a, b) => a.time - b.time);
  if (!keys.length)
    return { fill: el.fill, stroke: el.stroke, blur: el.blur ?? 0 };
  let a = keys[0],
    b = a;
  for (const key of keys) {
    if (key.time <= time) a = key;
    b = key;
    if (key.time >= time) break;
  }
  const t =
    a.time === b.time
      ? 0
      : applyEasing(
          Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time))),
          b.easing,
        );
  const color = (from: string, to: string) => {
    if (!/^#[a-f0-9]{6}$/i.test(from) || !/^#[a-f0-9]{6}$/i.test(to))
      return t < 0.5 ? from : to;
    return (
      "#" +
      [1, 3, 5]
        .map((i) =>
          Math.round(
            parseInt(from.slice(i, i + 2), 16) * (1 - t) +
              parseInt(to.slice(i, i + 2), 16) * t,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  };
  return {
    fill: color(a.fill, b.fill),
    stroke: color(a.stroke, b.stroke),
    blur: a.blur + (b.blur - a.blur) * t,
  };
}
