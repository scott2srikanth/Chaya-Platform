"use client";
import { ARCHITECTURE_LAYERS } from "../../lib/studio/architecture-library";
import { useEffect, useRef, useState } from "react";
import {
  DRAWING_LIBRARY,
  interpretPresenterSpeech,
  type DictationMode,
} from "../../lib/studio/drawing-library";
import { useStudioStore } from "../../lib/studio/store";
import {
  drawingPrompt,
  generatedBoardCommand,
} from "../../lib/studio/whiteboard-ai";
import {
  createBoardCommand,
  UnsupportedDrawingError,
} from "../../lib/studio/live-whiteboard";
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
export default function LiveWhiteboardCommands({
  elementId,
}: {
  elementId: string;
}) {
  const [input, setInput] = useState(""),
    [status, setStatus] = useState(""),
    [listening, setListening] = useState(false),
    [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false),
    [json, setJson] = useState("");
  const dictation = useRef<DictationMode>(null);
  const pending = useRef<AbortController | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const liveMode = useStudioStore(
    (s) =>
      s.activeScene()?.elements.find((e) => e.id === elementId)?.whiteboard
        ?.liveMode !== false,
  );
  const playing = useStudioStore((s) => s.isPlaying);
  const commands = useStudioStore(
    (s) =>
      s.project?.scenes
        .find((scene) => scene.id === s.activeSceneId)
        ?.elements.find((e) => e.id === elementId)?.whiteboard?.liveCommands,
  );
  const ctor = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  };
  useEffect(() => {
    setSupported(!!ctor());
    const controller = new AbortController();
    return () => {
      controller.abort();
      pending.current?.abort();
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.onend = null;
        recognition.current.abort();
      }
    };
  }, []);
  async function run(value: string, imported?: unknown) {
    if (imported === undefined) {
      const interpreted = interpretPresenterSpeech(value, dictation.current);
      dictation.current = interpreted.mode;
      if (!interpreted.command) {
        setStatus(interpreted.message ?? "");
        setInput("");
        return;
      }
      value = interpreted.command;
    }
    if (pending.current) {
      setStatus("Please wait for the current drawing to finish.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    try {
      let s = useStudioStore.getState();
      const sceneId = s.activeSceneId,
        projectId = s.project?.id;
      let element = s.activeScene()?.elements.find((e) => e.id === elementId);
      if (!s.project || !element)
        throw new Error("Select the presenter before sending a command.");
      const snapshot = JSON.stringify(element.whiteboard?.liveCommands ?? []);
      let previous = element.whiteboard?.liveCommands ?? [];
      if (previous.length >= 120)
        throw new Error("This board is full. Start a fresh board.");
      let event: ReturnType<typeof generatedBoardCommand>;
      if (imported !== undefined)
        event = generatedBoardCommand(value, imported, 0);
      else
        try {
          event = createBoardCommand(value, previous, 0);
        } catch (error) {
          if (!(error instanceof UnsupportedDrawingError)) throw error;
          throw new Error(
            "That drawing is not in the library. Choose a library item below, or import a custom drawing with ChatGPT JSON.",
          );
        }
      if (controller.signal.aborted) return;
      s = useStudioStore.getState();
      element = s.activeScene()?.elements.find((e) => e.id === elementId);
      if (
        s.project?.id !== projectId ||
        s.activeSceneId !== sceneId ||
        !element ||
        JSON.stringify(element.whiteboard?.liveCommands ?? []) !== snapshot
      )
        throw new Error("The board changed. Send your drawing request again.");
      previous = element.whiteboard?.liveCommands ?? [];
      const last = previous[previous.length - 1],
        local = Math.max(0, s.currentTime - (element.startTime ?? 0));
      event.start =
        Math.max(
          previous.length ? local : 0,
          last ? last.start + last.duration : 0,
        ) + 0.15;
      const end = (element.startTime ?? 0) + event.start + event.duration + 3;
      s.editProject((p) => {
        const target = p.scenes.find((x) => x.id === sceneId)!;
        const el = target.elements.find((x) => x.id === elementId)!;
        el.whiteboard = {
          ...el.whiteboard,
          liveCommands: [...previous, event],
        };
        target.duration = Math.max(target.duration, end);
        if (el.endTime !== undefined) el.endTime = Math.max(el.endTime, end);
      });
      const offset = s
        .project!.scenes.slice(
          0,
          s.project!.scenes.findIndex((x) => x.id === sceneId),
        )
        .reduce((n, x) => n + x.duration, 0);
      const globalStart = offset + (element.startTime ?? 0);
      if (element.whiteboard?.liveMode !== false) {
        // Continue a running command; otherwise start directly at the new action.
        s.playPresenterAction(
          globalStart + (s.isPlaying ? local : event.start),
          offset + end,
        );
      } else {
        if (!s.isPlaying || !previous.length)
          s.seek(globalStart + (previous.length ? local : 0));
        s.setIsPlaying(true);
      }
      setStatus(`Presenter: ${event.command}`);
      setInput("");
    } catch (error) {
      if (!controller.signal.aborted)
        setStatus(
          error instanceof Error ? error.message : "Unable to apply command.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Constructor = ctor();
    if (!Constructor) return;
    const r = new Constructor();
    recognition.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) run(result[0].transcript);
        else setInput(result[0].transcript);
      }
    };
    r.onerror = (e) => {
      setStatus(
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow it in your browser, or type a command."
          : `Speech recognition: ${e.error}. Try again or type a command.`,
      );
      setListening(false);
    };
    r.onend = () => setListening(false);
    try {
      r.start();
      setListening(true);
      setStatus(
        "Listening — say “write” plus a sentence, or a drawing command.",
      );
    } catch {
      setStatus("Microphone could not start. Try again or type a command.");
    }
  }
  return (
    <section
      aria-label="Live presenter commands"
      style={{
        border: "1px solid #d5dae3",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
      }}
    >
      <strong>Live presenter</strong>
      <button type="button" style={{display:"block",marginTop:8}} onClick={()=>{sessionStorage.setItem("presenter-room-seed",JSON.stringify(commands??[]));window.open("/studio/live","_blank");}}>Connect projector & tablet</button>
      <label
        style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}
      >
        <input
          type="checkbox"
          aria-label="Presenter live mode"
          checked={liveMode}
          onChange={(e) => {
            const s = useStudioStore.getState();
            s.setIsPlaying(false);
            const el = s
              .activeScene()
              ?.elements.find((el) => el.id === elementId);
            s.updateElement(elementId, {
              whiteboard: { ...el?.whiteboard, liveMode: e.target.checked },
            });
          }}
        />
        Live mode · {playing ? "Performing command" : "Ready for commands"}
      </label>
      <p>
        Every command is recorded as a timeline track. Live mode plays the
        action, then waits for your next command.
      </p>
      <p>
        Describe what to draw, or say “write” followed by a sentence. New ink is
        added to your live board. Your manual content is kept.
      </p>
      <p>
        Say “write”, then dictate. Say “draw”, then a library name. “Remove”
        erases the last item; “remove house” or “remove Hello” erases a named
        item. Say “stop writing” to end dictation.
      </p>
      <button type="button" disabled={!supported} onClick={toggleMic}>
        {listening ? "Stop listening" : "Start microphone"}
      </button>
      <p>
        {supported
          ? "Speech uses your browser’s recognition service and may send audio for processing."
          : "Voice input is unavailable in this browser. Type a command below, or try Chrome."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
      >
        <input
          aria-label="Presenter command"
          placeholder="write Hello / draw house / remove house"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? "Drawing…" : "Send command"}
        </button>
      </form>
      {busy && (
        <button
          type="button"
          onClick={() => {
            pending.current?.abort();
            setStatus("Drawing cancelled.");
          }}
        >
          Cancel drawing
        </button>
      )}
      <details>
        <summary>Draw with ChatGPT JSON</summary>
        <p>
          Enter a drawing request above. Copy its prompt into ChatGPT, then
          paste the returned JSON here.
        </p>
        <button
          type="button"
          disabled={!input.trim() || busy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                drawingPrompt(input, commands ?? []),
              );
              setStatus("Drawing prompt copied. Paste it into ChatGPT.");
            } catch {
              setStatus(
                "Clipboard unavailable. Select the prompt below and copy it.",
              );
            }
          }}
        >
          Copy drawing prompt
        </button>
        <textarea
          aria-label="Drawing prompt"
          readOnly
          value={drawingPrompt(
            input || "Describe your drawing here",
            commands ?? [],
          )}
          style={{ minHeight: 70 }}
        />
        <textarea
          aria-label="Drawing JSON"
          placeholder='{"strokes":[[{"x":0.1,"y":0.2},{"x":0.5,"y":0.8}]]}'
          value={json}
          onChange={(e) => setJson(e.target.value)}
          maxLength={180000}
        />
        <button
          type="button"
          disabled={busy || !json.trim() || !input.trim()}
          onClick={() => {
            try {
              const data = JSON.parse(
                json
                  .trim()
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```$/, ""),
              );
              void run(input, data);
            } catch {
              setStatus(
                "Invalid JSON. Paste the complete drawing object from ChatGPT.",
              );
            }
          }}
        >
          Validate & draw
        </button>
      </details>
      <details>
        <summary>Vertical ML / DL architecture</summary>
        <p>
          Six fixed layers, top to bottom. Say “draw first layer”, then add any
          of the remaining layers. Use a clear board.
        </p>
        {ARCHITECTURE_LAYERS.map((layer) => (
          <button
            type="button"
            key={layer.name}
            title={layer.title}
            onClick={() => run(`draw ${layer.name}`)}
            style={{
              display: "block",
              textAlign: "left",
              width: "100%",
              marginBottom: 4,
            }}
          >
            {layer.name}: {layer.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => run("draw vertical architecture diagram")}
        >
          Draw all six layers
        </button>
      </details>
      <details open>
        <summary>Drawing library & commands</summary>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}
        >
          {[
            "draw browser",
            "draw computer",
            "draw server",
            "connect computer to server",
            "connect server to computer",
            ...DRAWING_LIBRARY.map((item) => `draw ${item.name}`),
            "remove",
          ].map((c) => (
            <button
              type="button"
              disabled={busy}
              key={c}
              onClick={() => run(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </details>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {commands !== undefined && (
        <>
          <small>
            {commands.length} commands recorded · included in playback and
            export
          </small>
          <ol>
            {commands.map((c, i) => (
              <li key={i}>{c.command}</li>
            ))}
          </ol>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const s = useStudioStore.getState();
              s.setIsPlaying(false);
              s.updateElement(elementId, {
                whiteboard: {
                  ...s.activeScene()?.elements.find((e) => e.id === elementId)
                    ?.whiteboard,
                  liveCommands: undefined,
                },
              });
              setStatus(
                "Manual board restored. The next command starts a fresh live board.",
              );
            }}
          >
            Reset live board
          </button>
        </>
      )}
    </section>
  );
}
