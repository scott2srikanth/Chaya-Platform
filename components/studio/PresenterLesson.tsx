"use client";
import { useEffect, useState } from "react";
import {
  exampleLesson,
  lessonPrompt,
  parseLesson,
  type PresenterLesson as Lesson,
} from "../../lib/studio/presenter-lesson";
import type { LiveSessionState } from "../../lib/studio/live-session";
export default function PresenterLesson({
  session,
  time,
  disabled,
  onSend,
}: {
  session: LiveSessionState | null;
  time: number;
  disabled: boolean;
  onSend: (action: string, extra: object) => void;
}) {
  const [editing, setEditing] = useState(false),
    [json, setJson] = useState(""),
    [validated, setValidated] = useState<Lesson | null>(null),
    [status, setStatus] = useState("");
  useEffect(() => {
    try {
      setJson(
        localStorage.getItem("presenter-lesson-draft") ??
          JSON.stringify(exampleLesson, null, 2),
      );
    } catch {
      setJson(JSON.stringify(exampleLesson, null, 2));
    }
  }, []);
  const lesson = session?.lesson,
    active =
      lesson?.scenes.findIndex((s) => s.id === session?.activeSceneId) ?? -1;
  function update(value: string) {
    setJson(value);
    setValidated(null);
    try {
      localStorage.setItem("presenter-lesson-draft", value);
    } catch {
      setStatus("Browser storage is full. Download your lesson to keep it.");
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          lesson ?? validated ?? parseLesson(JSON.parse(json)),
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "presenter-lesson.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="lesson-panel">
      <div className="section-heading">
        <div>
          <span className="live-eyebrow">TEACH AT YOUR PACE</span>
          <h2>{lesson?.title ?? "Prepare your lesson"}</h2>
        </div>
        <button onClick={() => setEditing(!editing)} aria-expanded={editing}>
          {editing ? "Close editor" : "Prepare / import"}
        </button>
      </div>
      <p>
        Tap a scene to draw it on the projector. It stays on screen until you
        choose another.
      </p>
      {lesson && (
        <>
          <div className="lesson-controls">
            <button
              disabled={disabled || active >= lesson.scenes.length - 1}
              onClick={() =>
                onSend("scene", { sceneId: lesson.scenes[active + 1].id })
              }
            >
              {active < 0 ? "Start lesson" : "Draw next scene →"}
            </button>
            <button
              disabled={disabled || active < 0}
              onClick={() => onSend("replay", {})}
            >
              Redraw current
            </button>
            <button
              disabled={
                disabled || !session?.playing || time >= (session?.end ?? 0)
              }
              onClick={() => onSend("pause", {})}
            >
              Pause
            </button>
            <button
              disabled={
                disabled || session?.playing || time >= (session?.end ?? 0)
              }
              onClick={() => onSend("resume", {})}
            >
              Continue
            </button>
            <button
              onClick={() => {
                try {
                  download();
                } catch (e) {
                  setStatus((e as Error).message);
                }
              }}
            >
              Save lesson JSON
            </button>
          </div>
          <div className="lesson-scenes">
            {lesson.scenes.map((scene, i) => (
              <button
                key={scene.id}
                aria-pressed={active === i}
                disabled={disabled}
                onClick={() => onSend("scene", { sceneId: scene.id })}
              >
                <span className="scene-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{scene.title}</strong>
                  <small>
                    {active === i
                      ? time >= (session?.end ?? 0)
                        ? "Ready · waiting for you"
                        : session?.playing
                          ? "Drawing…"
                          : "Paused"
                      : `${scene.actions.length} drawing steps`}
                  </small>
                </span>
                <span aria-hidden="true">▶</span>
              </button>
            ))}
          </div>
          {active >= 0 && lesson.scenes[active].notes && (
            <aside className="teacher-notes">
              <strong>Teacher notes</strong>
              <p>{lesson.scenes[active].notes}</p>
            </aside>
          )}
        </>
      )}
      {!lesson && !editing && (
        <div className="empty-state">
          Prepare a lesson with ChatGPT, validate the JSON, then load it into
          this room.
          <br />
          <button onClick={() => setEditing(true)}>
            Create your first lesson
          </button>
        </div>
      )}
      {editing && (
        <div className="lesson-editor">
          <h3>1. Generate your lesson</h3>
          <p>
            Copy the prompt, replace the topic in ChatGPT, then paste the
            returned JSON below.
          </p>
          <div className="live-buttons">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(lessonPrompt);
                  setStatus("Lesson prompt copied.");
                } catch {
                  setStatus(
                    "Clipboard unavailable. Copy the prompt from the field below.",
                  );
                }
              }}
            >
              Copy ChatGPT prompt
            </button>
            <button
              onClick={() => update(JSON.stringify(exampleLesson, null, 2))}
            >
              Use React example
            </button>
            <button
              disabled={!lesson}
              onClick={() => update(JSON.stringify(lesson, null, 2))}
            >
              Edit current lesson
            </button>
          </div>
          <details>
            <summary>View prompt / copy manually</summary>
            <textarea
              aria-label="Lesson generation prompt"
              readOnly
              value={lessonPrompt}
              rows={6}
            />
          </details>
          <h3>2. Validate and load</h3>
          <label>
            Lesson JSON
            <textarea
              aria-label="Lesson JSON"
              value={json}
              rows={12}
              onChange={(e) => update(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="lesson-upload">
            Import JSON file{" "}
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1900000) {
                  setStatus("Use a lesson smaller than 1.9 MB.");
                  return;
                }
                update(await file.text());
              }}
            />
          </label>
          <div className="live-buttons">
            <button
              onClick={() => {
                try {
                  if (json.length > 1900000)
                    throw new Error("Use a lesson smaller than 1.9 MB.");
                  const l = parseLesson(JSON.parse(json));
                  setValidated(l);
                  setStatus(`Valid: ${l.scenes.length} scenes. Ready to load.`);
                } catch (e) {
                  setValidated(null);
                  setStatus((e as Error).message);
                }
              }}
            >
              Validate
            </button>
            <button
              className="primary-button"
              disabled={disabled || !validated}
              onClick={() => {
                if (
                  lesson &&
                  !confirm(
                    "Replace the lesson and clear the current board for everyone?",
                  )
                )
                  return;
                onSend("lesson", { lesson: validated });
              }}
            >
              Parse & load lesson
            </button>
          </div>
          <p>
            Loading clears the current board. The first scene starts only when
            you tap it. Your draft is saved on this device; download JSON for
            reuse.
          </p>
        </div>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
