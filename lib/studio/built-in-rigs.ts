import type { Bone, Pose, RiggedCharacter, Rig, CharacterAppearance, BoneVisual } from './rig';

// ─── Alex Bone Hierarchy ────────────────────────────────────────────
// Coordinate system: (0,0) at hip center, Y down, units ~pixels in 240x400 space.
// Each bone's (x,y) is the LOCAL offset from its parent's origin.

function v(type: BoneVisual['type'], fill: string, rest: Partial<BoneVisual> = {}): BoneVisual {
  return { type, fill, ...rest };
}

const ALEX_BONES: Bone[] = [
  // ─ Root (hip) ─────────────────────────────────
  {
    id: 'root',
    name: 'Root',
    parentId: null,
    x: 120, y: 230,
    rotation: 0,
    length: 0,
    zIndex: 0,
    visuals: [],
  },

  // ─ Torso ──────────────────────────────────────
  {
    id: 'torso',
    name: 'Torso',
    parentId: 'root',
    x: 0, y: 0,
    rotation: 0,
    length: 120,
    zIndex: 5,
    colorToken: 'shirt',
    visuals: [
      v('rect', '#2563eb', { offsetX: -32, offsetY: -120, width: 64, height: 120, borderRadius: 14 }),
      v('path', '#f4c7a3', { d: 'M -12 -120 Q 0 -110 12 -120', stroke: '#f4c7a3', strokeWidth: 2 }),
    ],
  },

  // ─ Neck ───────────────────────────────────────
  {
    id: 'neck',
    name: 'Neck',
    parentId: 'torso',
    x: 0, y: -120,
    rotation: 0,
    length: 16,
    zIndex: 4,
    colorToken: 'skin',
    visuals: [
      v('rect', '#f4c7a3', { offsetX: -7, offsetY: -16, width: 14, height: 16, borderRadius: 5 }),
    ],
  },

  // ─ Head ───────────────────────────────────────
  {
    id: 'head',
    name: 'Head',
    parentId: 'neck',
    x: 0, y: -16,
    rotation: 0,
    length: 76,
    zIndex: 10,
    colorToken: 'skin',
    visuals: [
      // Ears
      v('ellipse', '#f4c7a3', { cx: -32, cy: -38, rx: 6, ry: 8 }),
      v('ellipse', '#f4c7a3', { cx: 32, cy: -38, rx: 6, ry: 8 }),
      // Head shape
      v('ellipse', '#f4c7a3', { cx: 0, cy: -38, rx: 32, ry: 38 }),
    ],
  },

  // ─ Hair ───────────────────────────────────────
  {
    id: 'hair',
    name: 'Hair',
    parentId: 'head',
    x: 0, y: 0,
    rotation: 0,
    length: 0,
    zIndex: 11,
    colorToken: 'hair',
    visuals: [
      v('path', '#5b3a20', {
        d: 'M -29 -32 Q -30 -62 0 -77 Q 30 -62 29 -32',
      }),
    ],
  },

  // ─ Left Eye ───────────────────────────────────
  {
    id: 'eyeL',
    name: 'Left Eye',
    parentId: 'head',
    x: -12, y: -44,
    rotation: 0,
    length: 0,
    zIndex: 12,
    colorToken: 'eye',
    visuals: [
      v('ellipse', 'white', { cx: 0, cy: 0, rx: 7, ry: 5.5, stroke: '#c4a882', strokeWidth: 0.5 }),
      v('circle', '#3b6fb5', { cx: 0, cy: 0, r: 4.5 }),
      v('circle', '#111', { cx: 0, cy: 0, r: 2.2 }),
      v('circle', 'white', { cx: -1.2, cy: -1.5, r: 1, opacity: 0.9 }),
    ],
  },

  // ─ Right Eye ──────────────────────────────────
  {
    id: 'eyeR',
    name: 'Right Eye',
    parentId: 'head',
    x: 12, y: -44,
    rotation: 0,
    length: 0,
    zIndex: 12,
    colorToken: 'eye',
    visuals: [
      v('ellipse', 'white', { cx: 0, cy: 0, rx: 7, ry: 5.5, stroke: '#c4a882', strokeWidth: 0.5 }),
      v('circle', '#3b6fb5', { cx: 0, cy: 0, r: 4.5 }),
      v('circle', '#111', { cx: 0, cy: 0, r: 2.2 }),
      v('circle', 'white', { cx: -1.2, cy: -1.5, r: 1, opacity: 0.9 }),
    ],
  },

  // ─ Left Eyebrow ───────────────────────────────
  {
    id: 'browL',
    name: 'Left Brow',
    parentId: 'head',
    x: -12, y: -52,
    rotation: 0,
    length: 0,
    zIndex: 13,
    colorToken: 'hair',
    visuals: [
      v('path', 'none', { d: 'M -6 0 Q 0 -3 6 0.5', stroke: '#5b3a20', strokeWidth: 2.2 }),
    ],
  },

  // ─ Right Eyebrow ──────────────────────────────
  {
    id: 'browR',
    name: 'Right Brow',
    parentId: 'head',
    x: 12, y: -52,
    rotation: 0,
    length: 0,
    zIndex: 13,
    colorToken: 'hair',
    visuals: [
      v('path', 'none', { d: 'M -6 0.5 Q 0 -3 6 0', stroke: '#5b3a20', strokeWidth: 2.2 }),
    ],
  },

  // ─ Mouth ──────────────────────────────────────
  {
    id: 'mouth',
    name: 'Mouth',
    parentId: 'head',
    x: 0, y: -24,
    rotation: 0,
    length: 0,
    zIndex: 12,
    visuals: [
      v('path', 'none', { d: 'M -7 0 Q 0 3 7 0', stroke: '#b5655a', strokeWidth: 1.8 }),
    ],
  },

  // ─ Nose ───────────────────────────────────────
  {
    id: 'nose',
    name: 'Nose',
    parentId: 'head',
    x: 0, y: -36,
    rotation: 0,
    length: 0,
    zIndex: 12,
    visuals: [
      v('path', 'none', { d: 'M -1 0 Q 0 4 2 2 Q 4 1 3 -1', stroke: '#d4a070', strokeWidth: 1.2 }),
    ],
  },

  // ─ Upper Arm Left ─────────────────────────────
  {
    id: 'upperArmL',
    name: 'Upper Arm L',
    parentId: 'torso',
    x: -32, y: -112,
    rotation: 170,
    length: 55,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('rect', '#f4c7a3', { offsetX: -6.5, offsetY: 0, width: 13, height: 55, borderRadius: 6 }),
    ],
  },

  // ─ Lower Arm Left ─────────────────────────────
  {
    id: 'lowerArmL',
    name: 'Lower Arm L',
    parentId: 'upperArmL',
    x: 0, y: 55,
    rotation: 10,
    length: 50,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('rect', '#f4c7a3', { offsetX: -5.5, offsetY: 0, width: 11, height: 50, borderRadius: 5 }),
    ],
  },

  // ─ Hand Left ──────────────────────────────────
  {
    id: 'handL',
    name: 'Hand L',
    parentId: 'lowerArmL',
    x: 0, y: 50,
    rotation: 0,
    length: 12,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('ellipse', '#f4c7a3', { cx: 0, cy: 6, rx: 7, ry: 8 }),
    ],
  },

  // ─ Upper Arm Right ────────────────────────────
  {
    id: 'upperArmR',
    name: 'Upper Arm R',
    parentId: 'torso',
    x: 32, y: -112,
    rotation: 190,
    length: 55,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('rect', '#f4c7a3', { offsetX: -6.5, offsetY: 0, width: 13, height: 55, borderRadius: 6 }),
    ],
  },

  // ─ Lower Arm Right ────────────────────────────
  {
    id: 'lowerArmR',
    name: 'Lower Arm R',
    parentId: 'upperArmR',
    x: 0, y: 55,
    rotation: -10,
    length: 50,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('rect', '#f4c7a3', { offsetX: -5.5, offsetY: 0, width: 11, height: 50, borderRadius: 5 }),
    ],
  },

  // ─ Hand Right ─────────────────────────────────
  {
    id: 'handR',
    name: 'Hand R',
    parentId: 'lowerArmR',
    x: 0, y: 50,
    rotation: 0,
    length: 12,
    zIndex: 3,
    colorToken: 'skin',
    visuals: [
      v('ellipse', '#f4c7a3', { cx: 0, cy: 6, rx: 7, ry: 8 }),
    ],
  },

  // ─ Upper Leg Left ─────────────────────────────
  {
    id: 'upperLegL',
    name: 'Upper Leg L',
    parentId: 'root',
    x: -14, y: 0,
    rotation: 0,
    length: 70,
    zIndex: 2,
    colorToken: 'pants',
    visuals: [
      v('rect', '#1e293b', { offsetX: -7.5, offsetY: 0, width: 15, height: 70, borderRadius: 6 }),
    ],
  },

  // ─ Lower Leg Left ─────────────────────────────
  {
    id: 'lowerLegL',
    name: 'Lower Leg L',
    parentId: 'upperLegL',
    x: 0, y: 70,
    rotation: 0,
    length: 72,
    zIndex: 2,
    colorToken: 'pants',
    visuals: [
      v('rect', '#1e293b', { offsetX: -7, offsetY: 0, width: 14, height: 72, borderRadius: 5 }),
    ],
  },

  // ─ Foot Left ──────────────────────────────────
  {
    id: 'footL',
    name: 'Foot L',
    parentId: 'lowerLegL',
    x: 0, y: 72,
    rotation: 0,
    length: 18,
    zIndex: 2,
    colorToken: 'shoe',
    visuals: [
      v('ellipse', '#334155', { cx: 0, cy: 6, rx: 15, ry: 9 }),
    ],
  },

  // ─ Upper Leg Right ────────────────────────────
  {
    id: 'upperLegR',
    name: 'Upper Leg R',
    parentId: 'root',
    x: 14, y: 0,
    rotation: 0,
    length: 70,
    zIndex: 2,
    colorToken: 'pants',
    visuals: [
      v('rect', '#1e293b', { offsetX: -7.5, offsetY: 0, width: 15, height: 70, borderRadius: 6 }),
    ],
  },

  // ─ Lower Leg Right ────────────────────────────
  {
    id: 'lowerLegR',
    name: 'Lower Leg R',
    parentId: 'upperLegR',
    x: 0, y: 70,
    rotation: 0,
    length: 72,
    zIndex: 2,
    colorToken: 'pants',
    visuals: [
      v('rect', '#1e293b', { offsetX: -7, offsetY: 0, width: 14, height: 72, borderRadius: 5 }),
    ],
  },

  // ─ Foot Right ─────────────────────────────────
  {
    id: 'footR',
    name: 'Foot R',
    parentId: 'lowerLegR',
    x: 0, y: 72,
    rotation: 0,
    length: 18,
    zIndex: 2,
    colorToken: 'shoe',
    visuals: [
      v('ellipse', '#334155', { cx: 0, cy: 6, rx: 15, ry: 9 }),
    ],
  },
];

// ─── Built-in Poses ─────────────────────────────────────────────────

const IDLE_POSE: Pose = {
  id: 'idle',
  name: 'Idle',
  category: 'idle',
  icon: 'user',
  boneTransforms: {},
};

const WAVE_POSE: Pose = {
  id: 'wave',
  name: 'Wave',
  category: 'action',
  icon: 'hand',
  boneTransforms: {
    upperArmR: { rotation: -130 },
    lowerArmR: { rotation: -40 },
    handR: { rotation: 10 },
    torso: { rotation: -2 },
    head: { rotation: 3 },
  },
};

const POINT_POSE: Pose = {
  id: 'point',
  name: 'Point',
  category: 'action',
  icon: 'pointer',
  boneTransforms: {
    upperArmR: { rotation: -100 },
    lowerArmR: { rotation: 0 },
    handR: { rotation: -5 },
    torso: { rotation: -3 },
    head: { rotation: 2 },
  },
};

const TALK_POSE: Pose = {
  id: 'talk',
  name: 'Talk',
  category: 'action',
  icon: 'message-square',
  boneTransforms: {
    upperArmR: { rotation: -40 },
    lowerArmR: { rotation: -30 },
    upperArmL: { rotation: 40 },
    lowerArmL: { rotation: 30 },
    torso: { rotation: -2 },
    head: { rotation: 1 },
  },
};

const THINK_POSE: Pose = {
  id: 'think',
  name: 'Think',
  category: 'action',
  icon: 'brain',
  boneTransforms: {
    upperArmR: { rotation: -80 },
    lowerArmR: { rotation: -90 },
    handR: { rotation: 15 },
    head: { rotation: 8, y: -2 },
    torso: { rotation: 2 },
  },
};

const CELEBRATE_POSE: Pose = {
  id: 'celebrate',
  name: 'Celebrate',
  category: 'action',
  icon: 'party-popper',
  boneTransforms: {
    upperArmR: { rotation: -150 },
    lowerArmR: { rotation: -20 },
    upperArmL: { rotation: 150 },
    lowerArmL: { rotation: 20 },
    head: { y: -3 },
    torso: { rotation: 0 },
  },
};

const SIT_POSE: Pose = {
  id: 'sit',
  name: 'Sit',
  category: 'seated',
  icon: 'armchair',
  boneTransforms: {
    upperLegL: { rotation: -85 },
    lowerLegL: { rotation: 85 },
    footL: { rotation: 5 },
    upperLegR: { rotation: -85 },
    lowerLegR: { rotation: 85 },
    footR: { rotation: 5 },
    root: { y: -20 },
  },
};

const WALK_A_POSE: Pose = {
  id: 'walkA',
  name: 'Walk A',
  category: 'action',
  icon: 'footprints',
  boneTransforms: {
    upperLegL: { rotation: -20 },
    lowerLegL: { rotation: 10 },
    upperLegR: { rotation: 15 },
    lowerLegR: { rotation: -25 },
    upperArmL: { rotation: 20 },
    upperArmR: { rotation: -20 },
    torso: { rotation: -1 },
  },
};

const WALK_B_POSE: Pose = {
  id: 'walkB',
  name: 'Walk B',
  category: 'action',
  icon: 'footprints',
  boneTransforms: {
    upperLegL: { rotation: 15 },
    lowerLegL: { rotation: -25 },
    upperLegR: { rotation: -20 },
    lowerLegR: { rotation: 10 },
    upperArmL: { rotation: -20 },
    upperArmR: { rotation: 20 },
    torso: { rotation: 1 },
  },
};

const PRESENT_POSE: Pose = {
  id: 'present',
  name: 'Present',
  category: 'action',
  icon: 'presentation',
  boneTransforms: {
    upperArmR: { rotation: -70 },
    lowerArmR: { rotation: -40 },
    upperArmL: { rotation: 70 },
    lowerArmL: { rotation: 40 },
    torso: { rotation: 0 },
    head: { rotation: 0, y: -1 },
  },
};

// ─── Alex Character ─────────────────────────────────────────────────

const ALEX_APPEARANCE: CharacterAppearance = {
  skinColor: '#f4c7a3',
  hairColor: '#5b3a20',
  eyeColor: '#3b6fb5',
  shirtColor: '#2563eb',
  pantsColor: '#1e293b',
  shoeColor: '#334155',
  hairStyle: 'short',
};

const ALEX_RIG: Rig = {
  id: 'alex-rig',
  name: 'Alex Rig',
  bones: ALEX_BONES,
  defaultPoseId: 'idle',
};

const ALEX_POSES = [
  IDLE_POSE, WAVE_POSE, POINT_POSE, TALK_POSE,
  THINK_POSE, CELEBRATE_POSE, SIT_POSE,
  WALK_A_POSE, WALK_B_POSE, PRESENT_POSE,
];

export const ALEX_RIGGED: RiggedCharacter = {
  id: 'alex-rigged',
  version: '1.0',
  name: 'Alex',
  gender: 'male',
  rig: ALEX_RIG,
  appearance: ALEX_APPEARANCE,
  poses: ALEX_POSES,
  voicePitch: 0.85,
  voiceRate: 0.92,
};

// ─── Sarah Character ────────────────────────────────────────────────

const SARAH_APPEARANCE: CharacterAppearance = {
  skinColor: '#deb887',
  hairColor: '#1a1a2e',
  eyeColor: '#2d6a4f',
  shirtColor: '#059669',
  pantsColor: '#1e293b',
  shoeColor: '#475569',
  hairStyle: 'long',
};

export const SARAH_RIGGED: RiggedCharacter = {
  id: 'sarah-rigged',
  version: '1.0',
  name: 'Sarah',
  gender: 'female',
  rig: { ...ALEX_RIG, id: 'sarah-rig', name: 'Sarah Rig' },
  appearance: SARAH_APPEARANCE,
  poses: ALEX_POSES,
  voicePitch: 1.25,
  voiceRate: 0.95,
};

// ─── Max Character ──────────────────────────────────────────────────

const MAX_APPEARANCE: CharacterAppearance = {
  skinColor: '#ffe0bd',
  hairColor: '#d4a843',
  eyeColor: '#6b7b3a',
  shirtColor: '#dc2626',
  pantsColor: '#374151',
  shoeColor: '#1f2937',
  hairStyle: 'spiky',
};

export const MAX_RIGGED: RiggedCharacter = {
  id: 'max-rigged',
  version: '1.0',
  name: 'Max',
  gender: 'male',
  rig: { ...ALEX_RIG, id: 'max-rig', name: 'Max Rig' },
  appearance: MAX_APPEARANCE,
  poses: ALEX_POSES,
  voicePitch: 0.75,
  voiceRate: 1.0,
};

// ─── Mia Character ──────────────────────────────────────────────────

const MIA_APPEARANCE: CharacterAppearance = {
  skinColor: '#8d5524',
  hairColor: '#1a1a1a',
  eyeColor: '#5a3825',
  shirtColor: '#f59e0b',
  pantsColor: '#1e293b',
  shoeColor: '#44403c',
  hairStyle: 'curly',
};

export const MIA_RIGGED: RiggedCharacter = {
  id: 'mia-rigged',
  version: '1.0',
  name: 'Mia',
  gender: 'female',
  rig: { ...ALEX_RIG, id: 'mia-rig', name: 'Mia Rig' },
  appearance: MIA_APPEARANCE,
  poses: ALEX_POSES,
  voicePitch: 1.15,
  voiceRate: 0.9,
};

// ─── Character Library ──────────────────────────────────────────────

export const BUILT_IN_RIGGED_CHARACTERS: RiggedCharacter[] = [
  ALEX_RIGGED, SARAH_RIGGED, MAX_RIGGED, MIA_RIGGED,
];

export function getRiggedCharacter(id: string): RiggedCharacter | undefined {
  return BUILT_IN_RIGGED_CHARACTERS.find((c) => c.id === id);
}

export function getCharacterPose(char: RiggedCharacter, poseId: string): Pose | undefined {
  return char.poses.find((p) => p.id === poseId);
}

export { IDLE_POSE, WAVE_POSE, POINT_POSE, TALK_POSE, THINK_POSE, CELEBRATE_POSE, SIT_POSE, WALK_A_POSE, WALK_B_POSE, PRESENT_POSE };
