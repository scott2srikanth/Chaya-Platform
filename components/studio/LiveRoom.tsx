"use client";
import { useEffect, useRef, useState } from "react";
import {
  Monitor,
  Server,
  House,
  TreePine,
  Cloud,
  Database,
  Smartphone,
  UserRound,
  Circle,
  Square,
  Triangle,
  ArrowRight,
  Star,
  PanelsTopLeft,
  Layers,
  Shapes,
} from "lucide-react";
const libraryIcons: Record<string, typeof Monitor> = {
  browser: PanelsTopLeft,
  computer: Monitor,
  server: Server,
  house: House,
  tree: TreePine,
  cloud: Cloud,
  database: Database,
  phone: Smartphone,
  person: UserRound,
  circle: Circle,
  rectangle: Square,
  triangle: Triangle,
  arrow: ArrowRight,
  star: Star,
};
function LibraryIcon({ name }: { name: string }) {
  const Icon = libraryIcons[name] ?? Shapes;
  return <Icon size={25} strokeWidth={1.5} aria-hidden="true" />;
}
import type { LiveSessionState } from "../../lib/studio/live-session";
import {
  DRAWING_LIBRARY,
  interpretPresenterSpeech,
  type DictationMode,
} from "../../lib/studio/drawing-library";
import { ARCHITECTURE_LAYERS } from "../../lib/studio/architecture-library";
import LiveDrawingPad from "./LiveDrawingPad";
import WhiteboardPresenter from "./render/WhiteboardPresenter";
import "./live-room.css";
async function post(body: object, token = "") {
  const response = await fetch("/api/studio/live", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-presenter-token": token },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to connect.");
  return data;
}
export default function LiveRoom({
  view = "join",
}: {
  view?: "join" | "display" | "control";
}) {
  const [libraryQuery, setLibraryQuery] = useState(""),
    [showLayers, setShowLayers] = useState(false),
    [transcript, setTranscript] = useState(""),
    [language, setLanguage] = useState("en-US");
  const wantsMicrophone = useRef(false),
    restartTimer = useRef<ReturnType<typeof setTimeout>>();
  const [room, setRoom] = useState(""),
    [token, setToken] = useState(""),
    [code, setCode] = useState(""),
    [session, setSession] = useState<LiveSessionState | null>(null),
    [message, setMessage] = useState(""),
    [connected, setConnected] = useState(false),
    [input, setInput] = useState(""),
    [time, setTime] = useState(0),
    [hosts, setHosts] = useState<string[]>([]),
    [listening, setListening] = useState(false),
    [voiceAvailable, setVoiceAvailable] = useState(false),
    [pending, setPending] = useState(0);
  const stateRef = useRef<{
      state: LiveSessionState;
      time: number;
      received: number;
    } | null>(null),
    mode = useRef<DictationMode>(null),
    queue = useRef(Promise.resolve()),
    recognition = useRef<any>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setRoom(params.get("session") ?? "");
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
    const w = window as any;
    setVoiceAvailable(
      !!(w.SpeechRecognition || w.webkitSpeechRecognition) &&
        window.isSecureContext,
    );
    return () => {
      wantsMicrophone.current = false;
      clearTimeout(restartTimer.current);
      recognition.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!room) return;
    let disposed = false;
    const stream = new EventSource(
      `/api/studio/live?session=${encodeURIComponent(room)}&stream=1`,
    );
    stream.onmessage = (e) => {
      const data = JSON.parse(e.data),
        s = data.state as LiveSessionState;
      stateRef.current = {
        state: s,
        time: s.playing
          ? Math.min(
              s.end,
              s.anchorTime + Math.max(0, data.serverTime - s.anchorMs) / 1000,
            )
          : s.anchorTime,
        received: performance.now(),
      };
      setSession(s);
      setConnected(true);
    };
    stream.onerror = () => {
      setConnected(false);
      fetch(`/api/studio/live?session=${encodeURIComponent(room)}`)
        .then(async (r) => {
          if (r.status === 404 && !disposed) {
            const data = await r.json();
            setMessage(data.error);
            stream.close();
          }
        })
        .catch(() => {});
    };
    let frame = 0;
    const tick = () => {
      const snapshot = stateRef.current;
      if (snapshot)
        setTime(
          snapshot.state.playing
            ? Math.min(
                snapshot.state.end,
                snapshot.time + (performance.now() - snapshot.received) / 1000,
              )
            : snapshot.time,
        );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      stream.close();
      cancelAnimationFrame(frame);
    };
  }, [room]);
  async function create() {
    try {
      const saved = sessionStorage.getItem("presenter-room-seed");
      let events = [];
      if (saved) {
        try {
          events = JSON.parse(saved);
        } catch {}
      }
      const data = await post({ action: "create", events });
      sessionStorage.removeItem("presenter-room-seed");
      setRoom(data.state.id);
      setToken(data.token);
      setCode(data.code);
      setHosts(data.hosts);
      setMessage(
        "Session created. Open the display on the projector and join from your tablet.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function join() {
    try {
      const data = await post({ action: "join", code });
      location.href = `/studio/live/control?session=${data.state.id}#token=${data.token}`;
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function send(action: string, command?: string, drawing?: unknown) {
    if (!token) {
      setMessage("Join with the session code to control this presenter.");
      return;
    }
    const requestId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((n) => n + 1);
    queue.current = queue.current.then(async () => {
      try {
        let data;
        try {
          data = await post(
            { id: room, action, command, requestId, drawing },
            token,
          );
        } catch (e) {
          if (e instanceof TypeError)
            data = await post(
              { id: room, action, command, requestId, drawing },
              token,
            );
          else throw e;
        }
        setMessage(
          action === "reset"
            ? "Timeline deleted. The board is ready for a new presentation."
            : action === "drawing"
              ? "Drawing queued — the presenter will draw it next."
              : action === "command"
                ? `Sent: ${command}`
                : action === "pause"
                  ? "Presenter paused."
                  : "Playback started.",
        );
      } catch (e) {
        setMessage((e as Error).message);
      } finally {
        setPending((n) => n - 1);
      }
    });
  }
  const runRef = useRef<(value: string) => void>(() => {});
  function run(value: string) {
    const parsed = interpretPresenterSpeech(value, mode.current);
    mode.current = parsed.mode;
    if (parsed.command) send("command", parsed.command);
    else setMessage(parsed.message ?? "");
    setInput("");
  }
  runRef.current = run;
  function microphone() {
    if (wantsMicrophone.current) {
      wantsMicrophone.current = false;
      clearTimeout(restartTimer.current);
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const w = window as any,
      Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!window.isSecureContext) {
      setMessage(
        "Open this controller over HTTPS on your phone. Mobile microphones are blocked on local Wi-Fi HTTP.",
      );
      return;
    }
    if (!Constructor) {
      setMessage(
        "Speech recognition is unavailable in this browser. Use keyboard dictation in the command field, or open Safari on iPad/iPhone or Chrome on Android.",
      );
      return;
    }
    wantsMicrophone.current = true;
    const r = new Constructor();
    recognition.current = r;
    r.lang = language;
    // Single utterances avoid mobile engines silently stopping continuous mode.
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (event: any) => {
      if (!wantsMicrophone.current) return;
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          runRef.current(text);
          setTranscript("");
        } else live += text;
      }
      if (live) setTranscript(live);
    };
    r.onerror = (e: any) => {
      if (e.error === "aborted" && !wantsMicrophone.current) return;
      if (e.error === "no-speech") return;
      wantsMicrophone.current = false;
      setListening(false);
      setMessage(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone permission was blocked. Allow microphone access in your browser/site settings, then tap Start microphone again."
          : `Microphone: ${e.error}. Tap to retry or use keyboard dictation.`,
      );
    };
    const start = () => {
      if (!wantsMicrophone.current) return;
      try {
        r.start();
        setListening(true);
      } catch {
        wantsMicrophone.current = false;
        setListening(false);
        setMessage(
          "Unable to start microphone. Check microphone permissions and try again.",
        );
      }
    };
    r.onend = () => {
      if (wantsMicrophone.current)
        restartTimer.current = setTimeout(start, 350);
      else setListening(false);
    };
    start();
  }
  async function download() {
    if (!session) return;
    try {
      const data = await post(
        { action: "recording", id: room, requestId: `download-${Date.now()}` },
        token,
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data.project, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "live-presenter-recording.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  const board = (
    <WhiteboardPresenter
      text=""
      content={{ liveCommands: session?.events ?? [] }}
      time={time}
      duration={9}
      shirt="#7160ee"
      ink="#304b65"
      width={1600}
      height={920}
    />
  );
  if (view === "display")
    return (
      <main className="live-projector">
        <div className="live-projector-board">{board}</div>
        {!connected && (
          <div className="live-connection" role="status">
            {message || "Connecting to presenter…"}
          </div>
        )}
        <button
          className="live-fullscreen"
          aria-label="Enter fullscreen"
          onClick={() =>
            document.documentElement.requestFullscreen?.().catch(() => {})
          }
        >
          Fullscreen
        </button>
      </main>
    );
  if (view === "join")
    return (
      <main className="live-room">
        <header>
          <a href="/studio">← Studio</a>
          <span className="live-eyebrow">PRESENT • TEACH • CREATE</span>
          <h1>Live presenter room</h1>
          <p>
            A clean display for your audience. A separate controller for your
            tablet.
          </p>
        </header>
        <section>
          <h2>Start a room</h2>
          <button onClick={create}>Create live session</button>
        </section>
        <section>
          <h2>Join from a tablet</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <label>
              Session code
              <input
                aria-label="Session code"
                autoCapitalize="characters"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={8}
              />
            </label>
            <button disabled={code.trim().length !== 8}>Join controller</button>
          </form>
        </section>
        {room && (
          <section>
            <h2>Connect your screens</h2>
            <p>
              Controller pairing code: <strong>{code}</strong>
            </p>
            <div className="live-buttons">
              <a
                target="_blank"
                rel="noreferrer"
                href={`/studio/live/display?session=${room}`}
              >
                Open projector display
              </a>
              <a href={`/studio/live/control?session=${room}#token=${token}`}>
                Open controller here
              </a>
            </div>
            <p>
              On your tablet, open this address on the same Wi-Fi, then enter
              the pairing code:
            </p>
            {hosts.map((host) => (
              <p key={host}>
                <code>{host}/studio/live</code>
              </p>
            ))}
            <p>
              Rooms expire after four hours without commands. Download your
              recording to keep it. Use the deployed HTTPS address on mobile for
              microphone access.
            </p>
          </section>
        )}
        <p role="status">{message}</p>
      </main>
    );
  return (
    <main className="live-room live-controller">
      <header>
        <a href="/studio/live">← Rooms</a>
        <span className="live-eyebrow">LIVE WORKSPACE</span>
        <h1>Presenter controller</h1>
        <p
          className={`connection-pill ${connected ? "online" : ""}`}
          role="status"
        >
          {connected ? "Connected · changes are live" : "Reconnecting…"}
          {pending ? ` · ${pending} command(s) sending` : ""}
        </p>
      </header>
      {!token && <p>Join this room using its pairing code to send commands.</p>}
      <div className="live-preview">{board}</div>
      <section className="command-panel">
        <div className="section-heading">
          <div>
            <span className="live-eyebrow">DIRECT YOUR PRESENTER</span>
            <h2>Speak it. Write it. Draw it.</h2>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
        >
          <label>
            Presenter command
            <textarea
              rows={2}
              aria-label="Remote presenter command"
              placeholder="write Hello / draw house / remove house"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
            />
          </label>
          <button disabled={!connected || !token || !input.trim()}>
            Send command
          </button>
        </form>
        <div className="live-buttons">
          <button
            className={listening ? "mic-active" : "primary-button"}
            aria-pressed={listening}
            disabled={!token || !connected}
            onClick={microphone}
          >
            {listening ? "Stop microphone" : "Start microphone"}
          </button>
          <button disabled={!token} onClick={() => send("pause")}>
            Pause
          </button>
          <button disabled={!token} onClick={() => send("resume")}>
            Resume
          </button>
          <button disabled={!token} onClick={() => send("replay")}>
            Replay timeline
          </button>
          <button onClick={download} disabled={!session?.events.length}>
            Download recording
          </button>
        </div>
        <div className="voice-options">
          <label>
            Speech language{" "}
            <select
              disabled={listening}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-US">English (US)</option>
              <option value="en-IN">English (India)</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </label>
          <span>
            {listening
              ? "● Listening — say “write”, then your sentence"
              : "Say “draw computer” or “remove computer”"}
          </span>
        </div>
        {transcript && (
          <p className="live-transcript" aria-live="polite">
            {transcript}
          </p>
        )}
        <p className="helper-text">
          {voiceAvailable
            ? "Your browser may send microphone audio to its speech recognition service."
            : "Voice needs HTTPS and a supported browser. On local Wi-Fi HTTP, use the buttons or text commands."}
        </p>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </section>
      <LiveDrawingPad
        events={session?.events ?? []}
        disabled={!connected || !token}
        onErase={(name) => run(`remove ${name}`)}
        onClear={() => {
          if (
            window.confirm(
              "Erase all visible board items? The erasing action will be kept in the timeline.",
            )
          )
            run("remove all");
        }}
        onDraw={(points, color, penWidth) =>
          send("drawing", undefined, {
            color,
            penWidth,
            strokes: [points.map(([x, y]) => ({ x, y }))],
          })
        }
      />
      <section>
        <div className="section-heading">
          <div>
            <span className="live-eyebrow">READY TO DRAW</span>
            <h2>Drawing library</h2>
          </div>
          <input
            aria-label="Search drawing library"
            placeholder="Search components…"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
          />
        </div>
        <div className="library-grid">
          <button
            className="architecture-card"
            aria-expanded={showLayers}
            onClick={() => setShowLayers(!showLayers)}
          >
            <span>
              <Layers size={25} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <strong>Architecture layers (ML)</strong>
            <small>Dataset → deployment · 6 layers</small>
          </button>
          {[
            "browser",
            "computer",
            "server",
            ...DRAWING_LIBRARY.map((d) => d.name),
          ]
            .filter((name) =>
              name.toLowerCase().includes(libraryQuery.toLowerCase()),
            )
            .map((name) => (
              <button
                disabled={!connected || !token}
                key={name}
                onClick={() => run(`draw ${name}`)}
              >
                <span>
                  <LibraryIcon name={name} />
                </span>
                <strong>{name}</strong>
                <small>Tap to draw</small>
              </button>
            ))}
          <button disabled={!token} onClick={() => run("remove")}>
            Erase last item
          </button>
          <button
            disabled={!token}
            onClick={() => run("connect computer to server")}
          >
            Computer → server
          </button>
          <button
            disabled={!token}
            onClick={() => run("connect server to computer")}
          >
            Server → computer
          </button>
        </div>
      </section>
      {showLayers && (
        <section className="architecture-panel">
          <div className="section-heading">
            <h2>ML architecture layers</h2>
            <button onClick={() => setShowLayers(false)}>Close layers</button>
          </div>
          <button
            disabled={!connected || !token}
            onClick={() => run("draw vertical architecture diagram")}
          >
            Draw all six layers
          </button>
          <div className="live-buttons">
            {ARCHITECTURE_LAYERS.map((l) => (
              <button
                disabled={!connected || !token}
                key={l.name}
                onClick={() => run(`draw ${l.name}`)}
              >
                {l.name}: {l.title}
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="section-heading">
          <div>
            <span className="live-eyebrow">YOUR RECORDING</span>
            <h2>
              Recorded timeline{" "}
              <small>{session?.events.length ?? 0} actions</small>
            </h2>
          </div>
          <button
            className="danger-button"
            disabled={
              !connected || !token || !session?.events.length || pending > 0
            }
            onClick={() => {
              if (
                window.confirm(
                  "Delete the entire recorded timeline and clear the board for all connected screens? This cannot be undone.",
                )
              ) {
                wantsMicrophone.current = false;
                clearTimeout(restartTimer.current);
                recognition.current?.abort();
                setListening(false);
                send("reset");
              }
            }}
          >
            Delete all timeline
          </button>
        </div>
        {!session?.events.length && (
          <p className="empty-state">
            Your presentation starts here. Speak, type or draw to record an
            action.
          </p>
        )}
        <ol>
          {session?.events.map((e, i) => (
            <li key={i}>
              {e.command}{" "}
              <small>
                {e.start.toFixed(1)}s · {e.duration.toFixed(1)}s
              </small>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
