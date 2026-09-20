import type { CharacterDef } from '@/lib/studio/characters';
import type { CharacterGesture } from '@/lib/studio/types';
import type { CharacterMotion } from '@/lib/studio/character-animator';

const BASE_W = 240;
const BASE_H = 400;

function getHairPath(style: CharacterDef['hairStyle'], rx: number, ry: number): string {
  switch (style) {
    case 'short':
      return `M ${-rx * 0.9} ${-ry * 0.15} Q ${-rx * 0.95} ${-ry * 0.8} 0 ${-ry * 1.05} Q ${rx * 0.95} ${-ry * 0.8} ${rx * 0.9} ${-ry * 0.15}`;
    case 'long':
      return `M ${-rx * 0.95} ${-ry * 0.1} Q ${-rx} ${-ry * 0.9} 0 ${-ry * 1.1} Q ${rx} ${-ry * 0.9} ${rx * 0.95} ${-ry * 0.1} L ${rx * 0.9} ${ry * 0.7} Q ${rx * 0.7} ${ry * 1.3} 0 ${ry * 1.0} Q ${-rx * 0.7} ${ry * 1.3} ${-rx * 0.9} ${ry * 0.7} Z`;
    case 'spiky':
      return `M ${-rx * 0.85} ${-ry * 0.2} L ${-rx * 0.6} ${-ry * 1.2} L ${-rx * 0.2} ${-ry * 0.8} L 0 ${-ry * 1.35} L ${rx * 0.2} ${-ry * 0.8} L ${rx * 0.6} ${-ry * 1.2} L ${rx * 0.85} ${-ry * 0.2}`;
    case 'curly':
      return `M ${-rx * 0.95} ${-ry * 0.05} Q ${-rx * 1.2} ${-ry * 0.5} ${-rx * 0.85} ${-ry * 0.85} Q ${-rx * 0.4} ${-ry * 1.3} 0 ${-ry * 1.1} Q ${rx * 0.4} ${-ry * 1.3} ${rx * 0.85} ${-ry * 0.85} Q ${rx * 1.2} ${-ry * 0.5} ${rx * 0.95} ${-ry * 0.05} L ${rx * 1.05} ${ry * 0.3} Q ${rx * 0.95} ${ry * 0.7} ${rx * 0.6} ${ry * 0.5} Q 0 ${ry * 0.2} ${-rx * 0.6} ${ry * 0.5} Q ${-rx * 0.95} ${ry * 0.7} ${-rx * 1.05} ${ry * 0.3} Z`;
    default: return '';
  }
}

function getArmPath(side: 'left' | 'right', gesture: CharacterGesture, sw: number, wiggle: number): string {
  const s = side === 'left' ? -1 : 1;
  const b = sw * s;
  switch (gesture) {
    case 'waving':
      return side === 'right'
        ? `M ${b} 0 Q ${b + 35 * s} ${-40 + wiggle} ${b + 30 * s} ${-70 + wiggle}`
        : `M ${b} 0 Q ${b + 30 * s} ${50 + wiggle * 0.3} ${b + 20 * s} ${90 + wiggle * 0.3}`;
    case 'pointing':
      return side === 'right'
        ? `M ${b} 0 Q ${b + 40 * s} ${10 + wiggle} ${b + 70 * s} ${-5 + wiggle}`
        : `M ${b} 0 Q ${b + 30 * s} ${50 + wiggle * 0.3} ${b + 20 * s} ${90 + wiggle * 0.3}`;
    case 'thinking':
      return side === 'right'
        ? `M ${b} 0 Q ${b + 20 * s} ${-10 + wiggle} ${b + 5 * s} ${-40 + wiggle}`
        : `M ${b} 0 Q ${b + 30 * s} ${50 + wiggle * 0.3} ${b + 20 * s} ${90 + wiggle * 0.3}`;
    case 'celebrating':
      return `M ${b} 0 Q ${b + 35 * s} ${-40 + wiggle} ${b + 30 * s} ${-70 + wiggle}`;
    case 'talking':
      return side === 'right'
        ? `M ${b} 0 Q ${b + 35 * s} ${30 + wiggle} ${b + 25 * s} ${60 + wiggle}`
        : `M ${b} 0 Q ${b + 30 * s} ${45 + wiggle * 0.5} ${b + 22 * s} ${85 + wiggle * 0.5}`;
    default:
      return `M ${b} 0 Q ${b + 30 * s} ${50 + wiggle * 0.3} ${b + 20 * s} ${90 + wiggle * 0.3}`;
  }
}

interface Props {
  def: CharacterDef;
  gesture: CharacterGesture;
  motion: CharacterMotion;
  facingRight: boolean;
  width: number;
  height: number;
  seated?: boolean;
}

export default function CharacterRenderer({ def, gesture, motion, facingRight, width, height, seated }: Props) {
  const sx = width / BASE_W;
  const sy = height / BASE_H;
  const cx = BASE_W / 2;
  const flip = facingRight ? 1 : -1;
  const sw = def.gender === 'female' ? 14 : 16;

  const eyeOpenness = Math.max(0, 1 - motion.blinkAmount);
  const browY = -12 + motion.eyebrowRaise;
  const smileCurve = motion.smileAmount * 4;
  const mouthW = 6 + motion.mouthOpenness * 5;
  const mouthH = 1.5 + motion.mouthOpenness * 8;

  const headRx = 32;
  const headRy = 38;
  const headY = seated ? 55 : 65;
  const bodyY = headY + headRy + 12;
  const bodyH = BASE_H * 0.34;
  const legY = bodyY + bodyH;

  return (
    <g transform={`scale(${sx}, ${sy})`}>
      <g transform={`translate(${cx}, 0) scale(${flip}, 1)`}>
        {/* Legs */}
        {seated ? (
          <g transform={`rotate(${motion.bodySway * 0.15}, 0, ${legY})`}>
            {/* Thighs extend forward (+x in local space; parent flip handles direction) */}
            <line x1={-14} y1={legY} x2={30} y2={legY + 8} stroke={def.pantsColor} strokeWidth={15} strokeLinecap="round" />
            <line x1={14} y1={legY} x2={56} y2={legY + 8} stroke={def.pantsColor} strokeWidth={15} strokeLinecap="round" />
            {/* Shins go straight down from knees */}
            <line x1={30} y1={legY + 8} x2={32} y2={legY + 78} stroke={def.pantsColor} strokeWidth={14} strokeLinecap="round" />
            <line x1={56} y1={legY + 8} x2={58} y2={legY + 78} stroke={def.pantsColor} strokeWidth={14} strokeLinecap="round" />
            {/* Shoes at bottom of shins */}
            <ellipse cx={32} cy={legY + 84} rx={15} ry={9} fill={def.shoeColor} />
            <ellipse cx={58} cy={legY + 84} rx={15} ry={9} fill={def.shoeColor} />
          </g>
        ) : (
          <g transform={`rotate(${motion.bodySway * 0.2}, 0, ${legY})`}>
            <line x1={-16} y1={legY} x2={-20} y2={BASE_H - 32} stroke={def.pantsColor} strokeWidth={15} strokeLinecap="round" />
            <line x1={16} y1={legY} x2={20} y2={BASE_H - 32} stroke={def.pantsColor} strokeWidth={15} strokeLinecap="round" />
            <ellipse cx={-20} cy={BASE_H - 24} rx={15} ry={9} fill={def.shoeColor} />
            <ellipse cx={20} cy={BASE_H - 24} rx={15} ry={9} fill={def.shoeColor} />
          </g>
        )}

        {/* Body */}
        <g transform={`rotate(${motion.bodySway}, 0, ${bodyY + bodyH}) translate(${motion.bodyLean}, 0) scale(1, ${motion.breathScale})`}>
          <rect x={-32} y={bodyY} width={64} height={bodyH} rx={14} fill={def.shirtColor} />
          <path d={`M -12 ${bodyY} Q 0 ${bodyY + 10} 12 ${bodyY}`} fill="none" stroke={def.skinColor} strokeWidth={2} />

          <g transform={`translate(0, ${bodyY + 8 + motion.shoulderShrug})`}>
            <path d={getArmPath('left', gesture, sw, motion.leftArmWiggle)} fill="none" stroke={def.skinColor} strokeWidth={13} strokeLinecap="round" />
            <path d={getArmPath('right', gesture, sw, motion.rightArmWiggle)} fill="none" stroke={def.skinColor} strokeWidth={13} strokeLinecap="round" />
          </g>

          <rect x={-7} y={headY + headRy - 4} width={14} height={16} rx={5} fill={def.skinColor} />
        </g>

        {/* Head */}
        <g transform={`translate(0, ${headY + motion.headBobY + motion.nodAmount}) rotate(${motion.headTilt}, 0, 0)`}>
          <ellipse cx={-headRx + 2} cy={2} rx={6} ry={8} fill={def.skinColor} />
          <ellipse cx={headRx - 2} cy={2} rx={6} ry={8} fill={def.skinColor} />
          <ellipse cx={-headRx + 3} cy={2} rx={3.5} ry={5} fill={`color-mix(in srgb, ${def.skinColor} 70%, #a0522d)`} />
          <ellipse cx={headRx - 3} cy={2} rx={3.5} ry={5} fill={`color-mix(in srgb, ${def.skinColor} 70%, #a0522d)`} />

          <ellipse cx={0} cy={0} rx={headRx} ry={headRy} fill={def.skinColor} />
          <path d={getHairPath(def.hairStyle, headRx, headRy)} fill={def.hairColor} />

          {/* Face - unflip */}
          <g transform={`scale(${flip}, 1)`}>
            <g transform={`translate(-12, -6) scale(1, ${eyeOpenness})`}>
              <ellipse cx={0} cy={0} rx={7} ry={5.5} fill="white" stroke="#c4a882" strokeWidth={0.5} />
              <circle cx={motion.pupilOffsetX} cy={motion.pupilOffsetY} r={4.5} fill={def.eyeColor || '#5a3825'} />
              <circle cx={motion.pupilOffsetX} cy={motion.pupilOffsetY} r={2.2} fill="#111" />
              <circle cx={motion.pupilOffsetX - 1.2} cy={motion.pupilOffsetY - 1.5} r={1} fill="white" opacity={0.9} />
            </g>
            <g transform={`translate(12, -6) scale(1, ${eyeOpenness})`}>
              <ellipse cx={0} cy={0} rx={7} ry={5.5} fill="white" stroke="#c4a882" strokeWidth={0.5} />
              <circle cx={motion.pupilOffsetX} cy={motion.pupilOffsetY} r={4.5} fill={def.eyeColor || '#5a3825'} />
              <circle cx={motion.pupilOffsetX} cy={motion.pupilOffsetY} r={2.2} fill="#111" />
              <circle cx={motion.pupilOffsetX - 1.2} cy={motion.pupilOffsetY - 1.5} r={1} fill="white" opacity={0.9} />
            </g>

            {motion.blinkAmount > 0.1 && (
              <>
                <ellipse cx={-12} cy={-6} rx={7.5} ry={5.5 * motion.blinkAmount} fill={def.skinColor} />
                <ellipse cx={12} cy={-6} rx={7.5} ry={5.5 * motion.blinkAmount} fill={def.skinColor} />
              </>
            )}

            <path d={`M -18 ${browY} Q -12 ${browY - 3} -6 ${browY + 0.5}`} fill="none" stroke={def.hairColor} strokeWidth={2.2} strokeLinecap="round" />
            <path d={`M 6 ${browY + 0.5} Q 12 ${browY - 3} 18 ${browY}`} fill="none" stroke={def.hairColor} strokeWidth={2.2} strokeLinecap="round" />

            <path d="M -1 2 Q 0 6 2 4 Q 4 3 3 1" fill="none" stroke={`color-mix(in srgb, ${def.skinColor} 60%, #8b6914)`} strokeWidth={1.2} strokeLinecap="round" />

            <g transform="translate(0, 14)">
              {motion.mouthOpenness > 0.15 ? (
                <>
                  <ellipse cx={0} cy={0} rx={mouthW} ry={mouthH} fill="#6b1a1a" />
                  <rect x={-mouthW * 0.65} y={-mouthH * 0.4} width={mouthW * 1.3} height={mouthH * 0.35} rx={1} fill="white" opacity={0.85} />
                  {motion.mouthOpenness > 0.4 && (
                    <ellipse cx={0} cy={mouthH * 0.35} rx={mouthW * 0.5} ry={mouthH * 0.3} fill="#c0392b" opacity={0.6} />
                  )}
                  <path d={`M ${-mouthW} 0 Q ${-mouthW * 0.5} ${-mouthH - 1} 0 ${-mouthH} Q ${mouthW * 0.5} ${-mouthH - 1} ${mouthW} 0`} fill="none" stroke="#c0756b" strokeWidth={1.5} />
                  <path d={`M ${-mouthW} 0 Q 0 ${mouthH + 2} ${mouthW} 0`} fill="none" stroke="#b5655a" strokeWidth={1.3} />
                </>
              ) : (
                <>
                  <path d={`M -7 ${-smileCurve * 0.3} Q 0 ${3 + smileCurve} 7 ${-smileCurve * 0.3}`} fill="none" stroke="#b5655a" strokeWidth={1.8} strokeLinecap="round" />
                  {smileCurve > 1.5 && (
                    <path d={`M -7 ${-smileCurve * 0.3} Q 0 ${3 + smileCurve} 7 ${-smileCurve * 0.3}`} fill="#c0756b" opacity={0.15} />
                  )}
                </>
              )}
            </g>

            {motion.smileAmount > 0.5 && (
              <>
                <circle cx={-18} cy={6} r={5} fill="#e8a0a0" opacity={0.2 * motion.smileAmount} />
                <circle cx={18} cy={6} r={5} fill="#e8a0a0" opacity={0.2 * motion.smileAmount} />
              </>
            )}
          </g>
        </g>
      </g>
    </g>
  );
}
