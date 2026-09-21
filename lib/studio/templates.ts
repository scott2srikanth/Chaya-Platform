import {
  createDefaultProject,
  createDefaultScene,
  createElement,
  Project,
} from "./types";
import { nativeCharacters } from "./project";
import { PRESETS } from "./presets";
export const TEMPLATE_NAMES = [
  "Website Request",
  "Product Demo",
  "System Architecture",
  "API Explanation",
  "Database Explanation",
  "Cybersecurity",
  "Cloud Architecture",
  "Algorithm Explanation",
];
export function goldenProject(name = "Website Request"): Project {
  const p = createDefaultProject(name);
  p.characters = nativeCharacters();
  p.scenes = [];
  const journeys: Record<string, string[]> = {
    "Website Request": [
      "User",
      "Browser",
      "DNS",
      "CDN",
      "Load Balancer",
      "Server",
      "Cache",
      "Database",
      "Browser",
    ],
    "Product Demo": [
      "User",
      "Browser",
      "Notification",
      "API",
      "Database",
      "Browser",
    ],
    "System Architecture": [
      "User",
      "Load Balancer",
      "Container",
      "Queue",
      "Server",
      "Database",
    ],
    "API Explanation": [
      "Browser",
      "API",
      "Server",
      "Database",
      "API",
      "Browser",
    ],
    "Database Explanation": [
      "API",
      "Cache",
      "Database",
      "Server",
      "Cache",
      "API",
    ],
    Cybersecurity: [
      "User",
      "API",
      "Terminal",
      "Server",
      "Database",
      "Notification",
    ],
    "Cloud Architecture": [
      "Browser",
      "CDN",
      "Cloud",
      "Load Balancer",
      "Container",
      "Database",
    ],
    "Algorithm Explanation": [
      "Input",
      "Queue",
      "Process",
      "Cache",
      "Output",
      "Code Window",
    ],
  };
  const labels = journeys[name] ?? journeys["Website Request"];
  for (let i = 0; i < labels.length; i++) {
    const scene = createDefaultScene(`${i + 1}. ${labels[i]}`);
    scene.duration = 5;
    scene.background = "#101c30";
    scene.transition = i ? "crossfade" : "cut";
    scene.transitionDuration = 0.5;
    const title = createElement("text", {
      name: "Heading",
      text:
        i === 0
          ? name === "Website Request"
            ? "What happens when you open a website?"
            : name
          : `${labels[i]} → ${labels[(i + 1) % labels.length]}`,
      x: 100,
      y: 70,
      width: 1720,
      height: 150,
      fontSize: 62,
      fill: "#f1f5f9",
      textEffect: "words",
      revealDuration: 1,
    });
    const source = createElement("component", {
      name: labels[i],
      componentKind: labels[i],
      x: 650,
      y: 360,
      width: 330,
      height: 250,
      fill: "#2563eb",
    });
    const target = createElement("component", {
      name: labels[(i + 1) % labels.length],
      componentKind: labels[(i + 1) % labels.length],
      x: 1370,
      y: 360,
      width: 330,
      height: 250,
      fill: "#0d9488",
    });
    source.animations = PRESETS.fadeIn.generate(source, 0, 0.6);
    target.animations = PRESETS.pop.generate(target, 0.4, 0.6);
    const arrow = createElement("connector", {
      name: "Request path",
      sourceId: source.id,
      targetId: target.id,
      x: 0,
      y: 0,
      startTime: 1,
      drawDuration: 1,
      stroke: "#7dd3fc",
      strokeWidth: 5,
    });
    const packet = createElement("packet", {
      name: "Request packet",
      sourceId: source.id,
      targetId: target.id,
      x: 0,
      y: 0,
      startTime: 2,
      drawDuration: 1.5,
      fill: "#fbbf24",
    });
    const alex = createElement("character", {
      name: "Alex",
      characterId: "alex-rigged",
      x: 120,
      y: 410,
      width: 260,
      height: 440,
      expressionKeys: [
        { time: 0, expression: "happy" },
        { time: 2, expression: "thinking" },
      ],
      actions: [
        {
          id: crypto.randomUUID(),
          type: "pointAt",
          targetId: target.id,
          startTime: 1,
          duration: 3,
        },
      ],
    });
    scene.elements = [title, arrow, source, target, packet, alex];
    scene.script = [
      {
        id: crypto.randomUUID(),
        characterElementId: alex.id,
        text: `Let me show you how ${labels[i]} handles this request.`,
        gesture: "talking",
        reaction: "listening",
        shot: "wide",
        duration: 4,
      },
    ];
    scene.cameraKeys = [
      {
        id: crypto.randomUUID(),
        time: 0,
        x: 0,
        y: 0,
        zoom: 1,
        rotation: 0,
        easing: "linear",
      },
      {
        id: crypto.randomUUID(),
        time: 2,
        x: 100,
        y: 30,
        zoom: 1.12,
        rotation: 0,
        easing: "easeInOut",
      },
      {
        id: crypto.randomUUID(),
        time: 4.8,
        x: 0,
        y: 0,
        zoom: 1,
        rotation: 0,
        easing: "easeInOut",
      },
    ];
    p.scenes.push(scene);
  }
  return p;
}

/** Character-led starter preserving the original presenter's illustration style. */
export function presenterProject(): Project {
  const p = createDefaultProject("Presenter story");
  p.characters = nativeCharacters();
  const scene = p.scenes[0];
  scene.name = "Meet your presenter";
  scene.duration = 12;
  scene.background = "#eee9df";
  const board = createElement("rectangle", {
    name: "Presentation board",
    x: 140,
    y: 100,
    width: 1640,
    height: 840,
    fill: "#fdfcf9",
    borderRadius: 28,
  });
  const title = createElement("text", {
    name: "Story title",
    textAlign: "left",
    text: "Every great idea\nstarts with a story.",
    x: 270,
    y: 285,
    width: 780,
    height: 260,
    fontSize: 78,
    fill: "#222637",
    textEffect: "words",
    revealDuration: 1.8,
  });
  const subtitle = createElement("text", {
    name: "Story subtitle",
    textAlign: "left",
    fontWeight: "400",
    text: "Make yours worth watching.",
    x: 275,
    y: 615,
    width: 680,
    height: 100,
    fontSize: 30,
    fill: "#697080",
  });
  const tag = createElement("text", {
    name: "Chapter",
    textAlign: "left",
    text: "01 / THE INTRODUCTION",
    x: 275,
    y: 205,
    width: 620,
    height: 60,
    fontSize: 22,
    fill: "#7364d7",
  });
  const alex = createElement("character", {
    name: "Alex",
    characterId: "alex",
    x: 1050,
    y: 170,
    width: 570,
    height: 850,
    characterGesture: "waving",
  });
  scene.elements = [board, tag, title, subtitle, alex];
  scene.script = [
    {
      id: crypto.randomUUID(),
      characterElementId: alex.id,
      text: "Hello! Every great idea starts with a story.",
      gesture: "waving",
      reaction: "listening",
      shot: "wide",
      duration: 4,
    },
    {
      id: crypto.randomUUID(),
      characterElementId: alex.id,
      text: "Turn your ideas into a clear, memorable explanation.",
      gesture: "talking",
      reaction: "listening",
      shot: "wide",
      duration: 5,
    },
    {
      id: crypto.randomUUID(),
      characterElementId: alex.id,
      text: "Let us make yours worth watching.",
      gesture: "pointing",
      reaction: "listening",
      shot: "wide",
      duration: 3,
    },
  ];
  return p;
}

export function conversationProject(): Project {
  const p = createDefaultProject("A better way to plan");
  const scene = createDefaultScene("Studio conversation");
  scene.duration = 18;
  scene.stage3d = true;
  scene.cameraMode = "dialogue";
  scene.subtitles = true;
  const alex = createElement("character", {
    name: "Alex",
    characterId: "alex",
    x: 430,
    y: 260,
    width: 320,
    height: 650,
    voice: { name: "Daniel (English (UK))", rate: 165 },
    actor3d: {
      x: -0.95,
      z: 0,
      rotation: 0.18,
      shirt: "#567b83",
      skin: "#d3a080",
      hair: "#322920",
    },
  });
  const sarah = createElement("character", {
    name: "Sarah",
    characterId: "sarah",
    x: 1130,
    y: 260,
    width: 320,
    height: 650,
    voice: { name: "Samantha", rate: 170 },
    actor3d: {
      x: 0.95,
      z: 0,
      rotation: -0.18,
      shirt: "#c36d4d",
      skin: "#b77958",
      hair: "#26212a",
    },
  });
  scene.elements = [alex, sarah];
  scene.script = [
    {
      id: crypto.randomUUID(),
      characterElementId: alex.id,
      text: "What if planning your day could be this simple?",
      duration: 4.5,
      gesture: "talking",
      reaction: "none",
      shot: "wide",
    },
    {
      id: crypto.randomUUID(),
      characterElementId: sarah.id,
      text: "Start with one clear plan. Everything you need, in one place.",
      duration: 5,
      gesture: "pointing",
      reaction: "none",
      shot: "medium",
    },
    {
      id: crypto.randomUUID(),
      characterElementId: alex.id,
      text: "Less time organizing. More time for the work that matters.",
      duration: 4.5,
      gesture: "talking",
      reaction: "none",
      shot: "closeup",
    },
    {
      id: crypto.randomUUID(),
      characterElementId: sarah.id,
      text: "Exactly. Let us make today a little easier.",
      duration: 4,
      gesture: "waving",
      reaction: "none",
      shot: "closeup",
    },
  ];
  p.scenes = [scene];
  return p;
}

/** Editable 3D presenter + 2D product graphics, with an independently animated extra. */
export function mixedExplainerProject(): Project {
  const p = createDefaultProject("Make room for better work");
  const source = conversationProject().scenes[0];
  const beats = [
    { name: "01 · The problem", title: "Too many meetings?", sub: "Take back your calendar.", voice: "A busy calendar should not run your life. Make room for the work that matters.", cards: ["Overlapping calls", "Endless back and forth", "No time to focus"] },
    { name: "02 · How it works", title: "One link. A clear plan.", sub: "A simpler way to book your day.", voice: "Share one booking link. Pick a time that works. Your calendar stays organized, automatically.", cards: ["01   Share your link", "02   Choose a time", "03   You are booked"] },
    { name: "03 · The payoff", title: "Your time, back.", sub: "Less scheduling. More possibility.", voice: "Fewer interruptions. More focus. Start with one simple change, and make today a little easier.", cards: ["Protected focus time", "A calmer calendar", "Make room for better work"] },
  ];
  p.scenes = beats.map((beat, index) => {
    const scene = createDefaultScene(beat.name);
    scene.duration = 7; scene.stage3d = index !== 1; scene.subtitles = true;
    scene.background = "#edf3f3"; scene.cameraMode = "dialogue";
    scene.transition = index ? "crossfade" : "cut"; scene.transitionDuration = 0.35;
    const host = structuredClone(source.elements[0]); host.id = crypto.randomUUID(); host.name = "Presenter";
    host.actor3d = {...host.actor3d!, x: -1.2, z: 0.5, rotation: 0.12};
    // In the middle scene the same speaker becomes a native 2D presenter.
    host.x = 280; host.y = 350; host.width = 360; host.height = 560;
    const extra = structuredClone(source.elements[1]); extra.id = crypto.randomUUID(); extra.name = "Background colleague";
    extra.actor3d = {...extra.actor3d!, x: -2.6, z: -1, rotation: 1.3, motion: index === 0 ? "walk" : "look", motionStart: 0, motionEnd: 7, motionSpeed: 0.8,
      travel: index === 0 ? {x: -0.3, z: -1, start: 0, duration: 7} : undefined};
    scene.elements = scene.stage3d ? [host, extra] : [host];
    const camera = {...scene.cameras[0], spatial: {position: [0, 1.95, 6] as [number,number,number], target: [0, 1.25, 0] as [number,number,number]}};
    scene.cameras = [camera];
    scene.script = [{id: crypto.randomUUID(), characterElementId: host.id, text: beat.voice, gesture: index === 2 ? "waving" : "talking", reaction: "none", shot: "wide", cameraId: camera.id, duration: 7}];
    const enter = (delay: number) => [{id: crypto.randomUUID(), property: "opacity" as const, from: 0, to: 1, startTime: delay, duration: 0.45, easing: "easeOut" as const}];
    const text = (name: string, x: number, y: number, width: number, size: number, color: string, delay = 0) => createElement("text", {name, text: name, x, y, width, height: size * 1.4, fontSize: size, fontWeight: "600", textAlign: "left", fill: color, animations: enter(delay)});
    scene.elements.push(
      createElement("rectangle", {name: "Information panel", x: 970, y: 110, width: 810, height: 735, fill: "#102b36", borderRadius: 30, opacity: 0.96, animations: enter(0)}),
      text("CHAYA  /  A BETTER WORKDAY", 1020, 155, 700, 22, "#87dfce"),
      text(beat.title, 1020, 225, 720, 49, "#ffffff", 0.15),
      text(beat.sub, 1020, 305, 720, 27, "#c5d8df", 0.3),
    );
    beat.cards.forEach((label, i) => {
      const delay = 0.7 + i * 1.25;
      scene.elements.push(createElement("rectangle", {name: label + " card", x: 1015, y: 410 + i * 116, width: 720, height: 92, borderRadius: 16, fill: index === 0 ? "#493745" : "#224b53", animations: enter(delay)}),
        createElement("circle", {name: "Status", x: 1040, y: 440 + i * 116, width: 28, height: 28, fill: index === 0 ? "#f9a8a0" : "#87dfce", animations: enter(delay)}),
        text(label, 1090, 431 + i * 116, 610, 29, "#ffffff", delay + 0.12));
    });
    scene.elements.push(text(index === 1 ? "THE SIMPLE WAY" : "MAKE ROOM", 110, 110, 700, 25, "#183942"));
    return scene;
  });
  p.characters = nativeCharacters();
  return p;
}

export function interviewProject(): Project {
  const p = conversationProject();
  p.metadata.name = "Interview · seated conversation";
  const scene = p.scenes[0];
  scene.name = "Interview room"; scene.stageSet = "interview";
  scene.elements.forEach((el, i) => {
    el.seated = true;
    el.actor3d = {...el.actor3d!, x: i ? 1.18 : -1.18, z: 0.1, rotation: i ? -Math.PI / 2 : Math.PI / 2};
  });
  const lines = [
    "Welcome, Sarah. What is the biggest challenge when planning a busy day?",
    "Too many meetings leave very little time to focus. I start by protecting one clear block of time.",
    "That sounds useful. What is one simple tip our viewers can try today?",
    "Choose your most important task first, and schedule everything else around it. Small changes make a big difference.",
  ];
  scene.script.forEach((line, i) => { line.text = lines[i]; line.gesture = "talking"; line.duration = 7; });
  scene.duration = 28;
  return p;
}

export function whiteboardProject(): Project {
 const p=createDefaultProject("Whiteboard presenter"),scene=createDefaultScene("Write your idea");
 scene.duration=14;scene.background="#e8e1d7";
 scene.elements=[createElement("component",{name:"Whiteboard presenter",componentKind:"Whiteboard presenter",x:80,y:34,width:1760,height:1012,text:"IDEA\nPLAN\nBUILD",fill:"#7160ee",stroke:"#304b65",revealDuration:9})];
 p.scenes=[scene];return p;
}

export function livePresenterProject(): Project {
 const project=whiteboardProject();project.metadata.name="Live presenter";
 const scene=project.scenes[0];scene.name="Your live whiteboard";
 const presenter=scene.elements[0];presenter.name="Live presenter";presenter.text="";
 presenter.whiteboard={mode:"drawing",liveCommands:[]};
 return project;
}
