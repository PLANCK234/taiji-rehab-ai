import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("ENG-04B requires E2E_PASSWORD for synthetic staff only");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
}

test("unauthenticated synthetic workspace redirects to login", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
});

test("synthetic enrollment through confirmed baseline and missing revisit persists", async ({ page }) => {
  await login(page, "demo-clinician-a@example.org");
  await expect(page.getByRole("region", { name: "已分配研究" })
    .locator("li").filter({ hasText: "SYN-STUDY-A" })).toBeVisible();
  await page.getByLabel("合成编号").fill("SYN-ENG04B-001");
  await page.getByRole("button", { name: "创建编号对象" }).click();
  await expect(page.getByRole("heading", { name: "SYN-ENG04B-001" })).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText("未评估");
  await expect(page.getByText("未记录有效的模拟同意，筛查录入已关闭。")).toBeVisible();
  await expect(page.getByRole("button", { name: "创建评估草稿" })).toHaveCount(0);

  await page.getByRole("button", { name: "追加同意记录" }).click();
  await expect(page.getByText("当前记录：模拟同意已记录")).toBeVisible();
  await page.getByRole("button", { name: "追加筛查记录" }).click();
  await expect(page.getByRole("status").first()).toHaveText("待复核");
  await expect(page.getByText("SYN-ITEM-01：未知")).toBeVisible();

  await page.getByRole("button", { name: "创建评估草稿" }).click();
  await expect(page.getByRole("heading", { name: "基线评估" })).toBeVisible();
  await page.getByLabel("记录状态").selectOption("valid");
  await page.getByLabel("人工 SPPB 总分（分）").fill("0");
  await page.getByLabel("测量时间（设备本地时间，保存为 UTC）").fill("2026-10-30T10:00");
  await page.getByRole("button", { name: "保存新草稿版本" }).click();
  await expect(page.getByText("人工 SPPB 总分：0 分")).toBeVisible();
  await page.getByRole("button", { name: "确认当前记录" }).click();
  await expect(page.getByText(/当前版本 3 ·已确认记录/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("人工 SPPB 总分：0 分")).toBeVisible();
  await expect(page.getByRole("heading", { name: "版本时间线" })).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(3);
  await page.getByRole("link", { name: /返回编号对象/ }).click();
  await expect(page).toHaveURL(/\/participants\/[0-9a-f-]+$/);
  let table = page.getByRole("table", { name: "编号对象的人工 SPPB 总分基线与复评序列" });
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("meter")).toHaveCount(1);
  await expect(table.locator("meter")).toHaveAttribute("value", "0");

  await page.getByLabel("记录类型").selectOption("revisit");
  await page.getByRole("button", { name: "创建评估草稿" }).click();
  await expect(page.getByRole("heading", { name: "复评记录" })).toBeVisible();
  await page.getByLabel("记录状态").selectOption("missing");
  await page.getByLabel("缺失/无效原因").selectOption("declined");
  await page.getByRole("button", { name: "保存新草稿版本" }).click();
  await expect(page.getByText("人工 SPPB 总分：缺失（拒测）")).toBeVisible();
  await page.getByRole("button", { name: "确认当前记录" }).click();
  await expect(page.getByText(/当前版本 3 ·已确认记录/)).toBeVisible();
  await page.getByRole("link", { name: /返回编号对象/ }).click();
  await expect(page).toHaveURL(/\/participants\/[0-9a-f-]+$/);
  await page.reload();
  table = page.getByRole("table", { name: "编号对象的人工 SPPB 总分基线与复评序列" });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(table.locator("meter")).toHaveCount(1);
  await expect(table.locator("tbody tr").nth(1)).toContainText("缺失（拒测）");
  await expect(table.locator("tbody tr").nth(1).locator("meter")).toHaveCount(0);
});

test("cross-study coded participant is denied by the actual API and page", async ({ browser }) => {
  const other = await browser.newPage();
  await login(other, "demo-clinician-b@example.org");
  const crossStudyPath = await other.getByRole("link", { name: "SYN-002" }).getAttribute("href");
  expect(crossStudyPath).toBeTruthy();
  await other.close();

  const clinician = await browser.newPage();
  await login(clinician, "demo-clinician-a@example.org");
  const apiPath = crossStudyPath!.replace("/participants/", "/api/v1/participants/");
  const denied = await clinician.request.get(apiPath);
  expect(denied.status()).toBe(403);
  const response = await clinician.goto(crossStudyPath!);
  expect(response?.status()).toBe(404);
  await expect(clinician.getByRole("heading", { name: "SYN-002" })).toHaveCount(0);
  await clinician.close();
});
