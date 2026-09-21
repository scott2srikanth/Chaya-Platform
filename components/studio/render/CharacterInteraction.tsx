"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as T from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { useStudioStore } from "../../../lib/studio/store";
import { actorSettings } from "../../../lib/studio/stage3d";
import {
  CHARACTER_POSES,
  CHARACTER_ANIMATIONS,
} from "../../../lib/studio/character-directing";
import type { Scene } from "../../../lib/studio/types";
import type { HumanActor } from "./HumanActor";
type Stage = {
  world: T.Scene;
  camera: T.PerspectiveCamera;
  renderer: T.WebGLRenderer;
  actors: Map<string, HumanActor>;
  manipulating?: boolean;
};
const buttonStyle = {
  background: "#292938",
  border: "1px solid #48485c",
  borderRadius: 5,
  color: "#f1f0ff",
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};
export default function CharacterInteraction({
  stage,
  scene,
  time,
}: {
  stage: Stage;
  scene: Scene;
  time: number;
}) {
  const s = useStudioStore(),
    selected = s.selectedElementId,
    el = scene.elements.find((e) => e.id === selected),
    controls = useRef<TransformControls | null>(null),
    box = useRef<T.BoxHelper | null>(null);
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">(
      "translate",
    ),
    [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(
      null,
    ),
    [submenu, setSubmenu] = useState<"pose" | "animation" | null>(null),
    [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  useEffect(() => {
    const update = () => {
      const b = stage.renderer.domElement.getBoundingClientRect();
      setBounds({ left: b.left, top: b.top, width: b.width, height: b.height });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    observer.observe(stage.renderer.domElement);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stage]);
  useEffect(() => {
    const canvas = stage.renderer.domElement,
      control = new TransformControls(stage.camera, canvas),
      helper = control.getHelper(),
      selection = new T.BoxHelper(new T.Object3D(), 0xa78bfa);
    selection.visible = false;
    stage.world.add(helper, selection);
    controls.current = control;
    box.current = selection;
    control.setSize(0.85);
    const draw = () => {
      if (control.object) selection.setFromObject(control.object);
      stage.renderer.render(stage.world, stage.camera);
    };
    const ray = new T.Raycaster();
    const rayAt = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        stage.camera,
      );
    };
    const pick = (e: PointerEvent | MouseEvent) => {
      rayAt(e);
      const hit = ray
        .intersectObjects(
          Array.from(stage.actors.values()).map((a) => a.root),
          true,
        )
        .find((h) => {
          let node: T.Object3D | null = h.object;
          while (node) {
            if (!node.visible) return false;
            node = node.parent;
          }
          return true;
        });
      if (!hit) return null;
      return (
        Array.from(stage.actors).find(([, a]) => {
          let node: T.Object3D | null = hit.object;
          while (node) {
            if (node === a.root) return true;
            node = node.parent;
          }
          return false;
        })?.[0] ?? null
      );
    };
    let drag: {
      id: string;
      start: T.Vector3;
      x: number;
      z: number;
      plane: T.Plane;
      config: ReturnType<typeof actorSettings>;
    } | null = null;
    const begin = () => {
      stage.manipulating = true;
      useStudioStore.getState().beginEdit();
    };
    const finish = () => {
      if (stage.manipulating) {
        stage.manipulating = false;
        useStudioStore.getState().endEdit();
      }
      drag = null;
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || useStudioStore.getState().isPlaying) return;
      if (control.axis) return;
      setMenu(null);
      const id = pick(e);
      useStudioStore.getState().selectElement(id);
      if (!id) return;
      const actor = useStudioStore
        .getState()
        .activeScene()
        ?.elements.find((x) => x.id === id);
      if (!actor || actor.locked) return;
      const a = actorSettings(actor);
      const plane = new T.Plane(new T.Vector3(0, 1, 0), -(a.y ?? 0));
      const start = ray.ray.intersectPlane(plane, new T.Vector3());
      if (start && control.mode === "translate") {
        begin();
        drag = { id, start: start.clone(), x: a.x, z: a.z, plane, config: a };
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      rayAt(e);
      const point = ray.ray.intersectPlane(drag.plane, new T.Vector3());
      if (point)
        useStudioStore
          .getState()
          .updateElement(drag.id, {
            actor3d: {
              ...drag.config,
              x: drag.x + point.x - drag.start.x,
              z: drag.z + point.z - drag.start.z,
            },
          });
    };
    const context = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const id = pick(e);
      if (!id) {
        setMenu(null);
        return;
      }
      useStudioStore.getState().setIsPlaying(false);
      useStudioStore.getState().selectElement(id);
      setSubmenu(null);
      setMenu({
        x: Math.min(e.clientX, window.innerWidth - 250),
        y: Math.max(8, Math.min(e.clientY, window.innerHeight - 390)),
        id,
      });
    };
    const changed = () => {
      const state = useStudioStore.getState(),
        id = state.selectedElementId,
        el = state.activeScene()?.elements.find((e) => e.id === id);
      if (!id || !el || !control.object || el.locked) return;
      const a = actorSettings(el),
        o = control.object;
      let scale = a.scale ?? 1;
      if (control.mode === "scale") {
        scale = Math.max(
          0.15,
          Math.min(
            4,
            control.axis?.includes("X")
              ? o.scale.x
              : control.axis?.includes("Y")
                ? o.scale.y
                : o.scale.z,
          ),
        );
        o.scale.setScalar(scale);
      }
      state.updateElement(id, {
        actor3d: {
          ...a,
          x: o.position.x,
          y: o.position.y,
          z: o.position.z,
          rotation: o.rotation.y,
          scale,
        },
      });
      draw();
    };
    control.addEventListener("mouseDown", begin);
    control.addEventListener("mouseUp", finish);
    control.addEventListener("objectChange", changed);
    control.addEventListener("change", draw);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("contextmenu", context);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    const keys = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if (e.key === "Escape") {
        setMenu(null);
        finish();
      }
      if (e.key.toLowerCase() === "g") setMode("translate");
      if (e.key.toLowerCase() === "e") setMode("rotate");
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey)
        setMode("scale");
    };
    window.addEventListener("keydown", keys);
    return () => {
      finish();
      control.dispose();
      stage.world.remove(helper, selection);
      selection.geometry.dispose();
      (selection.material as T.Material).dispose();
      controls.current = null;
      box.current = null;
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("contextmenu", context);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("keydown", keys);
    };
  }, [stage]);
  useLayoutEffect(() => {
    const control = controls.current,
      selection = box.current;
    if (!control || !selection) return;
    const actor = selected ? stage.actors.get(selected) : undefined;
    control.setMode(mode);
    control.showX = mode !== "rotate";
    control.showY = true;
    control.showZ = mode !== "rotate";
    control.enabled = !s.isPlaying && !el?.locked;
    selection.visible = !!actor && !s.isPlaying;
    if (actor && !s.isPlaying) {
      control.attach(actor.root);
      selection.setFromObject(actor.root);
    } else control.detach();
    stage.renderer.render(stage.world, stage.camera);
  }, [stage, selected, mode, s.isPlaying, el, time]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-character-menu]"))
        setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);
  const target = menu ? scene.elements.find((e) => e.id === menu.id) : el,
    actor = target ? stage.actors.get(target.id) : undefined;
  const apply = (kind: "pose" | "animation", id: string) => {
    if (!target || target.locked) return;
    const a = actorSettings(target);
    s.updateElement(target.id, {
      actor3d: {
        ...a,
        pose: kind === "pose" ? id : undefined,
        manualPose: kind === "pose",
        jointPose: undefined,
        motion: kind === "animation" && !a.modelUrl ? id : undefined,
        animation: kind === "animation" && a.modelUrl ? id : a.animation,
        motionStart: time,
        motionEnd: undefined,
      },
    });
    setMenu(null);
    s.setIsPlaying(kind === "animation");
  };
  const reset = () => {
    if (!target) return;
    s.updateElement(target.id, {
      actor3d: {
        ...actorSettings(target),
        pose: undefined,
        motion: undefined,
        manualPose: false,
        jointPose: undefined,
      },
    });
    setMenu(null);
  };
  const poses = target?.actor3d?.modelUrl
      ? [{ id: "neutral", name: "Bind / first-frame pose" }]
      : CHARACTER_POSES,
    animations = target?.actor3d?.modelUrl
      ? (actor?.animationNames ?? []).map((name) => ({ id: name, name }))
      : CHARACTER_ANIMATIONS;
  return createPortal(
    <>
      {bounds.width > 0 && el?.type === "character" && !s.isPlaying && (
        <div
          role="toolbar"
          aria-label="Character transform"
          style={{
            position: "fixed",
            left: Math.max(bounds.left, 8),
            top: Math.max(8, bounds.top + 10),
            display: "flex",
            gap: 4,
            zIndex: 35,
            background: "#ffffff",
            border: "1px solid #dce2e8",
            boxShadow: "0 3px 12px #14233818",
            padding: 3,
            borderRadius: 7,
          }}
        >
          {(["translate", "rotate", "scale"] as const).map((m, i) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              style={{
                ...buttonStyle,
                background: mode === m ? "#eaf1fc" : "#ffffff",
                color: mode === m ? "#245ea8" : "#344054",
              }}
            >
              {["Move (G)", "Rotate (E)", "Scale (S)"][i]}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "#344054", padding: 6 }}>
            {el?.name ?? "Click a character · right-click for poses"}
          </span>
        </div>
      )}
      {menu && target && (
        <div
          data-character-menu
          role="menu"
          aria-label="Character actions"
          style={{
            position: "fixed",
            left: menu.x,
            top: Math.min(menu.y, window.innerHeight - 220),
            maxHeight: "min(520px, 70vh)",
            overflowY: "auto",
            width: 235,
            zIndex: 10000,
            background: "#20202d",
            color: "white",
            padding: 8,
            borderRadius: 10,
            border: "1px solid #555168",
            boxShadow: "0 15px 45px #0009",
          }}
        >
          <strong style={{ display: "block", padding: 8, fontSize: 13 }}>
            {target.name}
            {target.locked ? " · Locked" : ""}
          </strong>
          <button
            role="menuitem"
            aria-expanded={submenu === "pose"}
            disabled={target.locked}
            style={{ ...buttonStyle, width: "100%", textAlign: "left" }}
            onClick={() => setSubmenu(submenu === "pose" ? null : "pose")}
          >
            Pose ▸
          </button>
          {submenu === "pose" && (
            <div role="menu" aria-label="Poses">
              {poses.map((p) => (
                <button
                  role="menuitemradio"
                  aria-checked={
                    target.actor3d?.manualPose && target.actor3d?.pose === p.id
                  }
                  key={p.id}
                  onClick={() => apply("pose", p.id)}
                  style={{
                    ...buttonStyle,
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    marginTop: 3,
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            role="menuitem"
            aria-expanded={submenu === "animation"}
            disabled={target.locked}
            style={{
              ...buttonStyle,
              width: "100%",
              textAlign: "left",
              marginTop: 4,
            }}
            onClick={() =>
              setSubmenu(submenu === "animation" ? null : "animation")
            }
          >
            Animation ▸
          </button>
          {submenu === "animation" && (
            <div role="menu" aria-label="Animations">
              {animations.length ? (
                animations.map((a) => (
                  <button
                    role="menuitem"
                    key={a.id}
                    onClick={() => apply("animation", a.id)}
                    style={{
                      ...buttonStyle,
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginTop: 3,
                    }}
                  >
                    {a.name}
                  </button>
                ))
              ) : (
                <p>No animations embedded in this model.</p>
              )}
            </div>
          )}
          <button
            role="menuitem"
            disabled={target.locked}
            onClick={reset}
            style={{ ...buttonStyle, width: "100%", marginTop: 7 }}
          >
            Use dialogue gestures
          </button>
        </div>
      )}
    </>,
    document.body,
  );
}
