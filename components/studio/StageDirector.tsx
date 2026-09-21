"use client";
import { useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { actorSettings } from "../../lib/studio/stage3d";
import { CHARACTER_ANIMATIONS } from "../../lib/studio/character-directing";
import { MALE_FACE_TEXTURE } from "../../lib/studio/male-face-texture";
import { sculptedCharacter } from "../../lib/studio/character-models";
import libraryClips from "../../lib/studio/animation-library.json";
import { Field, Num } from "./StudioControls";
export default function StageDirector() {
  const s = useStudioStore(),
    scene = s.activeScene()!,
    [error, setError] = useState("");
  return (
    <div className="ms-director">
      <h3>Set & cast</h3>
      <label>
        <input
          type="checkbox"
          checked={scene.stage3d ?? false}
          onChange={(e) =>
            s.updateScene(scene.id, {
              stage3d: e.target.checked,
              cameraMode: e.target.checked ? "dialogue" : scene.cameraMode,
            })
          }
        />
        3D room
      </label>
      {scene.stage3d && (
        <>
          <p>
            Position your cast in metres. Use Camera to create coverage and
            Script to direct the conversation.
          </p>
          <Field label="Room set"><select value={scene.room3d ? "generated" : scene.stageSet ?? "living"} onChange={e => s.updateScene(scene.id, {stageSet: e.target.value as "living" | "interview", room3d: undefined})}>
            {scene.room3d && <option value="generated" disabled>Generated · {scene.room3d.name}</option>}<option value="living">Living room</option><option value="interview">Interview studio</option>
          </select></Field>
          <button onClick={() => s.updateScene(scene.id, {stageSet: "interview", room3d: undefined, cameraMode: "dialogue", elements: scene.elements.map((el, _, all) => {
            if (el.type !== "character") return el;
            const i = all.filter(e => e.type === "character").findIndex(e => e.id === el.id);
            return {...el, seated: true, actor3d: {...actorSettings(el), x: i % 2 ? 1.18 : -1.18, y: 0, z: 0.1 + Math.floor(i / 2) * 1.5, rotation: i % 2 ? -Math.PI / 2 : Math.PI / 2, scale: 1, manualPose: false, motion: undefined, travel: undefined}};
          }), script: scene.script.map(line => ({...line, cameraId: undefined, gesture: "talking"}))})}>Arrange seated interview</button>
          {scene.elements
            .filter((e) => e.type === "character")
            .map((el) => {
              const actor = actorSettings(el);
              const model = sculptedCharacter(el);
              const starter = /^sarah(?:-|$)/i.test(el.characterId ?? "") ? "sarah" : "alex";
              const characterName = starter === "sarah" ? "Sarah" : "Alex";
              const update = (v: Partial<typeof actor>) =>
                s.updateElement(el.id, { actor3d: { ...actor, ...v } });
              return (
                <details className="ms-key-card" key={el.id}>
                  <summary>{el.name} · 3D actor</summary>
                  <Field label="Character name">
                    <input
                      value={el.name}
                      onChange={(e) =>
                        s.updateElement(el.id, { name: e.target.value })
                      }
                    />
                  </Field>
                  {/^(alex|sarah)(?:-|$)/i.test(el.characterId ?? "") && <Field label={`${characterName} appearance`}><select value={model ? `${model}-v1` : actor.modelUrl ? "custom" : "procedural"} onChange={e => update({characterModel: e.target.value as "alex-v1" | "sarah-v1" | "procedural", modelUrl: undefined, modelName: undefined, faceTexture: ""})}>
                    <option value={`${starter}-v1`}>{characterName} · sculpted 3D model</option><option value="procedural">Simple starter</option>{actor.modelUrl && <option value="custom">Imported model</option>}
                  </select></Field>}
                  {model && <p>Quaternius character with matching skin UVs and sculpted hair. Pose, movement and seated controls remain available.</p>}
                  <label><input type="checkbox" checked={el.seated ?? false} onChange={e => s.updateElement(el.id, {seated: e.target.checked})} /> Seated posture</label>
                  <Num
                    label="Position X"
                    value={actor.x}
                    onChange={(x) => update({ x })}
                  />
                  <Num
                    label="Position Y"
                    value={actor.y ?? 0}
                    onChange={(y) => update({ y })}
                  />
                  <Num
                    label="Character scale"
                    min={0.15}
                    max={4}
                    value={actor.scale ?? 1}
                    onChange={(scale) => update({ scale })}
                  />
                  <Num
                    label="Position Z"
                    value={actor.z}
                    onChange={(z) => update({ z })}
                  />
                  <Num
                    label="Facing (radians)"
                    value={actor.rotation}
                    onChange={(rotation) => update({ rotation })}
                  />
                  {!model && (["shirt", "skin", "hair"] as const).map((key) => (
                    <Field key={key} label={key}>
                      <input
                        type="color"
                        value={actor[key]}
                        onChange={(e) => update({ [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                  <Field label="Background / character action">
                    <select value={actor.modelUrl ? actor.animation ?? "" : actor.motion ?? ""}
                      onChange={(e) => update(actor.modelUrl ? { animation: e.target.value, manualPose: false } : { motion: e.target.value || undefined, manualPose: false })}>
                      <option value="">{actor.modelUrl ? "First embedded clip" : "Follow dialogue"}</option>
                      {(actor.modelName === "Quaternius Human Library" ? libraryClips.map(id => ({id, name: id.replaceAll("_", " ")})) : actor.modelUrl ? [] : CHARACTER_ANIMATIONS).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                  <Num label="Action starts (s)" min={0} value={actor.motionStart ?? 0} onChange={motionStart => update({motionStart})} />
                  <Num label="Action ends (s)" min={0} value={actor.motionEnd ?? scene.duration} onChange={motionEnd => update({motionEnd})} />
                  <Num label="Action speed" min={0.1} max={3} value={actor.motionSpeed ?? 1} onChange={motionSpeed => update({motionSpeed})} />
                  <label><input type="checkbox" checked={actor.motionLoop !== false} onChange={e => update({motionLoop: e.target.checked})} /> Loop action</label>
                  <label><input type="checkbox" checked={!!actor.travel} onChange={e => update({travel: e.target.checked ? {x: actor.x + 2, z: actor.z, start: 0, duration: scene.duration} : undefined})} /> Move through scene</label>
                  {actor.travel && <>
                    <Num label="Destination X" value={actor.travel.x} onChange={x => update({travel: {...actor.travel!, x}})} />
                    <Num label="Destination Z" value={actor.travel.z} onChange={z => update({travel: {...actor.travel!, z}})} />
                    <Num label="Travel start (s)" min={0} value={actor.travel.start} onChange={start => update({travel: {...actor.travel!, start}})} />
                    <Num label="Travel duration (s)" min={0.1} value={actor.travel.duration} onChange={duration => update({travel: {...actor.travel!, duration}})} />
                  </>}
                  <button onClick={async () => {
                    try {
                      setError("Loading 46 animation clips…");
                      const response = await fetch("/studio/animations/quaternius/human-library.glb");
                      if (!response.ok) throw new Error("Could not load the bundled animation pack.");
                      const blob = await response.blob();
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
                      });
                      update({modelUrl: dataUrl, modelName: "Quaternius Human Library", animation: "Idle_Talking_Loop", manualPose: false, motion: undefined});
                      setError("");
                    } catch (e: any) { setError(e.message); }
                  }}>Use animation mannequin · 46 clips</button>
                  <p>Quaternius CC0 library: walking, running, sitting, talking, dancing, interactions and more. Uses its own compatible mannequin.</p>
                  {!actor.modelUrl && !model && <label><input type="checkbox"
                    checked={!!actor.faceTexture}
                    onChange={e => update({faceTexture: e.target.checked ? MALE_FACE_TEXTURE : ""})} /> Use supplied face UV texture</label>}
                  <Field label="Character model (.glb)">
                    <input
                      type="file"
                      accept=".glb"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          if (file.size > 30 * 1024 * 1024)
                            throw new Error(
                              "Choose a self-contained GLB under 30 MB.",
                            );
                          const buffer = await file.arrayBuffer();
                          const view = new DataView(buffer);
                          if (
                            view.byteLength < 20 ||
                            view.getUint32(0, true) !== 0x46546c67
                          )
                            throw new Error("This is not a GLB file.");
                          const reader = new FileReader();
                          reader.onload = () =>
                            update({
                              modelUrl: String(reader.result),
                              modelName: file.name,
                            });
                          reader.readAsDataURL(file);
                          setError("");
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    />
                  </Field>
                  {actor.modelUrl && (
                    <>
                      <p>{actor.modelName}</p>
                      <Field label="Animation clip name (empty uses first)">
                        <input
                          value={actor.animation ?? ""}
                          onChange={(e) =>
                            update({ animation: e.target.value })
                          }
                        />
                      </Field>
                      <button
                        onClick={() =>
                          update({ modelUrl: undefined, modelName: undefined })
                        }
                      >
                        Use starter character
                      </button>
                    </>
                  )}
                  <p>
                    GLB models are fitted to human height. Embedded animation
                    plays; mouth motion uses a mouthOpen or jawOpen morph when
                    available.
                  </p>
                </details>
              );
            })}
          <p role="status">{error}</p>
        </>
      )}
    </div>
  );
}
