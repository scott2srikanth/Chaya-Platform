"use client";
import { spatialShot, camera3DAt } from "../../lib/studio/stage3d";
import { useEffect, useState } from "react";
import { Mic, Video, Play, ArrowUp, ArrowDown } from "lucide-react";
import { useStudioStore } from "../../lib/studio/store";
import {
  dialogueSignature,
  frameCamera,
  voiceSettings,
} from "../../lib/studio/dialogue";
import { Field, Select, Num, uid } from "./StudioControls";
export default function DialogueDirector({
  mode,
}: {
  mode: "script" | "camera";
}) {
  const s = useStudioStore(),
    project = s.project!,
    scene = s.activeScene()!,
    cast = scene.elements.filter((e) => e.type === "character");
  const [voices, setVoices] = useState<{ name: string; language: string }[]>(
      [],
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("http://127.0.0.1:4319/voices")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setVoices(b.voices);
      })
      .catch(() =>
        setMessage("Start npm run studio to enable local voice generation."),
      );
  }, []);
  const coverage = () =>
    s.editProject((p) => {
      const scene = p.scenes.find((x) => x.id === s.activeSceneId)!;
      scene.cameraMode = "dialogue";
      const wide = {
        id: uid(),
        name: "Wide • entire cast",
        spatial: spatialShot(undefined, "wide"),
        ...frameCamera(
          scene,
          undefined,
          p.settings.width,
          p.settings.height,
          "wide",
        ),
      };
      const cameras = cast.flatMap((c) =>
        (["medium", "closeup"] as const).map((kind) => ({
          id: uid(),
          name: c.name + " • " + kind,
          spatial: spatialShot(c, kind),
          ...frameCamera(scene, c, p.settings.width, p.settings.height, kind),
        })),
      );
      scene.cameras = [wide, ...cameras];
      scene.script = scene.script.map((l, i) => ({
        ...l,
        cameraId:
          i === 0
            ? wide.id
            : cameras[cast.findIndex((c) => c.id === l.characterElementId) * 2]
                ?.id,
      }));
    });
  const generate = async () => {
    setBusy(true);
    setMessage("Recording voices and aligning mouth movements…");
    try {
      const r = await fetch("http://127.0.0.1:4319/narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, sceneId: scene.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const latest = useStudioStore
        .getState()
        .project?.scenes.find((x) => x.id === scene.id);
      if (
        !latest ||
        data.lines.some((v: any) => {
          const l = latest.script.find((l) => l.id === v.lineId);
          return (
            !l ||
            dialogueSignature(
              l,
              latest.elements.find((e) => e.id === l.characterElementId),
            ) !== v.signature
          );
        })
      )
        throw new Error(
          "The script changed during recording. Generate again to use the latest text.",
        );
      s.editProject((p) => {
        const scene = p.scenes.find((x) => x.id === latest.id)!;
        for (const result of data.lines) {
          const line = scene.script.find((l) => l.id === result.lineId)!;
          const id = uid();
          (p.assets ??= []).push({
            id,
            name:
              (scene.elements.find((e) => e.id === line.characterElementId)
                ?.name ?? "Voice") +
              " — " +
              line.text.slice(0, 32),
            type: "audio",
            width: 0,
            height: 0,
            dataUrl: result.dataUrl,
            duration: result.duration,
          });
          line.audioAssetId = id;
          line.audioSignature = result.signature;
          line.performance = result.performance;
          line.duration =
            Math.ceil((result.duration + 0.25) * p.settings.fps) /
            p.settings.fps;
        }
        scene.duration = Math.max(
          scene.duration,
          scene.script.reduce((n, l) => n + l.duration, 0),
        );
      });
      setMessage(
        "Voices and speech-driven mouth timing are ready for preview and export.",
      );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const preview = (index: number) => {
    const offset = project.scenes
      .slice(
        0,
        project.scenes.findIndex((x) => x.id === scene.id),
      )
      .reduce((n, x) => n + x.duration, 0);
    s.seek(
      offset + scene.script.slice(0, index).reduce((n, l) => n + l.duration, 0),
    );
  };
  return (
    <div className="ms-director">
      {mode === "camera" ? (
        <>
          <p>
            Place cameras once. Assign a shot to each dialogue line for
            automatic speaker cuts.
          </p>
          {!scene.stage3d && (
            <Select
              label="Camera direction"
              value={scene.cameraMode ?? "keyframes"}
              options={[
                { id: "keyframes", name: "Animated camera keys" },
                { id: "dialogue", name: "Cut by dialogue" },
              ]}
              onChange={(v) =>
                s.updateScene(scene.id, { cameraMode: v as any })
              }
            />
          )}
          <button disabled={!cast.length} onClick={coverage}>
            <Video size={14} /> Create cast cameras
          </button>
          <button
            onClick={() =>
              s.updateScene(scene.id, {
                cameras: [
                  ...scene.cameras,
                  {
                    id: uid(),
                    name: "Camera " + (scene.cameras.length + 1),
                    spatial: scene.stage3d
                      ? camera3DAt(scene, s.currentTime)
                      : undefined,
                    x: scene.camera.x,
                    y: scene.camera.y,
                    viewWidth: project.settings.width / scene.camera.zoom,
                    viewHeight: project.settings.height / scene.camera.zoom,
                    transition: "cut",
                    transitionDuration: 0.5,
                  },
                ],
              })
            }
          >
            Save current framing as camera
          </button>
          {scene.cameras.map((cam) => (
            <details className="ms-key-card" key={cam.id}>
              <summary>{cam.name}</summary>
              <Field label="Camera name">
                <input
                  value={cam.name}
                  onChange={(e) =>
                    s.updateCamera(cam.id, { name: e.target.value })
                  }
                />
              </Field>
              {!scene.stage3d &&
                ["x", "y", "viewWidth", "viewHeight"].map((key) => (
                  <Num
                    key={key}
                    label={key}
                    min={key.startsWith("view") ? 1 : undefined}
                    value={(cam as any)[key]}
                    onChange={(v) => s.updateCamera(cam.id, { [key]: v })}
                  />
                ))}
              {scene.stage3d &&
                (["position", "target"] as const).map((group) => (
                  <div key={group}>
                    <strong>
                      {group === "position" ? "Camera position" : "Look at"}
                    </strong>
                    {["X", "Y", "Z"].map((axis, i) => (
                      <Num
                        key={axis}
                        label={group + " " + axis}
                        value={
                          (cam.spatial ?? spatialShot(undefined, "wide"))[
                            group
                          ][i]
                        }
                        onChange={(v) => {
                          const spatial = structuredClone(
                            cam.spatial ?? spatialShot(undefined, "wide"),
                          );
                          spatial[group][i] = v;
                          s.updateCamera(cam.id, { spatial });
                        }}
                      />
                    ))}
                  </div>
                ))}
              <Select
                label="Enter camera with"
                value={cam.transition}
                options={["cut", "smooth", "dolly", "whip"]}
                onChange={(v) =>
                  s.updateCamera(cam.id, { transition: v as any })
                }
              />
              <Num
                label="Camera blend duration"
                value={cam.transitionDuration}
                min={0}
                onChange={(v) =>
                  s.updateCamera(cam.id, { transitionDuration: v })
                }
              />
              <button
                onClick={() => {
                  s.updateScene(scene.id, {
                    cameras: scene.cameras.filter((c) => c.id !== cam.id),
                    script: scene.script.map((l) =>
                      l.cameraId === cam.id ? { ...l, cameraId: undefined } : l,
                    ),
                  });
                }}
              >
                Delete camera
              </button>
            </details>
          ))}
        </>
      ) : (
        <>
          <div className="ms-director-title">
            <Mic size={17} />
            <strong>Cast & dialogue</strong>
          </div>
          <p>
            Assign each line to a character. Play automatically prepares their voice and lip timing.
          </p>
          <details className="ms-voice-settings"><summary>Voice settings · {cast.length} characters</summary>
          {cast.map((c) => (
            <details className="ms-key-card" key={c.id}>
              <summary>
                {c.name} · {voiceSettings(c).name}
              </summary>
              <Select
                label={c.name + " voice"}
                value={voiceSettings(c).name}
                options={
                  voices.length
                    ? [
                        ...(voices.some((v) => v.name === voiceSettings(c).name)
                          ? []
                          : [
                              {
                                name: voiceSettings(c).name,
                                language: "default",
                              },
                            ]),
                        ...voices,
                      ].map((v) => ({
                        id: v.name,
                        name: v.name + " · " + v.language,
                      }))
                    : [voiceSettings(c).name]
                }
                onChange={(name) =>
                  s.updateElement(c.id, {
                    voice: { ...voiceSettings(c), name },
                  })
                }
              />
              <Num
                label={c.name + " words per minute"}
                min={80}
                max={300}
                value={voiceSettings(c).rate}
                onChange={(rate) =>
                  s.updateElement(c.id, {
                    voice: { ...voiceSettings(c), rate },
                  })
                }
              />
            </details>
          ))}
          </details>
          <button
            className="primary"
            disabled={busy || !scene.script.some((l) => l.text.trim())}
            onClick={generate}
          >
            <Mic size={14} />
            {busy ? "Generating voices…" : "Prepare voices now"}
          </button>
          <p role="status">{message}</p>
          <label>
            <input
              type="checkbox"
              checked={scene.subtitles ?? false}
              onChange={(e) =>
                s.updateScene(scene.id, { subtitles: e.target.checked })
              }
            />
            Show dialogue captions
          </label>
          {scene.script.map((line, i) => {
            const speaker = cast.find((c) => c.id === line.characterElementId);
            const recorded =
              line.audioAssetId &&
              line.audioSignature === dialogueSignature(line, speaker);
            return (
              <div className="ms-key-card" key={line.id}>
                <div className="ms-row">
                  <strong>Line {i + 1}</strong>
                  <span className="ms-muted">
                    {recorded
                      ? line.performance
                        ? "Voice + lip sync ready"
                        : "Regenerate for lip sync"
                      : line.audioAssetId
                        ? "Voice needs update"
                        : "Not recorded"}
                  </span>
                  <button
                    aria-label={"Preview line " + (i + 1)}
                    onClick={() => preview(i)}
                  >
                    <Play size={12} />
                  </button>
                </div>
                <Select
                  label="Speaker"
                  value={line.characterElementId}
                  options={cast.map((c) => ({ id: c.id, name: c.name }))}
                  onChange={(v) =>
                    s.updateScriptLine(line.id, { characterElementId: v })
                  }
                />
                <textarea
                  aria-label="Dialogue"
                  value={line.text}
                  onChange={(e) =>
                    s.updateScriptLine(line.id, { text: e.target.value })
                  }
                />
                <details className="ms-line-options"><summary>Camera, gesture & timing</summary>
                <Select
                  label="Dialogue camera"
                  value={line.cameraId ?? ""}
                  options={[
                    { id: "", name: "Auto • " + line.shot },
                    ...scene.cameras,
                  ]}
                  onChange={(v) =>
                    s.updateScriptLine(line.id, { cameraId: v || undefined })
                  }
                />
                <Select
                  label="Automatic shot"
                  value={line.shot}
                  options={["wide", "medium", "closeup"]}
                  onChange={(v) =>
                    s.updateScriptLine(line.id, { shot: v as any })
                  }
                />
                <Select
                  label="Gesture"
                  value={line.gesture}
                  options={[
                    "idle",
                    "talking",
                    "pointing",
                    "waving",
                    "thinking",
                    "celebrating",
                  ]}
                  onChange={(v) =>
                    s.updateScriptLine(line.id, { gesture: v as any })
                  }
                />
                <Num
                  label="Line duration"
                  min={0.1}
                  value={line.duration}
                  onChange={(duration) =>
                    s.updateScriptLine(line.id, { duration })
                  }
                />
                <div className="ms-row">
                  {[-1, 1].map((delta) => (
                    <button
                      aria-label={delta < 0 ? "Move line up" : "Move line down"}
                      key={delta}
                      disabled={
                        i + delta < 0 || i + delta >= scene.script.length
                      }
                      onClick={() =>
                        s.editProject((p) => {
                          const lines = p.scenes.find(
                            (x) => x.id === scene.id,
                          )!.script;
                          [lines[i], lines[i + delta]] = [
                            lines[i + delta],
                            lines[i],
                          ];
                        })
                      }
                    >
                      {delta < 0 ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                    </button>
                  ))}
                  <button onClick={() => s.removeScriptLine(line.id)}>
                    Remove line
                  </button>
                </div>
                </details>
              </div>
            );
          })}
          <button
            disabled={!cast.length}
            onClick={() => s.addScriptLine(cast[0].id)}
          >
            + Dialogue
          </button>
          <button disabled={!cast.length} onClick={coverage}>
            Auto-direct camera cuts
          </button>
        </>
      )}
    </div>
  );
}
