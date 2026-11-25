import { expect, test } from "@playwright/test";

test("local teaching assets require login, play, seek and pause without training writes", async ({ page, browser }) => {
  const anonymous = await page.request.get("/api/local-teaching/teaching-01.mp4");
  expect(anonymous.status()).toBe(401);
  await page.goto("/login");
  await page.getByRole("button", { name: "患者演示账号", exact: true }).click();
  await page.getByLabel("密码", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "太极动作教学视频", exact: true })).toBeVisible();
  const player = page.locator('section[aria-labelledby="local-teaching-title"]');
  const writes: string[] = [];
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
  const options = page.getByRole("navigation", { name: "教学视频素材列表" }).getByRole("button");
  await expect(options).toHaveCount(13);
  await expect(player.getByRole("button", { name: "← 上一段", exact: true })).toBeDisabled();
  await expect(player.getByText("当前第 1 段，共 13 段 · 原片时长 0:10", { exact: true })).toBeVisible();
  await player.getByLabel("播放速度").selectOption("0.75");
  await expect(player.locator("video")).toHaveJSProperty("playbackRate", 0.75);
  await player.getByRole("button", { name: "下一段 →", exact: true }).click();
  await expect(player.getByRole("heading", { name: "野马分鬃", exact: true })).toBeVisible();
  await expect(player.locator("video")).toHaveJSProperty("playbackRate", 0.75);
  await expect(player.locator("video")).toHaveJSProperty("paused", true);
  await player.getByRole("button", { name: "← 上一段", exact: true }).click();
  for (let i = 0; i < 13; i++) {
    await options.nth(i).click();
    await expect.poll(() => player.locator("video").evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
    await expect(player.locator("video")).toHaveJSProperty("paused", true);
  }
  await expect(player.getByRole("button", { name: "下一段 →", exact: true })).toBeDisabled();
  await options.first().click();
  await page.getByRole("button", { name: "从头重播", exact: true }).click();
  await expect.poll(() => player.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  await player.locator("video").evaluate((element: HTMLVideoElement) => { element.currentTime = 3; });
  await expect.poll(() => player.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: "2. 准备", exact: true }).click();
  await expect(player.locator("video")).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "1. 学习", exact: true }).click();
  await expect(player.locator("video")).toHaveJSProperty("paused", true);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(player.getByLabel("播放速度")).toHaveValue("0.75");
  }
  const range = await page.request.get("/api/local-teaching/teaching-01.mp4", { headers: { Range: "bytes=0-63" } });
  expect(range.status()).toBe(206); expect((await range.body()).length).toBe(64);
  expect(range.headers()["cache-control"]).toContain("no-store");
  expect(writes).toEqual([]);

  const staff = await browser.newContext();
  try {
    const staffPage = await staff.newPage();
    await staffPage.goto(process.env.E2E_BASE_URL! + "/login");
    await staffPage.getByRole("button", { name: "工作人员演示账号", exact: true }).click();
    await staffPage.getByLabel("密码", { exact: true }).fill(process.env.E2E_PASSWORD!);
    await staffPage.getByRole("button", { name: "登录", exact: true }).click();
    await expect(staffPage.getByRole("heading", { name: "研究工作台" })).toBeVisible();
    expect((await staffPage.request.get(process.env.E2E_BASE_URL! + "/api/local-teaching/teaching-01.mp4")).status()).toBe(403);
  } finally { await staff.close(); }
});
