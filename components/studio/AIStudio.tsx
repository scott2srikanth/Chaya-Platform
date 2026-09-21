"use client";
import { useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import {
  importAIProject,
  validateRoomResponse,
  roomPrompt,
  projectPrompt,
} from "../../lib/studio/ai-import";
import { ZodError } from "zod";
export default function AIStudio() {
  const s = useStudioStore(),
    project = s.project!;
  const [mode, setMode] = useState<"project" | "room">(
      s.activeScene()?.backgroundDescription || s.activeScene()?.room3d
        ? "room"
        : "project",
    ),
    [busy, setBusy] = useState(false),
    [brief, setBrief] = useState(""),
    [text, setText] = useState(""),
    [validated, setValidated] = useState(""),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(false),
    [target, setTarget] = useState(s.activeSceneId),
    [template, setTemplate] = useState("");
  const scene =
    project.scenes.find((sc) => sc.id === target) ?? project.scenes[0];
  const fail = (error: unknown) => {
    setFailure(true);
    setValidated("");
    setMessage(
      error instanceof ZodError
        ? error.issues
            .map((i) => `${i.path.join(".") || "JSON"}: ${i.message}`)
            .join("\n")
        : error instanceof Error
          ? error.message
          : String(error),
    );
  };
  const copy = async (value: string) => {
    setTemplate(value);
    try {
      await navigator.clipboard.writeText(value);
      setFailure(false);
      setMessage(
        "Copied. Paste into ChatGPT, then paste its JSON response below.",
      );
    } catch {
      setFailure(false);
      setMessage("Clipboard unavailable. Select and copy the template below.");
    }
  };
  const validate = () => {
    try {
      if (mode === "project") {
        const p = importAIProject(text);
        setMessage(
          `Valid project: ${p.metadata.name} · ${p.scenes.length} scenes · ${p.scenes.reduce((sum, sc) => sum + sc.script.length, 0)} dialogue lines. Parse creates a new project; your current project is saved first.`,
        );
      } else {
        const data = validateRoomResponse(text, project);
        const destination = project.scenes.find(
          (sc) => sc.id === data.sceneId,
        )!;
        setMessage(
          `Valid background: ${data.room.objects.length} objects. Target: ${destination.name}. Parse replaces only this scene’s background.`,
        );
      }
      setFailure(false);
      setValidated(text);
    } catch (error) {
      fail(error);
    }
  };
  const parse = async () => {
    if (busy || !validated || validated !== text) return;
    setBusy(true);
    try {
      if (mode === "project") {
        const next = importAIProject(text);
        await useStudioStore.getState().saveProject();
        s.replaceProject(next);
        s.setWorkspace("ai");
        setTarget(next.scenes[0].id);
        setMode("room");
        setText("");
        setBrief("");
        setTemplate("");
        setMessage(
          "Project created. Choose a scene below to generate its background. Play in Scenes prepares the assigned character voices.",
        );
      } else {
        const live = useStudioStore.getState().project!;
        const data = validateRoomResponse(text, live);
        s.editProject((p) => {
          const destination = p.scenes.find((sc) => sc.id === data.sceneId)!;
          destination.room3d = data.room;
          destination.stage3d = true;
        });
        setTarget(data.sceneId);
        setMessage(
          "Background applied to its linked scene. Open Scenes to preview it.",
        );
      }
      setValidated("");
      setFailure(false);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  const choose = (value: "project" | "room") => {
    setMode(value);
    setText("");
    setValidated("");
    setMessage("");
    setTemplate("");
    setBrief("");
  };
  return (
    <main className="ms-ai-workspace">
      <h2>Build with ChatGPT</h2>
      <p>
        Describe → copy request → generate JSON in ChatGPT → paste → Validate →
        Parse.
      </p>
      <div className="ms-row">
        <button
          aria-pressed={mode === "project"}
          onClick={() => choose("project")}
        >
          Complete project
        </button>
        <button aria-pressed={mode === "room"} onClick={() => choose("room")}>
          Room & scenery
        </button>
      </div>
      <div className="ms-ai-columns">
        <section>
          <h3>1. Prepare your request</h3>
          {mode === "room" && (
            <>
              <label>
                Target scene
                <select
                  aria-label="Target scene"
                  value={scene.id}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setBrief("");
                    setTemplate("");
                  }}
                >
                  {project.scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ·{" "}
                      {sc.room3d ? "Background ready" : "Needs background"}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Returned JSON carries this scene’s ID, so you can generate
                backgrounds in any order.
              </p>
              <label>
                Scene background description
                <textarea
                  aria-label="Scene background description"
                  readOnly
                  value={
                    scene.backgroundDescription ??
                    "No description yet. Write one below."
                  }
                />
              </label>
              <button
                disabled={!scene.backgroundDescription}
                onClick={() => copy(scene.backgroundDescription!)}
              >
                Copy background description
              </button>
            </>
          )}
          <label>
            {mode === "project"
              ? "Describe your complete video"
              : "Room description / refinements"}
            <textarea
              aria-label="Generation description"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={
                mode === "project"
                  ? "Create a six-scene explainer with Alex and Sarah about…"
                  : "Describe walls, furniture, landscape, colours and lighting…"
              }
            />
          </label>
          <button
            className="primary"
            onClick={() =>
              copy(
                mode === "project"
                  ? projectPrompt(brief || "Write your video description here")
                  : roomPrompt(
                      project,
                      scene.id,
                      [
                        scene.backgroundDescription,
                        brief ? `Additional direction: ${brief}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n\n") || "Write your room description here",
                    ),
              )
            }
          >
            Copy ChatGPT JSON template
          </button>
          <p>
            Rooms use up to 250 coloured primitive objects and 6 lights. No
            external models or textures. Generated geometry renders only in the
            scene preview and export.
          </p>
          {template && (
            <details open>
              <summary>Copyable request</summary>
              <textarea
                aria-label="Copyable request"
                readOnly
                value={template}
                onFocus={(e) => e.target.select()}
              />
            </details>
          )}
        </section>
        <section>
          <h3>2. Import ChatGPT’s response</h3>
          <label>
            Response JSON
            <textarea
              className="ms-ai-json"
              aria-label="Response JSON"
              spellCheck={false}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setValidated("");
                setMessage("");
              }}
              placeholder="Paste the generated JSON here…"
            />
          </label>
          <div className="ms-row">
            <button disabled={!text.trim()} onClick={validate}>
              Validate
            </button>
            <button
              className="primary"
              disabled={busy || !validated || validated !== text}
              onClick={parse}
            >
              Parse
            </button>
          </div>
          {message && (
            <pre role={failure ? "alert" : "status"} className="ms-ai-result">
              {message}
            </pre>
          )}
          <p>
            Validate checks the format, values, speakers and scene links without
            changing your project. Parse applies only validated data.
          </p>
          <button
            onClick={() => {
              s.selectScene(scene.id);
              s.setWorkspace("scene");
            }}
          >
            Open scene preview
          </button>
        </section>
      </div>
    </main>
  );
}
