import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLesson,
  exampleLesson,
  compileLessonScene,
} from "../../lib/studio/presenter-lesson";
import {
  newLiveSession,
  commandLiveSession,
  sessionTime,
} from "../../lib/studio/live-session";
import { whiteboardPresenterPose } from "../../lib/studio/whiteboard";
test("lesson validation rejects duplicate scenes, out-of-board regions and invalid ink", () => {
  assert.equal(parseLesson(exampleLesson).scenes.length, 4);
  const duplicate = structuredClone(exampleLesson);
  duplicate.scenes[1].id = duplicate.scenes[0].id;
  assert.throws(() => parseLesson(duplicate));
  const region = structuredClone(exampleLesson);
  region.scenes[0].actions[0].region = { x: 0.9, y: 0, width: 0.5, height: 1 };
  assert.throws(() => parseLesson(region));
  assert.throws(() =>
    parseLesson({
      ...exampleLesson,
      scenes: [
        {
          id: "a",
          title: "A",
          actions: [
            {
              type: "drawing",
              drawing: {
                strokes: [
                  [
                    { x: 2, y: 0 },
                    { x: 0, y: 1 },
                  ],
                ],
              },
            },
          ],
        },
      ],
    }),
  );
});
test("teacher selects scenes; completion holds, retries do not restart, and lesson remains reusable", () => {
  const room = newLiveSession();
  let n = 0;
  const send = (action: string, extra: object = {}) =>
    commandLiveSession(room.state.id, room.token, {
      action,
      requestId: String(++n),
      ...extra,
    });
  assert.throws(() =>
    commandLiveSession(room.state.id, "wrong", {
      action: "lesson",
      requestId: "bad",
      lesson: exampleLesson,
    }),
  );
  const loaded = send("lesson", { lesson: exampleLesson });
  assert.equal(loaded.playing, false);
  assert.equal(loaded.events.length, 0);
  const first = send("scene", { sceneId: "web" });
  assert.equal(first.activeSceneId, "web");
  assert.ok(first.events.length > 0);
  assert.equal(sessionTime(first, first.anchorMs + 999999), first.end);
  const retry = commandLiveSession(room.state.id, room.token, {
    action: "scene",
    requestId: String(n),
    sceneId: "web",
  });
  assert.equal(retry.revision, first.revision);
  const second = send("scene", { sceneId: "component" });
  assert.equal(second.anchorTime, 0);
  assert.equal(second.activeSceneId, "component");
  assert.ok(second.playbackEpoch! > first.playbackEpoch!);
  assert.equal(second.lesson?.scenes.length, 4);
  assert.throws(() => send("scene", { sceneId: "missing" }));
  const reset = send("reset");
  assert.equal(reset.events.length, 0);
  assert.equal(reset.lesson?.scenes.length, 4);
});
test("compiled scenes preserve ordered actions and normalized regions", () => {
  for (const scene of parseLesson(exampleLesson).scenes) {
    const events = compileLessonScene(scene);
    events.forEach((e, i) => {
      assert.ok(e.strokes.length);
      assert.ok(
        e.start >= (i ? events[i - 1].start + events[i - 1].duration : 0),
      );
      for (const p of e.strokes.flat())
        assert.ok(p.every((v) => v >= 0 && v <= 1));
    });
  }
});
test("smoothed body stance holds steady for small strokes while both arm bones retain their lengths", () => {
  const a = whiteboardPresenterPose([200, 110], 1, 9, 120),
    b = whiteboardPresenterPose([204, 110], 1, 9, 120);
  assert.equal(a.x, b.x);
  for (const pose of [a, b]) {
    assert.ok(
      Math.abs(
        Math.hypot(
          pose.elbow[0] - pose.shoulder[0],
          pose.elbow[1] - pose.shoulder[1],
        ) - 46,
      ) < 1e-8,
    );
    assert.ok(
      Math.abs(
        Math.hypot(pose.hand[0] - pose.elbow[0], pose.hand[1] - pose.elbow[1]) -
          50,
      ) < 1e-8,
    );
  }
});

import { receivePlayback, playbackTime } from "../../lib/studio/live-playback";
test("clock ignores stale updates, eases drift without jumps, and resets for a new scene", () => {
  const state = {
    id: "test",
    revision: 1,
    events: [],
    anchorTime: 0,
    anchorMs: 1000,
    end: 30,
    playing: true,
    updatedAt: 1000,
    playbackEpoch: 1,
  };
  const first = receivePlayback(null, state, 2000, 100);
  assert.equal(playbackTime(first, 1100), 2);
  assert.equal(receivePlayback(first, state, 9000, 900), first);
  const corrected = receivePlayback(
    first,
    { ...state, revision: 2 },
    3400,
    1100,
  );
  assert.equal(playbackTime(corrected, 1100), 2);
  assert.equal(playbackTime(corrected, 2100), 3.08);
  const backwards = receivePlayback(
    corrected,
    { ...state, revision: 3 },
    2400,
    2100,
  );
  assert.equal(playbackTime(backwards, 2100), 3.08);
  assert.ok(playbackTime(backwards, 2200) > 3.08);
  const next = receivePlayback(
    backwards,
    { ...state, revision: 4, playbackEpoch: 2, anchorMs: 4000 },
    4000,
    2200,
  );
  assert.equal(next.time, 0);
});
