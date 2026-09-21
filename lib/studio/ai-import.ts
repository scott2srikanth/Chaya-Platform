import {
  projectResponseSchema,
  roomResponseSchema,
  readAIJson,
} from "./ai-schema";
import { conversationProject } from "./templates";
import { createDefaultScene, type Project } from "./types";
import { parseProject } from "./project";
export function importAIProject(text: string): Project {
  const data = projectResponseSchema.parse(readAIJson(text)),
    project = conversationProject(),
    actors = project.scenes[0].elements;
  project.metadata.name = data.name;
  project.scenes = data.scenes.map((source) => {
    const scene = createDefaultScene(source.name);
    scene.id = source.id;
    scene.duration = source.duration;
    scene.stage3d = true;
    scene.cameraMode = "dialogue";
    scene.subtitles = true;
    scene.backgroundDescription = source.backgroundDescription;
    scene.room3d = source.room;
    scene.elements = source.characters.map((c) => {
      const actor = structuredClone(
        actors.find((a) => a.characterId === c.id)!,
      );
      actor.id = `${source.id}-${c.id}`;
      actor.seated = c.seated;
      actor.actor3d = {
        ...actor.actor3d!,
        x: c.position[0],
        y: c.position[1],
        z: c.position[2],
        rotation: (c.rotation * Math.PI) / 180,
        appearance: { topColor: c.shirt },
      };
      return actor;
    });
    scene.cameras = [
      {
        id: `${scene.id}-wide`,
        name: "Wide",
        x: 0,
        y: 0,
        viewWidth: 1920,
        viewHeight: 1080,
        transition: "cut",
        transitionDuration: 0,
        spatial: source.camera,
      },
    ];
    scene.script = source.dialogue.map((line, i) => ({
      id: `${scene.id}-line-${i}`,
      characterElementId: `${scene.id}-${line.speaker}`,
      text: line.text,
      duration: line.duration,
      gesture: line.gesture,
      shot: line.shot,
      cameraId: line.shot === "wide" ? scene.cameras[0].id : undefined,
      reaction: "none",
    }));
    return scene;
  });
  return parseProject(project);
}
export function validateRoomResponse(text: string, project: Project) {
  const data = roomResponseSchema.parse(readAIJson(text));
  if (data.projectId !== project.id)
    throw new Error(
      "This background belongs to a different project. Copy a new room request from this project.",
    );
  if (!project.scenes.some((s) => s.id === data.sceneId))
    throw new Error("The target scene no longer exists in this project.");
  return data;
}
export function applyRoomResponse(project: Project, text: string): Project {
  const data = validateRoomResponse(text, project),
    next = structuredClone(project),
    scene = next.scenes.find((s) => s.id === data.sceneId)!;
  scene.room3d = data.room;
  scene.stage3d = true;
  return parseProject(next);
}
export const exampleRoom = {
  version: "chaya-room-1",
  name: "Interview studio",
  background: "#dce4ec",
  ambient: { color: "#ffffff", intensity: 2 },
  lights: [
    {
      type: "directional",
      color: "#fff4df",
      intensity: 3,
      position: [-3, 5, 4],
    },
  ],
  objects: [
    {
      id: "floor",
      name: "Floor",
      shape: "box",
      position: [0, -0.1, 0],
      rotation: [0, 0, 0],
      size: [10, 0.2, 10],
      color: "#b7aa96",
      roughness: 0.9,
      metalness: 0,
    },
    {
      id: "wall",
      name: "Back wall",
      shape: "box",
      position: [0, 2, -3],
      rotation: [0, 0, 0],
      size: [10, 4, 0.15],
      color: "#557080",
      roughness: 0.9,
      metalness: 0,
    },
  ],
};
const roomRules =
  "Generate a room from primitive meshes only. All objects use center positions in metres, Y up, camera generally looks toward negative Z. Rotations are XYZ Euler DEGREES. size is full XYZ extent, including sphere/cylinder/cone. Cylinders and cones are Y-axis aligned before rotation. Floor top at y=0. Build furniture from multiple named parts; keep clear space for characters. Seated characters have seat height approximately 0.48m: include chairs at their supplied positions/orientations. No automatic furniture is added. No URLs, code, textures, external models or extra fields. Every object needs all example fields. Unique IDs, max 250 objects and 6 lights; coordinates ±50m, sizes 0.01–100m, roughness/metalness 0–1, light intensity 0–8, ambient intensity 0–4, colours #RRGGBB.";
export function roomPrompt(
  project: Project,
  sceneId: string,
  description: string,
) {
  const scene = project.scenes.find((s) => s.id === sceneId)!;
  return JSON.stringify(
    {
      task: "Return ONLY the response JSON below, populated with the requested 3D room. Keep kind, projectId and sceneId exactly unchanged.",
      description,
      rules: roomRules,
      cast: scene.elements
        .filter((e) => e.type === "character")
        .map((e) => ({
          name: e.name,
          position: [e.actor3d?.x ?? 0, e.actor3d?.y ?? 0, e.actor3d?.z ?? 0],
          rotationDegrees: ((e.actor3d?.rotation ?? 0) * 180) / Math.PI,
          seated: !!e.seated,
        })),
      camera: scene.cameras[0]?.spatial,
      response: {
        kind: "chaya-room-response-1",
        projectId: project.id,
        sceneId: scene.id,
        room: exampleRoom,
      },
    },
    null,
    2,
  );
}
export function projectPrompt(description: string) {
  return JSON.stringify(
    {
      task: "Generate a complete 3D video project. Return ONLY JSON matching response. Replace the example with the requested number of scenes.",
      description,
      rules: [
        "kind must be chaya-project-1. Use 1–20 scenes with unique alphanumeric/hyphen/underscore IDs. No extra fields. Scene duration 1–600 seconds must cover the SUM of dialogue durations; lines play sequentially. Each line lasts 0.5–120 seconds.",
        "Only alex and sarah are supported; include each at most once per scene. Every speaker must appear in characters. Their voices are assigned automatically by the app. Gesture: idle/talking/pointing/waving/thinking/celebrating. Shot: wide/medium/closeup.",
        "Positions are metres [x,y,z], y is height above ground; rotation is Y-axis degrees. Characters roughly 1.8m tall. Camera position and target must differ. The camera is the wide shot; closer dialogue shots are composed automatically.",
        "backgroundDescription must be a self-contained, detailed art brief for each scene: geometry, room dimensions, furniture, colours, lighting, actor/chair/table positions and clear sightlines. It will be copied into a separate room request. Optional room embeds a finished room using roomFormat and roomRules; otherwise omit room and the app displays a placeholder set until a room response is applied.",
      ],
      roomRules,
      roomFormat: exampleRoom,
      response: {
        kind: "chaya-project-1",
        name: "My explainer",
        scenes: [
          {
            id: "scene-1",
            name: "Opening",
            duration: 10,
            backgroundDescription:
              "Describe this scene's room and furnishings in detail.",
            camera: { position: [0, 1.8, 6], target: [0, 1.2, 0] },
            characters: [
              {
                id: "alex",
                position: [-0.95, 0, 0],
                rotation: 10,
                seated: false,
                shirt: "#557789",
              },
              {
                id: "sarah",
                position: [0.95, 0, 0],
                rotation: -10,
                seated: false,
                shirt: "#955740",
              },
            ],
            dialogue: [
              {
                speaker: "alex",
                text: "What should we explain today?",
                duration: 5,
                gesture: "talking",
                shot: "wide",
              },
              {
                speaker: "sarah",
                text: "Let us show it, one step at a time.",
                duration: 5,
                gesture: "talking",
                shot: "medium",
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
}
