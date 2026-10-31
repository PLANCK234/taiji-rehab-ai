import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error("ENG-04B requires E2E_BASE_URL from the isolated test runner");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.real.ts",
  workers: 1,
  timeout: 60_000,
  globalTimeout: 300_000,
  outputDir: process.env.E2E_OUTPUT_DIR ?? "test-results/real-browser",
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
