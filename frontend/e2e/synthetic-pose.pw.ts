import { expect, test } from "@playwright/test";

const participantId = "11111111-1111-4111-8111-111111111111";
const otherId = "44444444-4444-4444-8444-444444444444";
const posePath = `/participants/${participantId}/pose-demo`;

test("unauthenticated visitors return to login", async ({ page }) => {
  await page.goto(posePath);
  await expect(page).toHaveURL(/\/login$/);
});

test("an unassigned coded object is not shown", async ({ context, page }) => {
  await context.addCookies([{
    name: "taiji_session",
    value: "synthetic-browser-only",
    url: "http://127.0.0.1:3100",
  }]);
  const response = await page.goto(`/participants/${otherId}/pose-demo`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("SYN-001")).toHaveCount(0);
});

test("synthetic preview works without capture or upload", async ({ context, page }) => {
  await context.addCookies([{
    name: "taiji_session",
    value: "synthetic-browser-only",
    url: "http://127.0.0.1:3100",
  }]);
  await page.addInitScript(() => {
    const browser = window as typeof window & { __cameraRequests: number };
    browser.__cameraRequests = 0;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => {
        browser.__cameraRequests += 1;
        return Promise.reject(new Error("synthetic browser fixture blocks camera"));
      } },
    });
  });
  await page.goto(posePath);
  await expect(page.getByRole("heading", { name: "姿态拍照演示壳" })).toBeVisible();
  await expect(page.getByText("姿态识别算法尚未接入")).toBeVisible();
  await expect(page.getByText("已记录（仍不授权真实采集）", { exact: false })).toBeVisible();
  await expect(page.locator("input[type=file], video, form")).toHaveCount(0);

  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`);
  });
  const generate = page.getByRole("button", { name: "生成合成示意画面" });
  const clear = page.getByRole("button", { name: "清除预览" });
  await expect(clear).toBeDisabled();
  await generate.click();
  await expect(page.getByRole("img", { name: "第 1 幅合成线条人物示意图" })).toBeVisible();
  await generate.click();
  await expect(page.getByRole("img", { name: "第 2 幅合成线条人物示意图" })).toBeVisible();
  await clear.click();
  await expect(page.getByRole("region", { name: "合成画面预览" }).getByRole("img")).toHaveCount(0);
  await expect(clear).toBeDisabled();
  expect(writes).toEqual([]);
  expect(await page.evaluate(() =>
    (window as typeof window & { __cameraRequests: number }).__cameraRequests)).toBe(0);
});
