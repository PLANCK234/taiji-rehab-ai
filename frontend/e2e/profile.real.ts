import { expect, test } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("profile test requires synthetic E2E_PASSWORD");

test("synthetic display profile correction persists and retains the original", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("demo-clinician-a@example.org");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
  await page.getByRole("link", { name: "SYN-001" }).click();
  const section = page.getByRole("region", { name: "合成展示资料" });
  await expect(section.getByText("尚未填写合成展示资料。")).toBeVisible();
  await section.getByLabel("演示年龄（可留空）").fill("67");
  await section.getByLabel("演示性别").selectOption("unknown");
  await section.getByRole("button", { name: "保存展示资料" }).click();
  await expect(section.getByText(/当前版本 1/)).toBeVisible();
  await section.getByLabel("演示年龄（可留空）").fill("68");
  await section.getByLabel("演示性别").selectOption("female");
  await section.getByLabel("更正原因（以 SYN- 开头）").fill("SYN-DEMO-CORRECTION");
  await section.getByRole("button", { name: "保存更正" }).click();
  await expect(section.getByText(/当前版本 2/)).toBeVisible();
  await page.reload();
  await expect(section.getByText(/当前版本 2/)).toBeVisible();
  await expect(section.getByRole("listitem").filter({ hasText: /版本 1 · 年龄：67/ })).toBeVisible();
  const latest = section.getByRole("listitem").filter({ hasText: /版本 2 · 年龄：68/ });
  await expect(latest).toBeVisible();
  await expect(latest).toContainText("更正原因：SYN-DEMO-CORRECTION");
});
