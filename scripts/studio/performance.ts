import { chromium } from "@playwright/test";
import { createDefaultProject, createElement } from "../../lib/studio/types";
import { nativeCharacters, serializeProject } from "../../lib/studio/project";
import { writeFile } from "node:fs/promises";
async function main() {
  const project = createDefaultProject("20-character playback");
  project.characters = nativeCharacters();
  project.scenes[0].duration = 20;
  project.scenes[0].elements = Array.from({ length: 20 }, (_, i) =>
    createElement("character", {
      characterId: project.characters![i % 4].id,
      x: 40 + (i % 10) * 180,
      y: 30 + Math.floor(i / 10) * 520,
      width: 170,
      height: 400,
      actions: [{ id: "talk-" + i, type: "talk", startTime: 0, duration: 20 }],
    }),
  );
  await writeFile("/tmp/studio-performance.json", serializeProject(project));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1000 },
    });
    await page.goto("http://localhost:3000/studio");
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles("/tmp/studio-performance.json");
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const result = await page.evaluate(
      `new Promise(resolve=>{const times=[];let prev=performance.now();const tick=(now)=>{times.push(now-prev);prev=now;if(times.length<120)requestAnimationFrame(tick);else{times.sort((a,b)=>a-b);resolve({samples:times.length,medianMs:times[60],p95Ms:times[114]});}};requestAnimationFrame(tick);})`,
    );
    console.log(JSON.stringify(result));
    await writeFile(
      "/tmp/studio-performance-result.json",
      JSON.stringify(result, null, 2),
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
