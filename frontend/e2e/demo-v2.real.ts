import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("DEMO-V2 browser requires synthetic E2E_PASSWORD");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("demo-clinician-a@example.org");
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
}

async function createDemo(page: Page, code: string, score: number) {
  await login(page);
  await page.getByLabel("合成编号").fill(code);
  await page.getByLabel("创建后直接完成 Demo 基础评估").check();
  await page.getByLabel("人工 SPPB 总分（0–12；留空为未评估）").fill(String(score));
  await page.getByLabel("测量日期").fill("2026-10-30");
  await page.getByLabel("明确记录模拟同意（仅合成数据）").check();
  await page.getByRole("button", { name: "创建编号对象" }).click();
  await expect(page.getByRole("heading", { name: "太极训练演示" })).toBeVisible();
}

test("DEMO-V2: score 8, action library, run feedback and refresh persistence", async ({ page }) => {
  await createDemo(page, "SYN-DEMO-V2-008", 8);
  await expect(page.getByText("功能等级：II", { exact: false })).toBeVisible();
  await expect(page.getByText("demo-rule-v1")).toBeVisible();
  await page.getByLabel("搜索动作").fill("简化云手");
  await expect(page.locator(".action-card")).toHaveCount(1);
  await page.locator(".action-card").click();
  await expect(page.getByRole("dialog")).toContainText("简化云手");
  await page.getByRole("dialog").getByRole("button", { name: "关闭" }).click();
  await page.getByLabel("搜索动作").fill("");
  await page.getByLabel("演示等级").selectOption("III");
  await expect(page.locator(".action-card")).toHaveCount(4);
  await page.getByRole("button", { name: "开始训练" }).click();
  await expect(page.getByRole("heading", { name: "本次训练", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "暂停" }).click();
  await expect(page.getByText("已暂停", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "继续" })).toBeVisible();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "下一动作" }).click();
  await page.getByLabel("实际训练时长（分钟）").fill("12");
  await page.locator('input[name="completed_action_ids"]').first().check();
  await page.getByRole("button", { name: "结束并填写反馈" }).click();
  await expect(page.getByRole("heading", { name: "训练后反馈" })).toBeVisible();
  await page.getByLabel("RPE（6–20，可留空）").fill("12");
  await page.getByRole("button", { name: "保存反馈版本" }).click();
  await expect(page.getByText("本次演示训练与反馈已保存。")).toBeVisible();
  await expect(page.getByText("实际完成动作：简化起势")).toBeVisible();
  await page.reload();
  await expect(page.getByText("本次演示训练与反馈已保存。")).toBeVisible();
  await page.getByRole("link", { name: "查看训练记录" }).click();
  await expect(page.getByText("RPE 12", { exact: false })).toBeVisible();
});

test("DEMO-V2: score 5 gives III; current database plan survives reopening", async ({ page }) => {
  await createDemo(page, "SYN-DEMO-V2-005", 5);
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "坐位 / 扶椅太极演示模式" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "← 编号对象列表" }).click();
  await page.getByLabel("搜索研究编号或演示名称").fill("SYN-DEMO-V2-005");
  await page.getByRole("link", { name: "打开方案 →" }).click();
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
});

test("DEMO-V2: explicit stop keeps minutes and RPE unknown", async ({ page }) => {
  await createDemo(page, "SYN-DEMO-V2-010", 10);
  await expect(page.getByText("功能等级：I", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "开始训练" }).click();
  await page.getByRole("button", { name: "中止训练" }).click();
  await expect(page.getByText("本次演示训练已中止", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("本次演示训练已中止", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "查看/补录训练反馈" }).click();
  await expect(page.getByText("时长：未记录", { exact: false })).toBeVisible();
  await expect(page.getByText("未填写反馈；不能视为 RPE 0 或无不适。")).toBeVisible();
});
