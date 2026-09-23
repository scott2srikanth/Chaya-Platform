import { pastedTextCommand } from "./whiteboard-text";
import {
  parseLesson,
  compileLessonScene,
  type PresenterLesson,
} from "./presenter-lesson";
import { generatedBoardCommand } from "./whiteboard-ai";
import { randomBytes } from "node:crypto";
import {
  createBoardCommand,
  validLiveCommands,
  type BoardCommand,
} from "./live-whiteboard";
export type LiveSessionState = {
  id: string;
  revision: number;
  lesson?: PresenterLesson;
  activeSceneId?: string;
  playbackEpoch?: number;
  events: BoardCommand[];
  anchorTime: number;
  anchorMs: number;
  end: number;
  playing: boolean;
  updatedAt: number;
};
export type Session = {
  state: LiveSessionState;
  code: string;
  token: string;
  listeners: Set<(state: LiveSessionState) => void>;
  requests: Map<string, true>;
};
const globalSessions = globalThis as typeof globalThis & {
  studioLiveSessions?: Map<string, Session>;
};
const sessions = (globalSessions.studioLiveSessions ??= new Map<
  string,
  Session
>());
const ttl = 4 * 60 * 60 * 1000;
function cleanup() {
  sessions.forEach((s, id) => {
    if (Date.now() - s.state.updatedAt > ttl) sessions.delete(id);
  });
}
export function newLiveSession(events: BoardCommand[] = []) {
  cleanup();
  if (sessions.size >= 50)
    throw new Error("Too many live sessions. Try again later.");
  if (!validLiveCommands(events))
    throw new Error("Invalid presenter recording.");
  const id = randomBytes(16).toString("hex"),
    token = randomBytes(24).toString("hex");
  let code = "";
  do {
    code = randomBytes(4).toString("hex").toUpperCase();
  } while (Array.from(sessions.values()).some((s) => s.code === code));
  const end = events.length
    ? events[events.length - 1].start + events[events.length - 1].duration + 3
    : 0;
  const state: LiveSessionState = {
    id,
    revision: 0,
    events: structuredClone(events),
    anchorTime: end,
    anchorMs: Date.now(),
    end,
    playing: false,
    updatedAt: Date.now(),
  };
  sessions.set(id, {
    state,
    code,
    token,
    listeners: new Set(),
    requests: new Map(),
  });
  return { state, code, token };
}
export function getLiveSession(id: string) {
  cleanup();
  const s = sessions.get(id);
  if (!s)
    throw new Error("Session expired or unavailable. Create a new session.");
  return s;
}
export function joinLiveSession(code: string) {
  cleanup();
  const s = Array.from(sessions.values()).find(
    (s) => s.code === code.trim().toUpperCase(),
  );
  if (!s)
    throw new Error("Session code not found. Check the code on the host.");
  return { state: s.state, token: s.token };
}
export function sessionTime(state: LiveSessionState, now = Date.now()) {
  return state.playing
    ? Math.min(
        state.end,
        state.anchorTime + Math.max(0, now - state.anchorMs) / 1000,
      )
    : state.anchorTime;
}
export function commandLiveSession(
  id: string,
  token: string,
  input: {
    action: string;
    command?: string;
    requestId: string;
    drawing?: unknown;
    text?: unknown;
    lesson?: unknown;
    sceneId?: string;
  },
) {
  const s = getLiveSession(id);
  return applyLiveCommand(s, token, input);
}
export function applyLiveCommand(
  s: Session,
  token: string,
  input: {
    action: string;
    command?: string;
    requestId: string;
    drawing?: unknown;
    text?: unknown;
    lesson?: unknown;
    sceneId?: string;
  },
) {
  if (s.token !== token)
    throw new Error("Controller access denied. Join with the session code.");
  if (s.requests.has(input.requestId)) return s.state;
  const now = Date.now(),
    current = sessionTime(s.state, now);
  let events = s.state.events,
    anchor = current,
    end = s.state.end,
    playing = s.state.playing && current < end;
  let lesson = s.state.lesson,
    activeSceneId = s.state.activeSceneId;
  let epoch = s.state.playbackEpoch ?? 0;
  if (input.action === "write-text") {
    events = [pastedTextCommand(input.text)];
    anchor = 0;
    end = events[0].start + events[0].duration + 2;
    playing = true;
    activeSceneId = undefined;
    epoch++;
  } else if (input.action === "lesson") {
    lesson = parseLesson(input.lesson);
    events = [];
    anchor = 0;
    end = 0;
    playing = false;
    activeSceneId = undefined;
    epoch++;
  } else if (input.action === "scene") {
    const scene = lesson?.scenes.find((scene) => scene.id === input.sceneId);
    if (!scene) throw new Error("Select a scene from the prepared lesson.");
    events = compileLessonScene(scene);
    anchor = 0;
    end =
      events[events.length - 1].start + events[events.length - 1].duration + 2;
    playing = true;
    activeSceneId = scene.id;
    epoch++;
  } else if (input.action === "command" || input.action === "drawing") {
    if (
      input.action === "command" &&
      (!input.command?.trim() || input.command.length > 500)
    )
      throw new Error("Enter a command of up to 500 characters.");
    if (events.length >= 120)
      throw new Error("This recording is full. Start a new session.");
    const last = events[events.length - 1],
      start = Math.max(current, last ? last.start + last.duration : 0) + 0.15;
    const event =
      input.action === "drawing"
        ? generatedBoardCommand(
            `draw sketch ${events.filter((e) => e.command.startsWith("draw sketch ")).length + 1}`,
            input.drawing,
            start,
          )
        : createBoardCommand(input.command!, events, start);
    events = [...events, event];
    end = start + event.duration + 3;
    anchor = playing ? current : Math.max(0, start - 0.15);
    playing = true;
  } else if (input.action === "reset") {
    activeSceneId = undefined;
    epoch++;
    events = [];
    anchor = 0;
    end = 0;
    playing = false;
  } else if (input.action === "pause") {
    playing = false;
  } else if (input.action === "replay") {
    epoch++;
    anchor = 0;
    playing = events.length > 0;
  } else if (input.action === "resume") {
    playing = current < end;
  } else throw new Error("Unknown presenter action.");
  s.state = {
    ...s.state,
    revision: s.state.revision + 1,
    lesson,
    activeSceneId,
    playbackEpoch: epoch,
    events,
    anchorTime: anchor,
    anchorMs: now,
    end,
    playing,
    updatedAt: now,
  };
  s.requests.set(input.requestId, true);
  if (s.requests.size > 500) s.requests.delete(s.requests.keys().next().value!);
  s.listeners.forEach((fn) => fn(s.state));
  return s.state;
}
