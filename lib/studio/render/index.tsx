import React from "react";
import {
  registerRoot,
  Composition,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
} from "remotion";
import { dialogueTracks } from "../dialogue";
import ProjectFrame from "../../../components/studio/render/ProjectFrame";
import { Project, createDefaultProject } from "../types";
import { projectDuration } from "../project";
function Movie({ project }: { project: Project }) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig();
  return (
    <>
      <ProjectFrame project={project} time={frame / fps} />
      {[...(project.audio ?? []), ...dialogueTracks(project)]
        .filter((a) => !a.muted)
        .map((track) => {
          const asset = project.assets?.find((a) => a.id === track.assetId);
          return asset ? (
            <Sequence
              key={track.id}
              from={Math.round(track.start * fps)}
              durationInFrames={Math.max(1, Math.round(track.duration * fps))}
            >
              <Audio
                src={asset.dataUrl}
                startFrom={Math.round(track.offset * fps)}
                volume={(f) =>
                  track.volume *
                  Math.min(
                    1,
                    track.fadeIn ? f / fps / track.fadeIn : 1,
                    track.fadeOut
                      ? (track.duration - f / fps) / track.fadeOut
                      : 1,
                  )
                }
              />
            </Sequence>
          ) : null;
        })}
    </>
  );
}
function Root() {
  return (
    <Composition
      id="MotionExplainer"
      component={Movie}
      defaultProps={{ project: createDefaultProject("Export") }}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={150}
      calculateMetadata={({ props }) => ({
        width: props.project.settings.width,
        height: props.project.settings.height,
        fps: props.project.settings.fps,
        durationInFrames: Math.max(
          1,
          Math.ceil(
            projectDuration(props.project) * props.project.settings.fps,
          ),
        ),
      })}
    />
  );
}
registerRoot(Root);
