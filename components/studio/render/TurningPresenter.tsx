import React from "react";
// Orthographic 3D projection keeps the illustrated style while rotating actual volumes.
export function presenterProjection(
  x: number,
  y: number,
  z: number,
  yaw: number,
  cx: number,
) {
  return {
    x: cx + x * Math.cos(yaw) + z * Math.sin(yaw),
    y,
    depth: -x * Math.sin(yaw) + z * Math.cos(yaw),
  };
}
export default function TurningPresenter({
  x,
  yaw,
  hand,
  elbow,
  marker,
  shirt,
  ink,
}: {
  x: number;
  yaw: number;
  hand: number[];
  elbow: number[];
  marker: number[];
  shirt: string;
  ink: string;
}) {
  const parts: { depth: number; node: React.ReactNode }[] = [];
  const project = (p: number[]) =>
    presenterProjection(p[0], p[1], p[2], yaw, x);
  const shade = (hex: string, light: number) => {
    const color = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#7160ee";
    return `rgb(${[1, 3, 5].map((i) => Math.round(parseInt(color.slice(i, i + 2), 16) * light)).join(",")})`;
  };
  const sphere = (
    center: number[],
    radius: number[],
    color: string,
    hair = false,
  ) => {
    const rows = 12,
      cols = 24;
    const point = (a: number, b: number) => [
      center[0] + radius[0] * Math.sin(a) * Math.cos(b),
      center[1] - radius[1] * Math.cos(a),
      center[2] + radius[2] * Math.sin(a) * Math.sin(b),
    ];
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const a = (i * Math.PI) / rows,
          b = (j * 2 * Math.PI) / cols,
          da = Math.PI / rows,
          db = (2 * Math.PI) / cols;
        const vertices = [
          point(a, b),
          point(a + da, b),
          point(a + da, b + db),
          point(a, b + db),
        ].map(project);
        const mid = point(a + da / 2, b + db / 2),
          normal = [
            (mid[0] - center[0]) / radius[0],
            (mid[1] - center[1]) / radius[1],
            (mid[2] - center[2]) / radius[2],
          ];
        const rotated = project([normal[0], normal[1], normal[2]]);
        if (rotated.depth < 0) continue;
        const light =
          0.8 +
          0.2 *
            Math.max(
              0,
              -0.4 * (rotated.x - x) - 0.5 * normal[1] + 0.75 * rotated.depth,
            );
        const fill = shade(hair && mid[1] < 76 ? "#59402e" : color, light);
        parts.push({
          depth: vertices.reduce((sum, p) => sum + p.depth, 0) / 4,
          node: (
            <polygon
              points={vertices.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={fill}
              stroke={fill}
              strokeWidth=".3"
            />
          ),
        });
      }
  };
  const stroke = (points: number[][], color: string, width: number) => {
    const ps = points.map(project);
    parts.push({
      depth: ps.reduce((s, p) => s + p.depth, 0) / ps.length,
      node: (
        <path
          d={ps.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    });
  };
  sphere([0, 166, 0], [29, 48, 15], shirt);
  sphere([0, 114, 0], [8, 13, 8], "#f0c3a2");
  sphere([0, 82, 0], [29, 33, 22], "#f0c3a2", true);
  stroke(
    [
      [-24, 139, 0],
      [-34, 168, 1],
      [-42, 192, 2],
    ],
    "#e5b493",
    15,
  );
  stroke(
    [
      [23, 137, 0],
      [elbow[0] - x, elbow[1], 1],
      [hand[0] - x, hand[1], 2],
    ],
    "#f0c3a2",
    15,
  );
  stroke(
    [
      [hand[0] - x - 2, hand[1] + 6, 3],
      [marker[0] - x, marker[1], 3],
    ],
    "#343740",
    5,
  );
  stroke(
    [
      [marker[0] - x - 1, marker[1] + 3, 3],
      [marker[0] - x, marker[1], 3],
    ],
    ink,
    2,
  );
  sphere([hand[0] - x, hand[1], 4], [6, 6, 5], "#f0c3a2");
  // Features live on the FRONT surface, occluded by the head until it turns.
  const surface = (xx: number, yy: number) => [
    xx,
    yy,
    -22 * Math.sqrt(Math.max(0, 1 - (xx / 29) ** 2 - ((yy - 82) / 33) ** 2)) -
      0.5,
  ];
  const faceStroke = (points: number[][], color: string, width: number) => {
    for (let i = 1; i < points.length; i++) {
      const a = surface(points[i - 1][0], points[i - 1][1]),
        b = surface(points[i][0], points[i][1]);
      if (project(a).depth > 0 && project(b).depth > 0)
        stroke([a, b], color, width);
    }
  };
  for (const side of [-1, 1]) {
    faceStroke(
      [
        [side * 16, 82],
        [side * 11, 80],
        [side * 6, 82],
      ],
      "#59402e",
      1.8,
    );
    const eye = surface(side * 10, 87);
    if (project(eye).depth > 0) sphere(eye, [2.4, 3, 1], "#34303a");
  }
  // The projecting nose provides a visible profile halfway through the turn.
  sphere([0, 94, -22], [3, 5, 5], "#e4ad89");
  faceStroke(
    [
      [-7, 101],
      [-4, 104],
      [0, 105],
      [4, 104],
      [7, 101],
    ],
    "#945744",
    2,
  );
  return (
    <g>
      {parts
        .sort((a, b) => a.depth - b.depth)
        .map((p, i) => (
          <React.Fragment key={i}>{p.node}</React.Fragment>
        ))}
    </g>
  );
}
