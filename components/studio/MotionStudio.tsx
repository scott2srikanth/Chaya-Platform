"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { createElement, Project } from "../../lib/studio/types";
import { parseProject } from "../../lib/studio/project";
import { listProjects, deleteProject } from "../../lib/studio/db";
import { goldenProject, TEMPLATE_NAMES } from "../../lib/studio/templates";
import { createKeyframe } from "../../lib/studio/clip-engine";
import ProjectFrame from "./render/ProjectFrame";
import CharacterStudio from "./CharacterStudio";
import AIStudio from "./AIStudio";
import AssetStudio from "./AssetStudio";
import SceneTimeline from "./SceneTimeline";
import StudioInspector from "./StudioInspector";
import AudioPreview from "./AudioPreview";
import ExportPanel from "./ExportPanel";
import "./studio.css";
import "./studio-refined.css";
import StudioLibrary from "./StudioLibrary";
import {
  Globe,
  MonitorPlay,
  Network,
  Braces,
  Database,
  ShieldCheck,
  Cloud,
  Workflow,
  Clapperboard,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  ArrowUpRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LayoutTemplate,
  Film,
  ChevronRight,
} from "lucide-react";
import {
  whiteboardProject,
  livePresenterProject,
  presenterProject,
  conversationProject,
  mixedExplainerProject,
  interviewProject,
} from "../../lib/studio/templates";

export default function MotionStudio() {
  const s = useStudioStore(),
    p = s.project,
    [name, setName] = useState(""),
    [recent, setRecent] = useState<Project[]>([]),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false),
    [zoom, setZoom] = useState(0.45),
    [pan, setPan] = useState({ x: 24, y: 24 }),
    [grid, setGrid] = useState(false),
    [focus, setFocus] = useState(false),
    [libraryOpen, setLibraryOpen] = useState(false),
    [inspectorOpen, setInspectorOpen] = useState(true);
  const workspace =
    s.studioWorkspace === "pose-editor" ? "characters" : s.studioWorkspace;
  const setWorkspace = useCallback(
    (workspace: string) =>
      useStudioStore
        .getState()
        .setWorkspace(workspace as "scene" | "characters" | "assets" | "ai"),
    [],
  );
  const viewport = useRef<HTMLDivElement>(null),
    file = useRef<HTMLInputElement>(null),
    saveTimer = useRef<ReturnType<typeof setTimeout>>(),
    dragging = useRef(false);
  const scene = s.activeScene(),
    selected = scene?.elements.find((e) => e.id === s.selectedElementId);
  const projectId = p?.id;
  useEffect(() => {
    if (!projectId)
      listProjects()
        .then(setRecent)
        .catch((e) => setError(e.message));
  }, [projectId]);
  useEffect(() => {
    if (!s.isPlaying) return;
    let last = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      useStudioStore.getState().tickPlayback(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.isPlaying]);
  useEffect(() => {
    if (!p) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () =>
        useStudioStore
          .getState()
          .saveProject()
          .catch((e) => setError("Save failed: " + e.message)),
      900,
    );
    return () => clearTimeout(saveTimer.current);
  }, [p]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      const state = useStudioStore.getState();
      if (!state.project) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? state.redo() : state.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        state.saveProject().catch((e) => setError(e.message));
      } else if (e.code === "Space") {
        e.preventDefault();
        state.togglePlayback();
      } else if (e.key.toLowerCase() === "r") state.stopPreview();
      else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedElementId
      )
        state.removeElement(state.selectedElementId);
      else if (e.key.toLowerCase() === "i" && state.selectedElementId)
        state.updateElement(state.selectedElementId, {
          startTime: state.currentTime,
        });
      else if (e.key.toLowerCase() === "o" && state.selectedElementId)
        state.updateElement(state.selectedElementId, {
          endTime: state.currentTime,
        });
      else if (e.key.toLowerCase() === "k") {
        const clip = state.animationClips.find(
          (c) => c.elementId === state.selectedElementId,
        );
        if (clip)
          state.addKeyframeToClip(
            clip.id,
            createKeyframe(
              Math.max(0, state.currentTime - (clip.startTime ?? 0)),
              "idle",
            ),
          );
      } else if (e.key.toLowerCase() === "p") {
        const el = state
          .activeScene()
          ?.elements.find((e) => e.id === state.selectedElementId);
        if (el?.characterId) {
          state.openPoseEditor(el.characterId);
          setWorkspace("characters");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setWorkspace]);
  const loadFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      s.replaceProject(parseProject(JSON.parse(await f.text())));
      setWorkspace("scene");
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  const add = (type: any, kind?: string) => {
    if (!p) return;
    const el = createElement(type, {
      ...(kind
        ? {
            name: kind,
            componentKind: kind,
            width: 300,
            height: 220,
            fill: "#2563eb",
          }
        : {}),
    });
    s.editProject((p) => {
      p.scenes.find((x) => x.id === s.activeSceneId)!.elements.push(el);
    });
    s.selectElement(el.id);
  };
  const beginDrag = (event: React.PointerEvent) => {
    if (s.isPlaying || !p || !scene || scene.stage3d) return;
    const node = event.target as Element,
      handle = node.getAttribute("data-handle"),
      id = node.closest("[data-element-id]")?.getAttribute("data-element-id");
    const el = scene.elements.find(
      (e) => e.id === (handle ? s.selectedElementId : id),
    );
    const start = { x: event.clientX, y: event.clientY },
      old = { ...pan };
    if (el) {
      s.selectElement(el.id);
      if (el.locked) return;
    } else s.selectElement(null);
    const before = el ? { ...el } : null;
    dragging.current = true;
    s.beginEdit();
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - start.x) / zoom,
        dy = (e.clientY - start.y) / zoom;
      if (!el || !before) {
        setPan({ x: old.x + dx * zoom, y: old.y + dy * zoom });
        return;
      }
      if (handle === "rotate") {
        const box = viewport.current!.getBoundingClientRect();
        const cx = box.left + pan.x + (before.x + before.width / 2) * zoom,
          cy = box.top + pan.y + (before.y + before.height / 2) * zoom;
        s.updateElement(el.id, {
          rotation:
            (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90,
        });
      } else if (handle)
        s.updateElement(el.id, {
          width: Math.max(10, before.width + dx),
          height: Math.max(10, before.height + dy),
        });
      else s.updateElement(el.id, { x: before.x + dx, y: before.y + dy });
    };
    const up = () => {
      s.endEdit();
      dragging.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const fit = useCallback(() => {
    const p = useStudioStore.getState().project;
    if (!p || !viewport.current) return;
    const box = viewport.current.getBoundingClientRect();
    const z = Math.max(
      0.05,
      Math.min(
        (box.width - 40) / p.settings.width,
        (box.height - 40) / p.settings.height,
      ),
    );
    setZoom(z);
    setPan({
      x: (box.width - p.settings.width * z) / 2,
      y: (box.height - p.settings.height * z) / 2,
    });
  }, []);
  useEffect(() => {
    if (workspace !== "scene" || !viewport.current) return;
    const observer = new ResizeObserver(() => requestAnimationFrame(fit));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [p?.id, workspace, p?.settings.width, p?.settings.height, fit]);
  return (
    <div className={"motion-studio" + (focus ? " ms-focus" : "") + (!libraryOpen ? " ms-library-closed" : "") + (!inspectorOpen ? " ms-inspector-closed" : "")}>
      <input
        ref={file}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => loadFile(e.target.files?.[0])}
      />
      {!p ? (
        <main className="ms-welcome">
          <div className="ms-wordmark">
            <span className="ms-logo">
              <Clapperboard size={19} />
            </span>{" "}
            MOTION EXPLAINER STUDIO{" "}
            <span className="ms-local-badge">LOCAL WORKSPACE</span>
          </div>
          <h1>Make your ideas move.</h1>
          <p>
            A local studio for animated stories, characters and system diagrams.
          </p>
          <div className="ms-row">
            <input
              aria-label="New project name"
              placeholder="Name your project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") s.newProject(name || "Untitled project");
              }}
            />
            <button
              className="primary"
              onClick={() => s.newProject(name || "Untitled project")}
            >
              Create project
            </button>
            <button onClick={() => file.current?.click()}>Open JSON</button>
            <button onClick={async ()=>{await s.newProject("AI project workspace");s.setWorkspace("ai");}}>Build with ChatGPT</button>
          </div>
          <div className="ms-section-heading">
            <h2>Start with a story</h2>
            <span>Ready to make your own</span>
          </div>
          <p><a href="/studio/live">Open live presenter room · projector + tablet</a></p>
          <div className="ms-template-grid">
            <button className="ms-featured-template" onClick={()=>{const p=livePresenterProject();s.replaceProject(p);s.selectElement(p.scenes[0].elements[0].id);}}>
              <div className="ms-template-art"><svg viewBox="0 0 400 210" width="100%" height="100%"><rect width="400" height="210" fill="#e8e1d7"/><rect x="20" y="20" width="360" height="150" rx="22" fill="#fbfaf7"/><path d="M180 130L245 65L310 130M195 115V155H295V115M234 155V122H256V155" stroke="#304b65" strokeWidth="4" fill="none"/><path d="M64 125Q90 105 116 125L122 200H58Z" fill="#7160ee"/><circle cx="90" cy="80" r="28" fill="#f0c3a2"/><path d="M62 73Q60 36 86 45Q118 36 118 73Z" fill="#59402e"/><path d="M114 135L152 100" stroke="#f0c3a2" strokeWidth="14" strokeLinecap="round"/><path d="M154 100L169 86" stroke="#343740" strokeWidth="4"/></svg></div>
              <strong>Live presenter</strong><small>Speak or type · drawing library · erase by name</small>
            </button>
            <button className="ms-featured-template" onClick={()=>s.replaceProject(whiteboardProject())}>
              <div className="ms-template-art"><svg viewBox="0 0 400 210" width="100%" height="100%"><rect width="400" height="210" fill="#e8e1d7"/><rect x="20" y="20" width="360" height="150" rx="22" fill="#fbfaf7"/><path d="M170 115 Q185 104 207 115 L218 200 H160Z" fill="#7160ee"/><circle cx="188" cy="75" r="30" fill="#f0c3a2"/><path d="M158 69 Q157 31 182 42 Q218 32 218 69Z" fill="#59402e"/><path d="M213 128 Q263 110 261 60 M167 128 L148 184" fill="none" stroke="#f0c3a2" strokeWidth="15" strokeLinecap="round"/><path d="M263 62L267 43" stroke="#343740" strokeWidth="4"/></svg></div>
              <strong>Whiteboard presenter</strong><small>Marker writing · simple 2D presenter · editable words</small>
            </button>
            <button className="ms-featured-template" onClick={async () => {
              try {
                const response = await fetch("/studio/examples/seated-interview.json");
                if (!response.ok) throw new Error("Sample unavailable");
                const project = await response.json(); project.id = crypto.randomUUID();
                s.replaceProject(project);
              } catch { s.replaceProject(interviewProject()); }
            }}>
              <div className="ms-template-art"><UsersPreview /></div>
              <strong>Seated interview</strong><small>Interview room · two chairs · table · recorded voices & lip sync</small>
            </button>
            <button className="ms-featured-template" onClick={() => s.replaceProject(mixedExplainerProject())}>
              <div className="ms-template-art"><UsersPreview /></div>
              <strong>3D + 2D explainer</strong>
              <small>Presenter · animated graphics · background cast · 3 scenes</small>
            </button>
            <button
              className="ms-featured-template"
              onClick={() => s.replaceProject(conversationProject())}
            >
              <div className="ms-template-art">
                <UsersPreview />
              </div>
              <strong>3D conversation</strong>
              <small>Two characters · camera cuts · character voices</small>
            </button>
            <button
              className="ms-featured-template"
              onClick={() => s.replaceProject(presenterProject())}
            >
              <div className="ms-template-art">
                <UsersPreview />
              </div>
              <strong>Presenter story</strong>
              <small>Original characters · expressive gestures</small>
            </button>
            {TEMPLATE_NAMES.map((t) => (
              <button
                key={t}
                onClick={() => s.replaceProject(goldenProject(t))}
              >
                <div className="ms-template-art">
                  <TemplateArtwork name={t} />
                  <span className="ms-template-orbit" />
                </div>
                <strong>{t}</strong>
                <small>Editable scenes · characters · camera motion</small>
              </button>
            ))}
          </div>
          <div className="ms-section-heading">
            <h2>Recent projects</h2>
            <span>Saved on this device</span>
          </div>
          {!recent.length && (
            <div className="ms-recent-empty">
              <FolderOpen size={20} />
              <span>Your projects will appear here. Start a story above.</span>
            </div>
          )}
          {recent.map((p) => (
            <div className="ms-row" key={p.id}>
              <button onClick={() => s.replaceProject(p)}>
                {p.metadata.name}
              </button>
              <small>{p.scenes.length} scenes</small>
              <button
                onClick={async () => {
                  await deleteProject(p.id);
                  setRecent(await listProjects());
                }}
              >
                Delete
              </button>
            </div>
          ))}
          <p role="alert">{error}</p>
        </main>
      ) : (
        <>
          <header className="ms-toolbar">
            <button
              className="ms-brand"
              aria-label="Studio home"
              title="Save and return home"
              onClick={async () => {
                try {
                  await s.saveProject();
                  s.closeProject();
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              <span className="ms-logo">
                <Clapperboard size={18} />
              </span>
              <span>
                Chaya<span className="ms-brand-light"> Studio</span>
              </span>
            </button>
            <input
              aria-label="Project name"
              value={p.metadata.name}
              onChange={(e) => s.setProjectName(e.target.value)}
            />
            <button
              title="Open project JSON"
              onClick={() => file.current?.click()}
            >
              <FolderOpen size={15} /> <span>Open</span>
            </button>
            <button
              onClick={() =>
                s
                  .saveProject()
                  .then(() => setError("Saved locally"))
                  .catch((e) => setError(e.message))
              }
            >
              <Save size={15} /> <span>{s.isSaving ? "Saving…" : "Save"}</span>
            </button>
            <button
              disabled={!s.canUndo}
              onClick={s.undo}
              aria-label="Undo (⌘Z)"
              title="Undo (⌘Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              disabled={!s.canRedo}
              onClick={s.redo}
              aria-label="Redo (⇧⌘Z)"
              title="Redo (⇧⌘Z)"
            >
              <Redo2 size={16} />
            </button>
            <nav className="ms-tabs">
              {["scene", "characters", "assets", "ai"].map((w) => (
                <button
                  key={w}
                  className={workspace === w ? "active" : ""}
                  onClick={() => {
                    setWorkspace(w);
                    s.setIsPlaying(false);
                  }}
                >
                  {w === "scene"
                    ? "Scenes"
                    : w === "characters"
                      ? "Character designer"
                      : w === "ai" ? "AI JSON" : "Assets & audio"}
                </button>
              ))}
            </nav>
            <button className="primary" onClick={() => setExporting(true)}>
              Export <ArrowUpRight size={16} />
            </button>
          </header>
          {error && (
            <div className="ms-notice" role="status">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {workspace === "ai" ? (<AIStudio />) : workspace === "characters" ? (
            <CharacterStudio />
          ) : workspace === "assets" ? (
            <AssetStudio />
          ) : (
            <>
              <div className="ms-scene-strip">
                <span className="ms-strip-label">
                  <Film size={14} /> SCENES
                </span>
                {p.scenes.map((scene, i) => (
                  <button
                    key={scene.id}
                    className={scene.id === s.activeSceneId ? "active" : ""}
                    onClick={() => s.selectScene(scene.id)}
                  >
                    <small className="ms-scene-number">
                      {String(i + 1).padStart(2, "0")}
                    </small>{" "}
                    {scene.name} <small>{Number(scene.duration.toFixed(2))}s</small>
                  </button>
                ))}
                <button onClick={s.addScene}>+ Scene</button>
                <button
                  disabled={
                    p.scenes.findIndex((x) => x.id === s.activeSceneId) === 0
                  }
                  onClick={() =>
                    s.editProject((p) => {
                      const i = p.scenes.findIndex(
                        (x) => x.id === s.activeSceneId,
                      );
                      if (i > 0)
                        [p.scenes[i - 1], p.scenes[i]] = [
                          p.scenes[i],
                          p.scenes[i - 1],
                        ];
                    })
                  }
                >
                  ← Move scene
                </button>
              </div>
              <div className="ms-editor">
                {libraryOpen && <StudioLibrary add={add} />}
                <main className="ms-canvas-wrap">
                  <div className="ms-canvas-tools">
                    <button className={libraryOpen ? "active" : ""} aria-expanded={libraryOpen} onClick={() => { setFocus(false); setLibraryOpen(focus ? true : !libraryOpen); }} title="Add characters, text and graphics"><Plus size={15} /> Add</button>
                    <span className="ms-canvas-breadcrumb">
                      Stage <ChevronRight size={13} />{" "}
                      <strong>{scene?.name}</strong>
                    </span>
                    <span className="ms-canvas-size">
                      {p.settings.width} × {p.settings.height}
                    </span>
                    <button onClick={fit} title="Fit canvas">
                      <Maximize2 size={13} />
                      <span>Fit canvas</span>
                    </button>
                    <button aria-label="Zoom out"
                      onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                    >
                      <Minus size={13} />
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button aria-label="Zoom in"
                      onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                    >
                      <Plus size={13} />
                    </button>
                    <label className="ms-grid-toggle">
                      <input
                        type="checkbox"
                        checked={grid}
                        onChange={(e) => setGrid(e.target.checked)}
                      />
                      Grid
                    </label>
                    <button aria-expanded={inspectorOpen} onClick={() => { setFocus(false); setInspectorOpen(focus ? true : !inspectorOpen); }} title="Show or hide editing controls">Settings</button>
                    <button
                      aria-label={focus ? "Exit focus mode" : "Focus mode"}
                      title={focus ? "Exit focus mode" : "Focus mode"}
                      onClick={() => setFocus(!focus)}
                    >
                      {focus ? (
                        <Minimize2 size={15} />
                      ) : (
                        <Maximize2 size={15} />
                      )}
                    </button>
                  </div>
                  <div
                    className={"ms-viewport " + (grid ? "grid" : "")}
                    ref={viewport}
                    onPointerDown={beginDrag}
                    onWheel={(e) => {
                      if (e.ctrlKey || e.metaKey)
                        setZoom((z) =>
                          Math.max(0.1, Math.min(2, z - e.deltaY * 0.001)),
                        );
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const type = e.dataTransfer.getData("studio-element"),
                        kind = e.dataTransfer.getData("studio-component"),
                        char = e.dataTransfer.getData("studio-character");
                      if (type) add(type);
                      if (kind) add("component", kind);
                      if (char) s.addRiggedCharacterElement(char);
                    }}
                  >
                    <div
                      className="ms-artboard"
                      style={{
                        width: p.settings.width * zoom,
                        height: p.settings.height * zoom,
                        transform: `translate(${pan.x}px,${pan.y}px)`,
                      }}
                    >
                      <ProjectFrame project={p} time={s.playbackTime} editable>
                        {selected && !s.isPlaying && !scene?.stage3d && (
                          <g
                            transform={`translate(${selected.x},${selected.y}) rotate(${selected.rotation},${selected.width / 2},${selected.height / 2})`}
                          >
                            <rect
                              width={selected.width}
                              height={selected.height}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth={2 / zoom}
                              pointerEvents="none"
                            />
                            <rect
                              data-handle="resize"
                              x={selected.width - 5 / zoom}
                              y={selected.height - 5 / zoom}
                              width={10 / zoom}
                              height={10 / zoom}
                              fill="#f8fafc"
                              stroke="#0284c7"
                              style={{ cursor: "nwse-resize" }}
                            />
                            <line
                              x1={selected.width / 2}
                              x2={selected.width / 2}
                              y1={0}
                              y2={-28 / zoom}
                              stroke="#38bdf8"
                              strokeWidth={1 / zoom}
                            />
                            <circle
                              data-handle="rotate"
                              cx={selected.width / 2}
                              cy={-28 / zoom}
                              r={6 / zoom}
                              fill="white"
                              stroke="#38bdf8"
                              style={{ cursor: "grab" }}
                            />
                          </g>
                        )}
                      </ProjectFrame>
                    </div>
                  </div>
                </main>
                {inspectorOpen && <StudioInspector />}
              </div>
              <SceneTimeline />
            </>
          )}
          <AudioPreview />
          {exporting && <ExportPanel onClose={() => setExporting(false)} />}
        </>
      )}
    </div>
  );
}

function UsersPreview() {
  return (
    <svg viewBox="0 0 180 90">
      <rect x="15" y="12" width="150" height="65" rx="7" fill="#faf9f6" />
      <circle cx="90" cy="33" r="13" fill="#efc5a4" />
      <path d="M77 29 Q77 11 90 17 Q104 14 103 29" fill="#563c2b" />
      <rect x="76" y="48" width="28" height="37" rx="9" fill="#6366f1" />
      <path
        d="M79 54L69 76M102 54Q124 43 121 29"
        fill="none"
        stroke="#efc5a4"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TemplateArtwork({ name }: { name: string }) {
  const Icon =
    (
      {
        "Website Request": Globe,
        "Product Demo": MonitorPlay,
        "System Architecture": Network,
        "API Explanation": Braces,
        "Database Explanation": Database,
        Cybersecurity: ShieldCheck,
        "Cloud Architecture": Cloud,
        "Algorithm Explanation": Workflow,
      } as any
    )[name] ?? LayoutTemplate;
  return (
    <>
      <span className="ms-template-node node-left" />
      <span className="ms-template-connector" />
      <Icon size={35} strokeWidth={1.25} />
      <span className="ms-template-node node-right" />
    </>
  );
}
