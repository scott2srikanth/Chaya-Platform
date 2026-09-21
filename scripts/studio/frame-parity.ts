import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import { chromium } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import { goldenProject } from "../../lib/studio/templates";
async function main() {
  const project = process.env.STUDIO_PARITY_PROJECT
    ? JSON.parse(await readFile(process.env.STUDIO_PARITY_PROJECT, "utf8"))
    : goldenProject();
  project.settings.fps = 60;
  await writeFile("/tmp/parity-project.json", JSON.stringify(project));
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 2200, height: 1500 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://localhost:3000/studio");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("/tmp/parity-project.json");
  await page.getByRole("slider", { name: "Project playhead" }).fill("4.25");
  await page.locator(".ms-artboard").evaluate((el: HTMLElement) => {
    el.style.position = "fixed";
    el.style.transform = "none";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "1920px";
    el.style.height = "1080px";
    el.style.zIndex = "999";
  });
  await page
    .locator(".ms-artboard > svg")
    .screenshot({ path: "/tmp/studio-preview-frame.png" });
  await browser.close();
  const serveUrl = await bundle({
    entryPoint: path.resolve("lib/studio/render/index.tsx"),
    publicDir: path.resolve("public"),
    webpackOverride: (c) => ({
      ...c,
      resolve: {
        ...c.resolve,
        alias: { ...c.resolve?.alias, "@": process.cwd() },
      },
    }),
  });
  const composition = await selectComposition({
    serveUrl,
    chromiumOptions: { gl: "swangle" },
    id: "MotionExplainer",
    inputProps: { project },
  });
  await renderStill({
    serveUrl,
    composition,
    inputProps: { project },
    chromiumOptions: { gl: "swangle" },
    frame: 255,
    output: "/tmp/studio-export-frame.png",
    imageFormat: "png",
  });
  const preview = PNG.sync.read(
      await readFile("/tmp/studio-preview-frame.png"),
    ),
    exported = PNG.sync.read(await readFile("/tmp/studio-export-frame.png"));
  assert.equal(preview.width, exported.width);
  assert.equal(preview.height, exported.height);
  let changed = 0,
    error = 0;
  for (let i = 0; i < preview.data.length; i += 4) {
    let delta = 0;
    for (let c = 0; c < 3; c++)
      delta += Math.abs(preview.data[i + c] - exported.data[i + c]);
    if (delta > 30) changed++;
    error += delta;
  }
  const result = {
    time: 4.25,
    width: preview.width,
    height: preview.height,
    changedPixelRatio: changed / (preview.width * preview.height),
    meanChannelError: error / (preview.width * preview.height * 3),
  };
  console.log(result);
  assert.ok(
    result.changedPixelRatio < 0.01,
    "Preview/export diverge beyond antialiasing tolerance",
  );
  await writeFile(
    "/tmp/studio-parity-result.json",
    JSON.stringify(result, null, 2),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
