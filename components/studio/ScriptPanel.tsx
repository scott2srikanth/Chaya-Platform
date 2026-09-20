'use client';

import { useState } from 'react';
import { useStudioStore } from '@/lib/studio/store';
import { getCharacter } from '@/lib/studio/characters';
import { SCRIPT_TEMPLATES } from '@/lib/studio/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronUp, ChevronDown, MessageSquare, Layout, Sparkles, Video } from 'lucide-react';
import type { CharacterGesture, ReactionType, ShotType } from '@/lib/studio/types';

const GESTURES: { value: CharacterGesture; label: string }[] = [
  { value: 'talking', label: 'Talk' },
  { value: 'pointing', label: 'Point' },
  { value: 'waving', label: 'Wave' },
  { value: 'thinking', label: 'Think' },
  { value: 'celebrating', label: 'Celebrate' },
];

const REACTIONS: { value: ReactionType; label: string }[] = [
  { value: 'listening', label: 'Listen' },
  { value: 'nodding', label: 'Nod' },
  { value: 'surprised', label: 'Surprise' },
  { value: 'laughing', label: 'Laugh' },
  { value: 'thinking', label: 'Think' },
  { value: 'confused', label: 'Confused' },
];

const SHOTS: { value: ShotType; label: string }[] = [
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'closeup', label: 'Closeup' },
];

export default function ScriptPanel() {
  const scene = useStudioStore((s) => s.activeScene());
  const activeScriptLineId = useStudioStore((s) => s.activeScriptLineId);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const addScriptLine = useStudioStore((s) => s.addScriptLine);
  const removeScriptLine = useStudioStore((s) => s.removeScriptLine);
  const updateScriptLine = useStudioStore((s) => s.updateScriptLine);
  const reorderScriptLine = useStudioStore((s) => s.reorderScriptLine);
  const applyTemplate = useStudioStore((s) => s.applyTemplate);
  const [showTemplates, setShowTemplates] = useState(false);

  if (!scene) return null;

  const characterElements = scene.elements.filter((e) => e.type === 'character');
  const hasCharacters = characterElements.length > 0;
  const cameras = scene.cameras || [];

  return (
    <div className="h-56 bg-slate-900 border-t border-slate-700 flex flex-col select-none">
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Script</span>
          <span className="text-[10px] text-slate-500">{scene.script.length} line{scene.script.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasCharacters && characterElements.length >= 2 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-400 hover:text-amber-300 px-2" onClick={() => setShowTemplates(!showTemplates)} disabled={isPlaying}>
              <Layout className="w-3 h-3 mr-1" /> Templates
            </Button>
          )}
          {hasCharacters && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-blue-400 hover:text-blue-300 px-2" onClick={() => addScriptLine(characterElements[0].id)} disabled={isPlaying}>
              <Plus className="w-3 h-3 mr-1" /> Add Line
            </Button>
          )}
        </div>
      </div>

      {showTemplates && (
        <div className="px-3 py-2 border-b border-slate-700/50 flex gap-2 overflow-x-auto shrink-0">
          {SCRIPT_TEMPLATES.filter((t) => characterElements.length >= t.minCharacters).map((tpl) => (
            <button
              key={tpl.id}
              className="shrink-0 text-left px-3 py-2 rounded-lg border border-slate-700 hover:border-blue-500/50 hover:bg-blue-950/20 transition-all"
              onClick={() => { applyTemplate(tpl.id); setShowTemplates(false); }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-medium text-slate-200">{tpl.name}</span>
              </div>
              <p className="text-[9px] text-slate-500 max-w-[180px]">{tpl.description}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1.5">
        {!hasCharacters && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500 text-center px-4">Add characters to the scene first, then write your script here</p>
          </div>
        )}

        {scene.script.map((line, idx) => {
          const charEl = scene.elements.find((e) => e.id === line.characterElementId);
          const isActive = activeScriptLineId === line.id;

          return (
            <div key={line.id} className={`flex gap-2 p-2 rounded-lg border transition-all ${isActive ? 'border-blue-500/50 bg-blue-950/30' : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'}`}>
              <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono w-5 text-center">{idx + 1}</span>
                <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-slate-600 hover:text-slate-300" onClick={() => reorderScriptLine(line.id, 'up')} disabled={idx === 0 || isPlaying}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-slate-600 hover:text-slate-300" onClick={() => reorderScriptLine(line.id, 'down')} disabled={idx === scene.script.length - 1 || isPlaying}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>

              <div className="shrink-0 w-[110px] space-y-1">
                <select value={line.characterElementId} onChange={(e) => updateScriptLine(line.id, { characterElementId: e.target.value })} className="w-full h-6 text-[10px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-1" disabled={isPlaying}>
                  {characterElements.map((ce) => (<option key={ce.id} value={ce.id}>{ce.name}</option>))}
                </select>
                <div className="flex gap-1">
                  <select value={line.gesture} onChange={(e) => updateScriptLine(line.id, { gesture: e.target.value as CharacterGesture })} className="flex-1 h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-0.5" disabled={isPlaying}>
                    {GESTURES.map((g) => (<option key={g.value} value={g.value}>{g.label}</option>))}
                  </select>
                  <select value={line.shot || 'medium'} onChange={(e) => updateScriptLine(line.id, { shot: e.target.value as ShotType })} className="w-14 h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-0.5" disabled={isPlaying || !!line.cameraId}>
                    {SHOTS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-slate-500">React:</span>
                  <select value={line.reaction || 'listening'} onChange={(e) => updateScriptLine(line.id, { reaction: e.target.value as ReactionType })} className="flex-1 h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-slate-300 px-0.5" disabled={isPlaying}>
                    {REACTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                  </select>
                </div>
                {cameras.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Video className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <select
                      value={line.cameraId || ''}
                      onChange={(e) => updateScriptLine(line.id, { cameraId: e.target.value || undefined })}
                      className="flex-1 h-5 text-[9px] bg-slate-700 border border-slate-600 rounded text-amber-300 px-0.5"
                      disabled={isPlaying}
                    >
                      <option value="">Auto (shot)</option>
                      {cameras.map((cam) => (<option key={cam.id} value={cam.id}>{cam.name}</option>))}
                    </select>
                  </div>
                )}
                <p className="text-[8px] text-slate-500 text-center">{line.duration.toFixed(1)}s</p>
              </div>

              <Textarea value={line.text} onChange={(e) => updateScriptLine(line.id, { text: e.target.value })} placeholder="Type dialogue..." className="flex-1 min-h-[56px] max-h-[90px] text-xs bg-slate-800/50 border-slate-600 text-slate-200 resize-none py-1.5 px-2" disabled={isPlaying} />

              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-600 hover:text-red-400 shrink-0 self-start" onClick={() => removeScriptLine(line.id)} disabled={isPlaying}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
