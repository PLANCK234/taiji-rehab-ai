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

async function fillDemo(page: Page, code: string, score: number) {
  await page.getByLabel("合成编号").fill(code);
  await page.getByLabel("人工 SPPB 总分（0–12；留空为未评估）").fill(String(score));
  await page.getByLabel("测量日期（北京时间）").fill("2026-10-30");
  await page.getByLabel("明确记录模拟同意（仅合成数据）").check();
}

async function createDemo(page: Page, code: string, score: number) {
  await login(page);
  await fillDemo(page, code, score);
  await page.getByRole("button", { name: "创建编号对象" }).click();
  await expect(page.getByRole("heading", { name: "太极训练演示" })).toBeVisible();
}

for (const city of ["Shanghai", "Honolulu"]) {
  test.describe(`quick assessment date in ${city}`, () => {
    test.use({ timezoneId: city === "Shanghai" ? "Asia/Shanghai" : "Pacific/Honolulu" });

    test("saves and displays the selected Beijing date", async ({ page }) => {
      const measurement = page.waitForRequest((request) =>
        request.method() === "PUT" && /\/api\/v1\/assessments\/[^/]+\/measurements$/.test(new URL(request.url()).pathname),
      );
      await createDemo(page, `SYN-DEMO-DATE-${city.toUpperCase()}`, 8);
      const request = await measurement;
      expect(request.postDataJSON()).toMatchObject({ performed_at: "2026-10-30T04:00:00.000Z" });
      const assessmentPath = new URL(request.url()).pathname.replace(/^\/api\/v1/, "").replace(/\/measurements$/, "");
      await page.goto(assessmentPath);
      const displayedTime = page.getByText("测量时间（北京时间）：2026/10/30 12:00:00", { exact: true });
      await expect(displayedTime).toBeVisible();
      await page.reload();
      await expect(displayedTime).toBeVisible();
    });
  });
}

test("DEMO-V2: quick assessment locates missing fields and saves an explicit zero", async ({ page }) => {
  await login(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT"].includes(request.method())) writes.push(new URL(request.url()).pathname);
  });
  const create = page.getByRole("button", { name: "创建编号对象" });
  const score = page.getByLabel("人工 SPPB 总分（0–12；留空为未评估）");
  const date = page.getByLabel("测量日期（北京时间）");
  const consent = page.getByLabel("明确记录模拟同意（仅合成数据）");
  await page.getByLabel("合成编号").fill("SYN-DEMO-QUICK-ZERO");
  // An entered score starts the one-step flow, which then needs a date and explicit consent.
  await score.fill("0");
  await date.fill("");
  await create.click();
  await expect(date).toBeFocused();
  await expect(date).toHaveAccessibleDescription("请选择测量日期。");
  await expect(consent).toHaveAccessibleDescription("请勾选模拟同意。");
  await expect(score).not.toHaveAttribute("aria-invalid", "true");
  await date.fill("2026-10-30");
  await create.click();
  await expect(consent).toBeFocused();
  expect(writes).toEqual([]);

  await consent.check();
  await create.click();
  await expect(page.getByText("功能等级：IV", { exact: false })).toBeVisible();

  await page.goto("/workspace");
  await page.getByLabel("合成编号").fill("SYN-DEMO-PLAIN-INTAKE");
  await create.click();
  await expect(page.getByRole("heading", { name: "SYN-DEMO-PLAIN-INTAKE", exact: true })).toBeVisible();
});

test("DEMO-V2: interrupted enrollment resumes from the saved participant or assessment", async ({ page }) => {
  await login(page);
  const createRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/participants") {
      createRequests.push((request.postDataJSON() as { study_code: string }).study_code);
    }
  });
  const createButton = page.getByRole("button", { name: "创建编号对象" });
  const profileFailure = "**/api/v1/participants/*/demo-profile";
  await page.route(profileFailure, (route) => route.fulfill({ status: 503 }), { times: 1 });
  await fillDemo(page, "SYN-DEMO-RECOVERY-PROFILE", 8);
  await createButton.click();
  await expect(page.getByRole("alert").filter({ hasText: "核对展示资料" })).toBeVisible();
  const originalParticipant = page.getByRole("link", { name: "打开原档案继续" });
  await expect(originalParticipant).toHaveAttribute("href", /^\/participants\/[^/]+$/);
  const participantPath = (await originalParticipant.getAttribute("href"))!;
  const participantResponse = await page.request.get(participantPath);
  expect(participantResponse.ok()).toBe(true);
  expect(await participantResponse.text()).toContain("SYN-DEMO-RECOVERY-PROFILE");
  await expect(createButton).toBeDisabled();
  await page.getByRole("button", { name: "开始录入另一对象" }).click();
  await expect(page.getByLabel("合成编号")).toHaveValue("");
  await expect(originalParticipant).toHaveCount(0);
  await expect(createButton).toBeEnabled();

  const confirmFailure = "**/api/v1/assessments/*/confirm";
  await page.route(confirmFailure, (route) => route.fulfill({ status: 503 }), { times: 1 });
  await fillDemo(page, "SYN-DEMO-RECOVERY-CONFIRM", 8);
  await createButton.click();
  await expect(page.getByRole("alert").filter({ hasText: "总分草稿已保存" })).toBeVisible();
  await expect(createButton).toBeDisabled();
  const originalAssessment = page.getByRole("link", { name: "打开原评估继续" });
  await expect(originalAssessment).toHaveAttribute("href", /^\/assessments\/[^/]+$/);
  await originalAssessment.click();
  await expect(page.getByRole("heading", { name: "基线评估" })).toBeVisible();
  await expect(page.getByText(/当前版本 2 · ?草稿/)).toBeVisible();
  await expect(page.getByText("人工 SPPB 总分：8 分")).toBeVisible();
  await page.getByRole("button", { name: "确认当前记录" }).click();
  await expect(page.getByRole("heading", { name: "太极训练演示" })).toBeVisible();
  await expect(page.getByText("功能等级：II", { exact: false })).toBeVisible();
  expect(createRequests).toEqual(["SYN-DEMO-RECOVERY-PROFILE", "SYN-DEMO-RECOVERY-CONFIRM"]);
});

test("DEMO-V2: conflicting enrollment links only to an assigned record in the selected study", async ({ page }) => {
  await login(page);
  const code = page.getByLabel("合成编号");
  const create = page.getByRole("button", { name: "创建编号对象" });
  const existing = page.getByRole("link", { name: "打开已有档案" });
  const assignedPath = await page.getByRole("link", { name: "SYN-001", exact: true }).getAttribute("href");
  expect(assignedPath).toMatch(/^\/participants\/[^/]+$/);

  // This seed belongs to the selected study but is not assigned to this clinician.
  await fillDemo(page, "SYN-003", 8);
  await create.click();
  await expect(page.getByText("编号或提交记录冲突，请核对后重试。")).toBeVisible();
  await expect(existing).toHaveCount(0);

  // A partial code or a record from another study cannot be used as the recovery target.
  const scopedList = "**/api/v1/participants";
  await page.route(scopedList, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const studyId = await page.getByLabel("研究", { exact: true }).inputValue();
    await route.fulfill({ json: [
      { id: "wrong-study", study_id: "different-study", study_code: "SYN-001" },
      { id: "partial-code", study_id: studyId, study_code: "SYN-0010" },
    ] });
  });
  await code.fill("SYN-001");
  await create.click();
  await expect(page.getByText("编号或提交记录冲突，请核对后重试。")).toBeVisible();
  await expect(existing).toHaveCount(0);
  await page.unroute(scopedList);

  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(new URL(request.url()).pathname);
  });
  await create.click();
  await expect(page.getByText("提交发生冲突。当前研究已有同编号档案，可打开核对。")).toBeVisible();
  await expect(existing).toHaveAttribute("href", assignedPath!);
  await code.fill("SYN-DIFFERENT");
  await expect(existing).toHaveCount(0);
  await code.fill("SYN-001");
  await create.click();
  await existing.click();
  await expect(page.getByRole("heading", { name: "SYN-001", exact: true })).toBeVisible();
  expect(writes).toEqual(["/api/v1/participants", "/api/v1/participants"]);
});

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

test("DEMO-V2: workspace can hide and restore a record without changing the record", async ({ page }) => {
  await login(page);
  const assigned = page.getByRole("region", { name: "已分配编号对象" });
  const record = assigned.getByRole("link", { name: "SYN-001", exact: true });
  const row = assigned.getByRole("listitem").filter({
    has: page.getByRole("link", { name: "SYN-001", exact: true }),
  });
  const href = (await record.getAttribute("href"))!;
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(new URL(request.url()).pathname);
  });
  await expect(row.getByText("SYN-STUDY-A", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "隐藏", exact: true }).click();
  await expect(record).toHaveCount(0);
  await page.reload();
  const hidden = assigned.getByRole("button", { name: "查看已隐藏（1）" });
  await expect(hidden).toBeVisible();
  await expect(record).toHaveCount(0);

  await page.goto(href);
  await expect(page.getByRole("heading", { name: "SYN-001", exact: true })).toBeVisible();
  await page.goto("/workspace");
  await hidden.click();
  await expect(record).toHaveAttribute("href", href);
  await row.getByRole("button", { name: "恢复显示", exact: true }).click();
  await expect(record).toHaveCount(0);
  await assigned.getByRole("button", { name: "返回显示中的档案" }).click();
  await expect(record).toBeVisible();
  await page.reload();
  await expect(record).toBeVisible();
  expect(writes).toEqual([]);
});

test("DEMO-V2: score 5 gives III; current database plan survives reopening", async ({ page }) => {
  await createDemo(page, "SYN-DEMO-V2-005", 5);
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "坐位 / 扶椅太极演示模式" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "← 编号对象列表" }).click();
  const assigned = page.getByRole("region", { name: "已分配编号对象" });
  const search = assigned.getByRole("searchbox", { name: "搜索研究编号" });
  await search.fill("  syn-demo-v2-005  ");
  await expect(assigned.getByRole("status")).toHaveText("找到 1 个编号对象。");
  await expect(assigned.getByRole("link", { name: "SYN-001", exact: true })).toHaveCount(0);
  await search.fill("SYN-NO-MATCH-FOR-SEARCH");
  await expect(assigned.getByRole("status")).toHaveText("没有匹配的编号对象。");
  await expect(assigned.getByRole("listitem")).toHaveCount(0);
  await assigned.getByRole("button", { name: "清除编号搜索" }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(assigned.getByRole("link", { name: "SYN-001", exact: true })).toBeVisible();
  await search.fill("v2-005");
  await expect(assigned.getByRole("status")).toHaveText("找到 1 个编号对象。");
  await assigned.getByRole("link", { name: "打开方案 →" }).click();
  await expect(page.getByText("功能等级：III", { exact: false })).toBeVisible();
});

test("DEMO-V2: explicit stop keeps minutes and RPE unknown", async ({ page }) => {
  await createDemo(page, "SYN-DEMO-V2-010", 10);
  await expect(page.getByText("功能等级：I", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "开始训练" }).click();
  await page.getByRole("button", { name: "中止训练" }).click();
  await page.getByRole("button", { name: "确认中止" }).click();
  await expect(page.getByText("本次演示训练已中止", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("本次演示训练已中止", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "查看/补录训练反馈" }).click();
  await expect(page.getByText("时长：未记录", { exact: false })).toBeVisible();
  await expect(page.getByText("未填写反馈；不能视为 RPE 0 或无不适。")).toBeVisible();
});
