import { expect, test } from "@playwright/test";

test("patient four-step shell keeps drafts and never starts training on desktop or mobile", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "患者演示账号", exact: true }).click();
  await page.getByLabel("密码", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "我的康复空间" })).toBeVisible();
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url());
  });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "1. 学习", exact: true }).click();
    await expect(page.getByRole("button", { name: "1. 学习", exact: true })).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("button", { name: "上一步", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "查看准备 →", exact: true }).click();
    await expect(page.getByRole("heading", { name: "准备 · 摄像头与环境" })).toBeFocused();
    await expect(page.getByText("摄像头尚未打开", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "关闭摄像头", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "查看训练 →", exact: true }).click();
    await expect(page.getByRole("button", { name: "开始训练（待接入）" })).toBeDisabled();
    await page.getByRole("button", { name: "查看反馈 →", exact: true }).click();
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-25T10:00");
    await page.getByLabel("实际训练情况").selectOption("performed");
    await page.getByLabel("实际时长（分钟，可留空表示未知）").fill("10");
    await page.getByRole("button", { name: "上一步", exact: true }).click();
    await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
    await expect(page.getByLabel("实际时长（分钟，可留空表示未知）")).toHaveValue("10");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "返回学习", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: `${process.env.E2E_OUTPUT_DIR}/patient-four-step-mobile.png`, fullPage: true });
  }
  const prompt = page.waitForEvent("dialog");
  const reload = page.reload();
  const dialog = await prompt;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.accept();
  await reload;
  await expect(page.getByRole("button", { name: "1. 学习", exact: true })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
  await expect(page.getByLabel("实际训练情况")).toHaveValue("unknown");
  expect(writes).toEqual([]);
});
