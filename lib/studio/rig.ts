// ─── Bone Rig Data Model & Solver ───────────────────────────────────

export interface BoneVisual {
  type: "ellipse" | "rect" | "path" | "circle" | "image";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Shape params (local to bone origin)
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  width?: number;
  height?: number;
  r?: number;
  src?: string; // Embedded SVG/image part
  d?: string; // SVG path data
  offsetX?: number;
  offsetY?: number;
  borderRadius?: number;
}

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  x: number; // local offset from parent origin
  y: number;
  rotation: number; // degrees, local
  length: number;
  zIndex: number;
  visuals: BoneVisual[];
  // Whether this bone uses appearance color tokens instead of hardcoded colors
  pivotX?: number;
  pivotY?: number;
  minRotation?: number;
  maxRotation?: number;
  colorToken?: string; // e.g. 'skin', 'hair', 'shirt', 'pants', 'shoe', 'eye'
}

export interface BoneTransform {
  opacity?: number;
  rotation: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export interface WorldTransform {
  x: number;
  y: number;
  rotation: number; // accumulated world rotation in degrees
  scaleX: number;
  scaleY: number;
}

export interface Pose {
  id: string;
  name: string;
  category: "idle" | "action" | "expression" | "seated" | "custom";
  icon?: string;
  boneTransforms: Record<string, Partial<BoneTransform>>;
}

export interface Rig {
  id: string;
  name: string;
  bones: Bone[];
  defaultPoseId: string;
}

export interface CharacterAppearance {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  hairStyle: "short" | "long" | "spiky" | "curly";
}

export interface RiggedCharacter {
  id: string;
  version: string;
  name: string;
  gender: "male" | "female";
  rig: Rig;
  appearance: CharacterAppearance;
  poses: Pose[];
  description?: string;
  representation?: {
    type: "rigged" | "image" | "svg" | "sprite" | "lottie" | "rive";
    assetId?: string;
  };
  expressions?: {
    id: string;
    name: string;
    boneTransforms: Record<string, Partial<BoneTransform>>;
  }[];
  animations?: import("./clip-engine").AnimationClip[];
  variants?: { id: string; name: string; appearance: CharacterAppearance }[];
  voicePitch: number;
  voiceRate: number;
}

// ─── Solver ─────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function buildBoneMap(bones: Bone[]): Map<string, Bone> {
  const map = new Map<string, Bone>();
  for (const bone of bones) map.set(bone.id, bone);
  return map;
}

export function getRootBone(bones: Bone[]): Bone | undefined {
  return bones.find((b) => b.parentId === null);
}

export function getChildren(bones: Bone[], parentId: string): Bone[] {
  return bones.filter((b) => b.parentId === parentId);
}

export function computeWorldTransforms(
  bones: Bone[],
  poseOverrides: Record<string, Partial<BoneTransform>> = {},
): Map<string, WorldTransform> {
  const boneMap = buildBoneMap(bones);
  const worldMap = new Map<string, WorldTransform>();

  const visiting = new Set<string>();
  function resolve(boneId: string): WorldTransform {
    if (visiting.has(boneId)) throw new Error("Rig hierarchy contains a cycle");
    const cached = worldMap.get(boneId);
    if (cached) return cached;

    const bone = boneMap.get(boneId);
    if (!bone) return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };

    const override = poseOverrides[boneId] || {};
    const localX = bone.x + (override.x ?? 0);
    const localY = bone.y + (override.y ?? 0);
    const localRot = Math.max(
      bone.minRotation ?? -360,
      Math.min(
        bone.maxRotation ?? 360,
        bone.rotation + (override.rotation ?? 0),
      ),
    );
    const localSX = override.scaleX ?? 1;
    const localSY = override.scaleY ?? 1;

    if (!bone.parentId) {
      const wt: WorldTransform = {
        x: localX,
        y: localY,
        rotation: localRot,
        scaleX: localSX,
        scaleY: localSY,
      };
      worldMap.set(boneId, wt);
      return wt;
    }

    visiting.add(boneId);
    const parent = resolve(bone.parentId);
    visiting.delete(boneId);
    const rad = parent.rotation * DEG2RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const wt: WorldTransform = {
      x: parent.x + localX * parent.scaleX * cos - localY * parent.scaleY * sin,
      y: parent.y + localX * parent.scaleX * sin + localY * parent.scaleY * cos,
      rotation: parent.rotation + localRot,
      scaleX: parent.scaleX * localSX,
      scaleY: parent.scaleY * localSY,
    };

    worldMap.set(boneId, wt);
    return wt;
  }

  for (const bone of bones) resolve(bone.id);
  return worldMap;
}

// ─── Pose Interpolation ─────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

export function interpolatePoseTransforms(
  a: Record<string, Partial<BoneTransform>>,
  b: Record<string, Partial<BoneTransform>>,
  t: number,
): Record<string, Partial<BoneTransform>> {
  const result: Record<string, Partial<BoneTransform>> = {};
  const allKeys: string[] = [];
  const seen: Record<string, boolean> = {};
  for (const k of Object.keys(a)) {
    if (!seen[k]) {
      seen[k] = true;
      allKeys.push(k);
    }
  }
  for (const k of Object.keys(b)) {
    if (!seen[k]) {
      seen[k] = true;
      allKeys.push(k);
    }
  }

  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    const ta = a[key] || {};
    const tb = b[key] || {};
    result[key] = {};
    if (ta.rotation !== undefined || tb.rotation !== undefined) {
      result[key].rotation = lerpAngle(ta.rotation ?? 0, tb.rotation ?? 0, t);
    }
    if (ta.x !== undefined || tb.x !== undefined) {
      result[key].x = lerpNum(ta.x ?? 0, tb.x ?? 0, t);
    }
    if (ta.y !== undefined || tb.y !== undefined) {
      result[key].y = lerpNum(ta.y ?? 0, tb.y ?? 0, t);
    }
    if (ta.scaleX !== undefined || tb.scaleX !== undefined) {
      result[key].scaleX = lerpNum(ta.scaleX ?? 1, tb.scaleX ?? 1, t);
    }
    if (ta.opacity !== undefined || tb.opacity !== undefined)
      result[key].opacity = lerpNum(ta.opacity ?? 1, tb.opacity ?? 1, t);
    if (ta.scaleY !== undefined || tb.scaleY !== undefined) {
      result[key].scaleY = lerpNum(ta.scaleY ?? 1, tb.scaleY ?? 1, t);
    }
  }

  return result;
}

export function blendPoses(
  poses: {
    transforms: Record<string, Partial<BoneTransform>>;
    weight: number;
  }[],
): Record<string, Partial<BoneTransform>> {
  if (poses.length === 0) return {};
  if (poses.length === 1) return poses[0].transforms;

  let result = poses[0].transforms;
  let totalWeight = poses[0].weight;

  for (let i = 1; i < poses.length; i++) {
    const { transforms, weight } = poses[i];
    totalWeight += weight;
    const t = weight / totalWeight;
    result = interpolatePoseTransforms(result, transforms, t);
  }

  return result;
}

// ─── Appearance color resolution ────────────────────────────────────

export function resolveVisualColor(
  visual: BoneVisual,
  token: string | undefined,
  appearance: CharacterAppearance,
): string {
  if (!token) return visual.fill;
  switch (token) {
    case "skin":
      return appearance.skinColor;
    case "hair":
      return appearance.hairColor;
    case "eye":
      return appearance.eyeColor;
    case "shirt":
      return appearance.shirtColor;
    case "pants":
      return appearance.pantsColor;
    case "shoe":
      return appearance.shoeColor;
    default:
      return visual.fill;
  }
}

/** Analytic two-segment IK, returning local angles in degrees. Bones point down at rest. */
export function solveTwoBoneIK(
  root: { x: number; y: number },
  target: { x: number; y: number },
  a: number,
  b: number,
  bend = 1,
) {
  if (a <= 0 || b <= 0) throw new Error("IK bone lengths must be positive");
  const dx = target.x - root.x,
    dy = target.y - root.y;
  const d = Math.max(
    Math.abs(a - b) + 0.0001,
    Math.min(a + b - 0.0001, Math.hypot(dx, dy)),
  );
  const elbow =
    bend *
    Math.acos(Math.max(-1, Math.min(1, (d * d - a * a - b * b) / (2 * a * b))));
  const shoulder =
    Math.atan2(dy, dx) -
    Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow));
  return {
    upper: (shoulder * 180) / Math.PI - 90,
    lower: (elbow * 180) / Math.PI,
  };
}
