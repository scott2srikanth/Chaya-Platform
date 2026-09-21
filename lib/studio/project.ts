import { validLiveCommands } from "./live-whiteboard";
import {roomSchema} from "./ai-schema";
import { validateJointPose } from "./pose3d";
import { z } from "zod";
import { Project, createDefaultScene, createElement } from "./types";
import { BUILT_IN_RIGGED_CHARACTERS } from "./built-in-rigs";
import type { RiggedCharacter } from "./rig";

const finite = z.number().finite();
const animation = z.object({
  id: z.string(),
  property: z.enum([
    "x",
    "y",
    "scale",
    "rotation",
    "opacity",
    "width",
    "height",
  ]),
  from: finite,
  to: finite,
  startTime: finite.min(0),
  duration: finite.min(0),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut", "spring"]),
});
const element = z
  .object({
    id: z.string(),
    type: z.enum([
      "rectangle",
      "circle",
      "line",
      "text",
      "svg",
      "image",
      "character",
      "component",
      "connector",
      "packet",
    ]),
    x: finite,
    y: finite,
    width: finite.min(0),
    height: finite.min(0),
    animations: z.array(animation).default([]),
  })
  .passthrough();
const schema = z.object({
  id: z.string().min(1),
  version: z.enum(["1.0", "2.0"]),
  metadata: z.object({
    name: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  settings: z.object({
    width: finite.int().min(16).max(7680),
    height: finite.int().min(16).max(4320),
    fps: finite.int().min(1).max(120),
  }),
  scenes: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          duration: finite.min(0.1).max(3600),
          elements: z.array(element),
          background: z.string(),
        })
        .passthrough(),
    )
    .min(1)
    .max(200),
  assets: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["image", "svg", "sprite", "lottie", "rive", "audio"]),
          dataUrl: z.string().startsWith("data:"),
          width: finite.min(0),
          height: finite.min(0),
        })
        .passthrough(),
    )
    .default([]),
  audio: z
    .array(
      z
        .object({
          id: z.string(),
          assetId: z.string(),
          start: finite.min(0),
          offset: finite.min(0),
          duration: finite.min(0),
          volume: finite.min(0).max(2),
        })
        .passthrough(),
    )
    .default([]),
  clips: z
    .array(
      z
        .object({
          id: z.string(),
          elementId: z.string(),
          name: z.string(),
          duration: finite.positive(),
          loop: z.boolean(),
          startTime: finite.min(0).optional(),
          speed: finite.positive().optional(),
          keyframes: z.array(
            z
              .object({
                id: z.string(),
                time: finite.min(0),
                poseId: z.string(),
                easing: z.enum([
                  "linear",
                  "easeIn",
                  "easeOut",
                  "easeInOut",
                  "spring",
                ]),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    )
    .default([]),
  characters: z.array(z.any()).default([]),
  templates: z.array(z.any()).default([]),
});
export function nativeCharacters(): RiggedCharacter[] {
  return structuredClone(BUILT_IN_RIGGED_CHARACTERS).map(
    (c): RiggedCharacter => {
      for (const bone of c.rig.bones) {
        if (bone.id === "upperArmL") bone.rotation = 10;
        if (bone.id === "upperArmR") bone.rotation = -10;
        if (bone.id.startsWith("lowerArm")) bone.rotation = 0;
        if (bone.id === "mouth")
          bone.visuals = [
            { type: "ellipse", cx: 0, cy: 0, rx: 7, ry: 2, fill: "#7f1d1d" },
          ];
      }
      const extra: [
        string,
        string,
        Record<string, Partial<import("./rig").BoneTransform>>,
      ][] = [
        ["standing", "Standing", {}],
        [
          "running",
          "Running",
          {
            upperLegL: { rotation: 45 },
            lowerLegR: { rotation: 70 },
            upperArmR: { rotation: -45 },
          },
        ],
        ["listening", "Listening", { head: { rotation: 8 } }],
        [
          "surprised",
          "Surprised",
          { mouth: { scaleY: 3 }, browL: { y: -4 }, browR: { y: -4 } },
        ],
        ["happy", "Happy", { head: { rotation: 4 }, mouth: { scaleX: 1.4 } }],
        ["sad", "Sad", { head: { rotation: 12, y: 4 } }],
        ["confused", "Confused", { head: { rotation: -12 } }],
        [
          "working",
          "Working",
          {
            upperArmL: { rotation: -40 },
            upperArmR: { rotation: 40 },
            lowerArmL: { rotation: -60 },
            lowerArmR: { rotation: 60 },
          },
        ],
        [
          "typing",
          "Typing",
          {
            upperArmL: { rotation: -25 },
            upperArmR: { rotation: 25 },
            lowerArmL: { rotation: -70 },
            lowerArmR: { rotation: 70 },
          },
        ],
        [
          "pointLeft",
          "Point left",
          { upperArmL: { rotation: 85 }, lowerArmL: { rotation: 0 } },
        ],
        [
          "jump",
          "Jump",
          {
            root: { y: -40 },
            upperArmL: { rotation: 140 },
            upperArmR: { rotation: -140 },
          },
        ],
        ["nod", "Nod", { head: { rotation: 10, y: 3 } }],
        ["shakeHead", "Shake head", { head: { rotation: -12 } }],
      ];
      c.poses.push(
        ...extra.map(([id, name, boneTransforms]) => ({
          id,
          name,
          category: "action" as const,
          boneTransforms,
        })),
      );
      const expressions = [
        { id: "neutral", name: "Neutral", boneTransforms: {} },
        ...extra
          .filter(([id]) =>
            ["happy", "sad", "surprised", "confused"].includes(id),
          )
          .map(([id, name, boneTransforms]) => ({ id, name, boneTransforms })),
        {
          id: "thinking",
          name: "Thinking",
          boneTransforms: { head: { rotation: -10 }, browL: { rotation: 8 } },
        },
        {
          id: "angry",
          name: "Angry",
          boneTransforms: { browL: { rotation: 20 }, browR: { rotation: -20 } },
        },
        {
          id: "speaking",
          name: "Speaking",
          boneTransforms: { mouth: { scaleY: 1.7 } },
        },
      ];
      const animations = [
        "idle",
        "walkA",
        "running",
        "jump",
        "wave",
        "talk",
        "point",
        "think",
        "sit",
        "standing",
        "celebrate",
        "shakeHead",
        "nod",
      ].map((pose, i) => ({
        id: c.id + "-animation-" + pose,
        characterId: c.id,
        elementId: "",
        name:
          pose === "walkA"
            ? "Walk"
            : pose.charAt(0).toUpperCase() + pose.slice(1),
        duration: 2,
        loop: ["idle", "walkA", "running", "talk"].includes(pose),
        keyframes: [
          {
            id: "a" + i,
            time: 0,
            poseId: pose === "walkA" ? "walkA" : "idle",
            easing: "easeInOut" as const,
          },
          {
            id: "b" + i,
            time: 0.6,
            poseId: pose === "walkA" ? "walkB" : pose,
            easing: "easeInOut" as const,
          },
          {
            id: "c" + i,
            time: 1.7,
            poseId: pose === "walkA" ? "walkA" : "idle",
            easing: "easeInOut" as const,
          },
        ],
      }));
      return {
        ...c,
        representation: { type: "rigged" },
        expressions: expressions as RiggedCharacter["expressions"],
        animations,
        variants: [],
      };
    },
  );
}
export function validateCharacter(c: RiggedCharacter) {
  if (
    !c ||
    !c.id ||
    !c.name ||
    !c.rig ||
    !Array.isArray(c.rig.bones) ||
    !Array.isArray(c.poses)
  )
    throw new Error("Invalid character: identity, rig and poses are required");
  if (
    !c.appearance ||
    ![
      "skinColor",
      "hairColor",
      "eyeColor",
      "shirtColor",
      "pantsColor",
      "shoeColor",
    ].every((k) => typeof (c.appearance as any)[k] === "string")
  )
    throw new Error("Invalid character appearance");
  for (const pose of [...c.poses, ...(c.expressions ?? [])]) {
    if (
      !pose.id ||
      !pose.name ||
      !pose.boneTransforms ||
      typeof pose.boneTransforms !== "object"
    )
      throw new Error("Invalid pose or expression");
    for (const transform of Object.values(pose.boneTransforms))
      if (
        !transform ||
        Object.values(transform).some(
          (v) => typeof v !== "number" || !Number.isFinite(v),
        )
      )
        throw new Error("Pose transforms must be finite numbers");
  }
  if (c.rig.bones.some((b) => !b.id || !Array.isArray(b.visuals)))
    throw new Error("Invalid bone visuals");
  const ids = new Set(c.rig.bones.map((b) => b.id));
  if (ids.size !== c.rig.bones.length)
    throw new Error("Bone IDs must be unique");
  for (const bone of c.rig.bones) {
    if (
      ![bone.x, bone.y, bone.rotation, bone.length, bone.zIndex].every(
        Number.isFinite,
      )
    )
      throw new Error("Bone transforms must be finite");
    const seen = new Set([bone.id]);
    let parent = bone.parentId;
    while (parent) {
      if (!ids.has(parent)) throw new Error("Unknown parent bone");
      if (seen.has(parent)) throw new Error("Rig contains a cycle");
      seen.add(parent);
      parent = c.rig.bones.find((b) => b.id === parent)!.parentId;
    }
  }
  return c;
}
export function parseProject(input: unknown): Project {
  // Reject non-JSON runtime objects before a library mutates or persists authoring state.
  const inspect = (v: any, depth = 0) => {
    if (depth > 80) throw new Error("Project nesting exceeds limit");
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error("Project numbers must be finite");
    if (
      typeof v === "function" ||
      typeof v === "symbol" ||
      typeof v === "bigint"
    )
      throw new Error("Project must contain serializable data only");
    if (v && typeof v === "object")
      Object.values(v).forEach((x) => inspect(x, depth + 1));
  };
  inspect(input);
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      "Invalid project: " +
        result.error.issues
          .map((i) => i.path.join(".") + " " + i.message)
          .slice(0, 4)
          .join("; "),
    );
  const p = result.data as unknown as Project;
  const sceneIds = p.scenes.map((s) => s.id),
    elementIds = p.scenes.flatMap((s) => s.elements.map((e) => e.id));
  if (
    new Set(sceneIds).size !== sceneIds.length ||
    new Set(elementIds).size !== elementIds.length
  )
    throw new Error("Duplicate scene or element IDs");
  p.characters = (p.characters?.length ? p.characters : nativeCharacters()).map(
    validateCharacter,
  );
  p.scenes = p.scenes.map((s) => ({
    ...createDefaultScene(s.name, p.settings.width, p.settings.height),
    ...s,
    elements: s.elements.map((e) => createElement(e.type, e)),
    cameraKeys: s.cameraKeys ?? [],
    transitionDuration: s.transitionDuration ?? 0.5,
  }));
  for (const a of p.assets ?? []) {
    if (
      a.type === "sprite" &&
      (!a.sprite ||
        !Number.isInteger(a.sprite.columns) ||
        !Number.isInteger(a.sprite.rows) ||
        a.sprite.columns < 1 ||
        a.sprite.rows < 1 ||
        a.sprite.fps <= 0 ||
        a.sprite.animations.some(
          (x) =>
            x.from < 0 ||
            x.to < x.from ||
            x.to >= a.sprite!.columns * a.sprite!.rows,
        ))
    )
      throw new Error("Invalid sprite frame range");
    if (
      a.type === "lottie" &&
      (!a.lottie ||
        !Array.isArray(a.lottie.layers) ||
        !(Number(a.lottie.fr) > 0))
    )
      throw new Error("Invalid Lottie data");
  }
  for (const scene of p.scenes) {
    if (
      scene.camera.zoom <= 0 ||
      (scene.cameraKeys ?? []).some((k) => k.zoom <= 0 || k.time < 0)
    )
      throw new Error("Camera zoom must be positive and key times nonnegative");
    for (const line of scene.script) {
      if (
        typeof line.text !== "string" ||
        !Number.isFinite(line.duration) ||
        line.duration <= 0
      )
        throw new Error("Dialogue needs text and a positive duration");
    }
    for (const camera of scene.cameras) {
      if (!(camera.viewWidth > 0) || !(camera.viewHeight > 0))
        throw new Error("Camera dimensions must be positive");
      if (
        camera.spatial &&
        [camera.spatial.position, camera.spatial.target].some(
          (v) =>
            !Array.isArray(v) ||
            v.length !== 3 ||
            v.some((n) => !Number.isFinite(n)),
        )
      )
        throw new Error(
          "3D cameras need finite position and target coordinates",
        );
    }
    if(scene.room3d !== undefined) roomSchema.parse(scene.room3d);
    if(scene.backgroundDescription !== undefined && (typeof scene.backgroundDescription !== "string" || scene.backgroundDescription.length>8000))throw new Error("Invalid background description");
    for (const e of scene.elements) {
      if(e.whiteboard !== undefined){
        const wb=e.whiteboard;
        if(wb?.liveMode!==undefined && typeof wb.liveMode!=="boolean")throw new Error("Invalid presenter live mode");
        if(wb?.liveCommands!==undefined && !validLiveCommands(wb.liveCommands)) throw new Error("Invalid live whiteboard commands");
        if(!wb || typeof wb!=="object" || (wb.mode!==undefined && !["text","code","drawing"].includes(wb.mode)) || (wb.code!==undefined && (typeof wb.code!=="string" || wb.code.length>4000)))throw new Error("Invalid whiteboard content");
        if(wb.strokes!==undefined && (!Array.isArray(wb.strokes)||wb.strokes.length>100||wb.strokes.some(stroke=>!Array.isArray(stroke)||stroke.length<2||stroke.length>512||stroke.some(point=>!Array.isArray(point)||point.length!==2||point.some(v=>!Number.isFinite(v)||v<0||v>1)))))throw new Error("Invalid whiteboard drawing coordinates");
      }
      if(e.actor3d?.animationPoses !== undefined) {
        const poses=e.actor3d.animationPoses;
        if(!poses || typeof poses!=="object" || Array.isArray(poses))throw new Error("Invalid animation poses");
        for(const pose of Object.values(poses)) {
          if(!pose || typeof pose!=="object" || (pose.pose!==undefined && typeof pose.pose!=="string"))throw new Error("Invalid animation pose");
          if(pose.joints!==undefined)validateJointPose(pose.joints);
        }
      }
      if(e.actor3d?.jointPose) validateJointPose(e.actor3d.jointPose);
      if(e.actor3d?.savedPoses !== undefined) {
        if(!Array.isArray(e.actor3d.savedPoses)) throw new Error("Invalid saved 3D poses");
        for(const pose of e.actor3d.savedPoses) {
          if(!pose || typeof pose.id!=="string" || typeof pose.name!=="string" || typeof pose.pose!=="string" || typeof pose.seated!=="boolean") throw new Error("Invalid saved 3D pose");
          validateJointPose(pose.joints);
        }
      }
      const appearance = e.actor3d?.appearance;
      if (appearance) {
        for (const key of ["headSize", "faceWidth", "bodyWidth", "height"] as const) {
          const value = appearance[key];
          if (value !== undefined && (!Number.isFinite(value) || value < .5 || value > 1.5)) throw new Error("Character proportions must be between 0.5 and 1.5");
        }
        for (const key of ["skinTint", "hairColor", "topColor", "trousersColor", "shoesColor", "glassesColor"] as const) {
          if (appearance[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(appearance[key]!)) throw new Error("Invalid character colour");
        }
        if (appearance.glasses !== undefined && !["none", "round", "rectangular"].includes(appearance.glasses)) throw new Error("Invalid glasses style");
      }
      if (
        e.actor3d &&
        (![
          e.actor3d.x,
          e.actor3d.y ?? 0,
          e.actor3d.z,
          e.actor3d.rotation,
          e.actor3d.scale ?? 1,
          e.actor3d.motionStart ?? 0,
          e.actor3d.motionEnd ?? scene.duration,
          e.actor3d.motionSpeed ?? 1,
          ...(e.actor3d.travel ? Object.values(e.actor3d.travel) : []),
        ].every(Number.isFinite) ||
          (e.actor3d.motionSpeed !== undefined && e.actor3d.motionSpeed <= 0) ||
          (e.actor3d.travel && e.actor3d.travel.duration <= 0) ||
          (e.actor3d.scale !== undefined &&
            (e.actor3d.scale <= 0 || e.actor3d.scale > 100)) ||
          (e.actor3d.characterModel !== undefined && !["alex-v1", "sarah-v1", "procedural"].includes(e.actor3d.characterModel)) ||
          (e.actor3d.modelUrl && !e.actor3d.modelUrl.startsWith("data:")))
      )
        throw new Error(
          "3D actors need finite coordinates and embedded model data",
        );
      if (
        e.voice &&
        (!Number.isFinite(e.voice.rate) ||
          e.voice.rate < 80 ||
          e.voice.rate > 300 ||
          typeof e.voice.name !== "string")
      )
        throw new Error("Invalid character voice settings");
      if (
        e.motionPath &&
        (e.motionPath.points.length < 2 || e.motionPath.duration <= 0)
      )
        throw new Error("Motion paths need two points and a positive duration");
      if (e.assetId && !p.assets!.some((a) => a.id === e.assetId))
        throw new Error("Missing asset for " + e.name);
    }
  }
  p.version = "2.0";
  return p;
}
export function serializeProject(p: Project): string {
  return JSON.stringify(parseProject(p), null, 2);
}
export function projectDuration(p: Project) {
  return p.scenes.reduce((n, s) => n + s.duration, 0);
}
export function locateScene(p: Project, time: number) {
  const t = Math.max(0, Math.min(time, projectDuration(p)));
  let start = 0;
  for (let i = 0; i < p.scenes.length; i++) {
    const scene = p.scenes[i];
    if (t < start + scene.duration || i === p.scenes.length - 1)
      return {
        scene,
        index: i,
        start,
        time: Math.min(scene.duration, t - start),
      };
    start += scene.duration;
  }
  throw new Error("Project has no scenes");
}
export function resolveCharacter(p: Project, id: string) {
  return (
    p.characters?.find((c) => c.id === id) ??
    BUILT_IN_RIGGED_CHARACTERS.find((c) => c.id === id)
  );
}
