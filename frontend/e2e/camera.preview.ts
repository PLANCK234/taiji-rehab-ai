import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "患者演示账号", exact: true }).click();
  await page.getByLabel("密码", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "2. 准备", exact: true }).click();
}

test("synthetic camera requires a click and stops on close, step change and pagehide", async ({ page }) => {
  await prepare(page);
  const writes: string[] = [];
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
  await expect(page.getByText("摄像头尚未打开", { exact: true })).toBeVisible();
  for (const exit of ["close", "step", "pagehide"]) {
    await page.getByRole("button", { name: "打开摄像头", exact: true }).click();
    await expect(page.getByText("摄像头已打开 · 仅本机预览", { exact: true })).toBeVisible();
    const track = await page.getByLabel("本机摄像头预览").evaluateHandle((element: HTMLVideoElement) => (element.srcObject as MediaStream).getVideoTracks()[0]);
    expect(await track.evaluate((item) => item.readyState)).toBe("live");
    expect(await page.getByLabel("本机摄像头预览").evaluate((element: HTMLVideoElement) => (element.srcObject as MediaStream).getAudioTracks().length)).toBe(0);
    if (exit === "close") await page.getByRole("button", { name: "关闭摄像头", exact: true }).click();
    else if (exit === "step") await page.getByRole("button", { name: "3. 训练", exact: true }).click();
    else await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect.poll(() => track.evaluate((item) => item.readyState)).toBe("ended");
    if (exit === "step") await page.getByRole("button", { name: "2. 准备", exact: true }).click();
    await track.dispose();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(writes).toEqual([]);
});

test("a denied permission can be retried without leaving the preparation step", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let first = true;
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (first) { first = false; return Promise.reject(new DOMException("synthetic permission denial", "NotAllowedError")); }
      return original(constraints);
    };
  });
  await prepare(page);
  await page.getByRole("button", { name: "打开摄像头", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "未获得摄像头权限" })).toBeVisible();
  await page.getByRole("button", { name: "重试打开摄像头", exact: true }).click();
  await expect(page.getByText("摄像头已打开 · 仅本机预览", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭摄像头", exact: true }).click();
});
