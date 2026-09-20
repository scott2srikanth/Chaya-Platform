'use client';

import { useState, useMemo } from 'react';
import { BUILT_IN_RIGGED_CHARACTERS, getCharacterPose } from '@/lib/studio/built-in-rigs';
import type { RiggedCharacter, Pose } from '@/lib/studio/rig';
import { RigPreview } from './RigRenderer';
import { Button } from '@/components/ui/button';
import { User, ChevronRight, Search, Layers, ArrowLeft } from 'lucide-react';

interface Props {
  onAddCharacter: (charId: string) => void;
  onOpenPoseEditor: (charId: string) => void;
}

export default function CharacterLibrary({ onAddCharacter, onOpenPoseEditor }: Props) {
  const [selectedChar, setSelectedChar] = useState<RiggedCharacter | null>(null);
  const [search, setSearch] = useState('');
  const [previewPoseId, setPreviewPoseId] = useState<string>('idle');

  const filteredChars = useMemo(() => {
    if (!search.trim()) return BUILT_IN_RIGGED_CHARACTERS;
    const q = search.toLowerCase();
    return BUILT_IN_RIGGED_CHARACTERS.filter((c) =>
      c.name.toLowerCase().includes(q) || c.gender.includes(q)
    );
  }, [search]);

  if (selectedChar) {
    const activePose = getCharacterPose(selectedChar, previewPoseId);
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex items-center gap-2">
          <button
            className="text-slate-400 hover:text-white transition-colors"
            onClick={() => setSelectedChar(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selectedChar.name}</p>
            <p className="text-[10px] text-slate-500">{selectedChar.gender === 'male' ? 'Male' : 'Female'} -- v{selectedChar.version}</p>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 flex justify-center border-b border-slate-700/50 bg-slate-800/30">
          <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
            <RigPreview
              character={selectedChar}
              poseTransforms={activePose?.boneTransforms ?? {}}
              size={160}
            />
          </div>
        </div>

        {/* Poses */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Poses</p>
          <div className="grid grid-cols-2 gap-1.5">
            {selectedChar.poses.map((pose) => (
              <button
                key={pose.id}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                  previewPoseId === pose.id
                    ? 'border-blue-500/50 bg-blue-950/30 text-blue-300'
                    : 'border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setPreviewPoseId(pose.id)}
              >
                <div className="w-10 h-14 flex items-center justify-center">
                  <RigPreview
                    character={selectedChar}
                    poseTransforms={pose.boneTransforms}
                    size={52}
                  />
                </div>
                <span className="text-[9px] font-medium">{pose.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-slate-700 space-y-1.5">
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-500"
            onClick={() => onAddCharacter(selectedChar.id)}
          >
            <User className="w-3.5 h-3.5 mr-1.5" />
            Add to Scene
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs text-slate-400 hover:text-white"
            onClick={() => onOpenPoseEditor(selectedChar.id)}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Edit Poses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Character Library</p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="w-full h-7 text-[11px] bg-slate-800 border border-slate-600 rounded-md text-slate-200 pl-7 pr-2 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Character Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {filteredChars.map((char) => (
            <button
              key={char.id}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/60 transition-all group"
              onClick={() => { setSelectedChar(char); setPreviewPoseId('idle'); }}
            >
              <div className="w-12 h-16 flex items-center justify-center shrink-0 bg-slate-700/20 rounded-lg">
                <RigPreview character={char} size={56} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{char.name}</p>
                <p className="text-[10px] text-slate-500">
                  {char.gender === 'male' ? 'Male' : 'Female'} -- {char.poses.length} poses -- v{char.version}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {filteredChars.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No characters found</p>
        )}
      </div>
    </div>
  );
}
