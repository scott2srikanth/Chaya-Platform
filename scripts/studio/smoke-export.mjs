import { readFile, writeFile } from "node:fs/promises";
const project = JSON.parse(
  await readFile(process.argv[3] ?? "examples/studio/audio.json", "utf8"),
);
const response = await fetch("http://127.0.0.1:4319/jobs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    project,
    format: process.argv[2] ?? "mp4",
    quality: process.argv[4] ?? "draft",
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
console.log("Render job:", result.id);
let last = "";
for (let i = 0; i < 240; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const job = await (
    await fetch("http://127.0.0.1:4319/jobs/" + result.id)
  ).json();
  if (job.state !== last) {
    console.log(job);
    last = job.state;
  }
  if (job.state === "failed") throw new Error(job.error);
  if (job.state === "done") {
    const file = await fetch(
      "http://127.0.0.1:4319/jobs/" + result.id + "/file",
    );
    const path = "/tmp/studio-smoke." + (process.argv[2] ?? "mp4");
    await writeFile(path, Buffer.from(await file.arrayBuffer()));
    console.log("Saved", path);
    process.exit(0);
  }
}
throw new Error("Render timed out");
