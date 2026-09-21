"use client";
import { applyJointPose, animationPoseSettings } from "../../../lib/studio/pose3d";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  delayRender,
  continueRender,
  cancelRender,
  getRemotionEnvironment,
} from "remotion";
import type { Scene, SceneElement } from "../../../lib/studio/types";
import { actorSettings, camera3DAt } from "../../../lib/studio/stage3d";
import { scriptAt } from "../../../lib/studio/frame";

import { createGeneratedRoom } from "./GeneratedRoom";
import { createHuman, type HumanActor as Actor } from "./HumanActor";
import CharacterInteraction from "./CharacterInteraction";
import { directedPose, actorMotionTime, actorTravel, safeArmPose } from "../../../lib/studio/character-directing";
import { createSculptedActor } from "./SculptedActor";
import { sculptedCharacter } from "../../../lib/studio/character-models";
import { speechPose } from "../../../lib/studio/performance";
function material(color: string) {
  return new T.MeshStandardMaterial({ color, roughness: 0.78 });
}
function mesh(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
) {
  const m = new T.Mesh(geometry, material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  p: T.Object3D,
  w: number,
  h: number,
  d: number,
  c: string,
  x: number,
  y: number,
  z: number,
) {
  return mesh(p, new T.BoxGeometry(w, h, d), c, x, y, z);
}
function sphere(
  p: T.Object3D,
  r: number,
  c: string,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const m = mesh(p, new T.SphereGeometry(r, 24, 20), c, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function room(world: T.Scene, scene: Scene) {
  if(scene.room3d){createGeneratedRoom(world,scene.room3d);return;}
  world.background = new T.Color("#d2dbdb");
  const hemi = new T.HemisphereLight("#fff7e8", "#526576", 2.4);
  world.add(hemi);
  const sun = new T.DirectionalLight("#fff3dc", 3.5);
  sun.position.set(-3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -6,
    right: 6,
    top: 6,
    bottom: -6,
    near: 0.1,
    far: 20,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  world.add(sun);
  const fill = new T.DirectionalLight("#cce6ff", 1.3);
  fill.position.set(5, 3, 1);
  world.add(fill);
  if (scene.stageSet === "interview") {
    world.background = new T.Color("#202b39");
    box(world, 12, 0.15, 12, "#514b46", 0, -0.12, 0);
    box(world, 12, 5, 0.16, "#243949", 0, 2.4, -3);
    for (let i = -10; i <= 10; i++) box(world, 0.055, 3.3, 0.08, "#8e765c", i * 0.3, 1.6, -2.88);
    box(world, 3.7, 0.8, 0.12, "#152b39", 0, 2.1, -2.74);
    box(world, 2.4, 0.025, 0.03, "#d8b984", 0, 1.85, -2.66);
    box(world, 5.5, 0.025, 3.4, "#737b7e", 0, 0.005, 0.1);
    // Conversation table: its sides stay clear of knees and forearms.
    mesh(world, new T.CylinderGeometry(0.67, 0.67, 0.085, 64), "#8c6243", 0, 0.74, 0.1);
    mesh(world, new T.CylinderGeometry(0.09, 0.13, 0.68, 24), "#202630", 0, 0.36, 0.1);
    mesh(world, new T.CylinderGeometry(0.4, 0.43, 0.045, 40), "#202630", 0, 0.035, 0.1);
    for (const x of [-0.27, 0.27]) {
      mesh(world, new T.CylinderGeometry(0.055, 0.047, 0.1, 24), "#e7e3dc", x, 0.835, 0.1);
    }
    for (const el of scene.elements.filter(e => e.type === "character" && e.seated)) {
      const a = actorSettings(el), chair = new T.Group();
      chair.position.set(a.x, a.y ?? 0, a.z); chair.rotation.y = a.rotation; chair.scale.setScalar(a.scale ?? 1); world.add(chair);
      box(chair, 0.62, 0.09, 0.6, "#294f5a", 0, 0.415, 0);
      box(chair, 0.62, 0.67, 0.09, "#294f5a", 0, 0.84, -0.28);
      for (const x of [-0.24, 0.24]) for (const z of [-0.23, 0.23]) box(chair, 0.045, 0.46, 0.045, "#252b31", x, 0.23, z);
    }
    for (const x of [-3.1, 3.1]) {
      box(world, 0.035, 2.1, 0.035, "#d0a666", x, 1.08, -2.3);
      mesh(world, new T.CylinderGeometry(0.25, 0.35, 0.35, 32), "#ead9b4", x, 2.12, -2.3);
    }
    return;
  }
  box(world, 12, 0.15, 12, "#bdac93", 0, -0.12, 0);
  for (let i = -6; i < 7; i++)
    box(world, 0.013, 0.003, 12, "#ad9d85", i, 0.0, 0);
  box(world, 12, 5, 0.12, "#d6d8ce", 0, 2.45, -3);
  box(world, 0.12, 5, 8, "#a9bdb5", -5, 2.45, 1);
  box(world, 11, 0.12, 0.15, "#eee9dd", 0, 0.06, -2.89);
  // Window, framed wall art, console, sofa, rug and plants.
  box(world, 2.5, 2.4, 0.08, "#f7f3e9", -2.65, 2.3, -2.86);
  box(world, 2.2, 2.1, 0.05, "#a9d5dd", -2.65, 2.3, -2.8);
  box(world, 0.07, 2.2, 0.07, "#f6f2e9", -2.65, 2.3, -2.74);
  box(world, 2.3, 0.07, 0.07, "#f6f2e9", -2.65, 2.3, -2.74);
  box(world, 1.3, 1.5, 0.09, "#6e5840", 0.5, 2.45, -2.86);
  box(world, 1.18, 1.38, 0.04, "#f4eee1", 0.5, 2.45, -2.79);
  sphere(world, 0.38, "#c58662", 0.36, 2.5, -2.75, 1, 1, 0.03);
  box(world, 0.65, 0.13, 0.03, "#6d8981", 0.7, 2.12, -2.72);
  box(world, 2.7, 0.4, 0.85, "#799187", 0.7, 0.4, -1.8);
  box(world, 2.7, 0.68, 0.24, "#718a7d", 0.7, 0.78, -2.12);
  for (const x of [-0.1, 0.75, 1.6])
    box(world, 0.8, 0.16, 0.7, "#92a69a", x, 0.65, -1.72);
  for (const x of [-0.75, 2.15])
    box(world, 0.24, 0.6, 0.85, "#718a7d", x, 0.63, -1.8);
  box(world, 4, 0.025, 3, "#e1d6bf", 0, 0.005, 0.65);
  box(world, 0.75, 0.1, 0.65, "#7c5b40", 3, 0.85, -1.5);
  box(world, 0.12, 0.8, 0.12, "#7c5b40", 3, 0.42, -1.5);
  mesh(
    world,
    new T.CylinderGeometry(0.21, 0.16, 0.35, 24),
    "#bd7859",
    3,
    1.08,
    -1.5,
  );
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const leaf = sphere(
      world,
      0.3,
      "#52755b",
      3 + Math.sin(angle) * 0.24,
      1.42 + (i % 3) * 0.1,
      -1.5 + Math.cos(angle) * 0.2,
      0.4,
      1,
      0.5,
    );
    leaf.rotation.z = Math.sin(angle) * 0.8;
  }
}
function dispose(world: T.Scene) {
  world.traverse((o) => {
    const m = o as T.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const ms = Array.isArray(m.material) ? m.material : [m.material];
      ms.forEach((mat) => {
        Object.values(mat).forEach((v) => {
          if (v instanceof T.Texture) v.dispose();
        });
        mat.dispose();
      });
    }
  });
}
export default function Stage3D({
  scene,
  time,
  width,
  height,
  editable,
}: {
  scene: Scene;
  time: number;
  width: number;
  height: number;
  editable?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    instance = useRef<{
      world: T.Scene;
      camera: T.PerspectiveCamera;
      renderer: T.WebGLRenderer;
      actors: Map<string, Actor>;
      manipulating?: boolean;
    } | null>(null);
  const [ready, setReady] = useState(0),
    [error, setError] = useState("");
  const pending = useRef<number | null>(null);
  const exporting = getRemotionEnvironment().isRendering;
  const [handle] = useState(() =>
    exporting ? delayRender("Loading 3D stage") : null,
  );
  const cast = scene.elements.filter((e) => e.type === "character");
  const key = JSON.stringify([scene.stageSet, scene.room3d,
    cast.map((e) => {
      const a = actorSettings(e);
      return [
        e.id,
        e.characterId,
        a.shirt,
        a.skin,
        a.hair,
        a.modelUrl,
        a.animation,
        a.faceTexture,
        a.characterModel,
        scene.stageSet === "interview" ? [e.seated, a.x, a.y, a.z, a.rotation, a.scale] : null,
      ];
    }),
  ]);
  useEffect(() => {
    const gate = exporting ? delayRender("Preparing 3D scene") : null;
    pending.current = gate;
    let canceled = false;
    let owned: typeof instance.current = null;
    setError("");
    (async () => {
      const renderer = new T.WebGLRenderer({
        canvas: canvas.current!,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const world = new T.Scene(),
        camera = new T.PerspectiveCamera(38, width / height, 0.05, 100),
        actors = new Map<string, Actor>();
      owned = { renderer, world, camera, actors };
      room(world, scene);
      for (const el of cast) {
        const config = animationPoseSettings(actorSettings(el));
        let actor: Actor;
        if (config.modelUrl) {
          const manager = new T.LoadingManager();
          manager.setURLModifier((url) => {
            if (!url.startsWith("data:") && !url.startsWith("blob:"))
              throw new Error("GLB must embed its textures and resources.");
            return url;
          });
          const gltf = await new GLTFLoader(manager).loadAsync(config.modelUrl);
          const model = gltf.scene,
            root = new T.Group();
          const bounds = new T.Box3().setFromObject(model),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          const scale = 1.95 / Math.max(0.001, size.y);
          model.scale.multiplyScalar(scale);
          model.position.set(
            -center.x * scale,
            -bounds.min.y * scale,
            -center.z * scale,
          );
          root.add(model);
          const mixer = new T.AnimationMixer(model);
          const animation =
            gltf.animations.find((a) => a.name === config.animation) ??
            gltf.animations[0];
          if (animation) mixer.clipAction(animation).play();
          const morphs: NonNullable<Actor["morphs"]> = [];
          model.traverse((o) => {
            const m = o as T.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              const dictionary = m.morphTargetDictionary ?? {};
              const primary =
                dictionary.jawOpen !== undefined
                  ? "jawOpen"
                  : dictionary.mouthOpen !== undefined
                    ? "mouthOpen"
                    : "viseme_aa";
              for (const shape of [
                primary,
                "mouthPucker",
                "mouthFunnel",
                "viseme_PP",
                "viseme_O",
                "viseme_U",
              ]) {
                const index = dictionary[shape];
                if (index !== undefined) morphs.push({ mesh: m, index, shape });
              }
            }
          });
          actor = {
            root,
            mixer,
            morphs,
            animationNames: gltf.animations.map((a) => a.name),
            clipDuration: animation?.duration,
          };
        } else if (sculptedCharacter(el)) {
          actor = await createSculptedActor(el, sculptedCharacter(el)!);
        } else {
          const faceUrl = config.faceTexture ?? "";
          const texture = faceUrl ? await new T.TextureLoader().loadAsync(faceUrl) : undefined;
          if (texture) texture.colorSpace = T.SRGBColorSpace;
          actor = createHuman(el, texture);
        }
        actors.set(el.id, actor);
        world.add(actor.root);
      }
      if (canceled) {
        dispose(world);
        renderer.dispose();
        return;
      }
      instance.current = owned;
      setReady((v) => v + 1);
    })().catch((e) => {
      if (canceled) return;
      setError(e.message);
      if (exporting) cancelRender(e);
    });
    return () => {
      canceled = true;
      instance.current = null;
      if (owned) {
        dispose(owned.world);
        owned.renderer.dispose();
      }
      if (handle !== null) continueRender(handle);
      if (gate !== null) continueRender(gate);
    };
    // Rebuild only when cast appearance/positions or render size changes; time is evaluated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height, exporting, handle]);
  useLayoutEffect(() => {
    const state = instance.current;
    if (!state) return;
    try {
      const current = scriptAt(scene, time),
        camera = camera3DAt(scene, time);
      if (!state.manipulating) {
        state.camera.position.set(...camera.position);
        state.camera.lookAt(...camera.target);
      }
      for (const el of cast) {
        const actor = state.actors.get(el.id);
        if (!actor) continue;
        const config = animationPoseSettings(actorSettings(el));
        actor.setAppearance?.(config.appearance);
        const travel = actorTravel(config, time);
        const motion = actorMotionTime(config, time);
        actor.root.position.set(travel.x, config.y ?? 0, travel.z);
        actor.root.scale.setScalar(config.scale ?? 1);
        actor.root.rotation.y = config.rotation;
        actor.root.visible =
          el.visible &&
          time >= (el.startTime ?? 0) &&
          time < (el.endTime ?? Infinity);
        const line =
          current?.line.characterElementId === el.id ? current.line : undefined;
        const local = current ? time - current.start : 0;
        const pose = speechPose(line, el, local);
        const t = time,
          emphasis = pose.beat,
          active = pose.gesture;
        actor.mixer?.setTime(
          config.manualPose || !motion.active ? 0 : config.motionLoop === false
            ? Math.min(motion.time, Math.max(0, (actor.clipDuration ?? 3.2) - 0.00001)) : motion.time,
        );
        actor.morphs?.forEach(({ mesh, index, shape }) => {
          if (mesh.morphTargetInfluences) {
            const value =
              shape === "mouthPucker" || shape === "mouthFunnel"
                ? pose.round
                : shape === "viseme_PP"
                  ? pose.open < 0.05 && active
                    ? 1
                    : 0
                  : shape === "viseme_O" || shape === "viseme_U"
                    ? pose.round
                    : pose.open;
            mesh.morphTargetInfluences[index] = value;
          }
        });
        if (actor.body) {
          actor.body.position.y = Math.sin(t * 1.25) * 0.003;
          actor.body.rotation.z = pose.side * emphasis * 0.017;
          actor.body.rotation.y = pose.side * emphasis * 0.025;
        }
        if (actor.head) {
          actor.head.rotation.z = pose.side * emphasis * 0.018;
          actor.head.rotation.x = emphasis * 0.045;
          actor.head.rotation.y = active
            ? -0.08 * pose.side
            : config.x < 0
              ? 0.16
              : -0.16;
        }
        // Short natural blinks independent of speech, offset for each cast member.
        const phase = (t + (config.x + 5) * 0.31) % 4.7,
          blink = phase < 0.16 ? Math.sin((phase / 0.16) * Math.PI) : 0;
        actor.eyes?.forEach((eye) => (eye.scale.y = 1 - blink * 0.94));
        if (actor.mouth) {
          actor.mouth.scale.x = (actor.texturedFace ? 0.032 : 0.045) * pose.width;
          actor.mouth.scale.y = 0.001 + pose.open * (actor.texturedFace ? 0.019 : 0.029);
          actor.mouth.position.y = actor.texturedFace ? -0.077 : -0.09;
          actor.mouth.position.z = 0.131 + pose.round * 0.012;
        }
        actor.lips?.forEach((lip, i) => {
          lip.scale.x = (actor.texturedFace ? 0.032 : i ? 0.043 : 0.046) * pose.width;
          if (actor.texturedFace) lip.scale.y = 0.003;
          lip.position.y = (actor.texturedFace ? -0.077 : -0.091) + (i ? -1 : 1) * (0.004 + pose.open * (actor.texturedFace ? 0.018 : 0.026));
          lip.position.z = 0.14 + pose.round * 0.012;
        });
        actor.arms?.forEach((arm, i) => {
          const side = i ? 1 : -1,
            selected = side === pose.side ? 1 : 0.32;
          arm.rotation.set(
            -emphasis * 0.18 * selected,
            0,
            side * 0.075 + side * emphasis * 0.12 * selected,
          );
          const elbow = actor.elbows?.[i],
            wrist = actor.wrists?.[i];
          if (elbow)
            elbow.rotation.set(-0.08 - emphasis * 0.72 * selected, 0, 0);
          if (wrist) wrist.rotation.set(0.04, side * emphasis * 0.32, 0);
          const gesture = line?.gesture;
          // One gesture with anticipation and recovery per line, never an endless wave.
          const envelope =
            active *
            Math.max(0, Math.min(1, local / 0.35, (1.9 - local) / 0.55));
          if (gesture === "waving" && i === 1) {
            arm.rotation.z = envelope * 1.65;
            if (elbow) elbow.rotation.x = -envelope * 0.8;
            if (wrist)
              wrist.rotation.z = envelope * Math.sin(local * 10) * 0.25;
          } else if (gesture === "pointing" && i === 1) {
            arm.rotation.x = -emphasis * 0.65;
            arm.rotation.z = emphasis * 0.25;
            if (elbow) elbow.rotation.x = -0.1 - emphasis * 0.25;
          } else if (gesture === "thinking" && i === 1) {
            arm.rotation.x = -envelope * 0.35;
            if (elbow) elbow.rotation.x = -envelope * 2;
          } else if (gesture === "celebrating") {
            arm.rotation.z = side * envelope * 1.8;
            if (elbow) elbow.rotation.x = -envelope * 0.5;
          }
        });
        actor.legs?.forEach((leg) => leg.rotation.set(0, 0, 0));
        actor.knees?.forEach((knee) => knee.rotation.set(0, 0, 0));
        if (config.manualPose || (config.motion && motion.active)) {
          const directed = directedPose(
            config.pose,
            config.manualPose ? undefined : config.motion,
            config.motionLoop === false ? Math.min(motion.time, 3.19999) : motion.time,
          );
          actor.arms?.forEach((arm, i) =>
            arm.rotation.set(...directed.arms[i]),
          );
          actor.elbows?.forEach((elbow, i) =>
            elbow.rotation.set(directed.elbows[i], 0, 0),
          );
          actor.wrists?.forEach((wrist, i) =>
            wrist.rotation.set(0, 0, directed.wrists[i]),
          );
          actor.legs?.forEach((leg, i) => leg.rotation.x = directed.legs[i]);
          actor.knees?.forEach((knee, i) => knee.rotation.x = directed.knees[i]);
          if (actor.head)
            actor.head.rotation.set(
              directed.head[0],
              directed.head[1],
              directed.head[2],
            );
          if (actor.body) {
            actor.body.rotation.set(0, 0, directed.body);
            actor.body.position.y = directed.lift;
          }
        }
        if (el.seated && actor.body) {
          actor.body.position.y = -0.43;
          actor.body.rotation.set(0, 0, 0);
          actor.legs?.forEach(leg => leg.rotation.set(-Math.PI / 2, 0, 0));
          actor.knees?.forEach(knee => knee.rotation.set(Math.PI / 2, 0, 0));
          // A restrained seated performance keeps hands in front of the chest,
          // above the lap, and inside the chair's personal space.
          if (!config.manualPose && !config.motion) actor.arms?.forEach((arm, i) => {
            arm.rotation.set(-0.3 - emphasis * 0.18, 0, (i ? 1 : -1) * 0.16);
            actor.elbows?.[i].rotation.set(-1.05 - emphasis * (i ? 0.25 : 0.12), 0, 0);
          });
          if (actor.head && !config.manualPose && !config.motion) actor.head.rotation.y = 0;
        }
        applyJointPose(actor, config.jointPose, {config,seated:!!el.seated,time});
        actor.arms?.forEach((arm, i) => {
          const elbow = actor.elbows?.[i];
          if (!elbow) return;
          const safe = safeArmPose([arm.rotation.x, arm.rotation.y, arm.rotation.z], elbow.rotation.x, i);
          arm.rotation.set(...safe.arm); elbow.rotation.x = safe.elbow;
        });
        actor.updateRig?.(pose.open, pose.round, blink);
      }
      state.renderer.render(state.world, state.camera);
      if (pending.current !== null) {
        continueRender(pending.current);
        pending.current = null;
      }
      if (handle !== null) continueRender(handle);
    } catch (e: any) {
      setError(e.message);
      if (exporting) cancelRender(e);
    }
  }, [scene, time, ready, width, height, handle, exporting, cast]);
  return (
    <foreignObject width={width} height={height}>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <canvas
          ref={canvas}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        {editable && !exporting && ready > 0 && instance.current && (
          <CharacterInteraction
            stage={instance.current}
            scene={scene}
            time={time}
          />
        )}
        {error && (
          <div
            role="alert"
            style={{
              position: "absolute",
              inset: 20,
              color: "white",
              background: "#552c32",
              padding: 24,
            }}
          >
            3D stage: {error}
          </div>
        )}
      </div>
    </foreignObject>
  );
}
