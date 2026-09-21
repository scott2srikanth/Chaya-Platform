import type { StudioAsset } from "../../../lib/studio/types";
export default function SpriteAsset({
  asset,
  time,
  width,
  height,
  animation,
  loop = true,
  speed = 1,
}: {
  asset: StudioAsset;
  time: number;
  width: number;
  height: number;
  animation?: string;
  loop?: boolean;
  speed?: number;
}) {
  const sprite = asset.sprite;
  if (!sprite)
    return <image href={asset.dataUrl} width={width} height={height} />;
  const clip =
    sprite.animations.find((a) => a.name === animation) ?? sprite.animations[0];
  const from = clip?.from ?? 0,
    to = clip?.to ?? sprite.columns * sprite.rows - 1;
  const raw = Math.floor(Math.max(0, time) * sprite.fps * speed),
    count = Math.max(1, to - from + 1),
    f = from + (loop ? raw % count : Math.min(raw, count - 1));
  return (
    <svg
      width={width}
      height={height}
      viewBox={`${((f % sprite.columns) * asset.width) / sprite.columns} ${(Math.floor(f / sprite.columns) * asset.height) / sprite.rows} ${asset.width / sprite.columns} ${asset.height / sprite.rows}`}
    >
      <image href={asset.dataUrl} width={asset.width} height={asset.height} />
    </svg>
  );
}
