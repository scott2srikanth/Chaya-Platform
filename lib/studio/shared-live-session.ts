import { randomBytes } from "node:crypto";
import { cloudflareDatabase, type SqlDatabase } from "../studio-database";
import {
  applyLiveCommand,
  newLiveSession,
  getLiveSession,
  joinLiveSession,
  commandLiveSession,
  type Session,
  type LiveSessionState,
} from "./live-session";
import { validLiveCommands, type BoardCommand } from "./live-whiteboard";
const ttl = 4 * 60 * 60 * 1000;
function decode(row: any): Session {
  if (!row)
    throw new Error("Session expired or unavailable. Create a new session.");
  return {
    state: JSON.parse(row.state_json),
    code: row.code,
    token: row.token,
    requests: new Map(
      JSON.parse(row.requests_json).map((id: string) => [id, true]),
    ),
    listeners: new Set(),
  };
}
export function sharedLiveStore(db: SqlDatabase) {
  const get = async (id: string) =>
    decode(
      await db.first(
        "SELECT * FROM live_rooms WHERE id=? AND expires_at>?",
        id,
        Date.now(),
      ),
    );
  return {
    async create(events: BoardCommand[] = []) {
      if (!validLiveCommands(events))
        throw new Error("Invalid presenter recording.");
      await db.run("DELETE FROM live_rooms WHERE expires_at<=?", Date.now());
      const id = randomBytes(16).toString("hex"),
        token = randomBytes(24).toString("hex"),
        code = randomBytes(4).toString("hex").toUpperCase();
      const end = events.length
        ? events[events.length - 1].start +
          events[events.length - 1].duration +
          3
        : 0;
      const state: LiveSessionState = {
        id,
        revision: 0,
        events,
        anchorTime: end,
        anchorMs: Date.now(),
        end,
        playing: false,
        updatedAt: Date.now(),
      };
      await db.run(
        "INSERT INTO live_rooms VALUES(?,?,?,?,?,?,?)",
        id,
        code,
        token,
        JSON.stringify(state),
        "[]",
        0,
        Date.now() + ttl,
      );
      return { state, code, token };
    },
    get,
    async join(code: string) {
      const session = decode(
        await db.first(
          "SELECT * FROM live_rooms WHERE code=? AND expires_at>?",
          code.trim().toUpperCase(),
          Date.now(),
        ),
      );
      return { state: session.state, token: session.token };
    },
    async command(
      id: string,
      token: string,
      input: Parameters<typeof commandLiveSession>[2],
    ) {
      // Optimistic concurrency preserves simultaneous tablet commands and retry IDs.
      for (let attempt = 0; attempt < 8; attempt++) {
        const session = await get(id),
          revision = session.state.revision;
        const state = applyLiveCommand(session, token, input);
        if (state.revision === revision) return state;
        const result = await db.run(
          "UPDATE live_rooms SET state_json=?,requests_json=?,revision=?,expires_at=? WHERE id=? AND revision=? AND expires_at>?",
          JSON.stringify(state),
          JSON.stringify(Array.from(session.requests.keys())),
          state.revision,
          Date.now() + ttl,
          id,
          revision,
          Date.now(),
        );
        if (result.changes === 1) return state;
      }
      throw new Error(
        "Another controller is updating this room. Please retry.",
      );
    },
  };
}
export async function liveStore() {
  const db = await cloudflareDatabase();
  if (db) return { shared: true, ...sharedLiveStore(db) };
  return {
    shared: false,
    create: async (events: BoardCommand[] = []) => newLiveSession(events),
    get: async (id: string) => getLiveSession(id),
    join: async (code: string) => joinLiveSession(code),
    command: async (...args: Parameters<typeof commandLiveSession>) =>
      commandLiveSession(...args),
  };
}
