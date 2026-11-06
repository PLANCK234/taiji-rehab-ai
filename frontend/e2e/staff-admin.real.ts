import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("staff administration test requires synthetic E2E_PASSWORD");

async function login(page: Page, email: string, secret = password!) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(secret);
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

test("synthetic admin creates staff and changes scoped access", async ({ page, browser }) => {
  await login(page, "demo-admin@example.org");
  await expect(page.getByRole("heading", { name: "人员与授权" })).toBeVisible();
  await page.getByLabel("演示邮箱（demo-…@example.org）").fill("demo-browser-staff@example.org");
  await page.getByLabel("初始密码（至少 12 位）").fill("synthetic-browser-secret-123");
  await page.getByRole("button", { name: "建立账号" }).click();
  await expect(page.getByText("已保存，授权立即生效。")).toBeVisible();
  const study = page.getByRole("listitem").filter({ hasText: "SYN-STUDY-A" });
  await study.getByRole("button", { name: "授权" }).click();
  await expect(study.getByRole("button", { name: "撤销" })).toBeVisible();
  const participant = page.getByRole("listitem").filter({ hasText: "SYN-001" });
  await participant.getByRole("button", { name: "授权" }).click();
  await expect(participant.getByRole("button", { name: "撤销" })).toBeVisible();

  const staffContext = await browser.newContext();
  try {
    const staffPage = await staffContext.newPage();
    await login(staffPage, "demo-browser-staff@example.org", "synthetic-browser-secret-123");
    await expect(staffPage.getByRole("heading", { name: "研究工作台" })).toBeVisible();
    await expect(staffPage.getByText("SYN-001")).toBeVisible();
    await page.reload();
    await page.getByLabel("工作人员").selectOption({ label: "demo-browser-staff@example.org" });
    await study.getByRole("button", { name: "撤销" }).click();
    await expect(study.getByRole("button", { name: "授权" })).toBeVisible();
    await staffPage.reload();
    await expect(staffPage.getByText("暂无研究分配。")).toBeVisible();
    await expect(staffPage.getByText("暂无已分配对象。")).toBeVisible();
    await page.getByRole("button", { name: "停用账号" }).click();
    await expect(page.getByRole("button", { name: "启用账号" })).toBeVisible();
    await staffPage.reload();
    await expect(staffPage).toHaveURL(/\/login$/);
  } finally {
    await staffContext.close();
  }
});
