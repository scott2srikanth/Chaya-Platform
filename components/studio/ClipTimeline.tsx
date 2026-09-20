'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useStudioStore } from '@/lib/studio/store';
import { getRiggedCharacter } from '@/lib/studio/built-in-rigs';
import type { AnimationClip, Keyframe } from '@/lib/studio/clip-engine';
import { createKeyframe, CLIP_PRESETS } from '@/lib/studio/clip-engine';
import type { EasingType } from '@/lib/studio/types';
import { RigPreview } from './RigRenderer';
import { Button } from '@/components/ui/button';
import {
  Plus, Trash2, Play, Pause, Diamond, Repeat,
  ChevronDown, Sparkles, Clock, GripVertical
} from 'lucide-react';

const TRACK_H = 56;
const HEADER_W = 160;
const PX_PER_SEC = 120;
const RULER_H = 28;
const KF_SIZE = 14;

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In-Out' },
  { value: 'spring', label: 'Spring' },
];

const POSE_COLORS: Record<string, string> = {
  idle: '#64748b', talk: '#3b82f6', point: '#f59e0b',
  wave: '#10b981', think: '#8b5cf6', celebrate: '#ef4444',
  sit: '#06b6d4', walkA: '#ec4899', walkB: '#f97316',
  present: '#14b8a6',
};

export default function ClipTimeline() {
  const scene = useStudioStore((s) => s.activeScene());
  const clips = useStudioStore((s) => s.animationClips);
  const addClip = useStudioStore((s) => s.addClip);
  const updateClip = useStudioStore((s) => s.updateClip);
  const removeClip = useStudioStore((s) => s.removeClip);
  const addKeyframeToClip = useStudioStore((s) => s.addKeyframeToClip);
  const removeKeyframeFromClip = useStudioStore((s) => s.removeKeyframeFromClip);
  const updateKeyframeInClip = useStudioStore((s) => s.updateKeyframeInClip);
  const clipPlaybackTime = useStudioStore((s) => s.clipPlaybackTime);
  const isClipPlaying = useStudioStore((s) => s.isClipPlaying);
  const toggleClipPlayback = useStudioStore((s) => s.toggleClipPlayback);
  const scrubClip = useStudioStore((s) => s.scrubClip);

  const [selectedKfId, setSelectedKfId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState<string | null>(null);
  const [showPosePicker, setShowPosePicker] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kfId: string; clipId: string; startX: number; startTime: number } | null>(null);

  const charElements = useMemo(() =>
    (scene?.elements ?? []).filter((e) => e.type === 'character' && e.characterId),
    [scene?.elements],
  );

  const sceneClips = useMemo(() =>
    clips.filter((c) => charElements.some((el) => el.id === c.elementId)),
    [clips, charElements],
  );

  const maxDuration = Math.max(5, ...sceneClips.map((c) => c.duration));
  const timelineW = maxDuration * PX_PER_SEC;

  const timeToX = (t: number) => t * PX_PER_SEC;
  const xToTime = (x: number) => Math.max(0, x / PX_PER_SEC);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    scrubClip(xToTime(x));
  }, [scrubClip]);

  const handleKfPointerDown = useCallback((e: React.PointerEvent, kfId: string, clipId: string, time: number) => {
    e.stopPropagation();
    setSelectedKfId(kfId);
    setSelectedClipId(clipId);
    dragRef.current = { kfId, clipId, startX: e.clientX, startTime: time };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const newTime = Math.max(0, dragRef.current.startTime + dx / PX_PER_SEC);
      const rounded = Math.round(newTime * 20) / 20; // snap to 0.05s
      updateKeyframeInClip(dragRef.current.clipId, dragRef.current.kfId, { time: rounded });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [updateKeyframeInClip]);

  const handleTrackDoubleClick = useCallback((e: React.MouseEvent, clipId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.round(xToTime(x) * 20) / 20;
    const kf = createKeyframe(time, 'idle', 'easeInOut');
    addKeyframeToClip(clipId, kf);
    setSelectedKfId(kf.id);
    setSelectedClipId(clipId);
  }, [addKeyframeToClip]);

  const selectedKf = useMemo(() => {
    if (!selectedKfId || !selectedClipId) return null;
    const clip = clips.find((c) => c.id === selectedClipId);
    return clip?.keyframes.find((k) => k.id === selectedKfId) ?? null;
  }, [selectedKfId, selectedClipId, clips]);

  const selectedClipChar = useMemo(() => {
    if (!selectedClipId) return null;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return null;
    const el = charElements.find((e) => e.id === clip.elementId);
    return el?.characterId ? getRiggedCharacter(el.characterId) : null;
  }, [selectedClipId, clips, charElements]);

  if (!scene) return null;

  return (
    <div className="bg-slate-900 border-t border-slate-700 flex flex-col select-none" style={{ height: Math.max(180, RULER_H + sceneClips.length * TRACK_H + 80) }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Animation Clips</span>
          <span className="text-[10px] text-slate-500">{sceneClips.length} clip{sceneClips.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm" variant="ghost"
            className={`h-6 w-6 p-0 ${isClipPlaying ? 'text-red-400' : 'text-emerald-400'}`}
            onClick={toggleClipPlayback}
          >
            {isClipPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <span className="text-[10px] text-slate-500 font-mono w-12 text-right">
            {clipPlaybackTime.toFixed(1)}s
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div className="shrink-0 border-r border-slate-700/50" style={{ width: HEADER_W }}>
          <div className="h-7 border-b border-slate-700/30" />
          {sceneClips.map((clip) => {
            const el = charElements.find((e) => e.id === clip.elementId);
            const rigChar = el?.characterId ? getRiggedCharacter(el.characterId) : null;
            return (
              <div
                key={clip.id}
                className={`flex items-center gap-2 px-2 border-b border-slate-700/20 ${
                  selectedClipId === clip.id ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
                style={{ height: TRACK_H }}
                onClick={() => { setSelectedClipId(clip.id); setSelectedKfId(null); }}
              >
                {rigChar && (
                  <div className="w-7 h-9 shrink-0">
                    <RigPreview character={rigChar} size={32} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-300 font-medium truncate">{clip.name}</p>
                  <p className="text-[8px] text-slate-500">{el?.name} -- {clip.duration}s</p>
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="h-5 w-5 p-0 text-slate-600 hover:text-red-400 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            );
          })}

          {/* Add clip for characters without one */}
          {charElements.filter((el) => !sceneClips.some((c) => c.elementId === el.id)).map((el) => (
            <div key={el.id} className="px-2 border-b border-slate-700/20 flex items-center" style={{ height: TRACK_H }}>
              <div className="relative flex-1">
                <Button
                  size="sm" variant="ghost"
                  className="h-7 w-full text-[10px] text-slate-500 hover:text-emerald-400 justify-start"
                  onClick={() => setShowPresets(showPresets === el.id ? null : el.id)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add clip for {el.name}
                </Button>
                {showPresets === el.id && (
                  <div className="absolute left-0 top-8 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-1.5 min-w-[160px]">
                    {CLIP_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className="w-full text-left px-2 py-1.5 rounded text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        onClick={() => {
                          addClip(preset.create(el.id));
                          setShowPresets(null);
                        }}
                      >
                        <Sparkles className="w-2.5 h-2.5 inline mr-1.5 text-amber-400" />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={timelineRef}>
          <div style={{ width: timelineW + 40, minWidth: '100%' }}>
            {/* Ruler */}
            <div
              className="h-7 border-b border-slate-700/30 relative cursor-pointer"
              onClick={handleRulerClick}
            >
              {Array.from({ length: Math.ceil(maxDuration) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: timeToX(i) }}
                >
                  <div className="w-px h-2.5 bg-slate-600" />
                  <span className="text-[8px] text-slate-500 font-mono ml-1">{i}s</span>
                </div>
              ))}
              {/* Half-second ticks */}
              {Array.from({ length: Math.ceil(maxDuration) * 2 }, (_, i) => {
                const t = i * 0.5;
                if (t === Math.floor(t)) return null;
                return (
                  <div
                    key={`h${i}`}
                    className="absolute bottom-0 w-px h-1.5 bg-slate-700"
                    style={{ left: timeToX(t) }}
                  />
                );
              })}
              {/* Playhead on ruler */}
              <div
                className="absolute top-0 h-full w-0.5 bg-emerald-400 z-10"
                style={{ left: timeToX(clipPlaybackTime), transition: isClipPlaying ? 'none' : 'left 0.1s' }}
              />
            </div>

            {/* Tracks */}
            {sceneClips.map((clip) => (
              <div
                key={clip.id}
                className={`relative border-b border-slate-700/20 ${
                  selectedClipId === clip.id ? 'bg-slate-800/30' : ''
                }`}
                style={{ height: TRACK_H }}
                onDoubleClick={(e) => handleTrackDoubleClick(e, clip.id)}
              >
                {/* Clip duration bar */}
                <div
                  className="absolute top-2 bottom-2 rounded-md border border-slate-600/40 bg-slate-700/20"
                  style={{ left: 0, width: timeToX(clip.duration) }}
                />

                {/* Interpolation lines between keyframes */}
                {clip.keyframes.map((kf, i) => {
                  if (i === 0) return null;
                  const prev = clip.keyframes[i - 1];
                  const color = POSE_COLORS[kf.poseId] ?? '#64748b';
                  return (
                    <line
                      key={`line-${kf.id}`}
                      x1={timeToX(prev.time)}
                      y1={TRACK_H / 2}
                      x2={timeToX(kf.time)}
                      y2={TRACK_H / 2}
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.3}
                      style={{ position: 'absolute' }}
                    />
                  );
                })}

                {/* SVG for lines */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: timeToX(clip.duration) + 20, height: TRACK_H }}>
                  {clip.keyframes.map((kf, i) => {
                    if (i === 0) return null;
                    const prev = clip.keyframes[i - 1];
                    const color = POSE_COLORS[kf.poseId] ?? '#64748b';
                    return (
                      <line
                        key={`l-${kf.id}`}
                        x1={timeToX(prev.time)}
                        y1={TRACK_H / 2}
                        x2={timeToX(kf.time)}
                        y2={TRACK_H / 2}
                        stroke={color}
                        strokeWidth={2}
                        opacity={0.35}
                        strokeDasharray="4 3"
                      />
                    );
                  })}
                </svg>

                {/* Keyframe diamonds */}
                {clip.keyframes.map((kf) => {
                  const color = POSE_COLORS[kf.poseId] ?? '#64748b';
                  const isSelected = selectedKfId === kf.id;
                  return (
                    <div
                      key={kf.id}
                      className="absolute cursor-grab active:cursor-grabbing group"
                      style={{
                        left: timeToX(kf.time) - KF_SIZE / 2,
                        top: TRACK_H / 2 - KF_SIZE / 2,
                        width: KF_SIZE,
                        height: KF_SIZE,
                      }}
                      onPointerDown={(e) => handleKfPointerDown(e, kf.id, clip.id, kf.time)}
                      onClick={(e) => { e.stopPropagation(); setSelectedKfId(kf.id); setSelectedClipId(clip.id); }}
                    >
                      <div
                        className={`w-full h-full rotate-45 rounded-[2px] border-2 transition-all ${
                          isSelected
                            ? 'border-white shadow-lg shadow-white/20 scale-125'
                            : 'border-slate-400 group-hover:border-white group-hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                      <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] text-slate-500 font-mono whitespace-nowrap pointer-events-none">
                        {kf.poseId}
                      </span>
                    </div>
                  );
                })}

                {/* Playhead */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-emerald-400/60 pointer-events-none z-10"
                  style={{ left: timeToX(clipPlaybackTime), transition: isClipPlaying ? 'none' : 'left 0.1s' }}
                />
              </div>
            ))}

            {/* Empty tracks for characters without clips */}
            {charElements.filter((el) => !sceneClips.some((c) => c.elementId === el.id)).map((el) => (
              <div key={el.id} className="border-b border-slate-700/20 flex items-center justify-center" style={{ height: TRACK_H }}>
                <p className="text-[9px] text-slate-600">Double-click or use the + button to add a clip</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframe inspector (bottom bar) */}
      {selectedKf && selectedClipChar && (
        <div className="shrink-0 px-3 py-1.5 border-t border-slate-700/50 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">Time:</span>
            <input
              type="number"
              step={0.05}
              min={0}
              value={selectedKf.time}
              onChange={(e) => updateKeyframeInClip(selectedClipId!, selectedKfId!, { time: Math.max(0, Number(e.target.value)) })}
              className="w-14 h-5 text-[10px] bg-slate-800 border border-slate-600 rounded text-slate-300 px-1 font-mono"
            />
            <span className="text-[9px] text-slate-500">s</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Pose:</span>
            <div className="relative">
              <button
                className="h-5 px-2 text-[10px] bg-slate-800 border border-slate-600 rounded text-slate-300 flex items-center gap-1 hover:border-slate-500"
                onClick={() => setShowPosePicker(showPosePicker ? null : selectedKfId)}
              >
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: POSE_COLORS[selectedKf.poseId] ?? '#64748b' }} />
                {selectedKf.poseId}
                <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
              </button>
              {showPosePicker === selectedKfId && (
                <div className="absolute bottom-6 left-0 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-1 min-w-[120px]">
                  {selectedClipChar.poses.map((pose) => (
                    <button
                      key={pose.id}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-colors ${
                        selectedKf.poseId === pose.id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                      onClick={() => {
                        updateKeyframeInClip(selectedClipId!, selectedKfId!, { poseId: pose.id });
                        setShowPosePicker(null);
                      }}
                    >
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: POSE_COLORS[pose.id] ?? '#64748b' }} />
                      {pose.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Easing:</span>
            <select
              value={selectedKf.easing}
              onChange={(e) => updateKeyframeInClip(selectedClipId!, selectedKfId!, { easing: e.target.value as EasingType })}
              className="h-5 text-[10px] bg-slate-800 border border-slate-600 rounded text-slate-300 px-1"
            >
              {EASING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <Button
            size="sm" variant="ghost"
            className="h-5 text-[9px] text-red-400 hover:text-red-300 px-1.5 ml-auto"
            onClick={() => {
              removeKeyframeFromClip(selectedClipId!, selectedKfId!);
              setSelectedKfId(null);
            }}
          >
            <Trash2 className="w-2.5 h-2.5 mr-0.5" /> Remove
          </Button>
        </div>
      )}
    </div>
  );
}
