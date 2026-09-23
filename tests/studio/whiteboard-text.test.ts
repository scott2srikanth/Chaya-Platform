import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pastedTextCommand,
  presenterGaze,
} from "../../lib/studio/whiteboard-text";
import { validLiveCommands } from "../../lib/studio/live-whiteboard";
import {
  newLiveSession,
  commandLiveSession,
} from "../../lib/studio/live-session";
test("pasted text wraps to the bottom without clipping and is a valid recording", () => {
  const event = pastedTextCommand(
    "This lesson explains how the browser sends a request and the server returns a response. ".repeat(
      6,
    ),
  );
  assert.ok(validLiveCommands([event]));
  const points = event.strokes.flat();
  assert.ok(Math.max(...points.map((p) => p[1])) > 0.95);
  assert.ok(points.every((p) => p.every((v) => v >= 0 && v <= 1)));
  assert.ok(event.duration > 3);
});
test("paste rejects empty or oversized passages instead of silently truncating", () => {
  assert.throws(() => pastedTextCommand(" "));
  assert.throws(() => pastedTextCommand("a".repeat(601)));
  assert.throws(() => pastedTextCommand("a\n".repeat(25)));
});
test("paste starts a fresh synchronized board and increments playback epoch", () => {
  const r = newLiveSession();
  const first = commandLiveSession(r.state.id, r.token, {
    action: "command",
    command: "write Hello",
    requestId: "a",
  });
  const page = commandLiveSession(r.state.id, r.token, {
    action: "write-text",
    text: "A pasted lesson\nwith two lines.",
    requestId: "b",
  });
  assert.equal(page.events.length, 1);
  assert.equal(page.anchorTime, 0);
  assert.ok(page.playing);
  assert.ok(page.playbackEpoch! > (first.playbackEpoch ?? 0));
  assert.equal(
    commandLiveSession(r.state.id, r.token, {
      action: "write-text",
      text: "retry",
      requestId: "b",
    }).revision,
    page.revision,
  );
});
test("head tracks marker height within a restrained natural tilt", () => {
  assert.ok(presenterGaze([200, 22], 140) < 0);
  assert.ok(presenterGaze([200, 197], 140) > 0);
  for (const y of [0, 40, 80, 140, 200])
    assert.ok(Math.abs(presenterGaze([200, y], 140)) <= 18);
});
