"use client";
import { useEffect, useState } from "react";
import { useStudioStore } from "../../lib/studio/store";
import { Field, Select, download } from "./StudioControls";
import { dialogueTracks } from "../../lib/studio/dialogue";
import { serializeProject } from "../../lib/studio/project";
import {
  presenterActions,
  presenterTimelineProject,
} from "../../lib/studio/presenter-timeline";
const base = "http://127.0.0.1:4319";
export default function ExportPanel({
  onClose,
  initialScope = "project",
}: {
  onClose: () => void;
  initialScope?: "project" | "presenter";
}) {
  const project = useStudioStore((s) => s.project)!,
    [format, setFormat] = useState("mp4"),
    [quality, setQuality] = useState("1080p"),
    [job, setJob] = useState(""),
    [status, setStatus] = useState(""),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false);
  const sceneId = useStudioStore((s) => s.activeSceneId);
  const [scope, setScope] = useState(initialScope);
  const scene = project.scenes.find((s) => s.id === sceneId);
  const hasPresenter = !!scene && presenterActions(scene).length > 0;
  const exportProject =
    scope === "presenter" && hasPresenter
      ? presenterTimelineProject(project, sceneId!)
      : project;
  useEffect(() => {
    if (!job) return;
    let canceled = false;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(base + "/jobs/" + job),
          j = await r.json();
        if (canceled) return;
        setProgress(j.progress);
        setStatus(j.error ?? j.state);
        if (j.state !== "rendering") {
          setBusy(false);
          clearInterval(timer);
        }
      } catch {
        setStatus("Renderer connection lost");
        setBusy(false);
        clearInterval(timer);
      }
    }, 750);
    return () => {
      canceled = true;
      clearInterval(timer);
    };
  }, [job]);
  const render = async () => {
    try {
      setBusy(true);
      setStatus("Starting render");
      const response = await fetch(base + "/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: exportProject, format, quality }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setJob(data.id);
    } catch (e: any) {
      setBusy(false);
      setStatus(
        e.message === "Failed to fetch"
          ? "Start the local renderer with npm run studio, then retry."
          : e.message,
      );
    }
  };
  return (
    <div className="ms-modal-backdrop">
      <section className="ms-modal" role="dialog" aria-label="Export video">
        <h2>Export your explainer</h2>
        {hasPresenter && (
          <label>
            Timeline
            <select
              aria-label="Export timeline"
              disabled={busy}
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as "project" | "presenter")
              }
            >
              <option value="project">Entire project</option>
              <option value="presenter">Current presenter timeline</option>
            </select>
          </label>
        )}
        {scope === "presenter" && hasPresenter && (
          <p>
            {presenterActions(scene!).length} recorded actions ·{" "}
            {exportProject.scenes[0].duration.toFixed(2)} seconds · writes,
            drawings and erasures included.
          </p>
        )}
        <p>
          {project.settings.width} × {project.settings.height} ·{" "}
          {project.settings.fps} FPS
        </p>
        <Select
          label="Format"
          value={format}
          options={["mp4", "webm"]}
          onChange={setFormat}
        />
        <Select
          label="Quality"
          value={quality}
          options={["draft", "1080p", "high"]}
          onChange={setQuality}
        />
        <p>
          Draft renders at half size. Other presets use project dimensions.
          Generated character voices and imported audio are included.
        </p>
        {project.scenes.reduce(
          (n, s) => n + s.script.filter((l) => l.text.trim()).length,
          0,
        ) > dialogueTracks(project).length && (
          <p role="note">
            Some dialogue has no current recording. Generate character voices in
            the Script tab to include those lines.
          </p>
        )}
        {status && (
          <progress
            aria-label="Video export progress"
            max={1}
            value={progress}
          />
        )}
        <p role="status">{status}</p>
        <div className="ms-row">
          <button className="primary" disabled={busy} onClick={render}>
            Render video
          </button>
          {busy && (
            <button
              onClick={async () => {
                await fetch(base + "/jobs/" + job, { method: "DELETE" });
                setStatus("canceled");
                setBusy(false);
              }}
            >
              Cancel render
            </button>
          )}
          {status === "done" && (
            <a href={base + "/jobs/" + job + "/file"}>Download video</a>
          )}
          <button
            onClick={() =>
              download(
                project.metadata.name + ".json",
                serializeProject(exportProject),
              )
            }
          >
            Download project
          </button>
          <button disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
