import { defineConfig } from "@playwright/test";

if (!process.env.E2E_BASE_URL) throw new Error("Set the local teaching preview URL");
export default defineConfig({
  testDir: "./e2e", testMatch: "**/teaching.preview.ts", workers: 1, timeout: 90_000,
  outputDir: process.env.E2E_OUTPUT_DIR ?? "test-results/teaching-preview",
  use: {
    baseURL: process.env.E2E_BASE_URL, browserName: "chromium",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    trace: "off", screenshot: "off",
  },
});
