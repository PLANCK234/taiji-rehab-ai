import { readFile } from "node:fs/promises";
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

test("synthetic longitudinal enrollment, revisit, observed training and export persist", async ({ page }) => {
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
  const baselineUrl = page.url();
  await page.getByRole("button", { name: "确认当前记录" }).click();
  await expect(page.getByRole("heading", { name: "太极训练演示" })).toBeVisible();
  await expect(page.getByText("功能等级：IV", { exact: false })).toBeVisible();
  await page.goto(baselineUrl);
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
  const revisitUrl = page.url();
  await page.getByRole("button", { name: "确认当前记录" }).click();
  await expect(page.getByRole("heading", { name: "太极训练演示" })).toBeVisible();
  await page.goto(revisitUrl);
  await expect(page.getByText(/当前版本 3 ·已确认记录/)).toBeVisible();
  await page.getByRole("link", { name: /返回编号对象/ }).click();
  await expect(page).toHaveURL(/\/participants\/[0-9a-f-]+$/);
  await page.reload();
  table = page.getByRole("table", { name: "编号对象的人工 SPPB 总分基线与复评序列" });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(table.locator("meter")).toHaveCount(1);
  await expect(table.locator("tbody tr").nth(1)).toContainText("缺失（拒测）");
  await expect(table.locator("tbody tr").nth(1).locator("meter")).toHaveCount(0);
  const participantPath = new URL(page.url()).pathname;
  const training = page.locator('form:has(input[name="session_at"])');
  await training.locator('input[name="session_at"]').fill("2026-11-06T08:00");
  await training.locator('input[name="action_label"]').fill("SYN-CYCLE-OBS");
  await training.locator('select[name="completion_status"]').selectOption("partial");
  await training.getByRole("button", { name: "保存训练观察" }).click();
  await expect(page).toHaveURL(/\/training\/[0-9a-f-]+$/);
  const observed = new URL(page.url()).pathname.split("/").at(-1)!;
  const feedback = page.locator('form:has(select[name="state"])');
  await feedback.locator('select[name="state"]').selectOption("recorded");
  await feedback.locator('input[name="rpe"]').fill("7");
  await feedback.getByRole("button", { name: "保存反馈版本" }).click();
  await expect(page.getByText("第 1 版", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("RPE 7", { exact: false })).toBeVisible();
  await page.goto(participantPath);
  const timeline = page.getByRole("table", { name: "编号对象的已记录训练观察" });
  await expect(timeline.locator("tbody tr")).toHaveCount(1);
  await expect(timeline.locator("tbody tr td").nth(1)).toHaveText("记录为部分完成");
  await expect(timeline.locator("tbody tr td").nth(2)).toHaveText("未记录");
  await expect(timeline.locator("tbody tr td").nth(3)).toHaveText("已记录");
  await expect(timeline.locator("tbody tr td").nth(4)).toHaveText("7");
  await page.getByLabel("周期名称").fill("合成周期一");
  await page.getByRole("button", { name: "保存周期" }).click();
  await expect(page.getByText("合成周期已保存。")).toBeVisible();
  await page.getByLabel("访视名称").fill("人工复评访视");
  await page.getByLabel("到访情况").selectOption("attended");
  await page.getByLabel("评估情况").selectOption("recorded");
  const revisitId = await page.getByLabel("已有人工评估").locator("option")
    .filter({ hasText: "复评" }).getAttribute("value");
  expect(revisitId).toBeTruthy();
  await page.getByLabel("已有人工评估").selectOption(revisitId!);
  await page.getByRole("checkbox", { name: /SYN-CYCLE-OBS/ }).check();
  await page.getByRole("button", { name: "保存访视" }).click();
  await expect(page.getByText("合成访视版本已保存。")).toBeVisible();
  await page.reload();
  await expect(page.getByText(/人工复评访视 · 已到访 · 已关联人工评估 · 版本 1/)).toBeVisible();
  await expect(page.getByText(/当前人工总分：缺失（拒测）（已确认）/)).toBeVisible();
  await expect(page.getByText("关联训练 1 次")).toBeVisible();
  const linkedTraining = page.getByRole("list", { name: "人工复评访视 的关联训练观察" });
  await expect(linkedTraining).toContainText("记录为部分完成");
  await expect(linkedTraining).toContainText("实际时长未知");
  await expect(linkedTraining).toContainText("反馈已记录");
  await expect(linkedTraining).toContainText("RPE 7");
  expect(observed).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "更正访视" }).click();
  await page.getByLabel("评估情况").selectOption("declined");
  await page.getByLabel("更正原因（以 SYN- 开头）").fill("SYN-RECHECK");
  await page.getByRole("button", { name: "保存访视" }).click();
  await page.reload();
  await expect(page.getByText(/人工复评访视 · 已到访 · 拒测 · 版本 2/)).toBeVisible();
  await expect(linkedTraining).toContainText("实际时长未知");
  await page.getByText("修订历史", { exact: true }).click();
  await expect(page.getByText(/版本 1 · 已到访 · 已关联人工评估/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "下载编号化 CSV" }).click(),
  ]);
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("synthetic_consent_record");
  expect(csv).toContain("synthetic_screening_record");
  expect(csv).toContain("SYN-ITEM-01");
  expect(csv).toContain("unknown");
  expect(csv).toContain("synthetic_cycle");
  expect(csv).toContain("synthetic_visit_revision");
  expect(csv).toContain("training_feedback_revision");
  expect(csv).toContain(observed);
  expect(csv).not.toContain("合成周期一");
  expect(csv).not.toContain("人工复评访视");
  expect(csv).not.toContain("SYN-RECHECK");
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
