import type { Animation, SceneElement, EasingType } from './types';

export type PresetName =
  | 'fadeIn' | 'fadeOut'
  | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  | 'scaleIn' | 'scaleOut'
  | 'pop' | 'bounce';

interface PresetConfig {
  label: string;
  category: 'entrance' | 'exit' | 'emphasis';
  generate: (el: SceneElement, startTime: number, duration: number) => Animation[];
}

function anim(
  property: Animation['property'],
  from: number,
  to: number,
  startTime: number,
  duration: number,
  easing: EasingType = 'easeOut'
): Animation {
  return { id: crypto.randomUUID(), property, from, to, startTime, duration, easing };
}

export const PRESETS: Record<PresetName, PresetConfig> = {
  fadeIn: {
    label: 'Fade In',
    category: 'entrance',
    generate: (_, st, dur) => [anim('opacity', 0, 1, st, dur, 'easeOut')],
  },
  fadeOut: {
    label: 'Fade Out',
    category: 'exit',
    generate: (_, st, dur) => [anim('opacity', 1, 0, st, dur, 'easeIn')],
  },
  slideLeft: {
    label: 'Slide from Left',
    category: 'entrance',
    generate: (el, st, dur) => [
      anim('x', -el.width, el.x, st, dur, 'easeOut'),
      anim('opacity', 0, 1, st, dur * 0.4, 'easeOut'),
    ],
  },
  slideRight: {
    label: 'Slide from Right',
    category: 'entrance',
    generate: (el, st, dur) => [
      anim('x', 1920 + el.width, el.x, st, dur, 'easeOut'),
      anim('opacity', 0, 1, st, dur * 0.4, 'easeOut'),
    ],
  },
  slideUp: {
    label: 'Slide from Bottom',
    category: 'entrance',
    generate: (el, st, dur) => [
      anim('y', 1080 + el.height, el.y, st, dur, 'easeOut'),
      anim('opacity', 0, 1, st, dur * 0.4, 'easeOut'),
    ],
  },
  slideDown: {
    label: 'Slide from Top',
    category: 'entrance',
    generate: (el, st, dur) => [
      anim('y', -el.height, el.y, st, dur, 'easeOut'),
      anim('opacity', 0, 1, st, dur * 0.4, 'easeOut'),
    ],
  },
  scaleIn: {
    label: 'Scale In',
    category: 'entrance',
    generate: (_, st, dur) => [
      anim('scale', 0, 1, st, dur, 'easeOut'),
      anim('opacity', 0, 1, st, dur * 0.5, 'easeOut'),
    ],
  },
  scaleOut: {
    label: 'Scale Out',
    category: 'exit',
    generate: (_, st, dur) => [
      anim('scale', 1, 0, st, dur, 'easeIn'),
      anim('opacity', 1, 0, st + dur * 0.5, dur * 0.5, 'easeIn'),
    ],
  },
  pop: {
    label: 'Pop',
    category: 'emphasis',
    generate: (_, st, dur) => [
      anim('scale', 0, 1, st, dur, 'spring'),
      anim('opacity', 0, 1, st, dur * 0.3, 'easeOut'),
    ],
  },
  bounce: {
    label: 'Bounce In',
    category: 'entrance',
    generate: (el, st, dur) => [
      anim('y', el.y - 200, el.y, st, dur, 'spring'),
      anim('opacity', 0, 1, st, dur * 0.3, 'easeOut'),
    ],
  },
};

export const PRESET_LIST = Object.entries(PRESETS).map(([key, cfg]) => ({
  name: key as PresetName,
  ...cfg,
}));
