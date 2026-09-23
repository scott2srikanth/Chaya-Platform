"use client";
import { useState } from "react";
export default function LiveConnection() {
  const [mode, setMode] = useState("current"),
    [hosts, setHosts] = useState<string[]>([]),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function test() {
    setBusy(true);
    try {
      const times: number[] = [];
      let data: any;
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const response = await fetch("/api/studio/live?connection=1", {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Connection failed");
        times.push(performance.now() - start);
      }
      setHosts(data.hosts);
      setStatus(
        `${data.shared ? "Cloud shared storage" : "Local app server"} reachable · ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms average round trip. ${data.shared ? "To use local Wi-Fi, run the app on your classroom computer and create a room there." : "Open one of the local addresses on your phone, sign in, and join the same room with its code. Run this test on the phone too."}`,
      );
    } catch (e) {
      setStatus(
        `Test failed: ${(e as Error).message}. Check the server, Wi-Fi and firewall.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <span className="live-eyebrow">PROJECTOR + PHONE</span>
      <h2>Connection</h2>
      <label>
        Connection option{" "}
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setStatus("");
          }}
        >
          <option value="current">Current server / cloud</option>
          <option value="local">Local Wi-Fi</option>
        </select>
      </label>
      <p>
        {mode === "local"
          ? "Run Studio on the classroom computer. Connect both screens to the same Wi-Fi, open its local address, then pair using the room code. Cloud rooms stay on the cloud server."
          : "Use the same server address on both devices. The projector follows every accepted command."}
      </p>
      <button disabled={busy} onClick={test}>
        {busy ? "Testing…" : "Test connection"}
      </button>
      <p role="status">{status}</p>
      {mode === "local" &&
        hosts.map((host) => (
          <p key={host}>
            <a href={`${host}/studio/live`} target="_blank" rel="noreferrer">
              {host}/studio/live
            </a>
          </p>
        ))}
      {mode === "local" && (
        <small>
          HTTP Wi-Fi supports scene buttons, typing and drawing. Mobile
          microphone access requires HTTPS. A successful test checks this
          device’s server connection; test on both devices.
        </small>
      )}
    </section>
  );
}
