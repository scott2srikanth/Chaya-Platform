import { spawn } from "node:child_process";
const children = [
  spawn("node", ["node_modules/next/dist/bin/next", "dev"], {
    stdio: "inherit",
  }),
  spawn("node", ["--import", "tsx", "scripts/studio/render-server.ts"], {
    stdio: "inherit",
  }),
];
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    children.forEach((c) => c.kill(signal));
    process.exit();
  });

let stopping = false;
for (const child of children)
  child.on("exit", (code) => {
    if (stopping) return;
    stopping = true;
    children.filter((c) => c !== child).forEach((c) => c.kill("SIGTERM"));
    process.exitCode = code ?? 1;
  });
