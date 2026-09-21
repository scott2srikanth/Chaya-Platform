import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/studio",
  testMatch: "**/*.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1500, height: 1000 },
    trace: "retain-on-failure",
  },
  workers: 1,
  reporter: "list",
  outputDir: "/tmp/motion-studio-playwright",
});
