import { defineConfig } from "@playwright/test";

const host = "127.0.0.1";
const apiUrl = `http://${host}:8765`;
const appUrl = `http://${host}:3100`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  workers: 1,
  use: {
    baseURL: appUrl,
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: `${apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm exec next dev --hostname ${host} --port 3100`,
      url: `${appUrl}/login`,
      env: { API_INTERNAL_URL: apiUrl },
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
});
