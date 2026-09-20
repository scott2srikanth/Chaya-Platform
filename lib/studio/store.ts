import { create } from 'zustand';
import type { Project, Scene, SceneElement, ElementType, Animation, ScriptLine, CharacterGesture, ReactionType, ShotType, ScriptTemplate, SceneCamera } from './types';
import { createDefaultProject, createDefaultScene, createElement, estimateSpeechDuration, createSceneCamera, SCRIPT_TEMPLATES } from './types';
import { saveProject as persistProject, loadProject, listProjects } from './db';
import type { PresetName } from './presets';
import { PRESETS } from './presets';
import type { CameraFrame } from './character-animator';
import { computeCameraFromSceneCamera } from './character-animator';
import { getCharacter } from './characters';
import { getRiggedCharacter, BUILT_IN_RIGGED_CHARACTERS } from './built-in-rigs';
import type { Pose } from './rig';
import type { AnimationClip, Keyframe } from './clip-engine';
import { insertKeyframe, removeKeyframe, updateKeyframe } from './clip-engine';

interface StudioState {
  project: Project | null;
  activeSceneId: string | null;
  selectedElementId: string | null;
  canvasZoom: number;
  canvasPanX: number;
  canvasPanY: number;
  currentTime: number;
  isPlaying: boolean;
  projectList: Project[];
  isSaving: boolean;
  activeScriptLineId: string | null;
  playbackTime: number;
  speechProgress: number;
  activeSpeechText: string;
  activeShot: ShotType;
  cameraFrame: CameraFrame | null;
  speakingElementId: string | null;
  speechSupported: boolean;
  activeCameraId: string | null;
  cameraTransitionElapsed: number;
  prevCameraFrame: CameraFrame | null;

  studioWorkspace: 'scene' | 'characters' | 'pose-editor';
  poseEditorCharId: string | null;
  customPoses: Record<string, Pose[]>;

  animationClips: AnimationClip[];
  clipPlaybackTime: number;
  isClipPlaying: boolean;

  addClip: (clip: AnimationClip) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<AnimationClip>) => void;
  addKeyframeToClip: (clipId: string, kf: Keyframe) => void;
  removeKeyframeFromClip: (clipId: string, kfId: string) => void;
  updateKeyframeInClip: (clipId: string, kfId: string, updates: Partial<Keyframe>) => void;
  toggleClipPlayback: () => void;
  scrubClip: (time: number) => void;
  getClipForElement: (elementId: string) => AnimationClip | undefined;

  setWorkspace: (workspace: StudioState['studioWorkspace']) => void;
  openPoseEditor: (charId: string) => void;
  addRiggedCharacterElement: (riggedCharId: string) => void;
  savePose: (charId: string, pose: Pose) => void;

  newProject: (name: string) => void;
  openProject: (id: string) => Promise<void>;
  refreshProjectList: () => Promise<void>;
  saveProject: () => Promise<void>;
  setProjectName: (name: string) => void;

  activeScene: () => Scene | null;
  selectScene: (id: string) => void;
  addScene: () => void;
  removeScene: (id: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;

  addElement: (type: ElementType) => void;
  addCharacterElement: (characterId: string, name: string) => void;
  selectElement: (id: string | null) => void;
  updateElement: (id: string, updates: Partial<SceneElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElementOrder: (id: string, direction: 'up' | 'down') => void;

  addAnimation: (elementId: string, animation: Animation) => void;
  removeAnimation: (elementId: string, animationId: string) => void;
  updateAnimation: (elementId: string, animationId: string, updates: Partial<Animation>) => void;
  applyPreset: (elementId: string, preset: PresetName, startTime?: number, duration?: number) => void;
  clearAnimations: (elementId: string) => void;

  addScriptLine: (characterElementId: string) => void;
  removeScriptLine: (lineId: string) => void;
  updateScriptLine: (lineId: string, updates: Partial<ScriptLine>) => void;
  reorderScriptLine: (lineId: string, direction: 'up' | 'down') => void;
  applyTemplate: (templateId: string) => void;

  addCamera: (partial?: Partial<SceneCamera>) => string;
  removeCamera: (id: string) => void;
  updateCamera: (id: string, updates: Partial<SceneCamera>) => void;
  duplicateCamera: (id: string) => string | null;

  previewScript: () => void;
  stopPreview: () => void;
  tickPlayback: (dt: number) => void;
  setCameraFrame: (frame: CameraFrame) => void;

  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (x: number, y: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
}

function updateSceneInProject(project: Project, sceneId: string, updater: (scene: Scene) => Scene): Project {
  return { ...project, scenes: project.scenes.map((s) => (s.id === sceneId ? updater(s) : s)) };
}

function updateElementInScene(scene: Scene, elementId: string, updater: (el: SceneElement) => SceneElement): Scene {
  return { ...scene, elements: scene.elements.map((e) => (e.id === elementId ? updater(e) : e)) };
}

let speechQueue: SpeechSynthesisUtterance[] = [];
let currentLineStartTime = 0;
let currentLineEstDuration = 2;

function pickVoice(gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const langVoices = voices.filter((v) => v.lang.startsWith('en'));
  const pool = langVoices.length > 0 ? langVoices : voices;
  const nameHint = gender === 'female'
    ? pool.find((v) => /female|zira|samantha|victoria|karen|fiona/i.test(v.name))
    : pool.find((v) => /male|david|daniel|james|george|thomas/i.test(v.name));
  return nameHint || pool[gender === 'female' ? Math.min(1, pool.length - 1) : 0];
}

export const useStudioStore = create<StudioState>((set, get) => ({
  project: null,
  activeSceneId: null,
  selectedElementId: null,
  canvasZoom: 0.5,
  canvasPanX: 0,
  canvasPanY: 0,
  currentTime: 0,
  isPlaying: false,
  projectList: [],
  isSaving: false,
  activeScriptLineId: null,
  playbackTime: 0,
  speechProgress: 0,
  activeSpeechText: '',
  activeShot: 'wide',
  cameraFrame: null,
  speakingElementId: null,
  speechSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  activeCameraId: null,
  cameraTransitionElapsed: 0,
  prevCameraFrame: null,

  studioWorkspace: 'scene',
  poseEditorCharId: null,
  customPoses: {},

  animationClips: [],
  clipPlaybackTime: 0,
  isClipPlaying: false,

  addClip: (clip) => set((s) => ({ animationClips: [...s.animationClips, clip] })),
  removeClip: (clipId) => set((s) => ({ animationClips: s.animationClips.filter((c) => c.id !== clipId) })),
  updateClip: (clipId, updates) => set((s) => ({
    animationClips: s.animationClips.map((c) => c.id === clipId ? { ...c, ...updates } : c),
  })),
  addKeyframeToClip: (clipId, kf) => set((s) => ({
    animationClips: s.animationClips.map((c) => c.id === clipId ? insertKeyframe(c, kf) : c),
  })),
  removeKeyframeFromClip: (clipId, kfId) => set((s) => ({
    animationClips: s.animationClips.map((c) => c.id === clipId ? removeKeyframe(c, kfId) : c),
  })),
  updateKeyframeInClip: (clipId, kfId, updates) => set((s) => ({
    animationClips: s.animationClips.map((c) => c.id === clipId ? updateKeyframe(c, kfId, updates) : c),
  })),
  toggleClipPlayback: () => {
    const s = get();
    if (s.isClipPlaying) {
      set({ isClipPlaying: false });
    } else {
      set({ isClipPlaying: true, clipPlaybackTime: 0 });
      let last = performance.now();
      const tick = (now: number) => {
        const state = useStudioStore.getState();
        if (!state.isClipPlaying) return;
        const dt = (now - last) / 1000;
        last = now;
        const maxDur = Math.max(1, ...state.animationClips.map((c) => c.duration));
        let next = state.clipPlaybackTime + dt;
        if (next > maxDur) next = 0;
        set({ clipPlaybackTime: next });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  },
  scrubClip: (time) => set({ clipPlaybackTime: Math.max(0, time), isClipPlaying: false }),
  getClipForElement: (elementId) => get().animationClips.find((c) => c.elementId === elementId),

  setWorkspace: (workspace) => set({ studioWorkspace: workspace }),

  openPoseEditor: (charId) => set({ studioWorkspace: 'pose-editor', poseEditorCharId: charId }),

  addRiggedCharacterElement: (riggedCharId) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const rigChar = getRiggedCharacter(riggedCharId);
    if (!rigChar) return;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    if (!scene) return;
    const charCount = scene.elements.filter((e) => e.type === 'character').length;
    const xPos = charCount === 0 ? 400 : charCount === 1 ? 1520 : 960;
    const el = createElement('character', {
      characterId: rigChar.id,
      name: rigChar.name,
      x: xPos - 120,
      y: 340,
      facingRight: charCount % 2 === 0,
    });
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, elements: [...s.elements, el] })),
      selectedElementId: el.id,
      studioWorkspace: 'scene',
    });
  },

  savePose: (charId, pose) => {
    set((s) => ({
      customPoses: {
        ...s.customPoses,
        [charId]: [...(s.customPoses[charId] ?? []), pose],
      },
    }));
  },

  newProject: (name) => {
    const project = createDefaultProject(name);
    set({ project, activeSceneId: project.scenes[0]?.id ?? null, selectedElementId: null, currentTime: 0, canvasZoom: 0.5, canvasPanX: 0, canvasPanY: 0 });
  },

  openProject: async (id) => {
    const project = await loadProject(id);
    if (project) set({ project, activeSceneId: project.scenes[0]?.id ?? null, selectedElementId: null, currentTime: 0 });
  },

  refreshProjectList: async () => set({ projectList: await listProjects() }),

  saveProject: async () => {
    const { project } = get();
    if (!project) return;
    set({ isSaving: true });
    try { await persistProject(project); } finally { set({ isSaving: false }); }
  },

  setProjectName: (name) => {
    const { project } = get();
    if (project) set({ project: { ...project, metadata: { ...project.metadata, name } } });
  },

  activeScene: () => {
    const { project, activeSceneId } = get();
    return project?.scenes.find((s) => s.id === activeSceneId) ?? null;
  },

  selectScene: (id) => set({ activeSceneId: id, selectedElementId: null, currentTime: 0, isPlaying: false }),

  addScene: () => {
    const { project } = get();
    if (!project) return;
    const scene = createDefaultScene(`Scene ${project.scenes.length + 1}`);
    set({ project: { ...project, scenes: [...project.scenes, scene] }, activeSceneId: scene.id, selectedElementId: null });
  },

  removeScene: (id) => {
    const { project, activeSceneId } = get();
    if (!project || project.scenes.length <= 1) return;
    const filtered = project.scenes.filter((s) => s.id !== id);
    set({ project: { ...project, scenes: filtered }, activeSceneId: activeSceneId === id ? filtered[0].id : activeSceneId, selectedElementId: null });
  },

  updateScene: (id, updates) => {
    const { project } = get();
    if (project) set({ project: updateSceneInProject(project, id, (s) => ({ ...s, ...updates })) });
  },

  addElement: (type) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const el = createElement(type);
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, elements: [...s.elements, el] })), selectedElementId: el.id });
  },

  addCharacterElement: (characterId, name) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    if (!scene) return;
    const charCount = scene.elements.filter((e) => e.type === 'character').length;
    const xPos = charCount === 0 ? 400 : charCount === 1 ? 1520 : 960;
    const el = createElement('character', { characterId, name, x: xPos - 120, y: 340, facingRight: charCount % 2 === 0 });
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, elements: [...s.elements, el] })), selectedElementId: el.id });
  },

  selectElement: (id) => set({ selectedElementId: id }),

  updateElement: (id, updates) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, id, (e) => ({ ...e, ...updates }))) });
  },

  removeElement: (id) => {
    const { project, activeSceneId, selectedElementId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => ({
        ...s, elements: s.elements.filter((e) => e.id !== id), script: s.script.filter((l) => l.characterElementId !== id),
      })),
      selectedElementId: selectedElementId === id ? null : selectedElementId,
    });
  },

  duplicateElement: (id) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    const el = scene?.elements.find((e) => e.id === id);
    if (!el) return;
    const dup: SceneElement = { ...el, id: crypto.randomUUID(), name: `${el.name} copy`, x: el.x + 30, y: el.y + 30, animations: el.animations.map((a) => ({ ...a, id: crypto.randomUUID() })) };
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, elements: [...s.elements, dup] })), selectedElementId: dup.id });
  },

  moveElementOrder: (id, direction) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => {
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx < 0) return s;
        const swap = direction === 'up' ? idx + 1 : idx - 1;
        if (swap < 0 || swap >= s.elements.length) return s;
        const arr = [...s.elements];
        [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
        return { ...s, elements: arr };
      }),
    });
  },

  addAnimation: (elementId, animation) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, elementId, (e) => ({ ...e, animations: [...e.animations, animation] }))) });
  },
  removeAnimation: (elementId, animationId) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, elementId, (e) => ({ ...e, animations: e.animations.filter((a) => a.id !== animationId) }))) });
  },
  updateAnimation: (elementId, animationId, updates) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, elementId, (e) => ({ ...e, animations: e.animations.map((a) => (a.id === animationId ? { ...a, ...updates } : a)) }))) });
  },
  applyPreset: (elementId, presetName, startTime, duration) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    const el = scene?.elements.find((e) => e.id === elementId);
    if (!el) return;
    const preset = PRESETS[presetName];
    if (!preset) return;
    set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, elementId, (e) => ({ ...e, animations: [...e.animations, ...preset.generate(el, startTime ?? 0, duration ?? 0.8)] }))) });
  },
  clearAnimations: (elementId) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => updateElementInScene(s, elementId, (e) => ({ ...e, animations: [] }))) });
  },

  addScriptLine: (characterElementId) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const line: ScriptLine = { id: crypto.randomUUID(), characterElementId, text: '', gesture: 'talking', reaction: 'listening', shot: 'medium', duration: 2 };
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, script: [...s.script, line] })) });
  },

  removeScriptLine: (lineId) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, script: s.script.filter((l) => l.id !== lineId) })) });
  },

  updateScriptLine: (lineId, updates) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => ({
        ...s,
        script: s.script.map((l) => {
          if (l.id !== lineId) return l;
          const updated = { ...l, ...updates };
          if (updates.text !== undefined) updated.duration = estimateSpeechDuration(updates.text);
          return updated;
        }),
      })),
    });
  },

  reorderScriptLine: (lineId, direction) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => {
        const idx = s.script.findIndex((l) => l.id === lineId);
        if (idx < 0) return s;
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= s.script.length) return s;
        const arr = [...s.script];
        [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
        return { ...s, script: arr };
      }),
    });
  },

  applyTemplate: (templateId) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    if (!scene) return;
    const tpl = SCRIPT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const charEls = scene.elements.filter((e) => e.type === 'character');
    if (charEls.length < tpl.minCharacters) return;

    const newLines: ScriptLine[] = tpl.lines.map((line, i) => ({
      ...line,
      id: crypto.randomUUID(),
      characterElementId: charEls[tpl.characterIndex[i] % charEls.length].id,
      duration: estimateSpeechDuration(line.text),
    }));

    // Remove old prop elements
    const keptElements = scene.elements.filter((e) => !e.isProp);

    // Create prop elements, split by layer
    const makeProp = (p: typeof tpl.props[number]) =>
      createElement(p.type, {
        name: p.name,
        x: p.x, y: p.y,
        width: p.width, height: p.height,
        fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth,
        borderRadius: p.borderRadius,
        rotation: p.rotation ?? 0,
        opacity: p.opacity ?? 1,
        locked: true,
        isProp: true,
      });
    const bgProps = tpl.props.filter((p) => p.layer !== 'foreground').map(makeProp);
    const fgProps = tpl.props.filter((p) => p.layer === 'foreground').map(makeProp);

    // Reposition and optionally resize characters
    const updatedElements = keptElements.map((el) => {
      if (el.type !== 'character') return el;
      const charIdx = charEls.findIndex((ce) => ce.id === el.id);
      if (charIdx < 0 || charIdx >= tpl.characterPositions.length) return el;
      const pos = tpl.characterPositions[charIdx];
      const w = pos.width ?? el.width;
      const h = pos.height ?? el.height;
      return { ...el, x: pos.x - w / 2, y: pos.y, width: w, height: h, facingRight: pos.facingRight, seated: pos.seated };
    });

    // Layer order: background props -> characters -> foreground props
    const finalElements = [...bgProps, ...updatedElements, ...fgProps];

    set({
      project: updateSceneInProject(project, activeSceneId, (s) => ({
        ...s,
        background: tpl.background,
        script: newLines,
        elements: finalElements,
      })),
    });
  },

  addCamera: (partial) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return '';
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    if (!scene) return '';
    const idx = scene.cameras.length + 1;
    const cam = createSceneCamera(`Camera ${idx}`, project.settings.width, project.settings.height, partial);
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, cameras: [...s.cameras, cam] })) });
    return cam.id;
  },

  removeCamera: (id) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: updateSceneInProject(project, activeSceneId, (s) => ({
        ...s,
        cameras: s.cameras.length <= 1 ? s.cameras : s.cameras.filter((c) => c.id !== id),
        script: s.script.map((l) => l.cameraId === id ? { ...l, cameraId: undefined } : l),
      })),
    });
  },

  updateCamera: (id, updates) => {
    const { project, activeSceneId } = get();
    if (project && activeSceneId) {
      set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...updates } : c)) })) });
    }
  },

  duplicateCamera: (id) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return null;
    const scene = project.scenes.find((s) => s.id === activeSceneId);
    const cam = scene?.cameras.find((c) => c.id === id);
    if (!cam) return null;
    const dup: SceneCamera = { ...cam, id: crypto.randomUUID(), name: `${cam.name} copy` };
    set({ project: updateSceneInProject(project, activeSceneId, (s) => ({ ...s, cameras: [...s.cameras, dup] })) });
    return dup.id;
  },

  previewScript: () => {
    const scene = get().activeScene();
    if (!scene || scene.script.length === 0) return;
    get().stopPreview();

    const lines = scene.script.filter((l) => l.text.trim());
    if (lines.length === 0) return;

    set({ isPlaying: true, playbackTime: 0, currentTime: 0, cameraFrame: null, activeCameraId: null, cameraTransitionElapsed: 0, prevCameraFrame: null });

    scene.elements.forEach((el) => {
      if (el.type === 'character') get().updateElement(el.id, { characterGesture: 'idle', characterReaction: 'none' });
    });

    const playLine = (idx: number) => {
      if (idx >= lines.length || !get().isPlaying) { get().stopPreview(); return; }
      const line = lines[idx];
      set({ activeScriptLineId: line.id, activeShot: line.shot, activeSpeechText: line.text, speechProgress: 0, speakingElementId: line.characterElementId, activeCameraId: line.cameraId || null, cameraTransitionElapsed: 0, prevCameraFrame: get().cameraFrame });
      currentLineStartTime = performance.now();
      currentLineEstDuration = line.duration * 1000;

      get().updateElement(line.characterElementId, { characterGesture: line.gesture, characterReaction: 'none' });

      scene.elements.forEach((el) => {
        if (el.type === 'character' && el.id !== line.characterElementId) {
          get().updateElement(el.id, { characterGesture: 'idle', characterReaction: line.reaction });
        }
      });

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const charEl = scene.elements.find((e) => e.id === line.characterElementId);
        const charDef = charEl?.characterId ? getCharacter(charEl.characterId) : null;

        const utt = new SpeechSynthesisUtterance(line.text);
        utt.rate = charDef?.voiceRate ?? 0.95;
        utt.pitch = charDef?.voicePitch ?? 1.0;

        const voice = pickVoice(charDef?.gender ?? 'male');
        if (voice) utt.voice = voice;

        utt.addEventListener('boundary', (e: SpeechSynthesisEvent) => {
          if (e.charIndex !== undefined && line.text.length > 0) set({ speechProgress: e.charIndex / line.text.length });
        });
        utt.onend = () => {
          get().updateElement(line.characterElementId, { characterGesture: 'idle', characterReaction: 'none' });
          scene.elements.forEach((el) => {
            if (el.type === 'character' && el.id !== line.characterElementId) get().updateElement(el.id, { characterReaction: 'none' });
          });
          set({ activeShot: 'wide', speechProgress: 1, speakingElementId: null });
          setTimeout(() => playLine(idx + 1), 400);
        };
        utt.onerror = () => {
          get().updateElement(line.characterElementId, { characterGesture: 'idle' });
          setTimeout(() => playLine(idx + 1), 400);
        };
        speechQueue.push(utt);
        window.speechSynthesis.speak(utt);
      } else {
        setTimeout(() => {
          get().updateElement(line.characterElementId, { characterGesture: 'idle' });
          set({ activeShot: 'wide', speakingElementId: null });
          setTimeout(() => playLine(idx + 1), 400);
        }, line.duration * 1000);
      }
    };

    playLine(0);
  },

  stopPreview: () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    speechQueue = [];
    const scene = get().activeScene();
    if (scene) {
      scene.elements.forEach((el) => {
        if (el.type === 'character') get().updateElement(el.id, { characterGesture: 'idle', characterReaction: 'none' });
      });
    }
    set({ isPlaying: false, activeScriptLineId: null, playbackTime: 0, speechProgress: 0, activeSpeechText: '', activeShot: 'wide', cameraFrame: null, speakingElementId: null, currentTime: 0, activeCameraId: null, cameraTransitionElapsed: 0, prevCameraFrame: null });
  },

  tickPlayback: (dt) => {
    const elapsed = performance.now() - currentLineStartTime;
    set((s) => ({ playbackTime: s.playbackTime + dt, speechProgress: Math.min(1, elapsed / Math.max(100, currentLineEstDuration)), cameraTransitionElapsed: s.cameraTransitionElapsed + dt }));
  },

  setCameraFrame: (frame) => set({ cameraFrame: frame }),
  setCanvasZoom: (zoom) => set({ canvasZoom: Math.max(0.1, Math.min(3, zoom)) }),
  setCanvasPan: (x, y) => set({ canvasPanX: x, canvasPanY: y }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlayback: () => { get().isPlaying ? get().stopPreview() : get().previewScript(); },
  stopPlayback: () => get().stopPreview(),
}));
