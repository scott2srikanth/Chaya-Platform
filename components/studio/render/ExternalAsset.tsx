"use client";
import { useEffect, useRef, useState } from "react";
import type { StudioAsset, SceneElement } from "../../../lib/studio/types";
import { riveFile, riveRuntime, riveValue } from "../../../lib/studio/assets";
import {
  delayRender,
  continueRender,
  cancelRender,
  getRemotionEnvironment,
} from "remotion";

export default function ExternalAsset({
  asset,
  time,
  width,
  height,
  element,
}: {
  asset: StudioAsset;
  time: number;
  width: number;
  height: number;
  element: SceneElement;
}) {
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    instance = useRef<any>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const exporting = getRemotionEnvironment().isRendering;
  const [handle] = useState(() =>
    exporting ? delayRender("Loading " + asset.name) : null,
  );
  useEffect(() => {
    let canceled = false;
    let cleanup = () => {};
    (async () => {
      if (asset.type === "lottie") {
        const lottie = (await import("lottie-web")).default;
        if (canceled || !container.current) return;
        const anim = lottie.loadAnimation({
          container: container.current,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: structuredClone(asset.lottie),
        });
        instance.current = anim;
        cleanup = () => anim.destroy();
        await new Promise<void>((resolve, reject) => {
          anim.addEventListener("DOMLoaded", () => resolve());
          anim.addEventListener("data_failed", () =>
            reject(new Error("Lottie could not load")),
          );
        });
      } else {
        const r = await riveRuntime(),
          file = await riveFile(asset);
        if (canceled || !canvas.current) return;
        const renderer = r.makeRenderer(canvas.current);
        instance.current = { r, file, renderer };
        cleanup = () => renderer.delete();
      }
      if (!canceled) setReady(true);
    })().catch((e) => {
      if (exporting) cancelRender(e);
      else setError(String(e.message));
    });
    return () => {
      canceled = true;
      cleanup();
      if (handle !== null) continueRender(handle);
    };
  }, [asset, exporting, handle]);
  useEffect(() => {
    if (!ready || !instance.current) return;
    try {
      const local =
        Math.max(0, time - (element.startTime ?? 0)) *
          (element.characterSpeed ?? 1) +
        (element.mediaStart ?? 0);
      if (asset.type === "lottie") {
        const fps = Number(asset.lottie?.fr) || 30,
          end = element.mediaEnd ?? asset.duration ?? 1,
          start = element.mediaStart ?? 0;
        const t =
          element.mediaLoop === false
            ? Math.min(local, end)
            : start + ((local - start) % Math.max(0.001, end - start));
        instance.current.goToAndStop(
          t * fps + (Number(asset.lottie?.ip) || 0),
          true,
        );
      } else {
        // Recreate the artboard and replay fixed simulation steps, so backwards seek and export agree.
        const { r, file, renderer } = instance.current,
          art = file.defaultArtboard();
        let animation: any, sm: any;
        try {
          art.volume = 0;
          if (element.riveStateMachine)
            sm = new r.StateMachineInstance(
              art.stateMachineByName(element.riveStateMachine),
              art,
            );
          else if (art.animationCount()) {
            const ref = element.mediaAnimation
              ? art.animationByName(element.mediaAnimation)
              : art.animationByIndex(0);
            if (ref) animation = new r.LinearAnimationInstance(ref, art);
          }
          if (animation) {
            animation.time = local;
            animation.apply(1);
            art.advance(0);
          }
          if (sm) {
            const events = [...(element.riveInputs ?? [])].sort(
              (a, b) => a.time - b.time,
            );
            let ei = 0;
            for (let step = 0; step <= Math.ceil(local * 60); step++) {
              const t = Math.min(local, step / 60);
              while (ei < events.length && events[ei].time <= t) {
                const event = events[ei++];
                for (let i = 0; i < sm.inputCount(); i++) {
                  const input = sm.input(i);
                  if (riveValue(input, "name") !== event.name) continue;
                  if (riveValue(input, "type") === r.SMIInput.bool)
                    input.asBool().value = !!event.value;
                  else if (riveValue(input, "type") === r.SMIInput.number)
                    input.asNumber().value = Number(event.value);
                  else if (event.value === "fire") input.asTrigger().fire();
                }
              }
              const dt =
                step === 0 ? 0 : Math.min(1 / 60, local - (step - 1) / 60);
              sm.advance(dt);
              art.advance(dt);
            }
          }
          renderer.clear();
          renderer.save();
          renderer.align(
            r.Fit.contain,
            r.Alignment.center,
            { minX: 0, minY: 0, maxX: width, maxY: height },
            art.bounds,
          );
          art.draw(renderer);
          renderer.restore();
          renderer.flush();
          r.resolveAnimationFrame();
        } finally {
          animation?.delete();
          sm?.delete();
          art.delete();
        }
      }
      if (handle !== null) continueRender(handle);
    } catch (e: any) {
      if (exporting) cancelRender(e);
      else setError(e.message);
    }
  }, [ready, time, width, height, element, asset, handle, exporting]);
  return (
    <foreignObject width={width} height={height}>
      <div style={{ width, height }}>
        {error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : asset.type === "lottie" ? (
          <div ref={container} style={{ width, height }} />
        ) : (
          <canvas ref={canvas} width={width} height={height} />
        )}
      </div>
    </foreignObject>
  );
}
