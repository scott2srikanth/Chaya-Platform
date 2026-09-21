"use client";
import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStudioStore } from "../../lib/studio/store";
import { sculptedCharacter } from "../../lib/studio/character-models";
import {
  appearanceDefaults,
  type CharacterAppearance,
} from "../../lib/studio/appearance";
import { actorSettings } from "../../lib/studio/stage3d";
import { createSculptedActor } from "./render/SculptedActor";
import type { HumanActor } from "./render/HumanActor";
import PoseControls3D from "./PoseControls3D";
import { previewPose, rebasePosePosture } from "../../lib/studio/pose3d";
import type { Actor3D } from "../../lib/studio/types";
import { Field } from "./StudioControls";

export default function CharacterDesigner3D() {
  const s = useStudioStore(),
    p = s.project!;
  const cast = p.scenes.flatMap((scene) =>
    scene.elements
      .filter((e) => e.type === "character" && sculptedCharacter(e))
      .map((element) => ({ scene, element })),
  );
  const [selected, setSelected] = useState(
      s.selectedElementId ?? cast[0]?.element.id,
    ),
    [section, setSection] = useState("Face"),
    [allScenes, setAllScenes] = useState(true),
    [status, setStatus] = useState("");
  const entry = cast.find((e) => e.element.id === selected) ?? cast[0],
    el = entry?.element,
    character = el ? sculptedCharacter(el) : undefined;
  const host = useRef<HTMLDivElement>(null),
    actor = useRef<HumanActor>(),
    view = useRef<{ camera: T.PerspectiveCamera; controls: OrbitControls }>();
  const [playing, setPlaying] = useState(false),
    [playhead, setPlayhead] = useState(0),
    [skeleton, setSkeleton] = useState(false);
  const clock = useRef(0),
    lastPaint = useRef(0);
  const playback = useRef({ playing, skeleton, el });
  playback.current = { playing, skeleton, el };
  const rigMode = section === "Pose" || section === "Animation";
  const changeRig = (patch: Partial<Actor3D>) => {
    if (!el) return;
    s.editProject((project) => {
      const item = project.scenes
        .flatMap((sc) => sc.elements)
        .find((e) => e.id === el.id);
      if (item) item.actor3d = { ...actorSettings(item), ...patch };
    });
  };
  const posture = (seated: boolean) => {
    if (!el) return;
    s.editProject((project) => {
      const item = project.scenes
        .flatMap((sc) => sc.elements)
        .find((e) => e.id === el.id);
      if (item) {
        const previous = !!item.seated;
        if (item.actor3d) {
          item.actor3d.jointPose = rebasePosePosture(
            item.actor3d.jointPose,
            previous,
            seated,
          );
          for (const pose of Object.values(item.actor3d.animationPoses ?? {}))
            pose.joints = rebasePosePosture(pose.joints, previous, seated);
        }
        item.seated = seated;
      }
    });
  };
  const settings = el?.actor3d?.appearance;
  const latestSettings = useRef(settings);
  latestSettings.current = settings;
  const defaults = appearanceDefaults(character ?? "alex"),
    a = { ...defaults, ...settings };
  const change = (patch: Partial<CharacterAppearance>) => {
    if (!el) return;
    s.editProject((project) => {
      for (const scene of project.scenes)
        for (const item of scene.elements) {
          if (
            item.id === el.id ||
            (allScenes &&
              item.characterId === el.characterId &&
              sculptedCharacter(item) === character)
          )
            item.actor3d = {
              ...actorSettings(item),
              appearance: { ...item.actor3d?.appearance, ...patch },
            };
        }
    });
  };
  const frame = (close: boolean) => {
    if (!view.current) return;
    view.current.camera.position.set(0, close ? 1.7 : 1.1, close ? 0.8 : 3.5);
    view.current.controls.target.set(0, close ? 1.69 : 0.96, 0);
    view.current.controls.update();
  };
  useEffect(() => {
    if (!host.current || !el || !character) return;
    let disposed = false,
      raf = 0,
      loaded: HumanActor | undefined,
      helper: T.SkeletonHelper | undefined;
    clock.current = 0;
    setPlayhead(0);
    setPlaying(false);
    const container = host.current,
      scene = new T.Scene();
    scene.background = new T.Color("#e9edf1");
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    const camera = new T.PerspectiveCamera(36, 1, 0.01, 50);
    camera.position.set(0, 1.1, 3.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.96, 0);
    controls.minDistance = 0.4;
    controls.maxDistance = 6;
    controls.enableDamping = true;
    view.current = { camera, controls };
    scene.add(new T.HemisphereLight("#ffffff", "#718092", 2.4));
    const light = new T.DirectionalLight("#fff4e8", 3);
    light.position.set(2, 4, 4);
    scene.add(light);
    const fill = new T.DirectionalLight("#d8e9ff", 1);
    fill.position.set(-3, 2, 1);
    scene.add(fill);
    const floor = new T.Mesh(
      new T.CircleGeometry(1.2, 64),
      new T.MeshStandardMaterial({ color: "#d8dee6", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    scene.add(floor);
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });
    observer.observe(container);
    const disposeModel = (root: T.Object3D) =>
      root.traverse((o) => {
        const m = o as T.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        for (const mat of Array.isArray(m.material)
          ? m.material
          : [m.material]) {
          Object.values(mat).forEach((v) => {
            if (v instanceof T.Texture) v.dispose();
          });
          mat.dispose();
        }
      });
    setStatus("Loading 3D character…");
    createSculptedActor(el, character)
      .then((value) => {
        if (disposed) {
          disposeModel(value.root);
          return;
        }
        loaded = value;
        actor.current = value;
        value.setAppearance?.(latestSettings.current);
        helper = new T.SkeletonHelper(value.root);
        const material = helper.material as T.LineBasicMaterial;
        material.depthTest = false;
        material.transparent = true;
        material.opacity = 0.75;
        helper.renderOrder = 10;
        scene.add(helper);
        value.updateRig?.(0, 0, 0);
        scene.add(value.root);
        setStatus("");
      })
      .catch((error) => {
        if (!disposed) setStatus(error.message);
      });
    let previous = performance.now();
    const render = () => {
      const now = performance.now(),
        state = playback.current;
      const duration = entry?.scene.duration ?? 10;
      if (state.playing) {
        clock.current = Math.min(
          duration,
          clock.current + (now - previous) / 1000,
        );
        if (clock.current >= duration) setPlaying(false);
      }
      previous = now;
      if (loaded && state.el)
        previewPose(
          loaded,
          actorSettings(state.el),
          !!state.el.seated,
          clock.current,
        );
      if (helper) helper.visible = state.skeleton;
      if (now - lastPaint.current > 100) {
        lastPaint.current = now;
        setPlayhead(clock.current);
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      helper?.geometry.dispose();
      if (helper) (helper.material as T.Material).dispose();
      disposeModel(scene);
      renderer.dispose();
      renderer.domElement.remove();
      if (actor.current === loaded) actor.current = undefined;
      view.current = undefined;
    };
    // Load a model only when switching character, not on every slider movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el?.id, character]);
  useEffect(() => {
    actor.current?.setAppearance?.(settings);
    actor.current?.updateRig?.(0, 0, 0);
  }, [settings]);
  if (!el)
    return (
      <div style={{ padding: 32 }}>
        Add Alex or Sarah to a 3D scene to customize their appearance.
      </div>
    );
  const slider = (
    label: string,
    key: "headSize" | "faceWidth" | "bodyWidth" | "height",
    min: number,
    max: number,
  ) => (
    <Field label={label}>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step="0.01"
        value={a[key]}
        onPointerDown={() => s.beginEdit()}
        onPointerUp={() => s.endEdit()}
        onChange={(e) => change({ [key]: +e.target.value })}
      />
      <small>{Math.round(a[key] * 100)}%</small>
    </Field>
  );
  const color = (
    label: string,
    key:
      | "skinTint"
      | "hairColor"
      | "topColor"
      | "trousersColor"
      | "shoesColor"
      | "glassesColor",
  ) => (
    <Field label={label}>
      <input
        aria-label={label}
        type="color"
        value={a[key]}
        onChange={(e) => change({ [key]: e.target.value })}
      />
    </Field>
  );
  return (
    <div className="ms-character-3d">
      <aside>
        <h2>3D characters</h2>
        <p>Appearance, poses and performance.</p>
        {cast.map(({ scene, element }) => (
          <button
            key={element.id}
            aria-pressed={element.id === el.id}
            onClick={() => setSelected(element.id)}
          >
            {element.name}
            <small>{scene.name}</small>
          </button>
        ))}
      </aside>
      <section className="ms-character-viewport">
        <div className="ms-row">
          <strong>{el.name}</strong>
          <button onClick={() => frame(true)}>Face close-up</button>
          <button onClick={() => frame(false)}>Full body</button>
        </div>
        <div ref={host} className="ms-character-canvas" />
        {status && <p role="status">{status}</p>}
        <p>Drag to rotate · Scroll to zoom · Right-drag to pan</p>
        {rigMode && (
          <div className="ms-pose-transport">
            <button
              onClick={() => {
                if (clock.current >= (entry?.scene.duration ?? 10))
                  clock.current = 0;
                setPlaying(!playing);
              }}
            >
              {playing ? "Pause preview" : "Play preview"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                clock.current = 0;
                setPlayhead(0);
              }}
            >
              Restart
            </button>
            <input
              aria-label="Pose preview time"
              type="range"
              min="0"
              max={entry?.scene.duration ?? 10}
              step="0.01"
              value={playhead}
              onChange={(e) => {
                clock.current = +e.target.value;
                setPlayhead(clock.current);
              }}
            />
            <span>{playhead.toFixed(1)}s</span>
            <label>
              <input
                type="checkbox"
                checked={skeleton}
                onChange={(e) => setSkeleton(e.target.checked)}
              />{" "}
              Show skeleton
            </label>
          </div>
        )}
      </section>
      <aside>
        <div className="ms-row">
          {["Face", "Body", "Clothing", "Glasses", "Pose", "Animation"].map(
            (name) => (
              <button
                key={name}
                aria-pressed={section === name}
                onClick={() => {
                  setSection(name);
                  frame(name === "Face" || name === "Glasses");
                }}
              >
                {name}
              </button>
            ),
          )}
        </div>
        {section === "Face" && (
          <>
            {slider("Head size", "headSize", 0.9, 1.12)}
            {slider("Face width", "faceWidth", 0.9, 1.12)}
            {color("Skin tint", "skinTint")}
            {color("Hair colour", "hairColor")}
            <p>
              Adjust proportions and colour. Individual facial features are not
              sculptable yet.
            </p>
          </>
        )}
        {section === "Body" && (
          <>
            {slider("Height", "height", 0.94, 1.06)}
            {slider("Body width", "bodyWidth", 0.88, 1.12)}
          </>
        )}
        {section === "Clothing" && (
          <>
            {color("Top colour", "topColor")}
            {color("Trousers colour", "trousersColor")}
            {color("Shoes colour", "shoesColor")}
            <p>
              Customize this outfit’s colours. Outfit mesh changes are not
              available yet.
            </p>
          </>
        )}
        {section === "Glasses" && (
          <>
            <Field label="Glasses style">
              <select
                value={a.glasses}
                onChange={(e) =>
                  change({
                    glasses: e.target.value as CharacterAppearance["glasses"],
                  })
                }
              >
                <option value="none">None</option>
                <option value="round">Round frames</option>
                <option value="rectangular">Rectangular frames</option>
              </select>
            </Field>
            {color("Frame colour", "glassesColor")}
          </>
        )}
        {rigMode && (
          <PoseControls3D
            element={el}
            actor={() => actor.current}
            section={section}
            change={changeRig}
            posture={posture}
          />
        )}
        {!rigMode && (
          <>
            <label>
              <input
                type="checkbox"
                checked={allScenes}
                onChange={(e) => setAllScenes(e.target.checked)}
              />{" "}
              Apply to this character in all scenes
            </label>
            <p>
              Changes appear in your scene immediately. Save the project to keep
              them.
            </p>
            <button onClick={() => change(defaults)}>Reset appearance</button>
          </>
        )}
        {rigMode && (
          <p>
            Pose and animation changes apply to this scene’s character. Save
            your project to keep them.
          </p>
        )}
      </aside>
    </div>
  );
}
