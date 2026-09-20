'use client';

import { useEffect, useState } from 'react';
import { useStudioStore } from '@/lib/studio/store';
import { listProjects, deleteProject } from '@/lib/studio/db';
import type { Project } from '@/lib/studio/types';
import StudioToolbar from '@/components/studio/StudioToolbar';
import StudioCanvas from '@/components/studio/StudioCanvas';
import AssetPanel from '@/components/studio/AssetPanel';
import PropertiesPanel from '@/components/studio/PropertiesPanel';
import ScriptPanel from '@/components/studio/ScriptPanel';
import ClipTimeline from '@/components/studio/ClipTimeline';
import CharacterLibrary from '@/components/studio/CharacterLibrary';
import PoseEditor from '@/components/studio/PoseEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FilePlus, Trash2, Film } from 'lucide-react';

function ProjectPicker() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState('');
  const newProject = useStudioStore((s) => s.newProject);
  const openProject = useStudioStore((s) => s.openProject);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  const handleCreate = () => {
    const name = newName.trim() || 'Untitled Project';
    newProject(name);
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setProjects(await listProjects());
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Motion Explainer Studio</h1>
            <p className="text-sm text-slate-400">Create animated explainer videos with characters</p>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              New Project
            </p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name..."
                className="bg-slate-700 border-slate-600 text-slate-200 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} className="shrink-0">
                <FilePlus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        {projects.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Recent Projects
              </p>
              <div className="space-y-1.5">
                {projects
                  .sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime())
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 group rounded-lg p-2.5 hover:bg-slate-700/50 transition-colors"
                    >
                      <button className="flex-1 text-left" onClick={() => openProject(p.id)}>
                        <p className="text-sm font-medium text-slate-200">{p.metadata.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {p.scenes.length} scene{p.scenes.length !== 1 ? 's' : ''} --{' '}
                          {new Date(p.metadata.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function StudioPage() {
  const project = useStudioStore((s) => s.project);
  const workspace = useStudioStore((s) => s.studioWorkspace);
  const poseEditorCharId = useStudioStore((s) => s.poseEditorCharId);
  const setWorkspace = useStudioStore((s) => s.setWorkspace);
  const addRiggedCharacterElement = useStudioStore((s) => s.addRiggedCharacterElement);
  const openPoseEditor = useStudioStore((s) => s.openPoseEditor);
  const savePose = useStudioStore((s) => s.savePose);

  if (!project) {
    return <ProjectPicker />;
  }

  if (workspace === 'characters') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
        <StudioToolbar />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 bg-slate-900 border-r border-slate-700 overflow-hidden">
            <CharacterLibrary
              onAddCharacter={(charId) => addRiggedCharacterElement(charId)}
              onOpenPoseEditor={(charId) => openPoseEditor(charId)}
            />
          </div>
          <div className="flex-1 flex items-center justify-center bg-slate-800/50">
            <div className="text-center space-y-3 px-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto">
                <Film className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Character Library</p>
              <p className="text-xs text-slate-500 max-w-xs">Browse and select characters. Click "Add to Scene" to place a character, or "Edit Poses" to customize poses.</p>
              <Button
                size="sm" variant="ghost"
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={() => setWorkspace('scene')}
              >
                Back to Scene
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (workspace === 'pose-editor' && poseEditorCharId) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
        <StudioToolbar />
        <div className="flex-1 overflow-hidden">
          <PoseEditor
            characterId={poseEditorCharId}
            onBack={() => setWorkspace('scene')}
            onSavePose={savePose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      <StudioToolbar />
      <div className="flex-1 flex overflow-hidden">
        <AssetPanel />
        <StudioCanvas />
        <PropertiesPanel />
      </div>
      <ScriptPanel />
      <ClipTimeline />
    </div>
  );
}
