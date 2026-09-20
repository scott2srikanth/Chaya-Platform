'use client';

import { useState, useEffect, useRef } from 'react';
import { Hotspot, HotspotAction } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface HotspotLayerProps {
  hotspots: Hotspot[];
  currentTime: number;
  onJumpToTime?: (time: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  editable?: boolean;
  onHotspotClick?: (hotspot: Hotspot) => void;
}

export function HotspotLayer({
  hotspots,
  currentTime,
  onJumpToTime,
  onPause,
  onResume,
  editable = false,
  onHotspotClick,
}: HotspotLayerProps) {
  const [activePopup, setActivePopup] = useState<{ title?: string; content: string } | null>(null);
  const triggeredHotspotsRef = useRef<Set<string>>(new Set());

  const activeHotspots = hotspots.filter(
    (h) => currentTime >= h.start_time && currentTime <= h.end_time
  );

  const handleHotspotClick = (hotspot: Hotspot) => {
    if (editable && onHotspotClick) {
      onHotspotClick(hotspot);
      return;
    }

    const action = hotspot.action as HotspotAction;

    switch (action.type) {
      case 'popup':
        setActivePopup({ title: action.title, content: action.content });
        onPause?.();
        break;
      case 'jump':
        onJumpToTime?.(action.timestamp);
        break;
      case 'url':
        window.location.href = action.url;
        break;
      case 'pause':
        onPause?.();
        break;
    }
  };

  useEffect(() => {
    if (editable) return;

    activeHotspots.forEach((hotspot) => {
      if (hotspot.trigger_type === 'automatic' && !triggeredHotspotsRef.current.has(hotspot.id)) {
        triggeredHotspotsRef.current.add(hotspot.id);
        handleHotspotClick(hotspot);
      }
    });

    hotspots.forEach((hotspot) => {
      if (currentTime < hotspot.start_time || currentTime > hotspot.end_time) {
        triggeredHotspotsRef.current.delete(hotspot.id);
      }
    });
  }, [activeHotspots.length, currentTime, editable, hotspots, onPause, onJumpToTime]);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        {activeHotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            className={`absolute pointer-events-auto transition-all duration-200 hover:scale-105 group ${
              !editable && !hotspot.image_url ? 'animate-pulse-slow' : ''
            }`}
            style={{
              left: `${hotspot.x * 100}%`,
              top: `${hotspot.y * 100}%`,
              width: `${hotspot.width * 100}%`,
              height: `${hotspot.height * 100}%`,
              border: hotspot.image_url
                ? 'none'
                : editable
                ? '2px solid #3b82f6'
                : hotspot.trigger_type === 'automatic'
                ? '3px solid rgba(34, 197, 94, 0.9)'
                : '3px solid rgba(59, 130, 246, 0.9)',
              backgroundColor: hotspot.image_url
                ? 'transparent'
                : editable
                ? 'rgba(59, 130, 246, 0.2)'
                : hotspot.trigger_type === 'automatic'
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(59, 130, 246, 0.2)',
              borderRadius: hotspot.image_url ? '0' : '8px',
              cursor: 'pointer',
              backdropFilter: hotspot.image_url ? 'none' : 'blur(2px)',
              boxShadow: hotspot.image_url
                ? 'none'
                : editable
                ? 'none'
                : hotspot.trigger_type === 'automatic'
                ? '0 0 15px rgba(34, 197, 94, 0.5)'
                : '0 0 15px rgba(59, 130, 246, 0.5)',
            }}
            onClick={() => handleHotspotClick(hotspot)}
            aria-label={`Hotspot at ${hotspot.start_time}s`}
          >
            {hotspot.image_url ? (
              <img
                src={hotspot.image_url}
                alt="Hotspot overlay"
                className="w-full h-full object-contain pointer-events-none"
                style={{ userSelect: 'none' }}
              />
            ) : (
              <>
                {!editable && hotspot.trigger_type === 'click' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Click to interact
                    </span>
                  </div>
                )}
                {!editable && hotspot.trigger_type === 'automatic' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-lg pointer-events-none">
                      Auto-trigger
                    </span>
                  </div>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!activePopup} onOpenChange={(open) => {
        if (!open) {
          setActivePopup(null);
          onResume?.();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            {activePopup?.title && <DialogTitle>{activePopup.title}</DialogTitle>}
            <DialogDescription className="text-base pt-2">
              {activePopup?.content}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => {
              setActivePopup(null);
              onResume?.();
            }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
