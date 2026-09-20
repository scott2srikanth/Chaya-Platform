'use client';

import { useStudioStore } from '@/lib/studio/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PRESET_LIST } from '@/lib/studio/presets';
import type { PresetName } from '@/lib/studio/presets';
import type { CharacterGesture } from '@/lib/studio/types';
import { Copy, Trash2, Lock, Unlock, Eye, EyeOff, Sparkles, FlipHorizontal, User, Layers } from 'lucide-react';
import { getCharacter } from '@/lib/studio/characters';
import { getRiggedCharacter } from '@/lib/studio/built-in-rigs';
import { RigPreview } from './RigRenderer';

const GESTURES: { value: CharacterGesture; label: string }[] = [
  { value: 'idle', label: 'Idle' },
  { value: 'talking', label: 'Talking' },
  { value: 'pointing', label: 'Pointing' },
  { value: 'waving', label: 'Waving' },
  { value: 'thinking', label: 'Thinking' },
  { value: 'celebrating', label: 'Celebrating' },
];

export default function PropertiesPanel() {
  const scene = useStudioStore((s) => s.activeScene());
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const updateElement = useStudioStore((s) => s.updateElement);
  const removeElement = useStudioStore((s) => s.removeElement);
  const duplicateElement = useStudioStore((s) => s.duplicateElement);
  const applyPreset = useStudioStore((s) => s.applyPreset);
  const openPoseEditor = useStudioStore((s) => s.openPoseEditor);

  const el = scene?.elements.find((e) => e.id === selectedElementId);

  if (!el) {
    return (
      <div className="w-64 bg-slate-900 border-l border-slate-700 flex items-center justify-center">
        <p className="text-xs text-slate-500 text-center px-4">Select an element to edit its properties</p>
      </div>
    );
  }

  const update = (key: string, value: any) => updateElement(el.id, { [key]: value });
  const numField = (label: string, key: string, val: number, step = 1) => (
    <div>
      <Label className="text-[10px] text-slate-400 uppercase">{label}</Label>
      <Input
        type="number" value={val} step={step}
        onChange={(e) => update(key, parseFloat(e.target.value) || 0)}
        className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200"
      />
    </div>
  );

  const isCharacter = el.type === 'character';
  const charDef = isCharacter && el.characterId ? getCharacter(el.characterId) : null;
  const riggedChar = isCharacter && el.characterId && !charDef ? getRiggedCharacter(el.characterId) : null;

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-700 overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <Input
          value={el.name} onChange={(e) => update('name', e.target.value)}
          className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 font-medium mb-2"
        />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => duplicateElement(el.id)}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => update('locked', !el.locked)}>
            {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => update('visible', !el.visible)}>
            {el.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => removeElement(el.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Rigged Character */}
        {isCharacter && riggedChar && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Rigged Character</p>
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="w-10 h-14 flex items-center justify-center shrink-0">
                <RigPreview character={riggedChar} size={48} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 font-medium">{riggedChar.name}</p>
                <p className="text-[9px] text-slate-500">{riggedChar.gender === 'male' ? 'Male' : 'Female'} -- {riggedChar.poses.length} poses</p>
              </div>
            </div>

            <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Pose</Label>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {GESTURES.map((g) => (
                <Button
                  key={g.value} size="sm" variant={el.characterGesture === g.value ? 'default' : 'ghost'}
                  className={`h-7 text-[10px] ${el.characterGesture === g.value ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  onClick={() => update('characterGesture', g.value)}
                >
                  {g.label}
                </Button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-white w-full"
                onClick={() => update('facingRight', !el.facingRight)}>
                <FlipHorizontal className="w-3 h-3 mr-1.5" />
                Flip Direction ({el.facingRight ? 'Right' : 'Left'})
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-blue-400 hover:text-blue-300 w-full"
                onClick={() => openPoseEditor(riggedChar.id)}>
                <Layers className="w-3 h-3 mr-1.5" />
                Open Pose Editor
              </Button>
            </div>
          </div>
        )}

        {/* Legacy Character */}
        {isCharacter && charDef && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Character</p>
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: charDef.shirtColor }}>
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-200 font-medium">{charDef.name}</p>
                <p className="text-[9px] text-slate-500">{charDef.gender === 'male' ? 'Male' : 'Female'} -- {charDef.hairStyle} hair</p>
              </div>
            </div>

            <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Pose</Label>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {GESTURES.map((g) => (
                <Button
                  key={g.value} size="sm" variant={el.characterGesture === g.value ? 'default' : 'ghost'}
                  className={`h-7 text-[10px] ${el.characterGesture === g.value ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  onClick={() => update('characterGesture', g.value)}
                >
                  {g.label}
                </Button>
              ))}
            </div>

            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-white w-full"
              onClick={() => update('facingRight', !el.facingRight)}>
              <FlipHorizontal className="w-3 h-3 mr-1.5" />
              Flip Direction ({el.facingRight ? 'Right' : 'Left'})
            </Button>
          </div>
        )}

        {/* Position */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Position</p>
          <div className="grid grid-cols-2 gap-2">
            {numField('X', 'x', el.x)}
            {numField('Y', 'y', el.y)}
          </div>
        </div>

        {/* Size */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Size</p>
          <div className="grid grid-cols-2 gap-2">
            {numField('W', 'width', el.width)}
            {numField('H', 'height', el.height)}
          </div>
        </div>

        {/* Appearance (non-character) */}
        {!isCharacter && (
          <>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Transform</p>
              <div className="grid grid-cols-2 gap-2">
                {numField('Rotation', 'rotation', el.rotation)}
                <div>
                  <Label className="text-[10px] text-slate-400 uppercase">Opacity</Label>
                  <Slider value={[el.opacity * 100]} min={0} max={100} step={1} onValueChange={([v]) => update('opacity', v / 100)} className="mt-1.5" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Appearance</p>
              <div className="space-y-2">
                {el.type !== 'line' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-slate-400 w-12">Fill</Label>
                    <input type="color" value={el.fill === 'transparent' ? '#000000' : el.fill} onChange={(e) => update('fill', e.target.value)} className="w-7 h-7 rounded border border-slate-600 bg-transparent cursor-pointer" />
                    <Input value={el.fill} onChange={(e) => update('fill', e.target.value)} className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 flex-1" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-slate-400 w-12">Stroke</Label>
                  <input type="color" value={el.stroke === 'transparent' ? '#000000' : el.stroke} onChange={(e) => update('stroke', e.target.value)} className="w-7 h-7 rounded border border-slate-600 bg-transparent cursor-pointer" />
                  <Input value={el.stroke} onChange={(e) => update('stroke', e.target.value)} className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 flex-1" />
                </div>
              </div>
            </div>

            {el.type === 'text' && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Text</p>
                <div className="space-y-2">
                  <Input value={el.text} onChange={(e) => update('text', e.target.value)} className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200" placeholder="Enter text..." />
                  {numField('Font Size', 'fontSize', el.fontSize)}
                </div>
              </div>
            )}

            {/* Motion Presets */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Motion Presets</p>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {PRESET_LIST.map((p) => (
                  <Button key={p.name} size="sm" variant="ghost" className="h-6 text-[10px] text-slate-400 hover:text-white justify-start px-1.5"
                    onClick={() => applyPreset(el.id, p.name)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
