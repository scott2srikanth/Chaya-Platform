export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export type ElementType = 'rectangle' | 'circle' | 'line' | 'text' | 'svg' | 'image' | 'character';

export type TransitionType = 'cut' | 'fade' | 'crossfade' | 'slide' | 'zoom';

export type CharacterGesture = 'idle' | 'talking' | 'pointing' | 'waving' | 'thinking' | 'celebrating';

export type ReactionType = 'none' | 'listening' | 'nodding' | 'surprised' | 'laughing' | 'thinking' | 'confused';

export type ShotType = 'wide' | 'medium' | 'closeup';

export interface Animation {
  id: string;
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'width' | 'height';
  from: number;
  to: number;
  startTime: number;
  duration: number;
  easing: EasingType;
}

export interface SceneElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  x2: number;
  y2: number;
  animations: Animation[];
  characterId?: string;
  characterGesture?: CharacterGesture;
  characterReaction?: ReactionType;
  facingRight?: boolean;
  seated?: boolean;
  isProp?: boolean;
}

export interface ScriptLine {
  id: string;
  characterElementId: string;
  text: string;
  gesture: CharacterGesture;
  reaction: ReactionType;
  shot: ShotType;
  cameraId?: string;
  duration: number;
}

export interface TemplateCharacterPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  facingRight: boolean;
  seated: boolean;
}

export interface TemplateProp {
  name: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  rotation?: number;
  opacity?: number;
  layer?: 'background' | 'foreground';
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  minCharacters: number;
  lines: Omit<ScriptLine, 'id' | 'characterElementId' | 'duration'>[];
  characterIndex: number[];
  background: string;
  characterPositions: TemplateCharacterPosition[];
  props: TemplateProp[];
}

export type CameraTransition = 'cut' | 'smooth' | 'dolly' | 'whip';

export interface SceneCamera {
  id: string;
  name: string;
  x: number;
  y: number;
  viewWidth: number;
  viewHeight: number;
  transition: CameraTransition;
  transitionDuration: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface Scene {
  id: string;
  name: string;
  duration: number;
  background: string;
  elements: SceneElement[];
  script: ScriptLine[];
  cameras: SceneCamera[];
  camera: CameraState;
  transition: TransitionType;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
}

export interface ProjectMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  version: string;
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  scenes: Scene[];
}

export function createDefaultCamera(): CameraState {
  return { x: 0, y: 0, zoom: 1, rotation: 0 };
}

export function createSceneCamera(name: string, canvasW: number, canvasH: number, partial?: Partial<SceneCamera>): SceneCamera {
  return {
    id: crypto.randomUUID(),
    name,
    x: 0, y: 0,
    viewWidth: canvasW, viewHeight: canvasH,
    transition: 'cut', transitionDuration: 0,
    ...partial,
  };
}

const DEFAULT_CAMERAS = (w: number, h: number): SceneCamera[] => [
  createSceneCamera('Wide', w, h),
];

export function createDefaultScene(name: string, canvasW = 1920, canvasH = 1080): Scene {
  return {
    id: crypto.randomUUID(),
    name, duration: 5, background: '#f0f4f8',
    elements: [], script: [],
    cameras: DEFAULT_CAMERAS(canvasW, canvasH),
    camera: { x: 0, y: 0, zoom: 1, rotation: 0 },
    transition: 'cut',
  };
}

export function createDefaultProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    version: '1.0',
    metadata: { name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    settings: { width: 1920, height: 1080, fps: 30 },
    scenes: [createDefaultScene('Scene 1')],
  };
}

export function estimateSpeechDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, words / 2.5);
}

export function createElement(type: ElementType, partial?: Partial<SceneElement>): SceneElement {
  const base: SceneElement = {
    id: crypto.randomUUID(), type, name: type.charAt(0).toUpperCase() + type.slice(1),
    x: 960 - 100, y: 540 - 75, width: 200, height: 150, rotation: 0, scaleX: 1, scaleY: 1,
    opacity: 1, locked: false, visible: true, fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0,
    borderRadius: 0, text: '', fontSize: 48, fontFamily: 'Inter, sans-serif', fontWeight: '600',
    textAlign: 'center', x2: 0, y2: 0, animations: [],
  };
  const overrides: Partial<SceneElement> = {};
  switch (type) {
    case 'circle': overrides.width = 160; overrides.height = 160; overrides.fill = '#10b981'; break;
    case 'text': overrides.width = 400; overrides.height = 80; overrides.fill = 'transparent'; overrides.stroke = 'transparent'; overrides.text = 'Your text here'; break;
    case 'line': overrides.width = 300; overrides.height = 0; overrides.fill = 'transparent'; overrides.stroke = '#334155'; overrides.strokeWidth = 3; overrides.x2 = 300; overrides.y2 = 0; break;
    case 'character': overrides.width = 240; overrides.height = 400; overrides.fill = 'transparent'; overrides.stroke = 'transparent'; overrides.characterGesture = 'idle'; overrides.characterReaction = 'none'; overrides.facingRight = true; break;
  }
  return { ...base, ...overrides, ...partial };
}

// ─── Helper for readable prop definitions ───────────────────────────

function bg(name: string, x: number, y: number, w: number, h: number, fill: string, extra?: Partial<TemplateProp>): TemplateProp {
  return { name, type: 'rectangle', x, y, width: w, height: h, fill, stroke: 'transparent', strokeWidth: 0, borderRadius: 0, ...extra };
}
function fg(name: string, x: number, y: number, w: number, h: number, fill: string, extra?: Partial<TemplateProp>): TemplateProp {
  return { name, type: 'rectangle', x, y, width: w, height: h, fill, stroke: 'transparent', strokeWidth: 0, borderRadius: 0, layer: 'foreground', ...extra };
}

// ─── Template Scenes ────────────────────────────────────────────────

const INTERVIEW_PROPS: TemplateProp[] = [
  // Studio wall
  bg('Wall', 0, 0, 1920, 730, '#131c2e'),
  // Accent wall panels for depth
  bg('Panel L', 40, 20, 420, 680, '#172035', { stroke: '#1e2d4a', strokeWidth: 1, borderRadius: 8 }),
  bg('Panel R', 1460, 20, 420, 680, '#172035', { stroke: '#1e2d4a', strokeWidth: 1, borderRadius: 8 }),
  // Warm ceiling light strips
  bg('Light L', 460, 8, 220, 5, '#f59e0b', { borderRadius: 3, opacity: 0.85 }),
  bg('Light R', 1240, 8, 220, 5, '#f59e0b', { borderRadius: 3, opacity: 0.85 }),
  // Subtle glow halos behind each light
  bg('Glow L', 420, 0, 300, 50, '#f59e0b', { borderRadius: 25, opacity: 0.08 }),
  bg('Glow R', 1200, 0, 300, 50, '#f59e0b', { borderRadius: 25, opacity: 0.08 }),
  // Armchair backs (behind characters)
  bg('Chair L back', 410, 240, 210, 280, '#1c1828', { stroke: '#2a2640', strokeWidth: 2, borderRadius: 22 }),
  bg('Chair L top', 430, 230, 170, 20, '#1c1828', { borderRadius: 10 }),
  bg('Chair R back', 1310, 240, 210, 280, '#1c1828', { stroke: '#2a2640', strokeWidth: 2, borderRadius: 22 }),
  bg('Chair R top', 1330, 230, 170, 20, '#1c1828', { borderRadius: 10 }),
  // Floor
  bg('Floor', 0, 730, 1920, 350, '#16111e'),
  bg('Floor edge', 0, 726, 1920, 6, '#2a2240', { borderRadius: 0 }),
  // Desk (foreground — renders IN FRONT of characters to cover lower body)
  fg('Desk surface', 320, 468, 1280, 24, '#5c3d1e', { stroke: '#7a5228', strokeWidth: 2, borderRadius: 8 }),
  fg('Desk panel', 340, 492, 1240, 160, '#4a3018', { borderRadius: 4 }),
  fg('Desk trim', 340, 492, 1240, 6, '#7a5228', { borderRadius: 3 }),
  fg('Desk leg L', 370, 652, 16, 78, '#3d2810', { borderRadius: 2 }),
  fg('Desk leg R', 1534, 652, 16, 78, '#3d2810', { borderRadius: 2 }),
];

const PRODUCT_DEMO_PROPS: TemplateProp[] = [
  // Stage backdrop
  bg('Backdrop', 0, 0, 1920, 800, '#0a0f1a'),
  // Screen mount wall
  bg('Screen wall', 560, 30, 800, 460, '#111827', { stroke: '#1f2937', strokeWidth: 2, borderRadius: 10 }),
  // Screen frame
  bg('Screen frame', 590, 50, 740, 400, '#1e293b', { stroke: '#334155', strokeWidth: 3, borderRadius: 8 }),
  // Screen glow border
  bg('Screen glow', 600, 60, 720, 380, '#0ea5e9', { borderRadius: 6, opacity: 0.15 }),
  // Screen interior
  bg('Screen', 604, 64, 712, 372, '#0c4a6e', { borderRadius: 4 }),
  // Screen content lines (visual interest)
  bg('Content 1', 660, 150, 300, 6, '#0ea5e9', { borderRadius: 3, opacity: 0.3 }),
  bg('Content 2', 660, 180, 220, 6, '#0ea5e9', { borderRadius: 3, opacity: 0.2 }),
  bg('Content 3', 660, 210, 260, 6, '#0ea5e9', { borderRadius: 3, opacity: 0.25 }),
  // Screen stand
  bg('Stand pole', 935, 450, 50, 90, '#475569', { borderRadius: 4 }),
  bg('Stand base', 870, 530, 180, 14, '#475569', { borderRadius: 7 }),
  // Stage floor
  bg('Stage', 0, 800, 1920, 280, '#111827'),
  bg('Stage edge', 0, 796, 1920, 6, '#0ea5e9', { opacity: 0.6 }),
  // Subtle floor spots
  bg('Spot L', 200, 810, 400, 4, '#0ea5e9', { borderRadius: 2, opacity: 0.1 }),
  bg('Spot R', 1320, 810, 400, 4, '#0ea5e9', { borderRadius: 2, opacity: 0.1 }),
];

const CLASSROOM_PROPS: TemplateProp[] = [
  // Walls
  bg('Wall', 0, 0, 1920, 740, '#fef9c3'),
  bg('Baseboard', 0, 700, 1920, 40, '#d4a853', { borderRadius: 0 }),
  // Whiteboard area
  bg('WB border', 100, 50, 560, 400, '#a1a1aa', { stroke: '#71717a', strokeWidth: 3, borderRadius: 4 }),
  bg('Whiteboard', 112, 62, 536, 376, '#ffffff', { borderRadius: 2 }),
  bg('WB tray', 112, 438, 536, 16, '#a1a1aa', { borderRadius: 4 }),
  // Board content (chalk marks)
  bg('Chalk 1', 160, 130, 200, 5, '#3b82f6', { borderRadius: 3, opacity: 0.4 }),
  bg('Chalk 2', 160, 160, 150, 5, '#3b82f6', { borderRadius: 3, opacity: 0.3 }),
  bg('Chalk 3', 160, 190, 240, 5, '#10b981', { borderRadius: 3, opacity: 0.35 }),
  // Clock on wall
  bg('Clock', 1700, 60, 70, 70, '#fafafa', { stroke: '#a1a1aa', strokeWidth: 2, borderRadius: 35 }),
  // Student chair (behind student)
  bg('Chair back', 1310, 410, 160, 200, '#ea580c', { stroke: '#c2410c', strokeWidth: 2, borderRadius: 12 }),
  bg('Chair seat', 1290, 610, 200, 22, '#ea580c', { stroke: '#c2410c', strokeWidth: 2, borderRadius: 8 }),
  // Floor
  bg('Floor', 0, 740, 1920, 340, '#d6d3d1'),
  bg('Floor line', 0, 738, 1920, 4, '#a8a29e'),
  // Student desk (foreground — covers student legs)
  fg('Desk top', 1180, 530, 400, 22, '#b45309', { stroke: '#92400e', strokeWidth: 2, borderRadius: 4 }),
  fg('Desk front', 1200, 552, 360, 80, '#a16207'),
  fg('Desk leg L', 1220, 632, 12, 60, '#78350f'),
  fg('Desk leg R', 1528, 632, 12, 60, '#78350f'),
];

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'product-demo',
    name: 'Product Demo',
    description: 'One presents a product, other reacts with interest',
    minCharacters: 2,
    characterIndex: [0, 1, 0, 1, 0],
    background: '#0a0f1a',
    characterPositions: [
      { x: 380, y: 300, width: 280, height: 470, facingRight: true, seated: false },
      { x: 1540, y: 300, width: 280, height: 470, facingRight: false, seated: false },
    ],
    props: PRODUCT_DEMO_PROPS,
    lines: [
      { text: "Hey! Let me show you something incredible we've been working on.", gesture: 'waving', reaction: 'listening', shot: 'medium' },
      { text: "Oh really? I'm all ears! What is it?", gesture: 'talking', reaction: 'nodding', shot: 'medium' },
      { text: "It's a brand new way to create animated videos, right in your browser!", gesture: 'pointing', reaction: 'surprised', shot: 'closeup' },
      { text: "Wow, that sounds amazing! How does it work?", gesture: 'talking', reaction: 'nodding', shot: 'medium' },
      { text: "You just add characters, write your script, and hit play. It's that simple!", gesture: 'celebrating', reaction: 'laughing', shot: 'wide' },
    ],
  },
  {
    id: 'interview',
    name: 'Interview',
    description: 'A back-and-forth interview conversation',
    minCharacters: 2,
    characterIndex: [0, 1, 0, 1, 0, 1],
    background: '#0f1520',
    characterPositions: [
      { x: 520, y: 150, width: 300, height: 500, facingRight: true, seated: true },
      { x: 1400, y: 150, width: 300, height: 500, facingRight: false, seated: true },
    ],
    props: INTERVIEW_PROPS,
    lines: [
      { text: "Welcome to the show! Tell us about yourself.", gesture: 'talking', reaction: 'listening', shot: 'medium' },
      { text: "Thanks for having me! I'm really excited to be here.", gesture: 'waving', reaction: 'nodding', shot: 'medium' },
      { text: "So what inspired you to get started in this field?", gesture: 'thinking', reaction: 'listening', shot: 'closeup' },
      { text: "It all started when I discovered how powerful technology can be for education.", gesture: 'pointing', reaction: 'nodding', shot: 'medium' },
      { text: "That's fascinating! And where do you see things heading?", gesture: 'talking', reaction: 'thinking', shot: 'medium' },
      { text: "I believe the future is all about making complex ideas simple and visual.", gesture: 'celebrating', reaction: 'laughing', shot: 'wide' },
    ],
  },
  {
    id: 'lesson',
    name: 'Classroom Lesson',
    description: 'Teacher explains a concept, student asks questions',
    minCharacters: 2,
    characterIndex: [0, 0, 1, 0, 1, 0],
    background: '#fefce8',
    characterPositions: [
      { x: 430, y: 260, width: 270, height: 450, facingRight: true, seated: false },
      { x: 1390, y: 300, width: 260, height: 440, facingRight: false, seated: true },
    ],
    props: CLASSROOM_PROPS,
    lines: [
      { text: "Good morning class! Today we're going to learn something exciting.", gesture: 'waving', reaction: 'listening', shot: 'medium' },
      { text: "Let me explain the key concept. Pay close attention to this.", gesture: 'pointing', reaction: 'nodding', shot: 'closeup' },
      { text: "Excuse me, could you explain that part again?", gesture: 'talking', reaction: 'listening', shot: 'medium' },
      { text: "Of course! Think of it like building blocks. Each piece connects to the next.", gesture: 'talking', reaction: 'thinking', shot: 'medium' },
      { text: "Oh, I think I understand now! That makes so much sense!", gesture: 'celebrating', reaction: 'nodding', shot: 'medium' },
      { text: "Excellent! You've got it. Now let's practice together.", gesture: 'celebrating', reaction: 'laughing', shot: 'wide' },
    ],
  },
];
