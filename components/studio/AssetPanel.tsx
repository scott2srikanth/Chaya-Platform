'use client';

import { useState } from 'react';
import { useStudioStore } from '@/lib/studio/store';
import { CHARACTER_LIBRARY } from '@/lib/studio/characters';
import { BUILT_IN_RIGGED_CHARACTERS } from '@/lib/studio/built-in-rigs';
import { RigPreview } from './RigRenderer';
import { Button } from '@/components/ui/button';
import { Square, Circle, Type, Minus, User, Video, Plus, Trash2, Copy, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { ElementType, CameraTransition } from '@/lib/studio/types';

const shapeTools: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
  { type: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
  { type: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
  { type: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line' },
];

const CHAR_COLORS: Record<string, string> = {
  alex: 'bg-blue-600',
  sarah: 'bg-emerald-600',
  max: 'bg-red-600',
  mia: 'bg-amber-600',
};

const TRANSITIONS: { value: CameraTransition; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'whip', label: 'Whip' },
];

const CAMERA_COLORS = ['text-amber-400', 'text-emerald-400', 'text-blue-400', 'text-red-400', 'text-violet-400', 'text-pink-400'];

export default function AssetPanel() {
  const addElement = useStudioStore((s) => s.addElement);
  const addCharacterElement = useStudioStore((s) => s.addCharacterElement);
  const addRiggedCharacterElement = useStudioStore((s) => s.addRiggedCharacterElement);
  const setWorkspace = useStudioStore((s) => s.setWorkspace);
  const scene = useStudioStore((s) => s.activeScene());
  const project = useStudioStore((s) => s.project);
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const selectElement = useStudioStore((s) => s.selectElement);
  const addCamera = useStudioStore((s) => s.addCamera);
  const removeCamera = useStudioStore((s) => s.removeCamera);
  const updateCamera = useStudioStore((s) => s.updateCamera);
  const duplicateCamera = useStudioStore((s) => s.duplicateCamera);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);

  const canvasW = project?.settings.width ?? 1920;
  const canvasH = project?.settings.height ?? 1080;

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden">
      {/* Rigged Characters */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Characters</p>
          <Button
            size="sm" variant="ghost"
            className="h-5 text-[9px] text-blue-400 hover:text-blue-300 px-1.5"
            onClick={() => setWorkspace('characters')}
          >
            <Layers className="w-3 h-3 mr-0.5" /> Library
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {BUILT_IN_RIGGED_CHARACTERS.map((char) => (
            <button
              key={char.id}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/60 transition-all group"
              onClick={() => addRiggedCharacterElement(char.id)}
            >
              <div className="w-8 h-12 flex items-center justify-center">
                <RigPreview character={char} size={40} />
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">{char.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legacy Characters */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Classic</p>
        <div className="grid grid-cols-2 gap-1.5">
          {CHARACTER_LIBRARY.map((char) => (
            <button
              key={char.id}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/60 transition-all group"
              onClick={() => addCharacterElement(char.id, char.name)}
            >
              <div className={`w-8 h-8 rounded-full ${CHAR_COLORS[char.id] || 'bg-slate-600'} flex items-center justify-center`}>
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">{char.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cameras */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cameras</p>
          <Button
            size="sm" variant="ghost"
            className="h-5 text-[9px] text-amber-400 hover:text-amber-300 px-1.5"
            onClick={() => {
              addCamera({ viewWidth: canvasW * 0.5, viewHeight: canvasH * 0.5, x: canvasW * 0.25, y: canvasH * 0.25 });
            }}
          >
            <Plus className="w-3 h-3 mr-0.5" /> Add
          </Button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {(scene?.cameras || []).map((cam, i) => {
            const isEditing = editingCameraId === cam.id;
            const colorClass = CAMERA_COLORS[i % CAMERA_COLORS.length];
            return (
              <div key={cam.id} className="rounded-md border border-slate-700/50 bg-slate-800/40">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Video className={`w-3 h-3 ${colorClass} shrink-0`} />
                  <span className="text-[10px] text-slate-300 flex-1 truncate">{cam.name}</span>
                  <button className="text-slate-600 hover:text-slate-300" onClick={() => setEditingCameraId(isEditing ? null : cam.id)}>
                    {isEditing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button className="text-slate-600 hover:text-blue-400" onClick={() => duplicateCamera(cam.id)}>
                    <Copy className="w-3 h-3" />
                  </button>
                  {(scene?.cameras.length ?? 0) > 1 && (
                    <button className="text-slate-600 hover:text-red-400" onClick={() => { removeCamera(cam.id); if (isEditing) setEditingCameraId(null); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isEditing && (
                  <div className="px-2 pb-2 space-y-1.5 border-t border-slate-700/50 pt-1.5">
                    <div>
                      <label className="text-[8px] text-slate-500 block mb-0.5">Name</label>
                      <input value={cam.name} onChange={(e) => updateCamera(cam.id, { name: e.target.value })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-[8px] text-slate-500 block mb-0.5">X</label>
                        <input type="number" value={cam.x} onChange={(e) => updateCamera(cam.id, { x: Number(e.target.value) })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 block mb-0.5">Y</label>
                        <input type="number" value={cam.y} onChange={(e) => updateCamera(cam.id, { y: Number(e.target.value) })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 block mb-0.5">Width</label>
                        <input type="number" value={cam.viewWidth} onChange={(e) => updateCamera(cam.id, { viewWidth: Math.max(100, Number(e.target.value)) })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 block mb-0.5">Height</label>
                        <input type="number" value={cam.viewHeight} onChange={(e) => updateCamera(cam.id, { viewHeight: Math.max(100, Number(e.target.value)) })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <label className="text-[8px] text-slate-500 block mb-0.5">Transition</label>
                        <select value={cam.transition} onChange={(e) => updateCamera(cam.id, { transition: e.target.value as CameraTransition })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-0.5">
                          {TRANSITIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                        </select>
                      </div>
                      <div className="w-14">
                        <label className="text-[8px] text-slate-500 block mb-0.5">Duration</label>
                        <input type="number" step={0.1} min={0} max={5} value={cam.transitionDuration} onChange={(e) => updateCamera(cam.id, { transitionDuration: Math.max(0, Number(e.target.value)) })} className="w-full h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shapes */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Shapes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {shapeTools.map((t) => (
            <Button key={t.type} variant="ghost" size="sm" className="h-9 text-xs text-slate-300 hover:text-white hover:bg-slate-700 justify-start gap-2" onClick={() => addElement(t.type)}>
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Layers */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Layers</p>
        {!scene || scene.elements.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No elements yet</p>
        ) : (
          <div className="space-y-0.5">
            {[...scene.elements].reverse().map((el) => (
              <button
                key={el.id}
                className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                  selectedElementId === el.id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
                onClick={() => selectElement(el.id)}
              >
                {el.type === 'character' && <User className="w-3 h-3 shrink-0" />}
                {el.type === 'rectangle' && <Square className="w-3 h-3 shrink-0" />}
                {el.type === 'circle' && <Circle className="w-3 h-3 shrink-0" />}
                {el.type === 'text' && <Type className="w-3 h-3 shrink-0" />}
                {el.type === 'line' && <Minus className="w-3 h-3 shrink-0" />}
                <span className="truncate">{el.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
