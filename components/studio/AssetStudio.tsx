"use client";
import { useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { importAsset, validateSprite } from "../../lib/studio/assets";
import { createElement } from "../../lib/studio/types";
import { Field, Num, Select, uid } from "./StudioControls";
export default function AssetStudio() {
  const s = useStudioStore(),
    p = s.project!,
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  const asset = p.assets?.find((a) => a.id === selected);
  const edit = (key: string, value: any) =>
    s.editProject((p) => {
      const a = p.assets!.find((a) => a.id === selected)!;
      (a as any)[key] = value;
    });
  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files))
      try {
        setMessage("Importing " + file.name);
        const a = await importAsset(file);
        s.editProject((p) => {
          p.assets!.push(a);
        });
        setSelected(a.id);
        setMessage("Imported " + a.name);
      } catch (e: any) {
        setMessage(e.message);
      }
  };
  const add = () => {
    if (!asset) return;
    if (asset.type === "audio") {
      s.editProject((p) => {
        p.audio!.push({
          id: uid(),
          name: asset.name,
          assetId: asset.id,
          start: s.playbackTime,
          offset: 0,
          duration: asset.duration ?? 1,
          volume: 1,
          muted: false,
          kind: "voice",
          fadeIn: 0,
          fadeOut: 0,
        });
      });
    } else {
      s.editProject((p) => {
        const scene = p.scenes.find((x) => x.id === s.activeSceneId)!;
        scene.elements.push(
          createElement(asset.type === "svg" ? "svg" : "image", {
            name: asset.name,
            assetId: asset.id,
            width: Math.min(500, asset.width),
            height:
              (Math.min(500, asset.width) * asset.height) /
              Math.max(1, asset.width),
          }),
        );
      });
      s.setWorkspace("scene");
    }
  };
  return (
    <div
      className="ms-asset-workspace"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        upload(e.dataTransfer.files);
      }}
    >
      <aside className="ms-panel">
        <h2>Assets & audio</h2>
        <p>Drop images, SVG, sprite sheets, Lottie, Rive or audio here.</p>
        <input
          aria-label="Import assets"
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.svg,.json,.riv,.mp3,.wav,.ogg,.m4a,.aac"
          onChange={(e) => upload(e.target.files)}
        />
        <p role="status">{message}</p>
        {p.assets?.map((a) => (
          <button
            key={a.id}
            className={"ms-asset-card " + (selected === a.id ? "active" : "")}
            onClick={() => setSelected(a.id)}
          >
            <span>{a.name}</span>
            <small>{a.type}</small>
          </button>
        ))}
      </aside>
      <main className="ms-asset-main">
        {asset ? (
          <>
            <h2>{asset.name}</h2>
            {["image", "svg", "sprite"].includes(asset.type) ? (
              <img
                className="ms-asset-image"
                src={asset.dataUrl}
                alt={asset.name}
              />
            ) : asset.type === "audio" ? (
              <>
                <audio controls src={asset.dataUrl} />
                <svg viewBox="0 0 640 100">
                  {asset.waveform?.map((v, i) => (
                    <line
                      key={i}
                      x1={i * 4}
                      x2={i * 4}
                      y1={50 - v * 50}
                      y2={50 + v * 50}
                      stroke="#38bdf8"
                      strokeWidth={2}
                    />
                  ))}
                </svg>
              </>
            ) : (
              <p>
                {asset.type === "rive"
                  ? `Animations: ${asset.rive?.animations.join(", ")}. State machines: ${asset.rive?.stateMachines.map((s) => s.name).join(", ")}`
                  : `Lottie: ${asset.duration?.toFixed(2)} seconds`}
              </p>
            )}
            <button onClick={add}>
              {asset.type === "audio" ? "Add audio track" : "Add to scene"}
            </button>
            <Field label="Asset name">
              <input
                value={asset.name}
                onChange={(e) => edit("name", e.target.value)}
              />
            </Field>
            <button
              onClick={() => {
                if (
                  p.scenes.some((s) =>
                    s.elements.some((e) => e.assetId === asset.id),
                  ) ||
                  p.characters?.some(
                    (c) => c.representation?.assetId === asset.id,
                  ) ||
                  p.audio?.some((a) => a.assetId === asset.id)
                ) {
                  setMessage(
                    "Remove instances using this asset before deleting it.",
                  );
                  return;
                }
                s.editProject((p) => {
                  p.assets = p.assets!.filter((a) => a.id !== asset.id);
                });
              }}
            >
              Delete asset
            </button>
            {["image", "sprite"].includes(asset.type) && (
              <div className="ms-key-card">
                <h3>Sprite-sheet setup</h3>
                <button
                  onClick={() => {
                    edit("type", "sprite");
                    edit(
                      "sprite",
                      asset.sprite ?? {
                        columns: 1,
                        rows: 1,
                        fps: 12,
                        animations: [{ name: "Idle", from: 0, to: 0 }],
                      },
                    );
                  }}
                >
                  Use as sprite sheet
                </button>
                {asset.sprite && (
                  <>
                    {["columns", "rows", "fps"].map((key) => (
                      <Num
                        key={key}
                        label={key}
                        value={(asset.sprite as any)[key]}
                        min={1}
                        step={1}
                        onChange={(v) => {
                          try {
                            const next = { ...asset.sprite!, [key]: v };
                            validateSprite(next.columns, next.rows, next.fps);
                            edit("sprite", next);
                            setMessage("");
                          } catch (e: any) {
                            setMessage(e.message);
                          }
                        }}
                      />
                    ))}
                    {asset.sprite.animations.map((a, i) => (
                      <div className="ms-row" key={i}>
                        <Field label="Animation name">
                          <input
                            value={a.name}
                            onChange={(e) =>
                              edit("sprite", {
                                ...asset.sprite,
                                animations: asset.sprite!.animations.map(
                                  (a, j) =>
                                    i === j
                                      ? { ...a, name: e.target.value }
                                      : a,
                                ),
                              })
                            }
                          />
                        </Field>
                        {["from", "to"].map((key) => (
                          <Num
                            key={key}
                            label={key}
                            value={(a as any)[key]}
                            min={0}
                            step={1}
                            onChange={(v) =>
                              edit("sprite", {
                                ...asset.sprite,
                                animations: asset.sprite!.animations.map(
                                  (a, j) =>
                                    i === j
                                      ? {
                                          ...a,
                                          [key]: Math.min(
                                            v,
                                            asset.sprite!.columns *
                                              asset.sprite!.rows -
                                              1,
                                          ),
                                        }
                                      : a,
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        edit("sprite", {
                          ...asset.sprite,
                          animations: [
                            ...asset.sprite!.animations,
                            {
                              name: "Animation",
                              from: 0,
                              to:
                                asset.sprite!.columns * asset.sprite!.rows - 1,
                            },
                          ],
                        })
                      }
                    >
                      + Named animation
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <p>Select an imported asset to inspect it.</p>
        )}
        <h2>Audio tracks</h2>
        {p.audio?.map((track) => (
          <div className="ms-key-card" key={track.id}>
            <strong>{track.name}</strong>
            <Select
              label="Track kind"
              value={track.kind}
              options={["voice", "music", "sfx"]}
              onChange={(v) =>
                s.editProject((p) => {
                  p.audio!.find((a) => a.id === track.id)!.kind = v as any;
                })
              }
            />
            <div className="ms-fields">
              {[
                "start",
                "offset",
                "duration",
                "volume",
                "fadeIn",
                "fadeOut",
              ].map((key) => (
                <Num
                  key={key}
                  label={key}
                  value={(track as any)[key]}
                  min={0}
                  onChange={(v) =>
                    s.editProject((p) => {
                      (p.audio!.find((a) => a.id === track.id)! as any)[key] =
                        v;
                    })
                  }
                />
              ))}
            </div>
            <label>
              <input
                type="checkbox"
                checked={track.muted}
                onChange={(e) =>
                  s.editProject((p) => {
                    p.audio!.find((a) => a.id === track.id)!.muted =
                      e.target.checked;
                  })
                }
              />
              Muted
            </label>
            <button
              onClick={() =>
                s.editProject((p) => {
                  p.audio = p.audio!.filter((a) => a.id !== track.id);
                })
              }
            >
              Remove track
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
