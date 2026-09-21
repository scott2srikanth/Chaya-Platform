import { missingVoiceLines, recordMissingVoices, applyRecordedVoices } from "./prepare-voices";
import {
  parseProject,
  nativeCharacters,
  projectDuration,
  locateScene,
  resolveCharacter,
} from "./project";
import { scriptAt } from "./frame";
import { create } from "zustand";
import type {
  Project,
  Scene,
  SceneElement,
  ElementType,
  Animation,
  ScriptLine,
  CharacterGesture,
  ReactionType,
  ShotType,
  ScriptTemplate,
  SceneCamera,
} from "./types";
import {
  createDefaultProject,
  createDefaultScene,
  createElement,
  estimateSpeechDuration,
  createSceneCamera,
  SCRIPT_TEMPLATES,
} from "./types";
import {
  saveProject as persistProject,
  loadProject,
  listProjects,
  loadLibrary,
} from "./db";
import type { PresetName } from "./presets";
import { PRESETS } from "./presets";
import type { CameraFrame } from "./character-animator";
import { computeCameraFromSceneCamera } from "./character-animator";
import { getCharacter } from "./characters";
import {
  getRiggedCharacter,
  BUILT_IN_RIGGED_CHARACTERS,
} from "./built-in-rigs";
import type { Pose } from "./rig";
import type { AnimationClip, Keyframe } from "./clip-engine";
import { insertKeyframe, removeKeyframe, updateKeyframe } from "./clip-engine";

interface StudioState {
  beginEdit: () => void;
  endEdit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  speed: number;
  loop: boolean;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  replaceProject: (project: Project) => void;
  editProject: (edit: (project: Project) => void) => void;
  closeProject: () => void;
  seek: (time: number) => void;
  character: (id: string) => import("./rig").RiggedCharacter | undefined;

  project: Project | null;
  activeSceneId: string | null;
  selectedElementId: string | null;
  canvasZoom: number;
  canvasPanX: number;
  canvasPanY: number;
  currentTime: number;
  livePlaybackEnd: number | null;
  playPresenterAction: (start:number,end:number)=>void;
  isPlaying: boolean;
  voicePreparation: string;
  voiceError: string;
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

  studioWorkspace: "scene" | "characters" | "pose-editor" | "assets" | "ai";
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
  updateKeyframeInClip: (
    clipId: string,
    kfId: string,
    updates: Partial<Keyframe>,
  ) => void;
  toggleClipPlayback: () => void;
  scrubClip: (time: number) => void;
  getClipForElement: (elementId: string) => AnimationClip | undefined;

  setWorkspace: (workspace: StudioState["studioWorkspace"]) => void;
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
  moveElementOrder: (id: string, direction: "up" | "down") => void;

  addAnimation: (elementId: string, animation: Animation) => void;
  removeAnimation: (elementId: string, animationId: string) => void;
  updateAnimation: (
    elementId: string,
    animationId: string,
    updates: Partial<Animation>,
  ) => void;
  applyPreset: (
    elementId: string,
    preset: PresetName,
    startTime?: number,
    duration?: number,
  ) => void;
  clearAnimations: (elementId: string) => void;

  addScriptLine: (characterElementId: string) => void;
  removeScriptLine: (lineId: string) => void;
  updateScriptLine: (lineId: string, updates: Partial<ScriptLine>) => void;
  reorderScriptLine: (lineId: string, direction: "up" | "down") => void;
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

function updateSceneInProject(
  project: Project,
  sceneId: string,
  updater: (scene: Scene) => Scene,
): Project {
  return {
    ...project,
    scenes: project.scenes.map((s) => (s.id === sceneId ? updater(s) : s)),
  };
}

function updateElementInScene(
  scene: Scene,
  elementId: string,
  updater: (el: SceneElement) => SceneElement,
): Scene {
  return {
    ...scene,
    elements: scene.elements.map((e) => (e.id === elementId ? updater(e) : e)),
  };
}

let playbackRequest = 0;
let speechQueue: SpeechSynthesisUtterance[] = [];
let currentLineStartTime = 0;
let currentLineEstDuration = 2;

function pickVoice(gender: "male" | "female"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const langVoices = voices.filter((v) => v.lang.startsWith("en"));
  const pool = langVoices.length > 0 ? langVoices : voices;
  const nameHint =
    gender === "female"
      ? pool.find((v) =>
          /female|zira|samantha|victoria|karen|fiona/i.test(v.name),
        )
      : pool.find((v) => /male|david|daniel|james|george|thomas/i.test(v.name));
  return (
    nameHint || pool[gender === "female" ? Math.min(1, pool.length - 1) : 0]
  );
}

let history: Project[] = [],
  future: Project[] = [],
  lastEdit = 0,
  grouping = false,
  grouped = false;
export const useStudioStore = create<StudioState>((rawSet, get) => {
  const set = (
    input: Partial<StudioState> | ((s: StudioState) => Partial<StudioState>),
  ) => {
    const old = get();
    const patch = typeof input === "function" ? input(old) : input;
    if (old?.project && ("animationClips" in patch || "customPoses" in patch)) {
      const project = { ...(patch.project ?? old.project) };
      if (patch.animationClips) project.clips = patch.animationClips;
      if (patch.customPoses)
        project.characters = (project.characters ?? nativeCharacters()).map(
          (c) => ({
            ...c,
            poses: [
              ...c.poses.filter((p) => p.category !== "custom"),
              ...(patch.customPoses?.[c.id] ?? []),
            ],
          }),
        );
      patch.project = project;
    }
    if (patch.project && patch.project !== old?.project) {
      if (old?.project) {
        const now = Date.now();
        if (!grouping || !grouped) history.push(old.project);
        grouped = true;
        lastEdit = now;
        history = history.slice(-80);
        future = [];
      }
      patch.animationClips = patch.project.clips ?? [];
      patch.customPoses = Object.fromEntries(
        (patch.project.characters ?? []).map((c) => [
          c.id,
          c.poses.filter((p) => p.category === "custom"),
        ]),
      );
      patch.canUndo = history.length > 0;
      patch.canRedo = false;
    }
    rawSet(patch);
  };
  return {
    canUndo: false,
    canRedo: false,
    speed: 1,
    loop: false,
    beginEdit: () => {
      grouping = true;
      grouped = false;
    },
    endEdit: () => {
      grouping = false;
      grouped = false;
    },
    setSpeed: (speed) => set({ speed }),
    setLoop: (loop) => set({ loop }),
    character: (id) =>
      get().project
        ? resolveCharacter(get().project!, id)
        : getRiggedCharacter(id),
    editProject: (edit) => {
      const project = get().project;
      if (!project) return;
      const next = structuredClone(project);
      edit(next);
      set({ project: next });
    },
    replaceProject: (input) => {
      playbackRequest++;
      const project = parseProject(input);
      set({
        project,
        livePlaybackEnd:null,
        voicePreparation: "", voiceError: "",
        activeSceneId: project.scenes[0].id,
        currentTime: 0,
        playbackTime: 0,
        isPlaying: false,
        selectedElementId: null,
        studioWorkspace: "scene",
      });
      history = [];
      future = [];
      lastEdit = 0;
      grouping = false;
      grouped = false;
      rawSet({ canUndo: false, canRedo: false });
    },
    closeProject: () => {
      get().stopPreview();
      set({ project: null });
      history = [];
      future = [];
    },
    undo: () => {
      const prev = history.pop();
      if (!prev) return;
      const old = get().project;
      if (old) future.push(old);
      rawSet({
        project: prev,
        animationClips: prev.clips ?? [],
        canUndo: history.length > 0,
        canRedo: true,
        selectedElementId: null,
        isPlaying: false,
      });
      get().seek(get().playbackTime);
      lastEdit = 0;
    },
    redo: () => {
      const next = future.pop();
      if (!next) return;
      const old = get().project;
      if (old) history.push(old);
      rawSet({
        project: next,
        animationClips: next.clips ?? [],
        canUndo: true,
        canRedo: future.length > 0,
        selectedElementId: null,
        isPlaying: false,
      });
      get().seek(get().playbackTime);
      lastEdit = 0;
    },
    seek: (time) => {
      const project = get().project;
      if (!project) return;
      const t = Math.max(0, Math.min(time, projectDuration(project)));
      const f = locateScene(project, t);
      const script = scriptAt(f.scene, f.time);
      set({
        playbackTime: t,
        currentTime: f.time,
        clipPlaybackTime: f.time,
        activeSceneId: f.scene.id,
        activeScriptLineId: script?.line.id ?? null,
        activeSpeechText: script?.line.text ?? "",
        speechProgress: script?.progress ?? 0,
        speakingElementId: script?.line.characterElementId ?? null,
      });
    },
    livePlaybackEnd:null,
    playPresenterAction:(start,end)=>{
      playbackRequest++;
      get().seek(start);
      set({livePlaybackEnd:end,isPlaying:true,isClipPlaying:true,voicePreparation:""});
    },
    project: null,
    activeSceneId: null,
    selectedElementId: null,
    canvasZoom: 0.5,
    canvasPanX: 0,
    canvasPanY: 0,
    currentTime: 0,
    isPlaying: false,
    voicePreparation: "",
    voiceError: "",
    projectList: [],
    isSaving: false,
    activeScriptLineId: null,
    playbackTime: 0,
    speechProgress: 0,
    activeSpeechText: "",
    activeShot: "wide",
    cameraFrame: null,
    speakingElementId: null,
    speechSupported:
      typeof window !== "undefined" && "speechSynthesis" in window,
    activeCameraId: null,
    cameraTransitionElapsed: 0,
    prevCameraFrame: null,

    studioWorkspace: "scene",
    poseEditorCharId: null,
    customPoses: {},

    animationClips: [],
    clipPlaybackTime: 0,
    isClipPlaying: false,

    addClip: (clip) =>
      set((s) => ({ animationClips: [...s.animationClips, clip] })),
    removeClip: (clipId) =>
      set((s) => ({
        animationClips: s.animationClips.filter((c) => c.id !== clipId),
      })),
    updateClip: (clipId, updates) =>
      set((s) => ({
        animationClips: s.animationClips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c,
        ),
      })),
    addKeyframeToClip: (clipId, kf) =>
      set((s) => ({
        animationClips: s.animationClips.map((c) =>
          c.id === clipId ? insertKeyframe(c, kf) : c,
        ),
      })),
    removeKeyframeFromClip: (clipId, kfId) =>
      set((s) => ({
        animationClips: s.animationClips.map((c) =>
          c.id === clipId ? removeKeyframe(c, kfId) : c,
        ),
      })),
    updateKeyframeInClip: (clipId, kfId, updates) =>
      set((s) => ({
        animationClips: s.animationClips.map((c) =>
          c.id === clipId ? updateKeyframe(c, kfId, updates) : c,
        ),
      })),
    toggleClipPlayback: () => get().togglePlayback(),
    scrubClip: (time) => {
      const p = get().project;
      if (!p) return;
      const idx = p.scenes.findIndex((s) => s.id === get().activeSceneId);
      get().seek(
        p.scenes.slice(0, idx).reduce((n, s) => n + s.duration, 0) + time,
      );
      set({ isPlaying: false, isClipPlaying: false });
    },
    getClipForElement: (elementId) =>
      get().animationClips.find((c) => c.elementId === elementId),

    setWorkspace: (workspace) => set({ studioWorkspace: workspace }),

    openPoseEditor: (charId) =>
      set({ studioWorkspace: "pose-editor", poseEditorCharId: charId }),

    addRiggedCharacterElement: (riggedCharId) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      const rigChar = get().character(riggedCharId);
      if (!rigChar) return;
      const scene = project.scenes.find((s) => s.id === activeSceneId);
      if (!scene) return;
      const charCount = scene.elements.filter(
        (e) => e.type === "character",
      ).length;
      const xPos = charCount === 0 ? 400 : charCount === 1 ? 1520 : 960;
      const el = createElement("character", {
        characterId: rigChar.id,
        name: rigChar.name,
        x: xPos - 120,
        y: 340,
        facingRight: charCount % 2 === 0,
      });
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          elements: [...s.elements, el],
        })),
        selectedElementId: el.id,
        studioWorkspace: "scene",
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

    newProject: async (name) => {
      const library = await loadLibrary();
      get().replaceProject({
        ...createDefaultProject(name),
        characters: library.characters,
        assets: library.assets,
        templates: library.templates,
      });
    },
    openProject: async (id) => {
      const project = await loadProject(id);
      if (project) get().replaceProject(project);
    },
    refreshProjectList: async () => set({ projectList: await listProjects() }),

    saveProject: async () => {
      const { project } = get();
      if (!project) return;
      set({ isSaving: true });
      try {
        await persistProject(project);
      } finally {
        set({ isSaving: false });
      }
    },

    setProjectName: (name) => {
      const { project } = get();
      if (project)
        set({
          project: { ...project, metadata: { ...project.metadata, name } },
        });
    },

    activeScene: () => {
      const { project, activeSceneId } = get();
      return project?.scenes.find((s) => s.id === activeSceneId) ?? null;
    },

    selectScene: (id) => {
      const p = get().project;
      if (!p) return;
      const idx = p.scenes.findIndex((s) => s.id === id);
      get().seek(p.scenes.slice(0, idx).reduce((n, s) => n + s.duration, 0));
      set({ selectedElementId: null, isPlaying: false });
    },

    addScene: () => {
      const { project } = get();
      if (!project) return;
      const scene = createDefaultScene(`Scene ${project.scenes.length + 1}`);
      set({
        project: { ...project, scenes: [...project.scenes, scene] },
        activeSceneId: scene.id,
        selectedElementId: null,
      });
      get().selectScene(scene.id);
    },

    removeScene: (id) => {
      const { project, activeSceneId } = get();
      if (!project || project.scenes.length <= 1) return;
      const filtered = project.scenes.filter((s) => s.id !== id);
      set({
        project: { ...project, scenes: filtered },
        activeSceneId: activeSceneId === id ? filtered[0].id : activeSceneId,
        selectedElementId: null,
      });
      get().selectScene(get().activeSceneId!);
    },

    updateScene: (id, updates) => {
      const { project } = get();
      if (project)
        set({
          project: updateSceneInProject(project, id, (s) => ({
            ...s,
            ...updates,
          })),
        });
    },

    addElement: (type) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      const el = createElement(type);
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          elements: [...s.elements, el],
        })),
        selectedElementId: el.id,
      });
    },

    addCharacterElement: (characterId, name) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      const scene = project.scenes.find((s) => s.id === activeSceneId);
      if (!scene) return;
      const charCount = scene.elements.filter(
        (e) => e.type === "character",
      ).length;
      const xPos = charCount === 0 ? 400 : charCount === 1 ? 1520 : 960;
      const el = createElement("character", {
        characterId,
        name,
        x: xPos - 120,
        y: 340,
        facingRight: charCount % 2 === 0,
      });
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          elements: [...s.elements, el],
        })),
        selectedElementId: el.id,
      });
    },

    selectElement: (id) => set({ selectedElementId: id }),

    updateElement: (id, updates) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) =>
            updateElementInScene(s, id, (e) => ({ ...e, ...updates })),
          ),
        });
    },

    removeElement: (id) => {
      const { project, activeSceneId, selectedElementId } = get();
      if (!project || !activeSceneId) return;
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          elements: s.elements.filter((e) => e.id !== id),
          script: s.script.filter((l) => l.characterElementId !== id),
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
      const dup: SceneElement = {
        ...el,
        id: crypto.randomUUID(),
        name: `${el.name} copy`,
        x: el.x + 30,
        y: el.y + 30,
        animations: el.animations.map((a) => ({
          ...a,
          id: crypto.randomUUID(),
        })),
      };
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          elements: [...s.elements, dup],
        })),
        selectedElementId: dup.id,
      });
    },

    moveElementOrder: (id, direction) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => {
          const idx = s.elements.findIndex((e) => e.id === id);
          if (idx < 0) return s;
          const swap = direction === "up" ? idx + 1 : idx - 1;
          if (swap < 0 || swap >= s.elements.length) return s;
          const arr = [...s.elements];
          [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
          return { ...s, elements: arr };
        }),
      });
    },

    addAnimation: (elementId, animation) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) =>
            updateElementInScene(s, elementId, (e) => ({
              ...e,
              animations: [...e.animations, animation],
            })),
          ),
        });
    },
    removeAnimation: (elementId, animationId) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) =>
            updateElementInScene(s, elementId, (e) => ({
              ...e,
              animations: e.animations.filter((a) => a.id !== animationId),
            })),
          ),
        });
    },
    updateAnimation: (elementId, animationId, updates) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) =>
            updateElementInScene(s, elementId, (e) => ({
              ...e,
              animations: e.animations.map((a) =>
                a.id === animationId ? { ...a, ...updates } : a,
              ),
            })),
          ),
        });
    },
    applyPreset: (elementId, presetName, startTime, duration) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      const scene = project.scenes.find((s) => s.id === activeSceneId);
      const el = scene?.elements.find((e) => e.id === elementId);
      if (!el) return;
      const preset = PRESETS[presetName];
      if (!preset) return;
      set({
        project: updateSceneInProject(project, activeSceneId, (s) =>
          updateElementInScene(s, elementId, (e) => ({
            ...e,
            animations: [
              ...e.animations,
              ...preset.generate(el, startTime ?? 0, duration ?? 0.8),
            ],
          })),
        ),
      });
    },
    clearAnimations: (elementId) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) =>
            updateElementInScene(s, elementId, (e) => ({
              ...e,
              animations: [],
            })),
          ),
        });
    },

    addScriptLine: (characterElementId) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      const line: ScriptLine = {
        id: crypto.randomUUID(),
        characterElementId,
        text: "",
        gesture: "talking",
        reaction: "listening",
        shot: "medium",
        duration: 2,
      };
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          script: [...s.script, line],
        })),
      });
    },

    removeScriptLine: (lineId) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId)
        set({
          project: updateSceneInProject(project, activeSceneId, (s) => ({
            ...s,
            script: s.script.filter((l) => l.id !== lineId),
          })),
        });
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
            if (updates.text !== undefined)
              updated.duration = estimateSpeechDuration(updates.text);
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
          const swap = direction === "up" ? idx - 1 : idx + 1;
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
      const charEls = scene.elements.filter((e) => e.type === "character");
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
      const makeProp = (p: (typeof tpl.props)[number]) =>
        createElement(p.type, {
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          fill: p.fill,
          stroke: p.stroke,
          strokeWidth: p.strokeWidth,
          borderRadius: p.borderRadius,
          rotation: p.rotation ?? 0,
          opacity: p.opacity ?? 1,
          locked: true,
          isProp: true,
        });
      const bgProps = tpl.props
        .filter((p) => p.layer !== "foreground")
        .map(makeProp);
      const fgProps = tpl.props
        .filter((p) => p.layer === "foreground")
        .map(makeProp);

      // Reposition and optionally resize characters
      const updatedElements = keptElements.map((el) => {
        if (el.type !== "character") return el;
        const charIdx = charEls.findIndex((ce) => ce.id === el.id);
        if (charIdx < 0 || charIdx >= tpl.characterPositions.length) return el;
        const pos = tpl.characterPositions[charIdx];
        const w = pos.width ?? el.width;
        const h = pos.height ?? el.height;
        return {
          ...el,
          x: pos.x - w / 2,
          y: pos.y,
          width: w,
          height: h,
          facingRight: pos.facingRight,
          seated: pos.seated,
        };
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
      if (!project || !activeSceneId) return "";
      const scene = project.scenes.find((s) => s.id === activeSceneId);
      if (!scene) return "";
      const idx = scene.cameras.length + 1;
      const cam = createSceneCamera(
        `Camera ${idx}`,
        project.settings.width,
        project.settings.height,
        partial,
      );
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          cameras: [...s.cameras, cam],
        })),
      });
      return cam.id;
    },

    removeCamera: (id) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return;
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          cameras:
            s.cameras.length <= 1
              ? s.cameras
              : s.cameras.filter((c) => c.id !== id),
          script: s.script.map((l) =>
            l.cameraId === id ? { ...l, cameraId: undefined } : l,
          ),
        })),
      });
    },

    updateCamera: (id, updates) => {
      const { project, activeSceneId } = get();
      if (project && activeSceneId) {
        set({
          project: updateSceneInProject(project, activeSceneId, (s) => ({
            ...s,
            cameras: s.cameras.map((c) =>
              c.id === id ? { ...c, ...updates } : c,
            ),
          })),
        });
      }
    },

    duplicateCamera: (id) => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return null;
      const scene = project.scenes.find((s) => s.id === activeSceneId);
      const cam = scene?.cameras.find((c) => c.id === id);
      if (!cam) return null;
      const dup: SceneCamera = {
        ...cam,
        id: crypto.randomUUID(),
        name: `${cam.name} copy`,
      };
      set({
        project: updateSceneInProject(project, activeSceneId, (s) => ({
          ...s,
          cameras: [...s.cameras, dup],
        })),
      });
      return dup.id;
    },

    previewScript: async () => {
      const p = get().project;
      if (!p || get().voicePreparation) return;
      const request = ++playbackRequest;
      if (get().playbackTime >= projectDuration(p)) get().seek(0);
      const initialTime = get().playbackTime;
      const location = locateScene(p, initialTime);
      const initialLine = scriptAt(location.scene, location.time);
      set({voiceError: ""});
      try {
        for (const scene of p.scenes) {
          if (!missingVoiceLines(get().project!, scene.id).length) continue;
          set({isPlaying:false, isClipPlaying:false, voicePreparation:`Preparing voices · ${scene.name}`});
          const lines = await recordMissingVoices(get().project!, scene.id);
          if (request !== playbackRequest || get().project?.id !== p.id) return;
          get().editProject(project => applyRecordedVoices(project, scene.id, lines));
        }
        if (request !== playbackRequest || get().project?.id !== p.id) return;
        if (get().project!.scenes.some(s => missingVoiceLines(get().project!, s.id).length))
          throw new Error("The script changed while preparing speech. Press Play again.");
        // Preserve the selected dialogue line when earlier recordings change the timeline length.
        const latest = get().project!;
        if (initialLine && get().playbackTime === initialTime) {
          const sceneIndex = latest.scenes.findIndex(s => s.id === location.scene.id);
          const scene = latest.scenes[sceneIndex];
          const lineIndex = scene?.script.findIndex(l => l.id === initialLine.line.id) ?? -1;
          if (lineIndex >= 0) get().seek(latest.scenes.slice(0,sceneIndex).reduce((n,s)=>n+s.duration,0)
            + scene.script.slice(0,lineIndex).reduce((n,l)=>n+l.duration,0)
            + Math.min(location.time-initialLine.start, scene.script[lineIndex].duration));
        }
        set({voicePreparation:"", isPlaying:true, isClipPlaying:true});
      } catch (error) {
        if (request === playbackRequest) set({voiceError: error instanceof Error ? error.message : "Could not prepare voices.", isPlaying:false, isClipPlaying:false});
      } finally {
        if (request === playbackRequest) set({voicePreparation:""});
      }
    },
    stopPreview: () => {
      set({livePlaybackEnd:null});
      playbackRequest++;
      set({ isPlaying: false, isClipPlaying: false, voicePreparation:"", voiceError:"" });
      get().seek(0);
    },
    tickPlayback: (dt) => {
      const s = get();
      if (!s.isPlaying || !s.project) return;
      const duration = projectDuration(s.project);
      let t = s.playbackTime + dt * s.speed;
      if(s.livePlaybackEnd!==null && t>=s.livePlaybackEnd){
        get().seek(Math.min(s.livePlaybackEnd,duration));
        set({isPlaying:false,isClipPlaying:false,livePlaybackEnd:null});
        return;
      }
      if (t >= duration) {
        if (s.loop) t = t % duration;
        else {
          t = duration;
          set({ isPlaying: false, isClipPlaying: false });
        }
      }
      get().seek(t);
    },
    setCameraFrame: (frame) => set({ cameraFrame: frame }),
    setCanvasZoom: (zoom) =>
      set({ canvasZoom: Math.max(0.1, Math.min(3, zoom)) }),
    setCanvasPan: (x, y) => set({ canvasPanX: x, canvasPanY: y }),
    setCurrentTime: (time) => get().scrubClip(time),
    setIsPlaying: (playing) => {
      set({livePlaybackEnd:null});
      if (playing) { void get().previewScript(); return; }
      playbackRequest++;
      set({isPlaying:false, isClipPlaying:false, voicePreparation:""});
    },
    togglePlayback: () => {
      set({livePlaybackEnd:null});
      get().isPlaying
        ? set({ isPlaying: false, isClipPlaying: false })
        : get().previewScript();
    },
    stopPlayback: () => get().stopPreview(),
  };
});
