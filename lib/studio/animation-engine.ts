import type { SceneElement, Animation } from './types';
import { interpolate } from './easing';

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

export function getAnimatedState(el: SceneElement, time: number): AnimatedState {
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

  for (const anim of el.animations) {
    const endTime = anim.startTime + anim.duration;

    if (time < anim.startTime) {
      applyProperty(state, anim.property, anim.from);
    } else if (time >= endTime) {
      applyProperty(state, anim.property, anim.to);
    } else {
      const progress = (time - anim.startTime) / anim.duration;
      const value = interpolate(anim.from, anim.to, progress, anim.easing);
      applyProperty(state, anim.property, value);
    }
  }

  return state;
}

function applyProperty(state: AnimatedState, property: Animation['property'], value: number) {
  switch (property) {
    case 'x': state.x = value; break;
    case 'y': state.y = value; break;
    case 'width': state.width = Math.max(1, value); break;
    case 'height': state.height = Math.max(1, value); break;
    case 'rotation': state.rotation = value; break;
    case 'opacity': state.opacity = Math.max(0, Math.min(1, value)); break;
    case 'scale':
      state.scaleX = value;
      state.scaleY = value;
      break;
  }
}
