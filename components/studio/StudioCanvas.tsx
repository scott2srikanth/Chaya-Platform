'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useStudioStore } from '@/lib/studio/store';
import { getAnimatedState } from '@/lib/studio/animation-engine';
import { getCharacter } from '@/lib/studio/characters';
import { getRiggedCharacter, getCharacterPose } from '@/lib/studio/built-in-rigs';
import { evaluateClip } from '@/lib/studio/clip-engine';
import { computeCharacterMotion, computeEyeTracking, computeCameraFrame, computeCameraFromSceneCamera } from '@/lib/studio/character-animator';
import type { CameraFrame } from '@/lib/studio/character-animator';
import type { SceneElement } from '@/lib/studio/types';
import type { AnimatedState } from '@/lib/studio/animation-engine';
import CharacterRenderer from './CharacterRenderer';
import RigRenderer from './RigRenderer';

const HANDLE_SIZE = 8;

function renderElement(el: SceneElement, anim: AnimatedState) {
  switch (el.type) {
    case 'rectangle':
      return <rect width={anim.width} height={anim.height} rx={el.borderRadius} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} opacity={anim.opacity} />;
    case 'circle':
      return <ellipse cx={anim.width / 2} cy={anim.height / 2} rx={anim.width / 2} ry={anim.height / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} opacity={anim.opacity} />;
    case 'text':
      return (
        <text x={el.textAlign === 'center' ? anim.width / 2 : el.textAlign === 'right' ? anim.width : 0} y={anim.height / 2} dominantBaseline="central"
          textAnchor={el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'}
          fill={el.fill === 'transparent' ? '#0f172a' : el.fill} fontSize={el.fontSize} fontFamily={el.fontFamily} fontWeight={el.fontWeight} opacity={anim.opacity}
        >{el.text}</text>
      );
    case 'line':
      return <line x1={0} y1={0} x2={el.x2 || anim.width} y2={el.y2} stroke={el.stroke} strokeWidth={el.strokeWidth || 3} opacity={anim.opacity} strokeLinecap="round" />;
    default:
      return <rect width={anim.width} height={anim.height} fill={el.fill} opacity={anim.opacity} />;
  }
}

function SelectionHandles({ width, height, zoom }: { width: number; height: number; zoom: number }) {
  const hs = HANDLE_SIZE / zoom;
  const corners = [
    { cx: 0, cy: 0, cursor: 'nwse-resize', anchor: 'nw' },
    { cx: width, cy: 0, cursor: 'nesw-resize', anchor: 'ne' },
    { cx: width, cy: height, cursor: 'nwse-resize', anchor: 'se' },
    { cx: 0, cy: height, cursor: 'nesw-resize', anchor: 'sw' },
  ];
  return (
    <g>
      <rect x={-1 / zoom} y={-1 / zoom} width={width + 2 / zoom} height={height + 2 / zoom} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom}`} pointerEvents="none" />
      {corners.map((c) => (
        <rect key={c.anchor} x={c.cx - hs / 2} y={c.cy - hs / 2} width={hs} height={hs} fill="white" stroke="#3b82f6" strokeWidth={1.5 / zoom} style={{ cursor: c.cursor }} data-handle={c.anchor} />
      ))}
    </g>
  );
}

const CAMERA_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function StudioCanvas() {
  const project = useStudioStore((s) => s.project);
  const activeSceneId = useStudioStore((s) => s.activeSceneId);
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const zoom = useStudioStore((s) => s.canvasZoom);
  const panX = useStudioStore((s) => s.canvasPanX);
  const panY = useStudioStore((s) => s.canvasPanY);
  const currentTime = useStudioStore((s) => s.currentTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const selectElement = useStudioStore((s) => s.selectElement);
  const updateElement = useStudioStore((s) => s.updateElement);
  const setCanvasZoom = useStudioStore((s) => s.setCanvasZoom);
  const setCanvasPan = useStudioStore((s) => s.setCanvasPan);

  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [animTime, setAnimTime] = useState(0);

  const [drag, setDrag] = useState<{
    type: 'move' | 'resize' | 'pan';
    startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number; handle?: string;
  } | null>(null);

  const scene = project?.scenes.find((s) => s.id === activeSceneId);
  const w = project?.settings.width ?? 1920;
  const h = project?.settings.height ?? 1080;

  useEffect(() => {
    if (!isPlaying) return;
    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      const state = useStudioStore.getState();
      if (!state.isPlaying) return;
      state.tickPlayback(dt);
      setAnimTime(state.playbackTime + dt);

      const sc = state.activeScene();
      const line = sc?.script.find((l) => l.id === state.activeScriptLineId);
      const charEl = line ? sc?.elements.find((e) => e.id === line.characterElementId) : null;

      // Use SceneCamera if a cameraId is set on the active line
      const activeCam = state.activeCameraId && sc ? sc.cameras.find((c) => c.id === state.activeCameraId) : null;

      let frame: CameraFrame;
      if (activeCam) {
        frame = computeCameraFromSceneCamera(activeCam, state.prevCameraFrame, state.cameraTransitionElapsed);
      } else if (charEl && line) {
        frame = computeCameraFrame(line.shot, charEl.x, charEl.y, charEl.width, charEl.height, w, h, state.cameraFrame, dt);
      } else {
        frame = computeCameraFrame('wide', 0, 0, 0, 0, w, h, state.cameraFrame, dt);
      }
      state.setCameraFrame(frame);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, w, h]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isPlaying) return;
    const target = e.target as SVGElement;
    const handle = target.getAttribute('data-handle');
    const elId = target.closest('[data-element-id]')?.getAttribute('data-element-id');
    if (handle && selectedElementId) {
      const el = scene?.elements.find((el) => el.id === selectedElementId);
      if (!el) return;
      setDrag({ type: 'resize', startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.width, origH: el.height, handle });
      e.stopPropagation(); return;
    }
    if (elId) {
      selectElement(elId);
      const el = scene?.elements.find((el) => el.id === elId);
      if (!el || el.locked) return;
      setDrag({ type: 'move', startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.width, origH: el.height });
      e.stopPropagation(); return;
    }
    selectElement(null);
    setDrag({ type: 'pan', startX: e.clientX, startY: e.clientY, origX: panX, origY: panY, origW: 0, origH: 0 });
  }, [scene, selectedElementId, panX, panY, selectElement, isPlaying]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (drag.type === 'pan') { setCanvasPan(drag.origX + dx, drag.origY + dy); return; }
      if (!selectedElementId) return;
      if (drag.type === 'move') { updateElement(selectedElementId, { x: Math.round(drag.origX + dx / zoom), y: Math.round(drag.origY + dy / zoom) }); return; }
      if (drag.type === 'resize' && drag.handle) {
        const sdx = dx / zoom, sdy = dy / zoom;
        let { origX: nx, origY: ny, origW: nw, origH: nh } = drag;
        if (drag.handle === 'se') { nw = Math.max(20, drag.origW + sdx); nh = Math.max(20, drag.origH + sdy); }
        if (drag.handle === 'sw') { nw = Math.max(20, drag.origW - sdx); nx = drag.origX + (drag.origW - nw); nh = Math.max(20, drag.origH + sdy); }
        if (drag.handle === 'ne') { nw = Math.max(20, drag.origW + sdx); nh = Math.max(20, drag.origH - sdy); ny = drag.origY + (drag.origH - nh); }
        if (drag.handle === 'nw') { nw = Math.max(20, drag.origW - sdx); nx = drag.origX + (drag.origW - nw); nh = Math.max(20, drag.origH - sdy); ny = drag.origY + (drag.origH - nh); }
        updateElement(selectedElementId, { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [drag, zoom, selectedElementId, updateElement, setCanvasPan]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); setCanvasZoom(zoom + (e.deltaY > 0 ? -0.05 : 0.05));
  }, [zoom, setCanvasZoom]);

  if (!scene) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500">No scene selected</div>;

  const storeState = useStudioStore.getState();
  const cf = storeState.cameraFrame;
  const viewBox = cf && isPlaying ? `${cf.vx} ${cf.vy} ${cf.vw} ${cf.vh}` : `0 0 ${w} ${h}`;
  const speakerEl = storeState.speakingElementId ? scene.elements.find((e) => e.id === storeState.speakingElementId) : null;

  return (
    <div className="flex-1 overflow-hidden bg-slate-800 relative cursor-default" onPointerDown={onPointerDown} onWheel={onWheel} style={{ touchAction: 'none' }}>
      <svg width={w * zoom} height={h * zoom} viewBox={viewBox} style={{ position: 'absolute', left: panX, top: panY, boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }} preserveAspectRatio="xMidYMid meet">
        <rect width={w} height={h} fill={scene.background} />
        {!isPlaying && (
          <><defs><pattern id="grid" width={100} height={100} patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} /></pattern></defs><rect width={w} height={h} fill="url(#grid)" /></>
        )}

        {/* Camera zone overlays in edit mode */}
        {!isPlaying && scene.cameras.map((cam, i) => {
          if (cam.viewWidth >= w && cam.viewHeight >= h && cam.x === 0 && cam.y === 0) return null;
          const color = CAMERA_COLORS[i % CAMERA_COLORS.length];
          return (
            <g key={cam.id} pointerEvents="none">
              <rect x={cam.x} y={cam.y} width={cam.viewWidth} height={cam.viewHeight} fill="none" stroke={color} strokeWidth={3} strokeDasharray="12 6" opacity={0.6} />
              <rect x={cam.x} y={cam.y - 24} width={Math.min(cam.name.length * 8 + 16, 120)} height={22} rx={4} fill={color} opacity={0.8} />
              <text x={cam.x + 8} y={cam.y - 10} fontSize={11} fill="white" fontFamily="Inter, sans-serif" fontWeight="600">{cam.name}</text>
            </g>
          );
        })}

        {scene.elements.filter((el) => el.visible).map((el) => {
          const anim = getAnimatedState(el, currentTime);
          const isChar = el.type === 'character' && el.characterId;
          const charDef = isChar ? getCharacter(el.characterId!) : null;
          const riggedChar = isChar && !charDef ? getRiggedCharacter(el.characterId!) : null;

          if (riggedChar) {
            const clipForEl = storeState.animationClips.find((c: any) => c.elementId === el.id);
            const isClipActive = clipForEl && (storeState.isClipPlaying || isPlaying);
            let poseTransforms: Record<string, any>;
            if (isClipActive && clipForEl) {
              poseTransforms = evaluateClip(clipForEl, storeState.clipPlaybackTime, riggedChar);
            } else {
              const gesture = el.characterGesture || 'idle';
              const gestureMap: Record<string, string> = {
                idle: 'idle', talking: 'talk', pointing: 'point',
                waving: 'wave', thinking: 'think', celebrating: 'celebrate',
              };
              const poseId = el.seated ? 'sit' : (gestureMap[gesture] || 'idle');
              const pose = getCharacterPose(riggedChar, poseId);
              poseTransforms = pose?.boneTransforms ?? {};
            }
            return (
              <g key={el.id} data-element-id={el.id} transform={`translate(${anim.x}, ${anim.y})`} style={{ cursor: el.locked || isPlaying ? 'default' : 'move' }}>
                <RigRenderer
                  character={riggedChar}
                  poseTransforms={poseTransforms}
                  width={anim.width}
                  height={anim.height}
                  facingRight={el.facingRight ?? true}
                />
                {selectedElementId === el.id && !isPlaying && <SelectionHandles width={anim.width} height={anim.height} zoom={zoom} />}
              </g>
            );
          }

          if (charDef) {
            const isSpeaking = isPlaying && storeState.speakingElementId === el.id;
            const reaction = el.characterReaction || 'none';
            const hasEyeTarget = isPlaying && speakerEl && speakerEl.id !== el.id;
            const eyeTarget = hasEyeTarget
              ? computeEyeTracking(el.x, el.width, speakerEl!.x, speakerEl!.width, true)
              : { pupilOffsetX: 0, pupilOffsetY: 0 };

            const motion = computeCharacterMotion(
              animTime, el.characterGesture || 'idle', isSpeaking,
              isSpeaking ? storeState.activeSpeechText : '', isSpeaking ? storeState.speechProgress : 0,
              isSpeaking ? 'none' : reaction, eyeTarget,
            );

            return (
              <g key={el.id} data-element-id={el.id} transform={`translate(${anim.x}, ${anim.y})`} style={{ cursor: el.locked || isPlaying ? 'default' : 'move' }}>
                <CharacterRenderer def={charDef} gesture={el.characterGesture || 'idle'} motion={motion} facingRight={el.facingRight ?? true} width={anim.width} height={anim.height} seated={el.seated} />
                {selectedElementId === el.id && !isPlaying && <SelectionHandles width={anim.width} height={anim.height} zoom={zoom} />}
              </g>
            );
          }

          return (
            <g key={el.id} data-element-id={el.id} transform={`translate(${anim.x}, ${anim.y}) rotate(${anim.rotation}, ${anim.width / 2}, ${anim.height / 2})`} style={{ cursor: el.locked || isPlaying ? 'default' : 'move' }}>
              {renderElement(el, anim)}
              {el.type === 'line' && <line x1={0} y1={0} x2={el.x2 || anim.width} y2={el.y2} stroke="transparent" strokeWidth={12} />}
              {selectedElementId === el.id && !isPlaying && <SelectionHandles width={anim.width} height={anim.height} zoom={zoom} />}
            </g>
          );
        })}

        {/* Speech bubble */}
        {isPlaying && storeState.activeScriptLineId && (() => {
          const line = scene.script.find((l) => l.id === storeState.activeScriptLineId);
          const charEl = line ? scene.elements.find((e) => e.id === line.characterElementId) : null;
          if (!line || !charEl) return null;
          const bx = charEl.x + charEl.width / 2 - 160;
          const by = charEl.y - 55;
          const displayText = line.text.length > 55 ? line.text.slice(0, 52) + '...' : line.text;
          return (
            <g>
              <rect x={bx} y={by} width={320} height={45} rx={10} fill="white" stroke="#e2e8f0" strokeWidth={1} opacity={0.95} />
              <polygon points={`${charEl.x + charEl.width / 2 - 7},${by + 45} ${charEl.x + charEl.width / 2 + 7},${by + 45} ${charEl.x + charEl.width / 2},${by + 58}`} fill="white" stroke="#e2e8f0" strokeWidth={1} />
              <polygon points={`${charEl.x + charEl.width / 2 - 5},${by + 44} ${charEl.x + charEl.width / 2 + 5},${by + 44} ${charEl.x + charEl.width / 2},${by + 54}`} fill="white" />
              <text x={charEl.x + charEl.width / 2} y={by + 25} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="#1e293b" fontFamily="Inter, sans-serif" fontWeight="500">{displayText}</text>
            </g>
          );
        })()}
      </svg>

      {!isPlaying && <div className="absolute bottom-3 right-3 bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded font-mono">{Math.round(zoom * 100)}%</div>}
      {isPlaying && <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-3 py-1 rounded-full font-medium tracking-wide animate-pulse">LIVE PREVIEW</div>}
    </div>
  );
}
