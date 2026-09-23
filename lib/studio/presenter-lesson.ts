import { z } from "zod";
import { drawingSchema, generatedBoardCommand } from "./whiteboard-ai";
import { whiteboardStrokes } from "./whiteboard";
import { validLiveCommands, type BoardCommand } from "./live-whiteboard";
const region = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .refine(
    (r) => r.x + r.width <= 1 && r.y + r.height <= 1,
    "Region must fit inside the board",
  );
const action = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("drawing"),
      drawing: drawingSchema,
      region: region.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("text"),
      text: z.string().min(1).max(400),
      region: region.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("code"),
      text: z.string().min(1).max(400),
      region: region.optional(),
    })
    .strict(),
]);
export const lessonSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(100),
    scenes: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
            title: z.string().trim().min(1).max(100),
            notes: z.string().max(2000).optional(),
            actions: z.array(action).min(1).max(12),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict()
  .refine(
    (l) => new Set(l.scenes.map((s) => s.id)).size === l.scenes.length,
    "Scene IDs must be unique",
  );
export type PresenterLesson = z.infer<typeof lessonSchema>;
export function compileLessonScene(
  scene: PresenterLesson["scenes"][number],
): BoardCommand[] {
  let start = 0.65;
  const events = scene.actions.map((a, i) => {
    let event: BoardCommand;
    if (a.type === "drawing")
      event = generatedBoardCommand(
        `draw ${scene.title} ${i + 1}`,
        a.drawing,
        start,
      );
    else {
      const { segments } = whiteboardStrokes(a.text, {
        mode: a.type,
        code: a.text,
      });
      event = {
        command: `${a.type}: ${a.text}`,
        start,
        duration: Math.max(1, Math.min(12, segments.length * 0.035)),
        strokes: segments
          .filter((s) => s.draw)
          .map((s) =>
            [s.from, s.to].map(
              ([x, y]) =>
                [
                  Math.max(0, Math.min(1, (x - 145) / 205)),
                  Math.max(0, Math.min(1, (y - 42) / 118)),
                ] as [number, number],
            ),
          ),
      };
    }
    const r = a.region ?? { x: 0, y: 0, width: 1, height: 1 };
    const textScale =
      a.type === "drawing"
        ? 1
        : Math.min(
            r.width,
            r.height /
              Math.max(0.001, ...event.strokes.flat().map((p) => p[1])),
          );
    event.strokes = event.strokes.map((s) =>
      s.map(([x, y]) => [
        r.x + x * (a.type === "drawing" ? r.width : textScale),
        r.y + y * (a.type === "drawing" ? r.height : textScale),
      ]),
    );
    start += event.duration + 0.35;
    return event;
  });
  if (!validLiveCommands(events))
    throw new Error(
      "Scene is too complex for the presenter. Reduce its content.",
    );
  return events;
}
export function parseLesson(value: unknown): PresenterLesson {
  const result = lessonSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  result.data.scenes.forEach(compileLessonScene);
  return result.data;
}
export const exampleLesson: PresenterLesson = {
  version: 1,
  title: "React • From browser to application",
  scenes: [
    {
      id: "web",
      title: "How the web works",
      notes: "Explain the browser and server before moving on.",
      actions: [
        {
          type: "text",
          text: "BROWSER       SERVER",
          region: { x: 0, y: 0, width: 1, height: 0.25 },
        },
        {
          type: "drawing",
          drawing: {
            strokes: [
              [
                { x: 0.1, y: 0.3 },
                { x: 0.35, y: 0.3 },
                { x: 0.35, y: 0.7 },
                { x: 0.1, y: 0.7 },
                { x: 0.1, y: 0.3 },
              ],
              [
                { x: 0.65, y: 0.3 },
                { x: 0.9, y: 0.3 },
                { x: 0.9, y: 0.7 },
                { x: 0.65, y: 0.7 },
                { x: 0.65, y: 0.3 },
              ],
              [
                { x: 0.37, y: 0.5 },
                { x: 0.62, y: 0.5 },
                { x: 0.56, y: 0.44 },
              ],
            ],
          },
        },
      ],
    },
    {
      id: "component",
      title: "Your first component",
      actions: [
        {
          type: "code",
          text: "function Hello() {\n  return <h1>Hello</h1>;\n}",
        },
      ],
    },
    {
      id: "architecture",
      title: "Application architecture",
      actions: [{ type: "text", text: "UI -> API -> DATABASE" }],
    },
    {
      id: "recap",
      title: "Discuss and recap",
      actions: [{ type: "text", text: "COMPONENTS\nPROPS\nSTATE" }],
    },
  ],
};
export const lessonPrompt = `Create a teacher-led whiteboard lesson. Topic: [describe your lesson here]. Return ONLY JSON, no markdown. Match this example's structure. version must be 1. Up to 24 scenes, each with a unique id, title, optional teacher notes and 1–12 actions. Actions are text/code (text up to 400 characters) or drawing (drawing.strokes contains polylines of {x,y} points between 0 and 1; 2–150 points per stroke, up to 120 strokes and 4000 total points). Optional drawing.color is hex #RRGGBB and penWidth 0.5–6. Each action may have region {x,y,width,height} normalized within the board. Place labels and diagrams in separate regions so they do not overlap. Actions draw in order, each scene starts on a blank board and waits for the teacher. Use text actions for labels; preserve code indentation. Prefer short readable slides. No URLs or executable code beyond displayed lesson text.\n${JSON.stringify(exampleLesson, null, 2)}`;
