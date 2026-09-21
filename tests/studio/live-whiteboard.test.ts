import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBoardCommand,
  validLiveCommands,
} from "../../lib/studio/live-whiteboard";
import { whiteboardFrame } from "../../lib/studio/whiteboard";
test("live drawing supports browser in monitor and both connection directions", () => {
  const browser = createBoardCommand("Draw a browser.", [], 0);
  const forward = createBoardCommand(
    "connect the computer to the server",
    [browser],
    11,
  );
  const reverse = createBoardCommand(
    "connect server to computer",
    [browser, forward],
    22,
  );
  assert.equal(browser.strokes.length, 7);
  assert.equal(forward.strokes.length, 5);
  assert.equal(reverse.strokes.length, 1);
  assert.ok(forward.strokes.at(-1)![0][0] < forward.strokes.at(-1)![1][0]);
  assert.ok(reverse.strokes[0][0][0] > reverse.strokes[0][1][0]);
  assert.ok(validLiveCommands([browser, forward, reverse]));
});
test("write preserves case, limits content, and rejects unsupported drawing requests", () => {
  const event = createBoardCommand("write Hello World", [], 0);
  assert.equal(event.command, "write Hello World");
  assert.ok(event.strokes.length);
  assert.throws(() => createBoardCommand("draw dragon", [], 0));
  assert.throws(() => createBoardCommand("write " + "x".repeat(101), [], 0));
  const second=createBoardCommand("write Second",[event],11);
  const third=createBoardCommand("write Third",[event,second],22);
  assert.throws(()=>createBoardCommand("write More",[event,second,third],33));
});
test("new commands retain completed ink and animate independently when scrubbing", () => {
  const first = createBoardCommand("draw computer", [], 0),
    second = createBoardCommand("draw server", [first], 12);
  const content = { liveCommands: [first, second] };
  const initial = whiteboardFrame("", 6, 8, { liveCommands: [first] });
  const waiting = whiteboardFrame("", 10, 8, content),
    progress = whiteboardFrame("", 13, 8, content),
    end = whiteboardFrame("", 30, 8, content);
  assert.equal(initial.distance, waiting.distance);
  assert.ok(progress.distance > waiting.distance);
  assert.ok(end.distance > progress.distance);
  assert.deepEqual(whiteboardFrame("", 10, 8, content), waiting);
  assert.ok(!waiting.writing);
  assert.ok(progress.writing);
});
test("live validation rejects invalid coordinates and overlapping events", () => {
  const e = createBoardCommand("draw server", [], 0);
  assert.equal(validLiveCommands([{ ...e, start: NaN }]), false);
  assert.equal(validLiveCommands([e, e]), false);
  assert.equal(
    validLiveCommands([
      {
        ...e,
        strokes: [
          [
            [0, 0],
            [2, 0],
          ],
        ],
      },
    ]),
    false,
  );
});

test('recorded commands survive project save and load with validation', async () => {
 const { whiteboardProject } = await import('../../lib/studio/templates');
 const { parseProject, serializeProject } = await import('../../lib/studio/project');
 const project=whiteboardProject();
 const event=createBoardCommand('write Hello',[],0);
 project.scenes[0].elements[0].whiteboard={liveCommands:[event]};
 assert.deepEqual(parseProject(JSON.parse(serializeProject(project))).scenes[0].elements[0].whiteboard?.liveCommands,[event]);
 project.scenes[0].elements[0].whiteboard!.liveCommands![0].start=-1;
 assert.throws(()=>parseProject(project),/Invalid live whiteboard commands/);
});

test('library draws recognized items and erases named ink while retaining other items',async()=>{
 const {visibleBoardItems}=await import('../../lib/studio/live-whiteboard');
 const house=createBoardCommand('draw a house',[],0);
 const tree=createBoardCommand('draw tree',[house],11);
 const remove=createBoardCommand('remove house',[house,tree],22);
 const events=[house,tree,remove];
 assert.deepEqual(remove.eraseTargets,[0]);assert.ok(validLiveCommands(events));
 const before=whiteboardFrame('',21,9,{liveCommands:events});
 const during=whiteboardFrame('',23,9,{liveCommands:events});
 const after=whiteboardFrame('',25,9,{liveCommands:events});
 const ink=(f:ReturnType<typeof whiteboardFrame>)=>f.segments.filter(s=>s.draw).reduce((n,s)=>n+s.length,0);
 assert.ok(ink(before)>ink(during)&&ink(during)>ink(after));assert.equal(during.erasing,true);
 assert.equal(visibleBoardItems(events)[0].event.command,'draw tree');
 const undo=createBoardCommand('delete',events,26);assert.deepEqual(undo.eraseTargets,[1]);
 assert.throws(()=>createBoardCommand('remove dragon',events,26));
 assert.equal(createBoardCommand('draw home',events,26).command,'draw house');
 assert.deepEqual(whiteboardFrame('',21,9,{liveCommands:events}),before);
});
test('named text erasure frees its row and malformed erase targets are rejected',()=>{
 const a=createBoardCommand('write Hello world',[],0),b=createBoardCommand('write Second',[a],11);
 const erase=createBoardCommand('remove Hello world',[a,b],22);
 assert.deepEqual(erase.eraseTargets,[0]);
 const c=createBoardCommand('write New heading',[a,b,erase],25);
 assert.equal(Math.min(...c.strokes.flat().map(p=>p[1])),0);
 assert.equal(validLiveCommands([a,{...erase,eraseTargets:[1]}]),false);
});
test('spoken write and draw modes accept the following utterance',async()=>{
 const {interpretPresenterSpeech}=await import('../../lib/studio/drawing-library');
 assert.equal(interpretPresenterSpeech('write',null).mode,'write');
 assert.equal(interpretPresenterSpeech('Hello everyone','write').command,'write Hello everyone');
 assert.equal(interpretPresenterSpeech('remove Hello everyone','write').command,'remove Hello everyone');
 assert.equal(interpretPresenterSpeech('stop writing','write').mode,null);
 assert.equal(interpretPresenterSpeech('tree','draw').command,'draw tree');
});
