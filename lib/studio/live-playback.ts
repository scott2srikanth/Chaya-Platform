import type { LiveSessionState } from "./live-session";
export type PlaybackSnapshot = {
  state: LiveSessionState;
  time: number;
  received: number;
  correction: number;
};
export function playbackTime(snapshot: PlaybackSnapshot, now: number) {
  if (!snapshot.state.playing) return snapshot.time;
  const elapsed = Math.max(0, now - snapshot.received) / 1000;
  return Math.min(
    snapshot.state.end,
    snapshot.time +
      elapsed +
      Math.sign(snapshot.correction) *
        Math.min(Math.abs(snapshot.correction), elapsed * 0.08),
  );
}
export function receivePlayback(
  previous: PlaybackSnapshot | null,
  state: LiveSessionState,
  serverTime: number,
  now: number,
): PlaybackSnapshot {
  if (
    previous &&
    previous.state.id === state.id &&
    previous.state.revision >= state.revision
  )
    return previous;
  const target = state.playing
    ? Math.min(
        state.end,
        state.anchorTime + Math.max(0, serverTime - state.anchorMs) / 1000,
      )
    : state.anchorTime;
  const continuing =
    previous &&
    previous.state.id === state.id &&
    previous.state.playing &&
    state.playing &&
    (previous.state.playbackEpoch ?? 0) === (state.playbackEpoch ?? 0);
  const time = continuing
    ? Math.min(state.end, playbackTime(previous, now))
    : target;
  return {
    state,
    time,
    received: now,
    correction: continuing ? target - time : 0,
  };
}
