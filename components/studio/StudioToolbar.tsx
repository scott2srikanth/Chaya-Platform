'use client';

import { useStudioStore } from '@/lib/studio/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, ZoomIn, ZoomOut, Maximize, Loader2, Play, Square, Volume2 } from 'lucide-react';
import Link from 'next/link';

export default function StudioToolbar() {
  const project = useStudioStore((s) => s.project);
  const isSaving = useStudioStore((s) => s.isSaving);
  const zoom = useStudioStore((s) => s.canvasZoom);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const scene = useStudioStore((s) => s.activeScene());
  const setProjectName = useStudioStore((s) => s.setProjectName);
  const saveProject = useStudioStore((s) => s.saveProject);
  const setCanvasZoom = useStudioStore((s) => s.setCanvasZoom);
  const setCanvasPan = useStudioStore((s) => s.setCanvasPan);
  const previewScript = useStudioStore((s) => s.previewScript);
  const stopPreview = useStudioStore((s) => s.stopPreview);

  const scriptLines = scene?.script.filter((l) => l.text.trim()).length ?? 0;

  return (
    <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-3 gap-2">
      <Link href="/admin/dashboard" className="text-sm font-bold text-slate-300 hover:text-white mr-2 whitespace-nowrap">
        Motion Studio
      </Link>

      <div className="w-px h-6 bg-slate-700" />

      {project && (
        <Input
          value={project.metadata.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-7 w-48 text-xs bg-slate-800 border-slate-600 text-slate-200"
        />
      )}

      <div className="w-px h-6 bg-slate-700" />

      <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white" onClick={() => saveProject()} disabled={!project || isSaving}>
        {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
        Save
      </Button>

      <div className="w-px h-6 bg-slate-700" />

      {/* Preview controls */}
      {isPlaying ? (
        <Button
          size="sm"
          className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
          onClick={stopPreview}
        >
          <Square className="w-3 h-3 mr-1.5 fill-current" />
          Stop
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          onClick={previewScript}
          disabled={scriptLines === 0}
        >
          <Play className="w-3 h-3 mr-1.5 fill-current" />
          Preview
        </Button>
      )}

      <div className="flex items-center gap-1 ml-1">
        <Volume2 className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] text-slate-500">
          {scriptLines} line{scriptLines !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => setCanvasZoom(zoom - 0.1)}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] text-slate-500 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => setCanvasZoom(zoom + 0.1)}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => { setCanvasZoom(0.5); setCanvasPan(0, 0); }}>
          <Maximize className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
