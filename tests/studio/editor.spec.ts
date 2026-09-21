import { PNG } from "pngjs";
import audioExample from "../../examples/studio/audio.json";
import { test, expect } from "@playwright/test";
test("create, animate, scrub, save, reopen and edit character", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/studio");
  await expect(page.getByText("Make your ideas move.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "New project name" })
    .fill("Studio acceptance");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "rectangle", exact: true }).click();
  await expect(page.locator("[data-element-id]")).toHaveCount(1);
  await page.getByRole("button", { name: "Fade In", exact: true }).click();
  await page.getByRole("slider", { name: "Project playhead" }).fill("0.5");
  await expect(page.locator("[data-element-id]").first()).toHaveAttribute(
    "opacity",
    "0.875",
  );
  await page.getByRole("button", { name: "Undo (⌘Z)" }).click();
  await page.getByRole("button", { name: "+ Scene", exact: true }).click();
  await page.getByRole("button", { name: "Scene", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Scene name", exact: true })
    .fill("Second scene");
  await page.getByRole("button", { name: "Character designer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Reusable Alex");
  await page
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reusable Alex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Poses", exact: true }).click();
  await page
    .getByRole("textbox", { name: "New name", exact: true })
    .fill("My pose");
  await page
    .getByRole("button", { name: "Create / duplicate pose", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "rotation", exact: true })
    .fill("25");
  await page
    .getByRole("button", { name: "Save pose / expression", exact: true })
    .click();
  await page.getByRole("button", { name: "Scenes", exact: true }).click();
  await page
    .getByRole("button", { name: "Characters library tab", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reusable Alex", exact: true })
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.reload();
  await page
    .getByRole("button", { name: "Studio acceptance", exact: true })
    .click();
  await page.getByRole("button", { name: "Character designer", exact: true }).click();
  await page.locator('[data-character-name="reusable alex"]').click();
  await page.getByRole("button", { name: "Poses", exact: true }).click();
  await expect(
    page.getByLabel("Pose", { exact: true }).locator("option"),
  ).toContainText(["My pose"]);
  await page.screenshot({
    path: "/tmp/motion-character-studio.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("golden template advances canvas and supports all scene types", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Website Request/ }).click();
  await expect(page.locator("[data-element-id]")).not.toHaveCount(0);
  await page.getByRole("slider", { name: "Project playhead" }).fill("4.25");
  await page.screenshot({
    path: "/tmp/motion-scene-studio.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(
    page.getByRole("slider", { name: "Project playhead" }),
  ).not.toHaveValue("4.25");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Export video" }),
  ).toBeVisible();
});

test("Lottie remains serializable after playback and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/studio");
  await page
    .getByRole("textbox", { name: "New project name" })
    .fill("Imported animation");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Assets & audio", exact: true })
    .click();
  await page
    .getByLabel("Import assets")
    .setInputFiles("tests/studio/fixtures/moving-square.json");
  await expect(
    page.getByText("Imported moving-square.json", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to scene", exact: true }).click();
  await page.getByRole("slider", { name: "Project playhead" }).fill("1");
  await expect(page.locator("foreignObject svg")).toHaveCount(1);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByText(/Save failed/)).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Imported animation", exact: true })
    .click();
  await expect(page.locator("foreignObject svg")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("Rive import renders visible pixels and exposes state machines", async ({
  page,
}) => {
  test.skip(
    !process.env.STUDIO_RIVE_FIXTURE,
    "Set STUDIO_RIVE_FIXTURE to a self-contained .riv file",
  );
  await page.goto("/studio");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Assets & audio", exact: true })
    .click();
  await page
    .getByLabel("Import assets")
    .setInputFiles(process.env.STUDIO_RIVE_FIXTURE!);
  await expect(page.getByText(/Imported .*riv/)).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Add to scene", exact: true }).click();
  await page.getByRole("slider", { name: "Project playhead" }).fill("1");
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((c: HTMLCanvasElement) => {
        const d = c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
        return n;
      }),
    )
    .toBeGreaterThan(100);
  await page
    .locator(".ms-track > button")
    .filter({ hasText: ".riv" })
    .first()
    .click();
  const machine = page.getByLabel("State machine", { exact: true });
  if ((await machine.locator("option").count()) > 1) {
    await machine.selectOption({ index: 1 });
    const inputs = page.getByRole("button", {
      name: /^Key .+ \((boolean|number|trigger)\)$/,
    });
    if (await inputs.count()) await inputs.first().click();
    await page.getByRole("slider", { name: "Project playhead" }).fill("1.5");
    await expect(page.locator("foreignObject p")).toHaveCount(0);
  }
});

test("sprite ranges animate and imported audio creates a timed track", async ({
  page,
}) => {
  const png = new PNG({ width: 16, height: 8 });
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      png.data[i] = x < 8 ? 255 : 0;
      png.data[i + 1] = x < 8 ? 0 : 255;
      png.data[i + 3] = 255;
    }
  await page.goto("/studio");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Assets & audio", exact: true })
    .click();
  await page.getByLabel("Import assets").setInputFiles({
    name: "two-frames.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(png),
  });
  await expect(
    page.getByText("Imported two-frames.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use as sprite sheet", exact: true })
    .click();
  await page.getByLabel("columns", { exact: true }).fill("2");
  await page.getByLabel("fps", { exact: true }).fill("1");
  await page.getByLabel("to", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Add to scene", exact: true }).click();
  await page.getByRole("slider", { name: "Project playhead" }).fill("1");
  await expect(page.locator("[data-element-id] > svg")).toHaveAttribute(
    "viewBox",
    "8 0 8 8",
  );
  await page
    .getByRole("button", { name: "Assets & audio", exact: true })
    .click();
  const wav = Buffer.from(
    audioExample.assets[0].dataUrl.split(",")[1],
    "base64",
  );
  await page
    .getByLabel("Import assets")
    .setInputFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: wav });
  await expect(
    page.getByText("Imported tone.wav", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add audio track", exact: true })
    .click();
  await expect(page.getByLabel("start", { exact: true })).toHaveValue("1");
});

test("presenter workspace preserves multiline text and supports focus mode", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Presenter story/ }).click();
  await page.getByRole("slider", { name: "Project playhead" }).fill("2");
  await expect(
    page.getByText("Every great idea", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("starts with a story.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .getByRole("button", { name: "Characters library tab", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add presenter Alex", exact: true }),
  ).toBeVisible();
  const before = await page.locator(".ms-artboard").boundingBox();
  await page.getByRole("button", { name: "Focus mode", exact: true }).click();
  await expect(page.locator(".ms-tools")).toBeHidden();
  await expect(page.locator(".ms-inspector")).toBeHidden();
  await expect
    .poll(async () => (await page.locator(".ms-artboard").boundingBox())!.width)
    .toBeGreaterThan(before!.width);
  await page
    .getByRole("button", { name: "Exit focus mode", exact: true })
    .click();
  await expect(page.locator(".ms-tools")).toBeVisible();
});
