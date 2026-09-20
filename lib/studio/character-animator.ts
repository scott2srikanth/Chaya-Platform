import type { CharacterGesture, ReactionType, SceneCamera, CameraTransition } from './types';

export type ShotType = 'wide' | 'medium' | 'closeup';

export interface CharacterMotion {
  headBobY: number;
  headTilt: number;
  bodySway: number;
  breathScale: number;
  blinkAmount: number;
  mouthOpenness: number;
  leftArmWiggle: number;
  rightArmWiggle: number;
  shoulderShrug: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
  nodAmount: number;
  eyebrowRaise: number;
  smileAmount: number;
  bodyLean: number;
}

export interface CameraFrame {
  vx: number;
  vy: number;
  vw: number;
  vh: number;
}

const VOWELS = new Set('aeiouAEIOU');

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function getMouthOpennessFromText(text: string, progress: number): number {
  if (!text || progress < 0 || progress > 1) return 0;
  const idx = Math.floor(progress * text.length);
  const char = text[Math.min(idx, text.length - 1)];
  if (char === ' ' || char === '.' || char === ',') return 0.05;
  if (VOWELS.has(char)) return 0.6 + pseudoRandom(idx) * 0.35;
  return 0.2 + pseudoRandom(idx + 50) * 0.35;
}

export function computeEyeTracking(
  myX: number, myW: number,
  targetX: number, targetW: number,
  hasTarget: boolean,
): { pupilOffsetX: number; pupilOffsetY: number } {
  if (!hasTarget) return { pupilOffsetX: 0, pupilOffsetY: 0 };
  const myCx = myX + myW / 2;
  const targetCx = targetX + targetW / 2;
  const dx = targetCx - myCx;
  const maxOffset = 2.5;
  const dist = Math.abs(dx);
  const normalized = dist > 0 ? Math.min(1, dist / 800) : 0;
  return {
    pupilOffsetX: Math.sign(dx) * normalized * maxOffset,
    pupilOffsetY: -0.3,
  };
}

export function computeReactionMotion(
  time: number,
  reaction: ReactionType,
): Partial<CharacterMotion> {
  switch (reaction) {
    case 'nodding':
      return {
        headBobY: Math.sin(time * 4) * 4,
        smileAmount: 0.4,
        eyebrowRaise: 0,
        bodyLean: Math.sin(time * 1.5) * 1,
      };
    case 'listening':
      return {
        headTilt: 4 + Math.sin(time * 0.8) * 2,
        headBobY: Math.sin(time * 2.5) * 2,
        smileAmount: 0.2,
        eyebrowRaise: 1,
        bodyLean: 2,
      };
    case 'surprised':
      return {
        eyebrowRaise: 5,
        headBobY: -3,
        bodyLean: -4,
        smileAmount: 0,
        mouthOpenness: 0.3 + Math.sin(time * 3) * 0.1,
      };
    case 'laughing':
      return {
        headBobY: Math.sin(time * 6) * 5,
        bodySway: Math.sin(time * 4) * 3,
        smileAmount: 1,
        shoulderShrug: Math.abs(Math.sin(time * 5)) * 4,
        mouthOpenness: 0.4 + Math.sin(time * 8) * 0.2,
      };
    case 'thinking':
      return {
        headTilt: 6,
        headBobY: -2,
        eyebrowRaise: -2,
        smileAmount: -0.2,
        rightArmWiggle: -30,
        bodyLean: 1,
      };
    case 'confused':
      return {
        headTilt: -8 + Math.sin(time * 1.2) * 3,
        eyebrowRaise: 3,
        smileAmount: -0.3,
        bodyLean: Math.sin(time * 0.8) * 2,
      };
    default:
      return {};
  }
}

export function computeCharacterMotion(
  time: number,
  gesture: CharacterGesture,
  isSpeaking: boolean,
  speechText: string,
  speechProgress: number,
  reaction: ReactionType,
  eyeTarget: { pupilOffsetX: number; pupilOffsetY: number },
): CharacterMotion {
  const base: CharacterMotion = {
    headBobY: Math.sin(time * 1.5) * 1.5,
    headTilt: Math.sin(time * 0.7) * 0.8,
    bodySway: Math.sin(time * 0.8) * 0.3,
    breathScale: 1 + Math.sin(time * 1.2) * 0.008,
    leftArmWiggle: Math.sin(time * 0.9) * 1,
    rightArmWiggle: Math.sin(time * 1.1 + 1) * 1,
    shoulderShrug: 0,
    mouthOpenness: 0,
    pupilOffsetX: eyeTarget.pupilOffsetX,
    pupilOffsetY: eyeTarget.pupilOffsetY,
    nodAmount: 0,
    eyebrowRaise: 0,
    smileAmount: 0.1,
    bodyLean: 0,
    blinkAmount: 0,
  };

  const blinkCycle = (time % 3.8);
  base.blinkAmount = blinkCycle > 3.5
    ? Math.min(1, (blinkCycle - 3.5) / 0.08) * (blinkCycle < 3.65 ? 1 : Math.max(0, 1 - (blinkCycle - 3.65) / 0.1))
    : 0;

  if (isSpeaking) {
    base.headBobY = Math.sin(time * 3) * 3 + Math.sin(time * 1.7) * 1.5;
    base.headTilt = Math.sin(time * 1.8) * 2.5;
    base.bodySway = Math.sin(time * 1.3) * 1.5;
    base.breathScale = 1 + Math.sin(time * 2) * 0.012;
    base.mouthOpenness = getMouthOpennessFromText(speechText, speechProgress);
    base.shoulderShrug = Math.sin(time * 2.2) * 1.5;
    base.smileAmount = 0.3;

    switch (gesture) {
      case 'waving':
        base.rightArmWiggle = Math.sin(time * 6) * 10;
        base.leftArmWiggle = Math.sin(time * 1.8 + 0.5) * 2;
        break;
      case 'pointing':
        base.rightArmWiggle = Math.sin(time * 2) * 3;
        base.leftArmWiggle = Math.sin(time * 1.5) * 1;
        break;
      case 'thinking':
        base.headTilt += 4;
        base.headBobY -= 2;
        base.eyebrowRaise = -2;
        break;
      case 'celebrating':
        base.leftArmWiggle = Math.sin(time * 5) * 8;
        base.rightArmWiggle = Math.sin(time * 5 + Math.PI) * 8;
        base.bodySway = Math.sin(time * 3) * 3;
        base.headBobY = Math.sin(time * 4) * 5;
        base.smileAmount = 1;
        break;
      default:
        base.rightArmWiggle = Math.sin(time * 2.5) * 4;
        base.leftArmWiggle = Math.sin(time * 1.8 + 0.5) * 2;
        break;
    }
  } else if (reaction !== 'none') {
    const reactionMotion = computeReactionMotion(time, reaction);
    Object.assign(base, reactionMotion);
  }

  return base;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeCameraFrame(
  shot: ShotType,
  characterX: number, characterY: number,
  characterW: number, characterH: number,
  canvasW: number, canvasH: number,
  prevFrame: CameraFrame | null, dt: number,
): CameraFrame {
  const cx = characterX + characterW / 2;
  let target: CameraFrame;
  switch (shot) {
    case 'closeup': {
      const viewH = characterH * 0.35;
      const viewW = viewH * (canvasW / canvasH);
      target = { vx: cx - viewW / 2, vy: characterY + characterH * 0.1 - viewH * 0.15, vw: viewW, vh: viewH };
      break;
    }
    case 'medium': {
      const viewH = characterH * 0.7;
      const viewW = viewH * (canvasW / canvasH);
      target = { vx: cx - viewW / 2, vy: characterY - characterH * 0.05, vw: viewW, vh: viewH };
      break;
    }
    default:
      target = { vx: 0, vy: 0, vw: canvasW, vh: canvasH };
      break;
  }
  return target;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function springInterp(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function applyTransitionEasing(t: number, transition: CameraTransition): number {
  switch (transition) {
    case 'cut': return 1;
    case 'dolly': return easeInOutCubic(t);
    case 'whip': return springInterp(Math.min(1, t * 1.3));
    case 'smooth':
    default: return easeInOutCubic(t);
  }
}

export function computeCameraFromSceneCamera(
  cam: SceneCamera,
  prevFrame: CameraFrame | null,
  transitionElapsed: number,
): CameraFrame {
  const target: CameraFrame = { vx: cam.x, vy: cam.y, vw: cam.viewWidth, vh: cam.viewHeight };

  if (!prevFrame || cam.transition === 'cut' || cam.transitionDuration <= 0) return target;

  const rawT = Math.min(1, transitionElapsed / cam.transitionDuration);
  const t = applyTransitionEasing(rawT, cam.transition);

  return {
    vx: lerp(prevFrame.vx, target.vx, t),
    vy: lerp(prevFrame.vy, target.vy, t),
    vw: lerp(prevFrame.vw, target.vw, t),
    vh: lerp(prevFrame.vh, target.vh, t),
  };
}
