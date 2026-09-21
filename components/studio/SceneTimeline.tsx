"use client";
import { Play, Pause, SkipBack, SlidersHorizontal } from "lucide-react";
import { dialogueSignature } from "../../lib/studio/dialogue";
import ExportPanel from "./ExportPanel";
import { presenterActions } from "../../lib/studio/presenter-timeline";
import { useEffect, useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { projectDuration } from "../../lib/studio/project";
import {
  createClip,
  createKeyframe,
  CLIP_PRESETS,
} from "../../lib/studio/clip-engine";
import { Field, Num, Select, uid } from "./StudioControls";
export default function SceneTimeline() {
  const s = useStudioStore(),
    p = s.project!,
    scene = s.activeScene()!,
    [selected, setSelected] = useState(""),
    [expanded, setExpanded] = useState(false);
  const actions = presenterActions(scene);
  const [exportLive, setExportLive] = useState(false);
  useEffect(() => {
    if (actions.length) setExpanded(true);
  }, [actions.length]);
  const sceneStart = p.scenes
    .slice(
      0,
      p.scenes.findIndex((x) => x.id === scene.id),
    )
    .reduce((n, s) => n + s.duration, 0);
  const clips = (p.clips ?? []).filter((c) =>
    scene.elements.some((e) => e.id === c.elementId),
  );
  const clip = clips.find((c) => c.id === selected),
    char = clip
      ? s.character(
          scene.elements.find((e) => e.id === clip.elementId)?.characterId ??
            "",
        )
      : undefined;
  const add = (elId: string, preset?: string) => {
    const old = clips.filter((c) => c.elementId === elId);
    const start = old.reduce(
      (n, c) => Math.max(n, (c.startTime ?? 0) + c.duration / (c.speed ?? 1)),
      0,
    );
    const c =
      CLIP_PRESETS.find((p) => p.id === preset)?.create(elId) ??
      createClip(elId, "New animation", 2, [
        createKeyframe(0, "idle"),
        createKeyframe(1, "wave"),
      ]);
    c.startTime = start;
    s.addClip(c);
    setSelected(c.id);
    if (start + c.duration > scene.duration)
      s.updateScene(scene.id, { duration: start + c.duration });
  };
  return (
    <section
      className={"ms-timeline" + (!expanded ? " ms-timeline-compact" : "")}
    >
      {exportLive && (
        <ExportPanel
          onClose={() => setExportLive(false)}
          initialScope="presenter"
        />
      )}
      <div className="ms-row ms-timeline-toolbar">
        {!!actions.length && (
          <button
            onClick={() => {
              s.setIsPlaying(false);
              setExportLive(true);
            }}
          >
            Export presenter timeline
          </button>
        )}
        <button
          className="ms-tracks-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal size={14} />{" "}
          {expanded ? "Hide tracks" : "Show tracks"}
        </button>
        <button onClick={s.togglePlayback} disabled={!!s.voicePreparation}>
          {s.isPlaying ? <Pause size={14} /> : <Play size={14} />}{" "}
          {s.voicePreparation
            ? "Preparing voices…"
            : s.isPlaying
              ? "Pause"
              : "Play"}
        </button>
        <button onClick={s.stopPreview}>
          <SkipBack size={14} /> Reset
        </button>
        <span className="ms-timecode">
          {s.playbackTime.toFixed(2)} / {projectDuration(p).toFixed(2)}s
        </span>
        <Select
          label="Speed"
          value={String(s.speed)}
          options={["0.25", "0.5", "1", "2"]}
          onChange={(v) => s.setSpeed(Number(v))}
        />
        <label>
          <input
            type="checkbox"
            checked={s.loop}
            onChange={(e) => s.setLoop(e.target.checked)}
          />{" "}
          Loop
        </label>
      </div>
      <input
        aria-label="Project playhead"
        type="range"
        min={0}
        max={projectDuration(p)}
        step={0.01}
        value={s.playbackTime}
        onChange={(e) => {
          s.setIsPlaying(false);
          s.seek(Number(e.target.value));
        }}
      />
      <div className="ms-time-ruler">
        <span>
          LAYERS <small>{scene.elements.length + actions.length}</small>
        </span>
        <div>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{((scene.duration * i) / 8).toFixed(1)}s</span>
          ))}
        </div>
      </div>
      <div className="ms-tracks">
        {actions.map(({ element, index, action, start, end }) => (
          <div className="ms-track" key={`${element.id}-action-${index}`}>
            <button
              title={action.command}
              onClick={() => {
                s.setIsPlaying(false);
                s.selectElement(element.id);
                s.seek(sceneStart + start);
              }}
            >
              {index + 1}. {action.command}
            </button>
            <div className="ms-track-lane">
              <div
                className="ms-playhead"
                style={{ left: `${(s.currentTime / scene.duration) * 100}%` }}
              />
              <button
                className="ms-clip"
                aria-label={`Play action ${index + 1}: ${action.command}`}
                title={`${start.toFixed(2)}–${end.toFixed(2)}s · click to play`}
                style={{
                  left: `${(start / scene.duration) * 100}%`,
                  width: `${(action.duration / scene.duration) * 100}%`,
                  background: action.eraseTargets
                    ? "#fce4de"
                    : action.command.startsWith("write ")
                      ? "#dbeafe"
                      : "#dcfce7",
                  color: "#243247",
                }}
                onClick={() =>
                  s.playPresenterAction(
                    sceneStart + start,
                    sceneStart + Math.min(scene.duration, end + 3, ...actions.filter(next=>next.start>start).map(next=>next.start)),
                  )
                }
              >
                {action.command}
              </button>
            </div>
            <small>{action.duration.toFixed(1)}s</small>
          </div>
        ))}
        {scene.elements.map((el) => (
          <div className="ms-track" key={el.id}>
            <button
              className={s.selectedElementId === el.id ? "active" : ""}
              onClick={() => s.selectElement(el.id)}
            >
              {el.name}
            </button>
            <div
              className="ms-track-lane"
              onDoubleClick={() => {
                if (el.type === "character" && !scene.stage3d) add(el.id);
              }}
            >
              <div
                className="ms-playhead"
                style={{ left: `${(s.currentTime / scene.duration) * 100}%` }}
              />
              {el.type === "character" ? (
                clips
                  .filter((c) => c.elementId === el.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={
                        "ms-clip " + (selected === c.id ? "selected" : "")
                      }
                      style={{
                        left: `${((c.startTime ?? 0) / scene.duration) * 100}%`,
                        width: `${(c.duration / (c.speed ?? 1) / scene.duration) * 100}%`,
                      }}
                      onClick={() => setSelected(c.id)}
                    >
                      {c.name}
                    </button>
                  ))
              ) : (
                <div
                  className="ms-object-bar"
                  style={{
                    left: `${((el.startTime ?? 0) / scene.duration) * 100}%`,
                    width: `${(((el.endTime ?? scene.duration) - (el.startTime ?? 0)) / scene.duration) * 100}%`,
                  }}
                >
                  {el.animations.length
                    ? `${el.animations.length} motions`
                    : el.type}
                </div>
              )}
            </div>
            {el.type === "character" && !scene.stage3d && (
              <button
                title="Add animation clip"
                onClick={() => add(el.id, "greeting")}
              >
                + Clip
              </button>
            )}
          </div>
        ))}
        <div className="ms-track">
          <span>Camera</span>
          <div className="ms-track-lane">
            {scene.cameraKeys?.map((k) => (
              <button
                className="ms-key"
                key={k.id}
                style={{ left: `${(k.time / scene.duration) * 100}%` }}
                onClick={() => s.seek(sceneStart + k.time)}
              >
                ◆
              </button>
            ))}
          </div>
        </div>
        {scene.script.length > 0 && (
          <div className="ms-track">
            <span>Dialogue / shots</span>
            <div className="ms-track-lane">
              {scene.script.map((line, i) => {
                const start = scene.script
                    .slice(0, i)
                    .reduce((n, l) => n + l.duration, 0),
                  speaker = scene.elements.find(
                    (e) => e.id === line.characterElementId,
                  ),
                  ready =
                    line.audioAssetId &&
                    line.audioSignature === dialogueSignature(line, speaker);
                return (
                  <button
                    className={"ms-dialogue-bar " + (ready ? "recorded" : "")}
                    key={line.id}
                    title={speaker?.name + ": " + line.text}
                    style={{
                      left: `${(start / scene.duration) * 100}%`,
                      width: `${(line.duration / scene.duration) * 100}%`,
                    }}
                    onClick={() => s.seek(sceneStart + start)}
                  >
                    {speaker?.name} ·{" "}
                    {scene.cameras.find((c) => c.id === line.cameraId)?.name ??
                      line.shot}{" "}
                    {ready ? "♫" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {p.audio?.map((a) => (
          <div className="ms-track" key={a.id}>
            <span>
              {a.kind}: {a.name}
            </span>
            <div className="ms-track-lane">
              <div
                className="ms-object-bar audio"
                style={{
                  left: `${(a.start / projectDuration(p)) * 100}%`,
                  width: `${(a.duration / projectDuration(p)) * 100}%`,
                }}
              >
                {p.assets
                  ?.find((x) => x.id === a.assetId)
                  ?.waveform?.map((v, i) => (
                    <i key={i} style={{ height: `${Math.max(5, v * 100)}%` }} />
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {clip && (
        <div className="ms-clip-editor">
          <div className="ms-row">
            <strong>Edit character animation</strong>
            <Field label="Clip name">
              <input
                value={clip.name}
                onChange={(e) =>
                  s.updateClip(clip.id, { name: e.target.value })
                }
              />
            </Field>
            <Num
              label="Start"
              value={clip.startTime ?? 0}
              min={0}
              onChange={(v) => s.updateClip(clip.id, { startTime: v })}
            />
            <Num
              label="Duration"
              value={clip.duration}
              min={0.1}
              onChange={(v) => s.updateClip(clip.id, { duration: v })}
            />
            <Num
              label="Clip speed"
              value={clip.speed ?? 1}
              min={0.1}
              onChange={(v) => s.updateClip(clip.id, { speed: v })}
            />
            <Num
              label="Blend in"
              value={clip.blendIn ?? 0.2}
              min={0}
              onChange={(v) => s.updateClip(clip.id, { blendIn: v })}
            />
            <label>
              <input
                type="checkbox"
                checked={clip.loop}
                onChange={(e) =>
                  s.updateClip(clip.id, { loop: e.target.checked })
                }
              />{" "}
              Loop clip
            </label>
            <button onClick={() => s.removeClip(clip.id)}>Delete clip</button>
            <button
              onClick={() => {
                if (char)
                  s.editProject((p) => {
                    const c = p.characters!.find((c) => c.id === char.id)!;
                    c.animations = [
                      ...(c.animations ?? []),
                      {
                        ...structuredClone(clip),
                        id: uid(),
                        elementId: "",
                        characterId: char.id,
                        startTime: 0,
                      },
                    ];
                  });
              }}
            >
              Save to character
            </button>
            <button onClick={() => setSelected("")}>Close</button>
          </div>
          <div className="ms-row">
            {clip.keyframes.map((k) => (
              <div className="ms-key-card" key={k.id}>
                <Num
                  label="Keyframe time"
                  value={k.time}
                  min={0}
                  onChange={(v) =>
                    s.updateKeyframeInClip(clip.id, k.id, {
                      time: Math.min(v, clip.duration),
                    })
                  }
                />
                <Select
                  label="Pose"
                  value={k.poseId}
                  options={
                    char?.poses.map((p) => ({ id: p.id, name: p.name })) ?? []
                  }
                  onChange={(v) =>
                    s.updateKeyframeInClip(clip.id, k.id, { poseId: v })
                  }
                />
                <Select
                  label="Easing"
                  value={k.easing}
                  options={[
                    "linear",
                    "easeIn",
                    "easeOut",
                    "easeInOut",
                    "spring",
                  ]}
                  onChange={(v) =>
                    s.updateKeyframeInClip(clip.id, k.id, { easing: v as any })
                  }
                />
                <button onClick={() => s.removeKeyframeFromClip(clip.id, k.id)}>
                  Remove key
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                s.addKeyframeToClip(
                  clip.id,
                  createKeyframe(
                    Math.min(
                      clip.duration,
                      Math.max(0, s.currentTime - (clip.startTime ?? 0)),
                    ),
                    char?.poses[0]?.id ?? "idle",
                  ),
                )
              }
            >
              + Keyframe
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
