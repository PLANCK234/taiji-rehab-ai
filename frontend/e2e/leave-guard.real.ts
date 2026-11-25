import { expect, test } from "@playwright/test";

test("unsaved feedback survives cancelled reload and logout, with no warning on step changes", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "患者演示账号", exact: true }).click();
  await page.getByLabel("密码", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
  await expect(page.getByText(/有未保存的反馈内容/)).toHaveCount(0);
  const logoutRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/auth/logout")) logoutRequests.push(request.url()); });
  await page.getByLabel("发生时间（北京时间）").fill("2026-11-25T10:00");
  await expect(page.getByText(/有未保存的反馈内容/)).toBeVisible();
  await page.getByRole("button", { name: "1. 学习", exact: true }).click();
  const reloadDialog = page.waitForEvent("dialog");
  // Schedule refresh as a user would; a cancelled refresh never reaches a new load event.
  await page.evaluate(() => { window.setTimeout(() => window.location.reload(), 0); });
  const first = await reloadDialog;
  expect(first.type()).toBe("beforeunload"); await first.dismiss();
  await expect(page.getByRole("heading", { name: "我的康复空间", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
  await expect(page.getByLabel("发生时间（北京时间）")).toHaveValue("2026-11-25T10:00");

  for (const accept of [false, true]) {
    const prompt = page.waitForEvent("dialog");
    const click = page.getByRole("button", { name: "退出登录", exact: true }).click();
    const dialog = await prompt;
    expect(dialog.type()).toBe("confirm"); expect(dialog.message()).toContain("未保存的反馈");
    if (accept) await dialog.accept(); else await dialog.dismiss();
    await click;
    if (!accept) {
      expect(logoutRequests).toHaveLength(0);
      await expect(page.getByLabel("发生时间（北京时间）")).toHaveValue("2026-11-25T10:00");
    }
  }
  await expect(page).toHaveURL(/\/login$/);
  expect(logoutRequests).toHaveLength(1);
});
