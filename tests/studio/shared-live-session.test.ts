import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sharedLiveStore } from "../../lib/studio/shared-live-session";
import type { SqlDatabase } from "../../lib/studio-database";
const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
test("shared rooms survive new store instances, concurrent commands, retries and expiration", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("migrations/0001_studio.sql", "utf8"));
  const db: SqlDatabase = {
    first: async (sql, ...values) => sqlite.prepare(sql).get(...values),
    run: async (sql, ...values) => sqlite.prepare(sql).run(...values),
  };
  const first = sharedLiveStore(db),
    second = sharedLiveStore(db);
  const created = await first.create();
  assert.equal((await second.join(created.code)).token, created.token);
  const commands = [
    { action: "command", command: "write hello", requestId: "a" },
    { action: "command", command: "draw computer", requestId: "b" },
  ];
  await Promise.all(
    commands.map((c) => second.command(created.state.id, created.token, c)),
  );
  const state = (await first.get(created.state.id)).state;
  assert.equal(state.events.length, 2);
  assert.equal(state.revision, 2);
  assert.equal(
    (await second.command(created.state.id, created.token, commands[0])).events
      .length,
    2,
  );
  await assert.rejects(
    () =>
      second.command(created.state.id, "wrong", {
        action: "pause",
        requestId: "c",
      }),
    /denied/,
  );
  await db.run("UPDATE live_rooms SET expires_at=0");
  await assert.rejects(() => first.get(created.state.id), /expired/);
  sqlite.close();
});

test("colored ink, animated clear board and timeline reset survive shared storage", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("migrations/0001_studio.sql", "utf8"));
  const db: SqlDatabase = {
    first: async (sql, ...v) => sqlite.prepare(sql).get(...v),
    run: async (sql, ...v) => sqlite.prepare(sql).run(...v),
  };
  const store = sharedLiveStore(db),
    room = await store.create();
  const draw = {
    action: "drawing",
    requestId: "color",
    drawing: {
      color: "#ff0066",
      penWidth: 3,
      strokes: [
        [
          { x: 0.1, y: 0.1 },
          { x: 0.3, y: 0.3 },
        ],
      ],
    },
  };
  let state = await store.command(room.state.id, room.token, draw);
  assert.equal(state.events[0].color, "#ff0066");
  assert.equal(state.events[0].penWidth, 3);
  await store.command(room.state.id, room.token, {
    action: "command",
    command: "write hello",
    requestId: "text",
  });
  state = await store.command(room.state.id, room.token, {
    action: "command",
    command: "remove all",
    requestId: "erase",
  });
  assert.deepEqual(state.events[2].eraseTargets, [0, 1]);
  state = await store.command(room.state.id, room.token, {
    action: "reset",
    requestId: "reset",
  });
  assert.deepEqual(state.events, []);
  assert.equal(state.playing, false);
  assert.equal(state.end, 0);
  assert.deepEqual(
    (await sharedLiveStore(db).get(room.state.id)).state.events,
    [],
  );
  assert.equal(
    (
      await store.command(room.state.id, room.token, {
        action: "reset",
        requestId: "reset",
      })
    ).revision,
    state.revision,
  );
  await assert.rejects(
    () =>
      store.command(room.state.id, "bad", {
        action: "reset",
        requestId: "unauthorized",
      }),
    /denied/,
  );
  sqlite.close();
});
