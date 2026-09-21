"use client";
import { useEffect, useRef, useMemo, useState } from "react";
import { dialogueTracks } from "../../lib/studio/dialogue";
import { useStudioStore } from "../../lib/studio/store";

export default function AudioPreview() {
  const project = useStudioStore(s => s.project),
    time = useStudioStore(s => s.playbackTime),
    playing = useStudioStore(s => s.isPlaying),
    speed = useStudioStore(s => s.speed),
    preparing = useStudioStore(s => s.voicePreparation),
    voiceError = useStudioStore(s => s.voiceError);
  const tracks = useMemo(() => project ? [...(project.audio ?? []), ...dialogueTracks(project)] : [], [project]);
  const elements = useRef(new Map<string, HTMLAudioElement>());
  const bindings = useRef(new Map<string, (audio: HTMLAudioElement | null) => void>());
  const bind = (id: string) => {
    if (!bindings.current.has(id)) bindings.current.set(id, audio => {
      if (audio) elements.current.set(id, audio);
      else { elements.current.get(id)?.pause(); elements.current.delete(id); }
    });
    return bindings.current.get(id)!;
  };
  const [problem, setProblem] = useState("");
  const pending = useRef(new Set<string>());
  const play = (id: string, audio: HTMLAudioElement) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    audio.play().then(() => setProblem("")).catch((error: DOMException) => {
      if (error.name !== "AbortError") setProblem(error.name === "NotAllowedError"
        ? "Your browser blocked sound. Enable audio to hear the character voices."
        : "Voice audio could not play. Regenerate the character voices in Script.");
    }).finally(() => pending.current.delete(id));
  };
  useEffect(() => {
    const map = elements.current;
    return () => { map.forEach(audio => audio.pause()); };
  }, []);
  useEffect(() => {
    for (const track of tracks) {
      const audio = elements.current.get(track.id);
      if (!audio) continue;
      const active = time >= track.start && time < track.start + track.duration && !track.muted;
      audio.playbackRate = speed;
      const gain = track.volume * Math.max(0, Math.min(1,
        track.fadeIn ? (time - track.start) / track.fadeIn : 1,
        track.fadeOut ? (track.start + track.duration - time) / track.fadeOut : 1));
      // Direct media playback avoids a suspended Web Audio graph silently
      // intercepting otherwise healthy voice elements (notably in WebKit).
      audio.volume = Math.max(0, Math.min(1, gain));
      audio.muted = track.muted;
      if (active) {
        const target = Math.max(0, time - track.start + track.offset);
        if (audio.readyState >= 1 && Math.abs(audio.currentTime - target) > 0.18) audio.currentTime = target;
        if (playing && audio.paused) play(track.id, audio);
        else if (!playing && !audio.paused) audio.pause();
      } else if (!audio.paused) audio.pause();
    }
    // Playback failures are surfaced with an explicit user-gesture retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, time, playing, speed]);
  const enableSound = () => {
    setProblem("");
    const state = useStudioStore.getState();
    tracks.forEach(track => {
      const audio = elements.current.get(track.id);
      if (audio && !track.muted && state.playbackTime >= track.start && state.playbackTime < track.start + track.duration) {
        audio.currentTime = Math.max(0, state.playbackTime - track.start + track.offset);
        play(track.id, audio);
      }
    });
    state.setIsPlaying(true);
  };
  return <>
    <div hidden aria-hidden="true" data-studio-audio>
      {tracks.map(track => <audio key={track.id + track.assetId} data-track-id={track.id} data-speaker={track.name}
        ref={bind(track.id)}
        src={project?.assets?.find(asset => asset.id === track.assetId)?.dataUrl} preload="auto" />)}
    </div>
    {problem && <div role="alert" style={{position: "fixed", bottom: 20, left: 20, zIndex: 10001, background: "#28243b", color: "white", padding: 16, borderRadius: 12}}>
      <p>{problem}</p><button onClick={enableSound}>Enable audio</button>
    </div>}
    {(preparing || voiceError) && <div role={voiceError ? "alert" : "status"} style={{position: "fixed", bottom: 20, left: 20, zIndex: 10001, background: "#28243b", color: "white", padding: 16, borderRadius: 12}}>{preparing || voiceError}</div>}
  </>;
}
