"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { nativeCharacters, validateCharacter } from "../../lib/studio/project";
import {
  RiggedCharacter,
  Pose,
  BoneTransform,
  computeWorldTransforms,
  solveTwoBoneIK,
} from "../../lib/studio/rig";
import {
  createClip,
  createKeyframe,
  evaluateClip,
} from "../../lib/studio/clip-engine";
import RigRenderer, { RigPreview } from "./RigRenderer";
import SpriteAsset from "./render/SpriteAsset";
import ExternalAsset from "./render/ExternalAsset";
import { createElement } from "../../lib/studio/types";
import { Field, Num, Select, uid, download } from "./StudioControls";
import CharacterDesigner3D from "./CharacterDesigner3D";
export default function CharacterStudio() {
 const [mode,setMode]=useState("3d");
 return <div><div className="ms-row" style={{padding:"12px 20px",borderBottom:"1px solid #e2e7ee"}}><button aria-pressed={mode==="3d"} onClick={()=>setMode("3d")}>3D characters</button><button aria-pressed={mode==="2d"} onClick={()=>setMode("2d")}>2D characters & rigs</button></div>{mode==="3d"?<CharacterDesigner3D/>:<CharacterStudio2D/>}</div>;
}
function CharacterStudio2D() {
  const s = useStudioStore(),
    p = s.project!,
    [id, setId] = useState(s.poseEditorCharId ?? p.characters?.[0]?.id ?? ""),
    [tab, setTab] = useState("Appearance"),
    [boneId, setBoneId] = useState("head"),
    [poseId, setPoseId] = useState("idle"),
    [clipId, setClipId] = useState(""),
    [expressionId, setExpressionId] = useState("neutral");
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(true),
    [background, setBackground] = useState("#172033"),
    [name, setName] = useState(""),
    [representation, setRepresentation] = useState("rigged"),
    [assetId, setAssetId] = useState(""),
    [message, setMessage] = useState(""),
    [ik, setIk] = useState(false),
    [mediaAnimation, setMediaAnimation] = useState("");
  const svg = useRef<SVGSVGElement>(null),
    c = p.characters?.find((c) => c.id === id),
    bone = c?.rig.bones.find((b) => b.id === boneId),
    pose = c?.poses.find((p) => p.id === poseId),
    clip = c?.animations?.find((c) => c.id === clipId),
    expression = c?.expressions?.find((e) => e.id === expressionId);
  const transforms =
    tab === "Animations" && clip && c
      ? evaluateClip(clip, time, c)
      : tab === "Expressions"
        ? (expression?.boneTransforms ?? {})
        : (pose?.boneTransforms ?? {});
  const edit = (fn: (c: RiggedCharacter) => void) =>
    s.editProject((p) => {
      const c = p.characters?.find((c) => c.id === id);
      if (c) fn(c);
    });
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      setTime((t) => {
        const next = t + dt,
          d = clip?.duration ?? 3;
        if (next > d) {
          if (loop) return next % d;
          setPlaying(false);
          return d;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, loop, clip?.duration]);
  const create = () => {
    try {
      const base = structuredClone(c ?? nativeCharacters()[0]);
      base.id = uid();
      base.name = name.trim() || "New character";
      base.version = "2.0";
      if (representation !== "rigged") {
        if (!assetId) throw new Error("Choose an imported asset first");
        base.representation = { type: representation as any, assetId };
      } else base.representation = { type: "rigged" };
      s.editProject((p) => {
        p.characters!.push(base);
      });
      setId(base.id);
      setTab("Appearance");
      setName("");
      setMessage("Character created");
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  const changeTransform = (key: string, v: number) =>
    edit((c) => {
      const target =
        tab === "Expressions"
          ? c.expressions?.find((e) => e.id === expressionId)
          : c.poses.find((p) => p.id === poseId);
      if (target)
        target.boneTransforms[boneId] = {
          ...target.boneTransforms[boneId],
          [key]: v,
        };
    });
  const drag = (e: React.PointerEvent) => {
    const selected = (e.target as Element)
      .closest("[data-bone-id]")
      ?.getAttribute("data-bone-id");
    const bone = c?.rig.bones.find((b) => b.id === selected);
    if (
      !c ||
      !bone ||
      !svg.current ||
      !["Rig", "Poses", "Expressions"].includes(tab)
    )
      return;
    const draggedId = bone.id;
    setBoneId(draggedId);
    const rect = svg.current.getBoundingClientRect(),
      x = e.clientX,
      y = e.clientY,
      before = transforms[bone.id] ?? {};
    s.beginEdit();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      const worldDX = ((event.clientX - x) * 320) / rect.width,
        worldDY = ((event.clientY - y) * 480) / rect.height;
      const parent = computeWorldTransforms(
        c.rig.bones,
        tab === "Rig" ? {} : transforms,
      ).get(bone.parentId ?? "");
      const angle = (-(parent?.rotation ?? 0) * Math.PI) / 180;
      const dx =
          (worldDX * Math.cos(angle) - worldDY * Math.sin(angle)) /
          (parent?.scaleX || 1),
        dy =
          (worldDX * Math.sin(angle) + worldDY * Math.cos(angle)) /
          (parent?.scaleY || 1);
      if (ik && tab === "Poses" && bone.parentId) {
        const lower = c.rig.bones.find((b) => b.id === bone.parentId),
          upper = c.rig.bones.find((b) => b.id === lower?.parentId);
        if (lower && upper) {
          const world = computeWorldTransforms(c.rig.bones, transforms),
            root = world.get(upper.id)!;
          const target = {
            x: ((event.clientX - rect.left) * 320) / rect.width - 40,
            y: ((event.clientY - rect.top) * 480) / rect.height - 40,
          };
          const angles = solveTwoBoneIK(
            root,
            target,
            upper.length,
            lower.length,
          );
          edit((c) => {
            const p = c.poses.find((p) => p.id === poseId);
            if (!p) return;
            p.boneTransforms[upper.id] = {
              ...p.boneTransforms[upper.id],
              rotation:
                angles.upper -
                upper.rotation -
                (world.get(upper.parentId ?? "")?.rotation ?? 0),
            };
            p.boneTransforms[lower.id] = {
              ...p.boneTransforms[lower.id],
              rotation: angles.lower - lower.rotation,
            };
          });
          return;
        }
      }
      if (tab === "Rig")
        edit((c) => {
          const b = c.rig.bones.find((b) => b.id === draggedId)!;
          if (e.altKey) b.rotation = bone.rotation + dx;
          else {
            b.x = bone.x + dx;
            b.y = bone.y + dy;
          }
        });
      else {
        edit((c) => {
          const target =
            tab === "Expressions"
              ? c.expressions?.find((x) => x.id === expressionId)
              : c.poses.find((x) => x.id === poseId);
          if (target)
            target.boneTransforms[draggedId] = {
              ...before,
              ...(e.altKey
                ? { rotation: (before.rotation ?? 0) + dx }
                : { x: (before.x ?? 0) + dx, y: (before.y ?? 0) + dy }),
            };
        });
      }
    };
    const up = () => {
      s.endEdit();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="ms-character-workspace">
      <aside className="ms-panel">
        <h2>Character library</h2>
        <Field label="Search">
          <input
            placeholder="Find a character"
            onChange={(e) => {
              const el = document.querySelectorAll<HTMLElement>(
                "[data-character-name]",
              );
              el.forEach(
                (el) =>
                  (el.hidden = !el.dataset.characterName?.includes(
                    e.target.value.toLowerCase(),
                  )),
              );
            }}
          />
        </Field>
        {p.characters?.map((char) => (
          <button
            data-character-name={char.name.toLowerCase()}
            key={char.id}
            className={"ms-character-card " + (id === char.id ? "active" : "")}
            onClick={() => {
              setId(char.id);
              if (char.representation?.assetId) setTab("Appearance");
              setPoseId(char.poses[0]?.id ?? "");
              setClipId(char.animations?.[0]?.id ?? "");
            }}
          >
            {char.representation?.assetId ? (
              <svg width={70} height={90} viewBox="0 0 240 400">
                {(() => {
                  const a = p.assets?.find(
                    (a) => a.id === char.representation?.assetId,
                  );
                  return a ? (
                    ["lottie", "rive"].includes(a.type) ? (
                      <ExternalAsset
                        asset={a}
                        time={0}
                        width={240}
                        height={400}
                        element={createElement("character", { mediaAnimation })}
                      />
                    ) : (
                      <image href={a.dataUrl} width={240} height={400} />
                    )
                  ) : null;
                })()}
              </svg>
            ) : (
              <RigPreview character={char} size={70} />
            )}
            <span>
              {char.name}
              <small>
                {char.representation?.type ?? "rigged"} · {char.poses.length}{" "}
                poses
              </small>
            </span>
          </button>
        ))}
        <h3>Create character</h3>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
          />
        </Field>
        <Select
          label="Representation"
          value={representation}
          options={["rigged", "image", "svg", "sprite", "lottie", "rive"]}
          onChange={setRepresentation}
        />
        {representation !== "rigged" && (
          <Select
            label="Source asset"
            value={assetId}
            options={[
              { id: "", name: "Choose asset" },
              ...(p.assets ?? [])
                .filter((a) => a.type === representation)
                .map((a) => ({ id: a.id, name: a.name })),
            ]}
            onChange={setAssetId}
          />
        )}
        <button onClick={create}>Create character</button>
        <p className="ms-muted">
          Rigged characters start from the selected reusable rig. Import media
          in Assets first.
        </p>
        <input
          aria-label="Import character"
          type="file"
          accept=".json"
          onChange={async (e) => {
            try {
              const file = e.target.files?.[0];
              if (!file) return;
              const data = JSON.parse(await file.text());
              const char = validateCharacter(data.character ?? data);
              const incomingAssets = data.assets ?? [];
              if (
                !Array.isArray(incomingAssets) ||
                incomingAssets.some(
                  (a: any) =>
                    typeof a.id !== "string" ||
                    typeof a.dataUrl !== "string" ||
                    !a.dataUrl.startsWith("data:"),
                )
              )
                throw new Error("Invalid character assets");
              if (
                char.representation?.assetId &&
                !p.assets?.some((a) => a.id === char.representation?.assetId) &&
                !incomingAssets.some(
                  (a: any) => a.id === char.representation?.assetId,
                )
              )
                throw new Error(
                  "Import the source project for characters with external assets",
                );
              char.id = uid();
              s.editProject((p) => {
                p.characters!.push(char);
                for (const a of incomingAssets)
                  if (!p.assets!.some((x) => x.id === a.id)) p.assets!.push(a);
              });
              setId(char.id);
            } catch (e: any) {
              setMessage(e.message);
            }
          }}
        />
      </aside>
      {c && (
        <>
          <main className="ms-character-main">
            <div className="ms-row">
              <h2>{c.name}</h2>
              <button
                onClick={() => {
                  s.addRiggedCharacterElement(c.id);
                  s.setWorkspace("scene");
                }}
              >
                Add to scene
              </button>
              <button
                onClick={() =>
                  download(
                    c.name + ".character.json",
                    JSON.stringify(
                      {
                        character: c,
                        assets:
                          p.assets?.filter(
                            (a) => a.id === c.representation?.assetId,
                          ) ?? [],
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                Export character
              </button>
            </div>
            <nav className="ms-tabs">
              {["Appearance", "Rig", "Poses", "Animations", "Expressions"].map(
                (t) => (
                  <button
                    disabled={!!c.representation?.assetId && t !== "Appearance"}
                    key={t}
                    className={t === tab ? "active" : ""}
                    onClick={() => {
                      setTab(t);
                      setPlaying(false);
                    }}
                  >
                    {t}
                  </button>
                ),
              )}
            </nav>
            <div className="ms-character-preview" style={{ background }}>
              <svg ref={svg} viewBox="0 0 320 480" onPointerDown={drag}>
                <g transform="translate(40,40)">
                  {c.representation?.assetId ? (
                    (() => {
                      const asset = p.assets?.find(
                        (a) => a.id === c.representation?.assetId,
                      );
                      return asset ? (
                        ["rive", "lottie"].includes(asset.type) ? (
                          <ExternalAsset
                            asset={asset}
                            time={time}
                            width={240}
                            height={400}
                            element={createElement("character", {
                              mediaAnimation,
                            })}
                          />
                        ) : (
                          <SpriteAsset
                            asset={asset}
                            time={time}
                            width={240}
                            height={400}
                            animation={mediaAnimation}
                            loop={loop}
                          />
                        )
                      ) : null;
                    })()
                  ) : (
                    <RigRenderer
                      character={c}
                      poseTransforms={tab === "Rig" ? {} : transforms}
                      width={240}
                      height={400}
                      showBones={["Rig", "Poses", "Expressions"].includes(tab)}
                      selectedBoneId={boneId}
                      onBoneClick={setBoneId}
                    />
                  )}
                </g>
              </svg>
            </div>
            {c.representation?.assetId && (
              <Select
                label="Imported animation preview"
                value={mediaAnimation}
                options={(() => {
                  const a = p.assets?.find(
                    (a) => a.id === c.representation?.assetId,
                  );
                  return [
                    { id: "", name: "Default animation" },
                    ...(a?.rive?.animations ??
                      a?.sprite?.animations.map((x) => x.name) ??
                      []),
                  ];
                })()}
                onChange={(v) => {
                  setMediaAnimation(v);
                  setTime(0);
                }}
              />
            )}
            <div className="ms-row">
              <button onClick={() => setPlaying(!playing)}>
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setTime(0);
                }}
              >
                Reset
              </button>
              <input
                aria-label="Character playhead"
                type="range"
                min={0}
                max={clip?.duration ?? 3}
                step={0.01}
                value={time}
                onChange={(e) => {
                  setTime(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <Select
                label="Preview speed"
                value={String(speed)}
                options={["0.25", "0.5", "1", "2"]}
                onChange={(v) => setSpeed(Number(v))}
              />
              <label>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                />
                Loop
              </label>
              <Field label="Background">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                />
              </Field>
            </div>
            <p role="status">{message}</p>
            {tab === "Animations" && (
              <div className="ms-animation-detail">
                <h3>Bone tracks</h3>
                {c.rig.bones.map((b) => (
                  <div className="ms-track" key={b.id}>
                    <span>{b.name}</span>
                    <div className="ms-track-lane">
                      {clip?.keyframes.map((k) => (
                        <button
                          className="ms-key"
                          key={k.id}
                          style={{ left: `${(k.time / clip.duration) * 100}%` }}
                          onClick={() => {
                            setTime(k.time);
                            setBoneId(b.id);
                          }}
                        >
                          ◆
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
          <aside className="ms-panel">
            <Field label="Character name">
              <input
                value={c.name}
                onChange={(e) =>
                  edit((c) => {
                    c.name = e.target.value;
                  })
                }
              />
            </Field>
            {tab === "Appearance" && !c.representation?.assetId && (
              <>
                <Select
                  label="Hair style"
                  value={c.appearance.hairStyle}
                  options={["short", "long", "spiky", "curly"]}
                  onChange={(v) =>
                    edit((c) => {
                      c.appearance.hairStyle = v as any;
                    })
                  }
                />
                {Object.entries(c.appearance)
                  .filter(([k]) => k.endsWith("Color"))
                  .map(([key, value]) => (
                    <Field label={key} key={key}>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          edit((c) => {
                            (c.appearance as any)[key] = e.target.value;
                          })
                        }
                      />
                    </Field>
                  ))}
                <Field label="Description">
                  <textarea
                    value={c.description ?? ""}
                    onChange={(e) =>
                      edit((c) => {
                        c.description = e.target.value;
                      })
                    }
                  />
                </Field>
                <button
                  onClick={() =>
                    edit((c) => {
                      c.variants = [
                        ...(c.variants ?? []),
                        {
                          id: uid(),
                          name:
                            name ||
                            "Variant " + ((c.variants?.length ?? 0) + 1),
                          appearance: { ...c.appearance },
                        },
                      ];
                    })
                  }
                >
                  Save appearance variant
                </button>
                {c.variants?.map((v) => (
                  <button
                    key={v.id}
                    onClick={() =>
                      edit((c) => {
                        c.appearance = { ...v.appearance };
                      })
                    }
                  >
                    {v.name}
                  </button>
                ))}
              </>
            )}
            {c.representation?.assetId && (
              <p className="ms-muted">
                This character uses imported artwork. Choose its animation or
                state machine and key its inputs in the scene inspector. To
                change its internal rig, edit the source artwork and reimport.
              </p>
            )}
            {tab === "Rig" && (
              <>
                <Select
                  label="Bone"
                  value={boneId}
                  options={c.rig.bones.map((b) => ({ id: b.id, name: b.name }))}
                  onChange={setBoneId}
                />
                <button
                  onClick={() => {
                    const id = uid();
                    edit((c) =>
                      c.rig.bones.push({
                        id,
                        name: "Bone",
                        parentId: boneId || null,
                        x: 0,
                        y: 30,
                        rotation: 0,
                        length: 50,
                        zIndex: c.rig.bones.length,
                        visuals: [
                          {
                            type: "rect",
                            width: 12,
                            height: 50,
                            fill: "#38bdf8",
                          },
                        ],
                      }),
                    );
                    setBoneId(id);
                  }}
                >
                  + Bone
                </button>
                <p className="ms-muted">
                  Drag a bone to move it. Alt-drag rotates it.
                </p>
                {bone && (
                  <>
                    <Select
                      label="Attach image / SVG part"
                      value=""
                      options={[
                        { id: "", name: "Choose imported part" },
                        ...(p.assets ?? [])
                          .filter((a) => ["image", "svg"].includes(a.type))
                          .map((a) => ({ id: a.id, name: a.name })),
                      ]}
                      onChange={(assetId) => {
                        const asset = p.assets?.find((a) => a.id === assetId);
                        if (!asset) return;
                        edit((c) => {
                          c.rig.bones.find((b) => b.id === boneId)!.visuals = [
                            {
                              type: "image",
                              src: asset.dataUrl,
                              fill: "none",
                              width: Math.max(20, bone.length),
                              height:
                                (Math.max(20, bone.length) * asset.height) /
                                Math.max(1, asset.width),
                            },
                          ];
                        });
                      }}
                    />
                    {bone.visuals[0]?.type === "image" &&
                      ["width", "height", "offsetX", "offsetY"].map((key) => (
                        <Num
                          key={key}
                          label={"Part " + key}
                          value={(bone.visuals[0] as any)[key] ?? 0}
                          onChange={(v) =>
                            edit((c) => {
                              (
                                c.rig.bones.find((b) => b.id === boneId)!
                                  .visuals[0] as any
                              )[key] = v;
                            })
                          }
                        />
                      ))}
                    <Field label="Bone name">
                      <input
                        value={bone.name}
                        onChange={(e) =>
                          edit((c) => {
                            c.rig.bones.find((b) => b.id === boneId)!.name =
                              e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Select
                      label="Parent"
                      value={bone.parentId ?? ""}
                      options={[
                        { id: "", name: "Root" },
                        ...c.rig.bones
                          .filter((b) => b.id !== boneId)
                          .map((b) => ({ id: b.id, name: b.name })),
                      ]}
                      onChange={(v) => {
                        try {
                          const next = structuredClone(c);
                          next.rig.bones.find(
                            (b) => b.id === boneId,
                          )!.parentId = v || null;
                          validateCharacter(next);
                          edit((c) => Object.assign(c, next));
                          setMessage("");
                        } catch (e: any) {
                          setMessage(e.message);
                        }
                      }}
                    />
                    {[
                      "x",
                      "y",
                      "rotation",
                      "length",
                      "zIndex",
                      "pivotX",
                      "pivotY",
                      "minRotation",
                      "maxRotation",
                    ].map((key) => (
                      <Num
                        key={key}
                        label={key}
                        value={
                          (bone as any)[key] ??
                          (key === "minRotation"
                            ? -180
                            : key === "maxRotation"
                              ? 180
                              : 0)
                        }
                        onChange={(v) =>
                          edit((c) => {
                            (c.rig.bones.find((b) => b.id === boneId)! as any)[
                              key
                            ] = v;
                          })
                        }
                      />
                    ))}
                    <button
                      onClick={() => {
                        if (c.rig.bones.some((b) => b.parentId === boneId)) {
                          setMessage(
                            "Reparent child bones before deleting this bone",
                          );
                          return;
                        }
                        edit((c) => {
                          c.rig.bones = c.rig.bones.filter(
                            (b) => b.id !== boneId,
                          );
                        });
                      }}
                    >
                      Delete bone
                    </button>
                  </>
                )}
              </>
            )}
            {["Poses", "Expressions"].includes(tab) && (
              <>
                <Select
                  label={tab === "Poses" ? "Pose" : "Expression"}
                  value={tab === "Poses" ? poseId : expressionId}
                  options={
                    tab === "Poses"
                      ? c.poses.map((p) => ({ id: p.id, name: p.name }))
                      : (c.expressions ?? [])
                  }
                  onChange={tab === "Poses" ? setPoseId : setExpressionId}
                />
                <Field label="New name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <button
                  onClick={() => {
                    const id = uid();
                    edit((c) => {
                      const entry = {
                        id,
                        name: name || "Untitled",
                        boneTransforms: structuredClone(transforms),
                      };
                      if (tab === "Poses")
                        c.poses.push({ ...entry, category: "custom" });
                      else c.expressions = [...(c.expressions ?? []), entry];
                    });
                    tab === "Poses" ? setPoseId(id) : setExpressionId(id);
                    setName("");
                  }}
                >
                  Create / duplicate {tab === "Poses" ? "pose" : "expression"}
                </button>
                <button
                  onClick={() =>
                    edit((c) => {
                      if (tab === "Poses")
                        c.poses = c.poses.filter((p) => p.id !== poseId);
                      else
                        c.expressions = c.expressions?.filter(
                          (p) => p.id !== expressionId,
                        );
                    })
                  }
                >
                  Delete selected {tab === "Poses" ? "pose" : "expression"}
                </button>
                <Select
                  label="Selected bone"
                  value={boneId}
                  options={c.rig.bones.map((b) => ({ id: b.id, name: b.name }))}
                  onChange={setBoneId}
                />
                {["x", "y", "rotation", "scaleX", "scaleY", "opacity"].map(
                  (key) => (
                    <Num
                      key={key}
                      label={key}
                      value={
                        (transforms[boneId] as any)?.[key] ??
                        (key.startsWith("scale") || key === "opacity" ? 1 : 0)
                      }
                      onChange={(v) => changeTransform(key, v)}
                    />
                  ),
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={ik}
                    onChange={(e) => setIk(e.target.checked)}
                  />
                  Two-bone IK: select hand or foot, then drag
                </label>
                <button
                  onClick={() =>
                    s
                      .saveProject()
                      .then(() =>
                        setMessage("Saved character and poses to this project"),
                      )
                      .catch((e) => setMessage(e.message))
                  }
                >
                  Save pose / expression
                </button>
              </>
            )}
            {tab === "Animations" && (
              <>
                <Select
                  label="Animation"
                  value={clipId}
                  options={[
                    { id: "", name: "Choose animation" },
                    ...(c.animations ?? []),
                  ]}
                  onChange={setClipId}
                />
                <button
                  onClick={() => {
                    const animation = createClip("", name || "Animation", 3, [
                      createKeyframe(0, "idle"),
                      createKeyframe(1, "wave"),
                      createKeyframe(2.5, "idle"),
                    ]);
                    animation.characterId = c.id;
                    edit((c) => {
                      c.animations = [...(c.animations ?? []), animation];
                    });
                    setClipId(animation.id);
                  }}
                >
                  Create animation
                </button>
                {clip && (
                  <>
                    <Field label="Animation name">
                      <input
                        value={clip.name}
                        onChange={(e) =>
                          edit((c) => {
                            c.animations!.find((a) => a.id === clipId)!.name =
                              e.target.value;
                          })
                        }
                      />
                    </Field>
                    <button
                      onClick={() => {
                        edit((c) => {
                          c.animations = c.animations!.filter(
                            (a) => a.id !== clipId,
                          );
                        });
                        setClipId("");
                      }}
                    >
                      Delete animation
                    </button>
                    <Num
                      label="Duration"
                      value={clip.duration}
                      min={0.1}
                      onChange={(v) =>
                        edit((c) => {
                          c.animations!.find((a) => a.id === clipId)!.duration =
                            v;
                        })
                      }
                    />
                    {clip.keyframes.map((k) => (
                      <div className="ms-key-card" key={k.id}>
                        <Num
                          label="Key time"
                          value={k.time}
                          min={0}
                          onChange={(v) =>
                            edit((c) => {
                              c
                                .animations!.find((a) => a.id === clipId)!
                                .keyframes.find((x) => x.id === k.id)!.time =
                                Math.min(clip.duration, v);
                              c.animations!.find(
                                (a) => a.id === clipId,
                              )!.keyframes.sort((a, b) => a.time - b.time);
                            })
                          }
                        />
                        <Select
                          label="Key pose"
                          value={k.poseId}
                          options={c.poses}
                          onChange={(v) =>
                            edit((c) => {
                              c
                                .animations!.find((a) => a.id === clipId)!
                                .keyframes.find((x) => x.id === k.id)!.poseId =
                                v;
                            })
                          }
                        />
                        <Select
                          label="Key easing"
                          value={k.easing}
                          options={[
                            "linear",
                            "easeIn",
                            "easeOut",
                            "easeInOut",
                            "spring",
                          ]}
                          onChange={(v) =>
                            edit((c) => {
                              c
                                .animations!.find((a) => a.id === clipId)!
                                .keyframes.find((x) => x.id === k.id)!.easing =
                                v as any;
                            })
                          }
                        />
                        {(
                          [
                            "rotation",
                            "x",
                            "y",
                            "scaleX",
                            "scaleY",
                            "opacity",
                          ] as const
                        ).map((property) => (
                          <Num
                            key={property}
                            label={boneId + " " + property}
                            value={
                              k.transforms?.[boneId]?.[property] ??
                              (property.startsWith("scale") ||
                              property === "opacity"
                                ? 1
                                : 0)
                            }
                            onChange={(v) =>
                              edit((c) => {
                                const key = c
                                  .animations!.find((a) => a.id === clipId)!
                                  .keyframes.find((x) => x.id === k.id)!;
                                const base =
                                  key.transforms ??
                                  c.poses.find((p) => p.id === key.poseId)
                                    ?.boneTransforms ??
                                  {};
                                key.transforms = {
                                  ...base,
                                  [boneId]: { ...base[boneId], [property]: v },
                                };
                              })
                            }
                          />
                        ))}
                        <button
                          onClick={() =>
                            edit((c) => {
                              const a = c.animations!.find(
                                (a) => a.id === clipId,
                              )!;
                              a.keyframes = a.keyframes.filter(
                                (x) => x.id !== k.id,
                              );
                            })
                          }
                        >
                          Delete key
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        edit((c) => {
                          const a = c.animations!.find((a) => a.id === clipId)!;
                          a.keyframes.push(createKeyframe(time, poseId));
                          a.keyframes.sort((a, b) => a.time - b.time);
                        })
                      }
                    >
                      Insert keyframe at playhead
                    </button>
                  </>
                )}
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
