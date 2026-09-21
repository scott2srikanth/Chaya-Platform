"use client";
import { useState } from "react";
import {
  Square,
  Circle,
  Type,
  Minus,
  MoveUpRight,
  CircleDot,
  Search,
  Plus,
  Server,
  Database,
  Cloud,
  Globe,
  Code2,
  Upload,
  Shapes,
  Users,
  Network,
} from "lucide-react";
import { useStudioStore } from "../../lib/studio/store";
import { CHARACTER_LIBRARY } from "../../lib/studio/characters";
import { computeCharacterMotion } from "../../lib/studio/character-animator";
import CharacterRenderer from "./CharacterRenderer";
import { RigPreview } from "./RigRenderer";
import { COMPONENTS } from "./render/ProjectFrame";
const shapes = [
  ["rectangle", Square],
  ["circle", Circle],
  ["text", Type],
  ["line", Minus],
  ["connector", MoveUpRight],
  ["packet", CircleDot],
] as const;
export default function StudioLibrary({
  add,
}: {
  add: (type: string, kind?: string) => void;
}) {
  const s = useStudioStore(),
    [tab, setTab] = useState("Elements"),
    [query, setQuery] = useState("");
  const match = (name: string) =>
    name.toLowerCase().includes(query.toLowerCase());
  return (
    <aside className="ms-panel ms-tools">
      <div className="ms-panel-heading">
        <div>
          <span className="ms-eyebrow">YOUR TOOLKIT</span>
          <h2>Library</h2>
        </div>
        <span className="ms-count">
          {tab === "Characters"
            ? (s.project?.characters?.length ?? 0) + 4
            : tab === "Components"
              ? COMPONENTS.length
              : 6}
        </span>
      </div>
      <div className="ms-library-search">
        <Search size={15} />
        <input
          aria-label="Search library"
          placeholder="Search your library"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>⌕</kbd>
      </div>
      <nav className="ms-library-tabs" aria-label="Library categories">
        {[
          ["Elements", Shapes],
          ["Characters", Users],
          ["Components", Network],
        ].map(([name, Icon]: any) => (
          <button
            key={name}
            aria-label={name + " library tab"}
            className={tab === name ? "active" : ""}
            onClick={() => {
              setTab(name);
              setQuery("");
            }}
          >
            <Icon size={17} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {tab === "Elements" && (
        <>
          <h3>Shapes & text</h3>
          <div className="ms-shape-grid">
            {shapes
              .filter(([type]) => match(type))
              .map(([type, Icon]) => (
                <button
                  key={type}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("studio-element", type)
                  }
                  onClick={() => add(type)}
                >
                  <Icon size={23} strokeWidth={1.5} />
                  <span>{type}</span>
                </button>
              ))}
          </div>
          <div className="ms-library-tip">
            <Shapes size={18} />
            <p>
              Start with a shape.
              <br />
              <span>Add motion in the inspector.</span>
            </p>
          </div>
          <button
            className="ms-library-link"
            onClick={() => setTab("Characters")}
          >
            <Users size={16} /> Explore characters <span>→</span>
          </button>
          <button
            className="ms-library-link"
            onClick={() => setTab("Components")}
          >
            <Network size={16} /> Build a system diagram <span>→</span>
          </button>
        </>
      )}
      {tab === "Characters" && (
        <>
          <h3>
            Presenters <span className="ms-badge">Original style</span>
          </h3>
          <div className="ms-presenter-grid">
            {CHARACTER_LIBRARY.filter((c) => match(c.name)).map((c) => (
              <button
                className="ms-presenter-card"
                aria-label={"Add presenter " + c.name}
                key={c.id}
                onClick={() => s.addCharacterElement(c.id, c.name)}
              >
                <div
                  className="ms-character-art"
                  style={{
                    background:
                      c.id === "alex"
                        ? "#dce8ff"
                        : c.id === "sarah"
                          ? "#d9eee9"
                          : c.id === "max"
                            ? "#f7e3df"
                            : "#f1e6d1",
                  }}
                >
                  <svg viewBox="0 0 240 310">
                    <CharacterRenderer
                      def={c}
                      width={240}
                      height={400}
                      facingRight
                      gesture="idle"
                      motion={computeCharacterMotion(
                        0.5,
                        "idle",
                        false,
                        "",
                        0,
                        "none",
                        { pupilOffsetX: 0, pupilOffsetY: 0 },
                      )}
                    />
                  </svg>
                  <span className="ms-add-badge">
                    <Plus size={13} />
                  </span>
                </div>
                <strong>{c.name}</strong>
                <small>Presenter</small>
              </button>
            ))}
          </div>
          <h3>Editable rigs</h3>
          <div className="ms-rig-list">
            {s.project?.characters
              ?.filter((c) => match(c.name))
              .map((c) => (
                <button
                  key={c.id}
                  aria-label={c.name}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("studio-character", c.id)
                  }
                  onClick={() => s.addRiggedCharacterElement(c.id)}
                >
                  <RigPreview character={c} size={54} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.poses.length} poses · editable rig</small>
                  </span>
                  <Plus size={14} />
                </button>
              ))}
          </div>
        </>
      )}
      {tab === "Components" && (
        <>
          <h3>Architecture components</h3>
          <div className="ms-component-grid">
            {COMPONENTS.filter(match).map((kind, i) => {
              const Icon = /Database|Cache/.test(kind)
                ? Database
                : /Cloud|CDN/.test(kind)
                  ? Cloud
                  : /Server|Container/.test(kind)
                    ? Server
                    : /Code|Terminal|API/.test(kind)
                      ? Code2
                      : Globe;
              return (
                <button
                  key={kind}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("studio-component", kind)
                  }
                  onClick={() => add("component", kind)}
                >
                  <Icon size={22} strokeWidth={1.5} />
                  <span>{kind}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {query && <p className="ms-muted">Showing matches for “{query}”</p>}
      {!!s.project?.templates?.length && (
        <details className="ms-saved-templates">
          <summary>
            Saved scene templates <span>{s.project.templates.length}</span>
          </summary>
          {s.project.templates.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                s.editProject((p) => {
                  const scene = structuredClone(t.scene);
                  scene.id = crypto.randomUUID();
                  const map = new Map(
                    scene.elements.map((e) => [e.id, crypto.randomUUID()]),
                  );
                  scene.elements = scene.elements.map((e) => ({
                    ...e,
                    id: map.get(e.id)!,
                    sourceId: map.get(e.sourceId ?? ""),
                    targetId: map.get(e.targetId ?? ""),
                    actions: e.actions?.map((a) => ({
                      ...a,
                      id: crypto.randomUUID(),
                      targetId: map.get(a.targetId ?? ""),
                    })),
                  }));
                  scene.script = scene.script.map((l) => ({
                    ...l,
                    id: crypto.randomUUID(),
                    characterElementId:
                      map.get(l.characterElementId) ?? l.characterElementId,
                  }));
                  p.scenes.push(scene);
                })
              }
            >
              {t.name} <Plus size={12} />
            </button>
          ))}
        </details>
      )}
      <button
        className="ms-import-card"
        onClick={() => s.setWorkspace("assets")}
      >
        <Upload size={18} />
        <span>
          <strong>Import your assets</strong>
          <small>Images, animations & audio</small>
        </span>
        <Plus size={15} />
      </button>
    </aside>
  );
}
