import type { EasingType } from './types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function easeInFn(t: number): number {
  return t * t * t;
}

function easeOutFn(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutFn(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function springFn(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function applyEasing(t: number, easing: EasingType): number {
  const clamped = clamp01(t);
  switch (easing) {
    case 'linear': return clamped;
    case 'easeIn': return easeInFn(clamped);
    case 'easeOut': return easeOutFn(clamped);
    case 'easeInOut': return easeInOutFn(clamped);
    case 'spring': return springFn(clamped);
    default: return clamped;
  }
}

export function interpolate(from: number, to: number, progress: number, easing: EasingType): number {
  return lerp(from, to, applyEasing(progress, easing));
}
