import { z } from "zod";
const n = z.number().finite();
const vector = z.tuple([
  n.min(-50).max(50),
  n.min(-50).max(50),
  n.min(-50).max(50),
]);
const rotation = z.tuple([
  n.min(-360).max(360),
  n.min(-360).max(360),
  n.min(-360).max(360),
]);
const color = z.string().regex(/^#[0-9a-f]{6}$/i, "Use #RRGGBB colours");
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const roomSchema = z
  .object({
    version: z.literal("chaya-room-1"),
    name: z.string().min(1).max(120),
    background: color,
    ambient: z.object({ color, intensity: n.min(0).max(4) }).strict(),
    lights: z
      .array(
        z
          .object({
            type: z.enum(["directional", "point"]),
            color,
            intensity: n.min(0).max(8),
            position: vector,
          })
          .strict(),
      )
      .max(6),
    objects: z
      .array(
        z
          .object({
            id,
            name: z.string().min(1).max(120),
            shape: z.enum(["box", "sphere", "cylinder", "cone"]),
            position: vector,
            rotation,
            size: z.tuple([
              n.min(0.01).max(100),
              n.min(0.01).max(100),
              n.min(0.01).max(100),
            ]),
            color,
            roughness: n.min(0).max(1),
            metalness: n.min(0).max(1),
          })
          .strict(),
      )
      .min(1)
      .max(250),
  })
  .strict()
  .superRefine((room, ctx) => {
    if (new Set(room.objects.map((o) => o.id)).size !== room.objects.length)
      ctx.addIssue({
        code: "custom",
        path: ["objects"],
        message: "Object IDs must be unique",
      });
  });
export type Room3D = z.infer<typeof roomSchema>;
export const roomResponseSchema = z
  .object({
    kind: z.literal("chaya-room-response-1"),
    projectId: id,
    sceneId: id,
    room: roomSchema,
  })
  .strict();
export const projectResponseSchema = z
  .object({
    kind: z.literal("chaya-project-1"),
    name: z.string().min(1).max(120),
    scenes: z
      .array(
        z
          .object({
            id,
            name: z.string().min(1).max(120),
            duration: n.min(1).max(600),
            backgroundDescription: z.string().min(1).max(8000),
            room: roomSchema.optional(),
            camera: z.object({ position: vector, target: vector }).strict(),
            characters: z
              .array(
                z
                  .object({
                    id: z.enum(["alex", "sarah"]),
                    position: vector,
                    rotation: n.min(-360).max(360),
                    seated: z.boolean(),
                    shirt: color,
                  })
                  .strict(),
              )
              .min(1)
              .max(2),
            dialogue: z
              .array(
                z
                  .object({
                    speaker: z.enum(["alex", "sarah"]),
                    text: z.string().min(1).max(2000),
                    duration: n.min(0.5).max(120),
                    gesture: z.enum([
                      "idle",
                      "talking",
                      "pointing",
                      "waving",
                      "thinking",
                      "celebrating",
                    ]),
                    shot: z.enum(["wide", "medium", "closeup"]),
                  })
                  .strict(),
              )
              .min(1)
              .max(80),
          })
          .strict()
          .superRefine((scene, ctx) => {
            if (
              new Set(scene.characters.map((c) => c.id)).size !==
              scene.characters.length
            )
              ctx.addIssue({
                code: "custom",
                path: ["characters"],
                message: "Character IDs must be unique in a scene",
              });
            scene.dialogue.forEach((line, i) => {
              if (!scene.characters.some((c) => c.id === line.speaker))
                ctx.addIssue({
                  code: "custom",
                  path: ["dialogue", i, "speaker"],
                  message: "Speaker must be in this scene",
                });
            });
            if (
              scene.dialogue.reduce((sum, line) => sum + line.duration, 0) >
              scene.duration + 0.001
            )
              ctx.addIssue({
                code: "custom",
                path: ["duration"],
                message: "Scene duration must cover all dialogue",
              });
            if (
              scene.camera.position.every(
                (v, i) => v === scene.camera.target[i],
              )
            )
              ctx.addIssue({
                code: "custom",
                path: ["camera"],
                message: "Camera position and target must differ",
              });
          }),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.scenes.map((s) => s.id)).size !== p.scenes.length)
      ctx.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Scene IDs must be unique",
      });
  });
export function readAIJson(text: string): unknown {
  if (text.length > 2_000_000)
    throw new Error("JSON must be smaller than 2 MB");
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*\n/i, "")
    .replace(/\n```\s*$/, "");
  return JSON.parse(clean);
}
