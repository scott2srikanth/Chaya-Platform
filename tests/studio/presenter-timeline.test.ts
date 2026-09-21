import { test } from "node:test";
import assert from "node:assert/strict";
import { livePresenterProject } from "../../lib/studio/templates";
import { createBoardCommand } from "../../lib/studio/live-whiteboard";
import {
  presenterActions,
  presenterTimelineProject,
} from "../../lib/studio/presenter-timeline";
import { useStudioStore } from "../../lib/studio/store";
import { createDefaultScene } from "../../lib/studio/types";
import { parseProject, serializeProject } from "../../lib/studio/project";
function fixture() {
  const p = livePresenterProject();
  const write = createBoardCommand("write Hello", [], 0.2);
  const draw = createBoardCommand("draw house", [write], 12);
  const erase = createBoardCommand("remove house", [write, draw], 16);
  p.scenes[0].duration = 30;
  p.scenes[0].elements[0].endTime = 30;
  p.scenes[0].elements[0].whiteboard = {
    liveMode: true,
    liveCommands: [write, draw, erase],
  };
  return p;
}
test("live action playback pauses at its endpoint even with looping enabled", () => {
  const p = fixture();
  const s = useStudioStore.getState();
  s.replaceProject(p);
  s.setLoop(true);
  useStudioStore.getState().playPresenterAction(12, 17);
  useStudioStore.getState().tickPlayback(20);
  assert.equal(useStudioStore.getState().playbackTime, 17);
  assert.equal(useStudioStore.getState().isPlaying, false);
  assert.equal(
    useStudioStore.getState().project!.scenes[0].elements[0].whiteboard!
      .liveMode,
    true,
  );
  useStudioStore.getState().playPresenterAction(17, 21);
  assert.equal(useStudioStore.getState().isPlaying, true);
  useStudioStore.getState().stopPreview();
  assert.equal(useStudioStore.getState().livePlaybackEnd, null);
  s.setLoop(false);
});
test("timeline actions map to their element-relative positions and retain erasure", () => {
  const p = fixture();
  p.scenes[0].elements[0].startTime = 2;
  const actions = presenterActions(p.scenes[0]);
  assert.equal(actions.length, 3);
  assert.equal(actions[0].start, 2.2);
  assert.deepEqual(actions[2].action.eraseTargets, [1]);
  assert.equal(
    parseProject(JSON.parse(serializeProject(p))).scenes[0].elements[0]
      .whiteboard!.liveMode,
    true,
  );
});
test("standalone timeline export trims trailing scene time and rebases intersecting audio", () => {
  const p = fixture(),
    scene = p.scenes[0],
    intro = createDefaultScene("Intro");
  intro.duration = 5;
  p.scenes.unshift(intro);
  p.audio = [
    {
      id: "music",
      name: "music",
      assetId: "x",
      start: 3,
      offset: 1,
      duration: 30,
      volume: 1,
      muted: false,
      kind: "music",
      fadeIn: 0,
      fadeOut: 0,
    },
  ];
  const result = presenterTimelineProject(p, scene.id);
  assert.equal(result.scenes.length, 1);
  assert.equal(result.scenes[0].duration, 21);
  assert.equal(result.audio![0].start, 0);
  assert.equal(result.audio![0].offset, 3);
  assert.equal(result.audio![0].duration, 21);
  assert.equal(p.scenes.length, 2);
  assert.equal(scene.duration, 30);
  assert.throws(
    () => presenterTimelineProject(p, intro.id),
    /Record a presenter command/,
  );
});
