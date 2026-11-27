import { defineConfig } from "@playwright/test";

if (!process.env.E2E_BASE_URL) throw new Error("Set the local demo URL");
export default defineConfig({
  testDir: "./e2e", testMatch: "**/camera.preview.ts", workers: 1, timeout: 45_000,
  outputDir: process.env.E2E_OUTPUT_DIR ?? "test-results/camera-preview",
  use: {
    baseURL: process.env.E2E_BASE_URL, browserName: "chromium", trace: "off", screenshot: "off",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
});
