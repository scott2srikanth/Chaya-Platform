import { test } from "node:test";
import assert from "node:assert/strict";
import {
  presenterActionStart,
  createBoardCommand,
  boardWritingDuration,
} from "../../lib/studio/live-whiteboard";
import { generatedBoardCommand } from "../../lib/studio/whiteboard-ai";
import {
  whiteboardFrame,
  whiteboardStrokes,
} from "../../lib/studio/whiteboard";
test("first live action rewinds even if an empty board was already playing", () => {
  assert.equal(presenterActionStart(14, 0.15, true, false, false), 0);
  assert.equal(presenterActionStart(14, 0.15, true, true, true), 0);
  assert.equal(presenterActionStart(5, 12, true, true, false), 5);
  assert.equal(presenterActionStart(14, 14.15, false, true, false), 14);
});
test("text and imported diagrams reveal progressively along the marker path", () => {
  const events = [
    createBoardCommand("write Hello world", [], 0.15),
    generatedBoardCommand(
      "draw rectangle",
      {
        strokes: [
          [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
            { x: 0.1, y: 0.1 },
          ],
        ],
      },
      0.15,
    ),
  ];
  for (const event of events) {
    const content = { liveCommands: [event] };
    const geometry = whiteboardStrokes("", {
      mode: "drawing",
      strokes: event.strokes,
    });
    assert.equal(whiteboardFrame("", 0, 9, content).distance, 0);
    const partial = whiteboardFrame(
      "",
      event.start + event.duration * 0.25,
      9,
      content,
    );
    assert.ok(partial.distance > 0 && partial.distance < geometry.total * 0.3);
    assert.ok(partial.writing);
    assert.equal(
      whiteboardFrame("", event.start + event.duration + 1, 9, content)
        .distance,
      geometry.total,
    );
  }
});
test("longer paths get enough time for visible drawing instead of the former short cap", () => {
  const complex = Array.from(
    { length: 30 },
    (_, i) =>
      [
        [0, i / 30],
        [1, i / 30],
      ] as [number, number][],
  );
  assert.ok(boardWritingDuration(complex) > 10);
  assert.ok(boardWritingDuration(complex) <= 60);
});
