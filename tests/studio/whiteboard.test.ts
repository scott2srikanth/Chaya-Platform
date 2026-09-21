import { test } from "node:test";
import assert from "node:assert/strict";
import {
  presenterSpriteFrame,
  whiteboardPresenterPose,
  whiteboardFrame,
  whiteboardStrokes,
} from "../../lib/studio/whiteboard";
import { whiteboardProject } from "../../lib/studio/templates";
import { parseProject, serializeProject } from "../../lib/studio/project";
test("whiteboard ink and marker tip follow the same deterministic path", () => {
  const first = whiteboardFrame("PLAN", 0, 8);
  assert.equal(first.distance, 0);
  const middle = whiteboardFrame("PLAN", 3, 8);
  const segment = middle.segments.find(
    (s) => middle.distance <= s.start + s.length,
  )!;
  const p = (middle.distance - segment.start) / segment.length;
  assert.ok(
    Math.abs(
      middle.tip[0] - (segment.from[0] + (segment.to[0] - segment.from[0]) * p),
    ) < 1e-8,
  );
  const end = whiteboardFrame("PLAN", 9, 8);
  assert.equal(end.distance, whiteboardStrokes("PLAN").total);
  assert.deepEqual(whiteboardFrame("PLAN", 3, 8), middle);
});
test("whiteboard template and empty text remain valid", () => {
  const p = whiteboardProject();
  const restored = parseProject(JSON.parse(serializeProject(p)));
  assert.equal(
    restored.scenes[0].elements[0].componentKind,
    "Whiteboard presenter",
  );
  assert.equal(whiteboardFrame("", 3, 8).segments.length, 0);
  assert.ok(whiteboardStrokes("abc 123!?").total > 0);
});

test("presenter steps clear of all ink and faces camera only after writing", () => {
  const end = whiteboardFrame("A LONG HEADING\nPLAN\nBUILD", 20, 9);
  const before = whiteboardPresenterPose(end.tip, 9, 9);
  assert.equal(before.move, 0);
  assert.equal(before.face, 0);
  assert.deepEqual(before.marker, end.tip);
  const final = whiteboardPresenterPose(end.tip, 13, 9);
  assert.equal(final.x, 50);
  assert.equal(final.face, 1);
  assert.equal(final.move, 1);
  const leftmost = Math.min(
    ...end.segments.filter((s) => s.draw).flatMap((s) => [s.from[0], s.to[0]]),
  );
  assert.ok(final.x + 51 < leftmost);
  assert.deepEqual(whiteboardPresenterPose(end.tip, 13, 9), final);
});

test("presenter rotates through a profile instead of fading on a face",()=>{
 const middle=whiteboardPresenterPose([180,100],10.85,9);
 assert.ok(Math.abs(middle.face-.5)<1e-10);
});

test("sprite turn changes full views at the narrowest point without a face fade",()=>{
 assert.equal(presenterSpriteFrame(0).view,"back");assert.equal(presenterSpriteFrame(1).view,"front");
 assert.equal(presenterSpriteFrame(0).widthScale,1);assert.equal(presenterSpriteFrame(1).widthScale,1);
 assert.equal(presenterSpriteFrame(.5).widthScale,.07);
});

test("code preserves case and indentation and includes programming punctuation",()=>{
 const lower=whiteboardStrokes("",{mode:"code",code:"const x = (a) => {\n  return a + 1;\n};"});
 assert.ok(lower.total>0);
 assert.notDeepEqual(whiteboardStrokes("",{mode:"code",code:"a"}),whiteboardStrokes("",{mode:"code",code:"A"}));
 const indented=whiteboardStrokes("",{mode:"code",code:"  x"});
 assert.ok(indented.segments[0].from[0]>145);
 assert.notDeepEqual(whiteboardStrokes("",{mode:"code",code:"{"}),whiteboardStrokes("",{mode:"code",code:"?"}));
});
test("drawing follows supplied points, and content roundtrips with the project",()=>{
 const content={mode:"drawing" as const,strokes:[[[0,0],[1,0],[1,1]] as [number,number][]]};
 const drawing=whiteboardStrokes("ignored",content);assert.deepEqual(drawing.segments[0].from,[145,42]);assert.deepEqual(drawing.segments[1].to,[350,160]);
 const frame=whiteboardFrame("",20,8,content);assert.deepEqual(frame.tip,[350,160]);
 const p=whiteboardProject();p.scenes[0].elements[0].whiteboard=content;
 assert.deepEqual(parseProject(JSON.parse(serializeProject(p))).scenes[0].elements[0].whiteboard,content);
 p.scenes[0].elements[0].whiteboard!.strokes=[[[2,0],[1,1]]];assert.throws(()=>parseProject(p));
});
