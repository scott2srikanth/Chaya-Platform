"use client";
import WhiteboardEditor from "./WhiteboardEditor";
import DialogueDirector from "./DialogueDirector";
import StageDirector from "./StageDirector";
import { MousePointer2, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { PRESET_LIST } from "../../lib/studio/presets";
import { createKeyframe } from "../../lib/studio/clip-engine";
import { Field, Num, Select, uid } from "./StudioControls";
export default function StudioInspector() {
  const s = useStudioStore(),
    p = s.project!,
    scene = s.activeScene()!,
    el = scene.elements.find((e) => e.id === s.selectedElementId),
    [tab, setTab] = useState(scene.stage3d ? "Cast" : "Scene");
  useEffect(() => {
    if (el) setTab(el.type === "character" && scene.stage3d ? "Cast" : "Object");
    // Selecting an object reveals its relevant controls without changing the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.selectedElementId]);
  const update = (key: string, value: any) => {
    if (el) s.updateElement(el.id, { [key]: value });
  };
  const char = el?.characterId ? s.character(el.characterId) : undefined;
  return (
    <aside className="ms-panel ms-inspector">
      <div className="ms-panel-heading">
        <div>
          <span className="ms-eyebrow">SCENE WORKSPACE</span>
          <h2>{tab === "Object" ? el?.name ?? "Object" : tab === "Cast" ? "Set & cast" : tab === "Script" ? "Script & voices" : tab === "Camera" ? "Camera direction" : "Scene settings"}</h2>
        </div>
        <SlidersHorizontal size={17} />
      </div>
      <nav className="ms-tabs">
        {["Scene", "Cast", "Script", "Camera", "Object"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Scene" && (
        <>
          <Field label="Scene name">
            <input
              value={scene.name}
              onChange={(e) =>
                s.updateScene(scene.id, { name: e.target.value })
              }
            />
          </Field>
          <Num
            label="Scene duration"
            value={scene.duration}
            min={0.1}
            onChange={(v) => s.updateScene(scene.id, { duration: v })}
          />
          <Field label="Scene background">
            <input
              type="color"
              value={scene.background}
              onChange={(e) =>
                s.updateScene(scene.id, { background: e.target.value })
              }
            />
          </Field>
          <Select
            label="Transition"
            value={scene.transition}
            options={["cut", "fade", "crossfade", "slide", "zoom"]}
            onChange={(v) => s.updateScene(scene.id, { transition: v as any })}
          />
          <Num
            label="Transition duration"
            value={scene.transitionDuration ?? 0.5}
            min={0.01}
            onChange={(v) => s.updateScene(scene.id, { transitionDuration: v })}
          />
          <button
            onClick={() => s.removeScene(scene.id)}
            disabled={p.scenes.length === 1}
          >
            Delete scene
          </button>
          <button
            onClick={() =>
              s.editProject((p) => {
                p.templates = [
                  ...(p.templates ?? []),
                  {
                    id: uid(),
                    name: scene.name,
                    scene: structuredClone(scene),
                  },
                ];
              })
            }
          >
            Save scene as template
          </button>
          <button
            onClick={() =>
              s.editProject((p) => {
                const scene = p.scenes.find((x) => x.id === s.activeSceneId)!;
                scene.elements.forEach((el, i) => {
                  el.startTime = i * 0.15;
                  el.animations = el.animations.map((a) => ({
                    ...a,
                    startTime: a.startTime + i * 0.15,
                  }));
                });
              })
            }
          >
            Stagger scene elements (150ms)
          </button>
          <h3>Project settings</h3>
          {["width", "height", "fps"].map((key) => (
            <Num
              key={key}
              label={key}
              value={(p.settings as any)[key]}
              min={key === "fps" ? 1 : 16}
              step={1}
              onChange={(v) =>
                s.editProject((p) => {
                  (p.settings as any)[key] = Math.round(v);
                })
              }
            />
          ))}
        </>
      )}
      {tab === "Camera" && (
        <>
          <DialogueDirector mode="camera" />
          {!scene.stage3d && (
            <details>
              <summary>Animated camera keys</summary>
              <p>
                Camera keys use scene time. Select a key to adjust the shot.
              </p>
              {["x", "y", "zoom", "rotation"].map((key) => (
                <Num
                  key={key}
                  label={"Camera " + key}
                  value={(scene.camera as any)[key]}
                  min={key === "zoom" ? 0.1 : undefined}
                  onChange={(v) =>
                    s.updateScene(scene.id, {
                      camera: { ...scene.camera, [key]: v },
                    })
                  }
                />
              ))}
              <button
                onClick={() =>
                  s.updateScene(scene.id, {
                    cameraKeys: [
                      ...(scene.cameraKeys ?? []),
                      {
                        ...scene.camera,
                        id: uid(),
                        time: s.currentTime,
                        easing: "easeInOut" as const,
                      },
                    ].sort((a, b) => a.time - b.time),
                  })
                }
              >
                Add camera key at playhead
              </button>
              {scene.cameraKeys?.map((k) => (
                <div className="ms-key-card" key={k.id}>
                  {["time", "x", "y", "zoom", "rotation"].map((key) => (
                    <Num
                      key={key}
                      label={"Key " + key}
                      value={(k as any)[key]}
                      onChange={(v) =>
                        s.updateScene(scene.id, {
                          cameraKeys: scene.cameraKeys!.map((x) =>
                            x.id === k.id
                              ? {
                                  ...x,
                                  [key]: key === "zoom" ? Math.max(0.1, v) : v,
                                }
                              : x,
                          ),
                        })
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      s.updateScene(scene.id, {
                        cameraKeys: scene.cameraKeys!.filter(
                          (x) => x.id !== k.id,
                        ),
                      })
                    }
                  >
                    Delete camera key
                  </button>
                </div>
              ))}
            </details>
          )}
        </>
      )}
      {tab === "Script" && <DialogueDirector mode="script" />}
      {tab === "Cast" && <StageDirector />}
      {tab === "Object" && scene.stage3d && el?.type === "character" && <div className="ms-inspector-empty"><p>Use Set & cast to edit this 3D character.</p><button onClick={() => setTab("Cast")}>Edit character</button></div>}
      {tab === "Object" &&
        !(scene.stage3d && el?.type === "character") &&
        (!el ? (
          <div className="ms-inspector-empty">
            <MousePointer2 />
            <strong>Select an object to edit.</strong>
            <p>
              Click a character or graphic on the canvas. Use Add to insert something new.
            </p>
            <p>
              <kbd>Space</kbd> to preview your story
            </p>
          </div>
        ) : (
          <>
            <Field label="Object name">
              <input
                value={el.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            {el.componentKind === "Whiteboard presenter" && <WhiteboardEditor key={el.id} element={el} update={patch=>s.updateElement(el.id,patch)}/>}
            {el.type === "text" && (
              <>
                <Field label="Text">
                  <textarea
                    value={el.text}
                    onChange={(e) => update("text", e.target.value)}
                  />
                </Field>
                <Num
                  label="Font size"
                  value={el.fontSize}
                  min={1}
                  onChange={(v) => update("fontSize", v)}
                />
                <Select
                  label="Text alignment"
                  value={el.textAlign}
                  options={["left", "center", "right"]}
                  onChange={(v) => update("textAlign", v)}
                />
                <Select
                  label="Text effect"
                  value={el.textEffect ?? "none"}
                  options={["none", "typewriter", "words", "lines"]}
                  onChange={(v) => update("textEffect", v)}
                />
                <Num
                  label="Reveal duration"
                  value={el.revealDuration ?? 1}
                  min={0.01}
                  onChange={(v) => update("revealDuration", v)}
                />
              </>
            )}
            <div className="ms-row">
              <button onClick={() => s.duplicateElement(el.id)}>
                Duplicate
              </button>
              <button onClick={() => s.removeElement(el.id)}>Delete</button>
              <button onClick={() => s.moveElementOrder(el.id, "up")}>
                Forward
              </button>
              <button onClick={() => s.moveElementOrder(el.id, "down")}>
                Back
              </button>
            </div>
            <label>
              <input
                type="checkbox"
                checked={el.locked}
                onChange={(e) => update("locked", e.target.checked)}
              />
              Locked
            </label>
            <label>
              <input
                type="checkbox"
                checked={el.visible}
                onChange={(e) => update("visible", e.target.checked)}
              />
              Visible
            </label>
            <details className="ms-property-group" open={el.type !== "text"}><summary>Position & appearance</summary>
            <div className="ms-fields">
              {[
                "x",
                "y",
                "width",
                "height",
                "rotation",
                "scaleX",
                "scaleY",
                "opacity",
                "blur",
              ].map((key) => (
                <Num
                  key={key}
                  label={key}
                  value={(el as any)[key] ?? 0}
                  min={
                    ["width", "height", "opacity", "blur"].includes(key)
                      ? 0
                      : undefined
                  }
                  onChange={(v) =>
                    update(key, key === "opacity" ? Math.min(1, v) : v)
                  }
                />
              ))}
            </div>
            <Num
              label="In"
              value={el.startTime ?? 0}
              min={0}
              onChange={(v) => update("startTime", v)}
            />
            <Num
              label="Out"
              value={el.endTime ?? scene.duration}
              min={0}
              onChange={(v) => update("endTime", v)}
            />
            {!char && (
              <>
                <Field label="Fill">
                  <input
                    type="color"
                    value={el.fill === "transparent" ? "#ffffff" : el.fill}
                    onChange={(e) => update("fill", e.target.value)}
                  />
                </Field>
                <Field label="Stroke">
                  <input
                    type="color"
                    value={el.stroke === "transparent" ? "#334155" : el.stroke}
                    onChange={(e) => update("stroke", e.target.value)}
                  />
                </Field>
                <Num
                  label="Stroke width"
                  value={el.strokeWidth}
                  min={0}
                  onChange={(v) => update("strokeWidth", v)}
                />
              </>
            )}
            </details>
            <details className="ms-property-group"><summary>Motion paths & style keyframes</summary>
            <h3>Motion path</h3>
            {!el.motionPath ? (
              <button
                onClick={() =>
                  update("motionPath", {
                    points: [
                      { x: el.x, y: el.y },
                      { x: el.x + 400, y: el.y },
                    ],
                    startTime: s.currentTime,
                    duration: 2,
                    easing: "easeInOut",
                    loop: false,
                  })
                }
              >
                Add path
              </button>
            ) : (
              <>
                <Num
                  label="Path start"
                  value={el.motionPath.startTime}
                  min={0}
                  onChange={(v) =>
                    update("motionPath", { ...el.motionPath, startTime: v })
                  }
                />
                <Num
                  label="Path duration"
                  value={el.motionPath.duration}
                  min={0.01}
                  onChange={(v) =>
                    update("motionPath", { ...el.motionPath, duration: v })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={el.motionPath.loop}
                    onChange={(e) =>
                      update("motionPath", {
                        ...el.motionPath,
                        loop: e.target.checked,
                      })
                    }
                  />
                  Loop path
                </label>
                {el.motionPath.points.map((point, i) => (
                  <div className="ms-fields" key={i}>
                    {(["x", "y"] as const).map((key) => (
                      <Num
                        key={key}
                        label={`Point ${i + 1} ${key}`}
                        value={point[key]}
                        onChange={(v) =>
                          update("motionPath", {
                            ...el.motionPath,
                            points: el.motionPath!.points.map((p, j) =>
                              i === j ? { ...p, [key]: v } : p,
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                ))}
                <button
                  onClick={() =>
                    update("motionPath", {
                      ...el.motionPath,
                      points: [...el.motionPath!.points, { x: el.x, y: el.y }],
                    })
                  }
                >
                  Add path point
                </button>
                <button onClick={() => update("motionPath", undefined)}>
                  Remove path
                </button>
              </>
            )}
            <h3>Color & blur keyframes</h3>
            <button
              onClick={() =>
                update("styleKeys", [
                  ...(el.styleKeys ?? []).filter(
                    (k) => Math.abs(k.time - s.currentTime) > 0.001,
                  ),
                  {
                    id: uid(),
                    time: s.currentTime,
                    fill: el.fill,
                    stroke: el.stroke,
                    blur: el.blur ?? 0,
                    easing: "easeInOut",
                  },
                ])
              }
            >
              Key current style at playhead
            </button>
            {el.styleKeys?.map((k) => (
              <div className="ms-key-card" key={k.id}>
                <Num
                  label="Style key time"
                  value={k.time}
                  min={0}
                  onChange={(time) =>
                    update(
                      "styleKeys",
                      el.styleKeys!.map((x) =>
                        x.id === k.id ? { ...x, time } : x,
                      ),
                    )
                  }
                />
                {(["fill", "stroke"] as const).map((property) => (
                  <Field key={property} label={"Key " + property}>
                    <input
                      type="color"
                      value={
                        k[property] === "transparent" ? "#000000" : k[property]
                      }
                      onChange={(e) =>
                        update(
                          "styleKeys",
                          el.styleKeys!.map((x) =>
                            x.id === k.id
                              ? { ...x, [property]: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </Field>
                ))}
                <Num
                  label="Key blur"
                  value={k.blur}
                  min={0}
                  onChange={(blur) =>
                    update(
                      "styleKeys",
                      el.styleKeys!.map((x) =>
                        x.id === k.id ? { ...x, blur } : x,
                      ),
                    )
                  }
                />
                <button
                  onClick={() =>
                    update(
                      "styleKeys",
                      el.styleKeys!.filter((x) => x.id !== k.id),
                    )
                  }
                >
                  Delete style key
                </button>
              </div>
            ))}
            </details>
            {el.type === "character" && !char && (
              <>
                <h3>Presenter performance</h3>
                <Select
                  label="Gesture"
                  value={el.characterGesture ?? "idle"}
                  options={[
                    "idle",
                    "waving",
                    "talking",
                    "pointing",
                    "thinking",
                    "celebrating",
                  ]}
                  onChange={(v) => update("characterGesture", v)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={el.facingRight ?? true}
                    onChange={(e) => update("facingRight", e.target.checked)}
                  />
                  Face right
                </label>
                <p className="ms-muted">
                  Add dialogue in Script to sequence gestures and animate
                  speech.
                </p>
              </>
            )}
            {["connector", "packet"].includes(el.type) && (
              <>
                <Select
                  label="From object"
                  value={el.sourceId ?? ""}
                  options={[
                    { id: "", name: "Free point" },
                    ...scene.elements
                      .filter((e) => e.id !== el.id)
                      .map((e) => ({ id: e.id, name: e.name })),
                  ]}
                  onChange={(v) => update("sourceId", v)}
                />
                <Select
                  label="To object"
                  value={el.targetId ?? ""}
                  options={[
                    { id: "", name: "Free point" },
                    ...scene.elements
                      .filter((e) => e.id !== el.id)
                      .map((e) => ({ id: e.id, name: e.name })),
                  ]}
                  onChange={(v) => update("targetId", v)}
                />
                <Num
                  label="Travel / draw duration"
                  value={el.drawDuration ?? 1}
                  min={0.01}
                  onChange={(v) => update("drawDuration", v)}
                />
              </>
            )}
            {char && (
              <>
                <Select
                  label="Pose"
                  value={el.activePose ?? "idle"}
                  options={char.poses}
                  onChange={(v) => update("activePose", v)}
                />
                <Select
                  label="Expression"
                  value={el.expression ?? "neutral"}
                  options={char.expressions ?? []}
                  onChange={(v) => update("expression", v)}
                />
                <button
                  onClick={() =>
                    update("expressionKeys", [
                      ...(el.expressionKeys ?? []),
                      {
                        time: s.currentTime,
                        expression: el.expression ?? "neutral",
                      },
                    ])
                  }
                >
                  Key expression here
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={el.facingRight ?? true}
                    onChange={(e) => update("facingRight", e.target.checked)}
                  />
                  Face right
                </label>
                <Num
                  label="Character speed"
                  value={el.characterSpeed ?? 1}
                  min={0.1}
                  onChange={(v) => update("characterSpeed", v)}
                />
                <Select
                  label="Appearance variant"
                  value=""
                  options={[
                    { id: "", name: "Choose variant" },
                    ...(char.variants ?? []),
                  ]}
                  onChange={(v) =>
                    update(
                      "appearanceOverride",
                      char.variants?.find((x) => x.id === v)?.appearance,
                    )
                  }
                />
                <h3>Saved animations</h3>
                {char.animations?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      s.addClip({
                        ...structuredClone(c),
                        id: uid(),
                        elementId: el.id,
                        startTime: s.currentTime,
                      })
                    }
                  >
                    {c.name} +
                  </button>
                ))}
                <h3>Actions</h3>
                <Select
                  label="Add action"
                  value=""
                  options={[
                    { id: "", name: "Choose action" },
                    "walkTo",
                    "runTo",
                    "pointAt",
                    "lookAt",
                    "turnTo",
                    "sit",
                    "stand",
                    "wave",
                    "talk",
                    "think",
                    "celebrate",
                  ]}
                  onChange={(v) =>
                    update("actions", [
                      ...(el.actions ?? []),
                      {
                        id: uid(),
                        type: v,
                        startTime: s.currentTime,
                        duration: 2,
                      },
                    ])
                  }
                />
                {el.actions?.map((a) => (
                  <div className="ms-key-card" key={a.id}>
                    <strong>{a.type}</strong>
                    <Select
                      label="Target"
                      value={a.targetId ?? ""}
                      options={[
                        { id: "", name: "Coordinates" },
                        ...scene.elements
                          .filter((e) => e.id !== el.id)
                          .map((e) => ({ id: e.id, name: e.name })),
                      ]}
                      onChange={(v) =>
                        update(
                          "actions",
                          el.actions!.map((x) =>
                            x.id === a.id ? { ...x, targetId: v } : x,
                          ),
                        )
                      }
                    />
                    {["startTime", "duration", "x", "y"].map((key) => (
                      <Num
                        key={key}
                        label={key}
                        value={(a as any)[key] ?? 0}
                        onChange={(v) =>
                          update(
                            "actions",
                            el.actions!.map((x) =>
                              x.id === a.id ? { ...x, [key]: v } : x,
                            ),
                          )
                        }
                      />
                    ))}
                    <button
                      onClick={() =>
                        update(
                          "actions",
                          el.actions!.filter((x) => x.id !== a.id),
                        )
                      }
                    >
                      Delete action
                    </button>
                  </div>
                ))}
              </>
            )}
            {(() => {
              const asset = p.assets?.find(
                (a) => a.id === (el.assetId ?? char?.representation?.assetId),
              );
              if (!asset) return null;
              return (
                <>
                  <Select
                    label="Media animation"
                    value={el.mediaAnimation ?? ""}
                    options={[
                      { id: "", name: "Default" },
                      ...(asset.rive?.animations ??
                        asset.sprite?.animations.map((a) => a.name) ??
                        []),
                    ]}
                    onChange={(v) => update("mediaAnimation", v)}
                  />
                  <Num
                    label="Media start"
                    value={el.mediaStart ?? 0}
                    min={0}
                    onChange={(v) => update("mediaStart", v)}
                  />
                  <Num
                    label="Media end"
                    value={el.mediaEnd ?? asset.duration ?? 3}
                    min={0.01}
                    onChange={(v) => update("mediaEnd", v)}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={el.mediaLoop ?? true}
                      onChange={(e) => update("mediaLoop", e.target.checked)}
                    />
                    Loop media
                  </label>
                  {asset.rive && (
                    <>
                      <Select
                        label="State machine"
                        value={el.riveStateMachine ?? ""}
                        options={[
                          { id: "", name: "Animation only" },
                          ...asset.rive.stateMachines.map((sm) => ({
                            id: sm.name,
                            name: sm.name,
                          })),
                        ]}
                        onChange={(v) => update("riveStateMachine", v)}
                      />
                      {asset.rive.stateMachines
                        .find((sm) => sm.name === el.riveStateMachine)
                        ?.inputs.map((input) => (
                          <button
                            key={input.name}
                            onClick={() =>
                              update("riveInputs", [
                                ...(el.riveInputs ?? []),
                                {
                                  time: s.currentTime,
                                  name: input.name,
                                  value:
                                    input.type === "trigger"
                                      ? "fire"
                                      : input.type === "boolean"
                                        ? true
                                        : 1,
                                },
                              ])
                            }
                          >
                            Key {input.name} ({input.type})
                          </button>
                        ))}
                      {el.riveInputs?.map((v, i) => (
                        <div className="ms-row" key={i}>
                          <span>{v.name}</span>
                          <Num
                            label="Input time"
                            value={v.time}
                            onChange={(time) =>
                              update(
                                "riveInputs",
                                el.riveInputs!.map((v, j) =>
                                  j === i ? { ...v, time } : v,
                                ),
                              )
                            }
                          />
                          <input
                            aria-label="Input value"
                            value={String(v.value)}
                            onChange={(e) =>
                              update(
                                "riveInputs",
                                el.riveInputs!.map((v, j) =>
                                  j === i
                                    ? {
                                        ...v,
                                        value:
                                          e.target.value === "true"
                                            ? true
                                            : e.target.value === "false"
                                              ? false
                                              : e.target.value === "fire"
                                                ? "fire"
                                                : Number(e.target.value),
                                      }
                                    : v,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
            <h3>Motion</h3>
            <div className="ms-preset-grid">
              {PRESET_LIST.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() =>
                    s.applyPreset(el.id, preset.name, s.currentTime, 1)
                  }
                >
                  {preset.label}
                </button>
              ))}
              <button onClick={() => update("drawDuration", 1)}>
                Draw line
              </button>
            </div>
            {el.animations.map((a) => (
              <div className="ms-key-card" key={a.id}>
                <Select
                  label="Property"
                  value={a.property}
                  options={[
                    "x",
                    "y",
                    "scale",
                    "rotation",
                    "opacity",
                    "width",
                    "height",
                  ]}
                  onChange={(v) =>
                    s.updateAnimation(el.id, a.id, { property: v as any })
                  }
                />
                {["from", "to", "startTime", "duration"].map((key) => (
                  <Num
                    key={key}
                    label={key}
                    value={(a as any)[key]}
                    onChange={(v) =>
                      s.updateAnimation(el.id, a.id, { [key]: v })
                    }
                  />
                ))}
                <Select
                  label="Easing"
                  value={a.easing}
                  options={[
                    "linear",
                    "easeIn",
                    "easeOut",
                    "easeInOut",
                    "spring",
                  ]}
                  onChange={(v) =>
                    s.updateAnimation(el.id, a.id, { easing: v as any })
                  }
                />
                <button onClick={() => s.removeAnimation(el.id, a.id)}>
                  Remove motion
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                s.addAnimation(el.id, {
                  id: uid(),
                  property: "x",
                  from: el.x,
                  to: el.x + 300,
                  startTime: s.currentTime,
                  duration: 1,
                  easing: "easeInOut",
                })
              }
            >
              + Motion
            </button>
          </>
        ))}
    </aside>
  );
}
