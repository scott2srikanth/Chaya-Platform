'use client';

import { useState, useRef, useEffect } from 'react';
import { Hotspot, HotspotAction } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HotspotEditorProps {
  hotspots: Hotspot[];
  currentTime: number;
  duration: number;
  onHotspotCreate: (hotspot: Omit<Hotspot, 'id' | 'created_at' | 'video_id'>) => void;
  onHotspotUpdate: (id: string, hotspot: Partial<Hotspot>) => void;
  onHotspotDelete: (id: string) => void;
  videoContainerRef: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}

export function HotspotEditor({
  hotspots,
  currentTime,
  duration,
  onHotspotCreate,
  onHotspotUpdate,
  onHotspotDelete,
  videoContainerRef,
  children,
}: HotspotEditorProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; hotspotX: number; hotspotY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoContainerRef.current) return;

    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !videoContainerRef.current || !drawStart) return;

    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setDrawEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawEnd) return;

    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const width = Math.abs(drawEnd.x - drawStart.x);
    const height = Math.abs(drawEnd.y - drawStart.y);

    if (width > 0.02 && height > 0.02) {
      const newHotspot: Omit<Hotspot, 'id' | 'created_at' | 'video_id'> = {
        start_time: currentTime,
        end_time: Math.min(currentTime + 5, duration),
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        width: Math.max(0, Math.min(1, width)),
        height: Math.max(0, Math.min(1, height)),
        action: {
          type: 'popup',
          content: 'New hotspot',
          title: 'Hotspot',
        },
        trigger_type: 'click',
        image_url: null,
      };

      onHotspotCreate(newHotspot);
      setDrawingMode(false);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  };

  const updateSelectedHotspot = (field: string, value: any) => {
    if (!selectedHotspot) return;

    if (field.startsWith('action.')) {
      const actionField = field.split('.')[1];
      const updatedAction = { ...selectedHotspot.action, [actionField]: value };
      onHotspotUpdate(selectedHotspot.id, { action: updatedAction });
    } else {
      onHotspotUpdate(selectedHotspot.id, { [field]: value });
    }
  };

  useEffect(() => {
    if (selectedHotspot) {
      const updated = hotspots.find((h) => h.id === selectedHotspot.id);
      if (updated) {
        setSelectedHotspot(updated);
      }
    }
  }, [hotspots, selectedHotspot?.id]);

  return (
    <>
      {children && (
        <div className="relative">
          {children}

          {drawingMode && isDrawing && drawStart && drawEnd && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500 bg-opacity-20 rounded"
              style={{
                left: `${Math.min(drawStart.x, drawEnd.x) * 100}%`,
                top: `${Math.min(drawStart.y, drawEnd.y) * 100}%`,
                width: `${Math.abs(drawEnd.x - drawStart.x) * 100}%`,
                height: `${Math.abs(drawEnd.y - drawStart.y) * 100}%`,
              }}
            />
          )}

          {drawingMode && (
            <div
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}

          {selectedHotspot && !drawingMode && (
            <div
              className="absolute pointer-events-none border-2 border-yellow-400 rounded"
              style={{
                left: `${selectedHotspot.x * 100}%`,
                top: `${selectedHotspot.y * 100}%`,
                width: `${selectedHotspot.width * 100}%`,
                height: `${selectedHotspot.height * 100}%`,
                boxShadow: '0 0 0 2px rgba(250, 204, 21, 0.3)',
              }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Hotspot List</CardTitle>
                <CardDescription>
                  {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant={drawingMode ? "default" : "outline"}
                onClick={() => setDrawingMode(!drawingMode)}
              >
                <Plus className="w-4 h-4 mr-1" />
                {drawingMode ? 'Drawing...' : 'Add'}
              </Button>
            </div>
          </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 p-4">
              {hotspots.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hotspots yet. Click &quot;Add&quot; to create one.
                </p>
              ) : (
                hotspots.map((hotspot) => (
                  <button
                    key={hotspot.id}
                    onClick={() => setSelectedHotspot(hotspot)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedHotspot?.id === hotspot.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {(hotspot.action as any).title || 'Hotspot'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {hotspot.start_time.toFixed(1)}s - {hotspot.end_time.toFixed(1)}s
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Hotspot Properties</CardTitle>
          <CardDescription>
            {selectedHotspot
              ? 'Edit the selected hotspot'
              : 'Select a hotspot or draw a new one on the video'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedHotspot ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time (s)</Label>
                  <Input
                    id="start_time"
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration}
                    value={selectedHotspot.start_time}
                    onChange={(e) => updateSelectedHotspot('start_time', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (s)</Label>
                  <Input
                    id="end_time"
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration}
                    value={selectedHotspot.end_time}
                    onChange={(e) => updateSelectedHotspot('end_time', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Position & Size</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="x" className="text-xs">X (%)</Label>
                    <Input
                      id="x"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(selectedHotspot.x * 100)}
                      onChange={(e) => updateSelectedHotspot('x', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="y" className="text-xs">Y (%)</Label>
                    <Input
                      id="y"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(selectedHotspot.y * 100)}
                      onChange={(e) => updateSelectedHotspot('y', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="width" className="text-xs">Width (%)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={Math.round(selectedHotspot.width * 100)}
                      onChange={(e) => updateSelectedHotspot('width', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="height" className="text-xs">Height (%)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={Math.round(selectedHotspot.height * 100)}
                      onChange={(e) => updateSelectedHotspot('height', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={selectedHotspot.image_url || ''}
                  onChange={(e) => updateSelectedHotspot('image_url', e.target.value || null)}
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-slate-500">
                  Add a transparent PNG image to display instead of the default border
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action_type">Action Type</Label>
                  <Select
                    value={(selectedHotspot.action as HotspotAction).type}
                    onValueChange={(value) => {
                      const newAction: HotspotAction =
                        value === 'popup'
                          ? { type: 'popup', content: '', title: '' }
                          : value === 'jump'
                          ? { type: 'jump', timestamp: 0 }
                          : value === 'url'
                          ? { type: 'url', url: '' }
                          : { type: 'pause' };
                      onHotspotUpdate(selectedHotspot.id, { action: newAction });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popup">Show Popup</SelectItem>
                      <SelectItem value="jump">Jump to Timestamp</SelectItem>
                      <SelectItem value="url">Open URL</SelectItem>
                      <SelectItem value="pause">Pause Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger_type">Trigger Mode</Label>
                  <Select
                    value={selectedHotspot.trigger_type || 'click'}
                    onValueChange={(value) => updateSelectedHotspot('trigger_type', value)}
                  >
                    <SelectTrigger id="trigger_type">
                      <SelectValue placeholder="Select trigger mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="click">Click to Interact</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(selectedHotspot.action as HotspotAction).type === 'popup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="popup_title">Popup Title</Label>
                    <Input
                      id="popup_title"
                      value={(selectedHotspot.action as any).title || ''}
                      onChange={(e) => updateSelectedHotspot('action.title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="popup_content">Popup Content</Label>
                    <Textarea
                      id="popup_content"
                      value={(selectedHotspot.action as any).content || ''}
                      onChange={(e) => updateSelectedHotspot('action.content', e.target.value)}
                      rows={4}
                    />
                  </div>
                </>
              )}

              {(selectedHotspot.action as HotspotAction).type === 'jump' && (
                <div className="space-y-2">
                  <Label htmlFor="jump_timestamp">Jump to Time (s)</Label>
                  <Input
                    id="jump_timestamp"
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration}
                    value={(selectedHotspot.action as any).timestamp || 0}
                    onChange={(e) => updateSelectedHotspot('action.timestamp', parseFloat(e.target.value))}
                  />
                </div>
              )}

              {(selectedHotspot.action as HotspotAction).type === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={(selectedHotspot.action as any).url || ''}
                    onChange={(e) => updateSelectedHotspot('action.url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              <div className="pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onHotspotDelete(selectedHotspot.id);
                    setSelectedHotspot(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Hotspot
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {drawingMode
                  ? 'Draw a rectangle on the video to create a hotspot'
                  : 'Click "Add" button and draw on the video to create a hotspot'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
