"use client";
import { useState } from "react";
import { pastedTextCommand } from "../../lib/studio/whiteboard-text";
export default function PastePresenterText({
  disabled,
  onWrite,
}: {
  disabled?: boolean;
  onWrite: (text: string) => void;
}) {
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <details className="presenter-paste">
      <summary>Paste text · full whiteboard</summary>
      <p>
        Paste a passage. The presenter wraps it onto new lines and continues
        down to the bottom. This starts a fresh board.
      </p>
      <textarea
        aria-label="Text to write on the whiteboard"
        rows={6}
        maxLength={600}
        placeholder="Paste your lesson text here…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
        }}
        style={{
          width: "100%",
          padding: 10,
          boxSizing: "border-box",
          border: "1px solid #dce2ec",
          borderRadius: 8,
          fontSize: 16,
        }}
      />
      <small>{text.length}/600 characters · automatic line wrapping</small>
      <button
        type="button"
        disabled={disabled || !text.trim()}
        onClick={() => {
          try {
            pastedTextCommand(text);
            onWrite(text);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Write on fresh board
      </button>
      <p role="status">{error}</p>
    </details>
  );
}
