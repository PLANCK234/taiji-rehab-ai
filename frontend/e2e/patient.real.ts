import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("patient browser test requires synthetic E2E_PASSWORD");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", {
    name: email === "demo-patient@example.org" ? "患者演示账号" : "工作人员演示账号",
  }).click();
  await expect(page.getByLabel("邮箱")).toHaveValue(email);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

test("synthetic patient sees only own portal and loses access after binding revocation", async ({ page, browser }) => {
  await login(page, "demo-patient@example.org");
  // This regression deliberately reloads an unsaved new-report draft after correcting history.
  page.on("dialog", async (dialog) => { expect(dialog.type()).toBe("beforeunload"); await dialog.accept(); });
  await expect(page.getByRole("heading", { name: "我的康复空间" })).toBeVisible();
  await expect(page.getByText("当前账号：demo-patient@example.org（患者）")).toBeVisible();
  await expect(page.getByText("我的演示编号：SYN-001")).toBeVisible();
  await expect(page.getByText("目前没有经医护确认并发布给此账号的计划或视频。")).toBeVisible();
  await expect(page.getByRole("button", { name: "重新检查记录" })).toHaveCount(0);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/patient$/);
  const forbidden = await page.evaluate(async () => (await fetch("/api/v1/participants")).status);
  expect(forbidden).toBe(403);

  const staffContext = await browser.newContext();
  try {
    const staffPage = await staffContext.newPage();
    await login(staffPage, "demo-clinician-a@example.org");
    await expect(staffPage.getByRole("heading", { name: "研究工作台" })).toBeVisible();
    const id = await staffPage.evaluate(async () => {
      const participants = await (await fetch("/api/v1/participants")).json() as { id: string; study_code: string }[];
      const id = participants.find((item) => item.study_code === "SYN-001")?.id;
      const csrf = document.cookie.split("; ").find((item) => item.startsWith("taiji_csrf="))?.split("=")[1];
      if (!id || !csrf) throw new Error("synthetic clinician has no participant or CSRF token");
      const consent = await fetch(`/api/v1/participants/${id}/consents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", "X-CSRF-Token": decodeURIComponent(csrf),
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          document_version: "SYN-DEMO-V1", purpose_code: "SYN-DEMO-PATIENT",
          decision: "granted", photo_scope: false,
        }),
      });
      if (consent.status !== 201) throw new Error(`synthetic consent failed: ${consent.status}`);
      return id;
    });
    await staffPage.goto(`/participants/${id}`);
    await expect(staffPage.getByText(/当前模拟同意：已记录，可用于合成发布/)).toBeVisible();
    await expect(staffPage.getByText(/合成患者绑定：有效/)).toBeVisible();
    await staffPage.getByLabel("选择演示卡片").selectOption("SYN-CARD-B");
    await staffPage.getByRole("checkbox", { name: /确认本次选择/ }).check();
    await staffPage.getByRole("checkbox", { name: /合成流程测试/ }).check();
    await staffPage.getByRole("button", { name: "发布所选测试卡片" }).click();
    await expect(staffPage.getByText(/合成卡片已发布/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/合成流程测试版本 1/)).toBeVisible();
    await expect(page.getByText("当前卡片：演示卡片 B · 后续查看")).toBeVisible();
    await expect(page.getByText("视频待添加")).toBeVisible();
    await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
    await expect(page.getByText("尚未填写训练或不适记录；训练与不适状态均未知。")).toBeVisible();
    const submissionKeys: string[] = [];
    await page.route("**/api/v1/patient/reports", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      submissionKeys.push(route.request().headers()["idempotency-key"]);
      if (submissionKeys.length === 1) {
        // The database commits, but its successful response is lost before the UI receives it.
        const saved = await route.fetch();
        expect(saved.status()).toBe(201);
        await route.fulfill({ status: 503, contentType: "application/json", body: '{}' });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "保存记录", exact: true }).click();
    await expect(page.getByLabel("发生时间（北京时间）")).toBeFocused();
    await expect(page.getByText("请选择有效的发生日期和时间（北京时间）。", { exact: true })).toBeVisible();
    expect(submissionKeys).toHaveLength(0);
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-05T10:00");
    await page.getByLabel("实际训练情况").selectOption("performed");
    await page.getByLabel("实际时长（分钟，可留空表示未知）").fill("12");
    await page.getByLabel("不适情况").selectOption("reported");
    await page.getByLabel("不适描述").fill("合成演示不适描述");
    await page.getByRole("button", { name: "保存记录" }).click();
    await expect(page.getByRole("button", { name: "重试保存", exact: true })).toBeVisible();
    await expect(page.getByLabel("不适描述")).toHaveValue("合成演示不适描述");
    await expect(page.getByText(/合成记录已保存/)).toHaveCount(0);
    expect(submissionKeys).toHaveLength(1);
    await page.getByRole("button", { name: "重试保存", exact: true }).click();
    await expect(page.getByText(/合成记录已保存/)).toBeVisible();
    await expect(page.getByText(/有未保存的反馈内容/)).toHaveCount(0);
    expect(submissionKeys).toHaveLength(2);
    expect(submissionKeys[1]).toBe(submissionKeys[0]);
    expect((await (await page.request.get("/api/v1/patient/reports")).json()).length).toBe(1);
    await page.unroute("**/api/v1/patient/reports");
    await staffPage.reload();
    await expect(staffPage.getByText(/合成演示不适描述/)).toBeVisible();
    const staffReports = staffPage.locator('section[aria-labelledby="patient-reports-heading"]');
    const staffCurrent = staffReports.locator(":scope > ul > li");
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("发生时间（北京时间）");
    await expect(staffCurrent.first().locator("time").first()).toContainText("10:00");
    await expect(staffCurrent.first()).toContainText("保存时间（北京时间）");
    const observedTime = page.getByLabel("发生时间（北京时间）");
    await observedTime.fill("2026-11-05T11:00");
    await page.getByRole("button", { name: "更正", exact: true }).click();
    await expect(observedTime).toHaveValue("2026-11-05T10:00");
    await page.getByRole("button", { name: "取消更正" }).click();
    await expect(observedTime).toHaveValue("2026-11-05T11:00");
    await expect(page.getByText("当前版本 1")).toHaveCount(1);
    await page.getByRole("button", { name: "更正" }).click();
    await expect(page.getByLabel("发生时间（北京时间）")).toHaveValue("2026-11-05T10:00");
    await page.getByLabel("不适情况").selectOption("none");
    await page.getByLabel("更正原因（以 SYN- 开头）").fill("SYN-SELF-CORRECTION");
    await page.getByRole("button", { name: "保存更正" }).click();
    await expect(page.getByText(/版本 2/)).toBeVisible();
    // Saving this correction must not discard the separate new-report draft.
    await expect(page.getByText(/有未保存的反馈内容/)).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
    await expect(page.getByText(/版本 2/)).toBeVisible();
    const previousReport = page.locator("details").filter({ hasText: "查看旧版本" });
    await previousReport.locator("summary").click();
    await expect(previousReport).toContainText("旧版本 1");
    await expect(previousReport).toContainText("12 分钟");
    await expect(previousReport).toContainText("自报有不适");
    await expect(previousReport).toContainText("合成演示不适描述");
    await staffPage.reload();
    await expect(staffPage.getByText(/更正原因：SYN-SELF-CORRECTION/)).toBeVisible();
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("当前版本 2");
    await expect(staffCurrent.first()).toContainText("保存时间（北京时间）");
    await staffCurrent.first().locator("summary").click();
    await expect(staffCurrent.first().locator("details li")).toHaveCount(1);
    await expect(staffCurrent.first().locator("details li")).toContainText("旧版本 1");
    await expect(staffCurrent.first().locator("details li")).toContainText("合成演示不适描述");
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-04T09:00");
    await page.getByLabel("实际训练情况").selectOption("not_performed");
    await page.getByLabel("不适情况").selectOption("none");
    await page.getByRole("button", { name: "保存记录" }).click();
    const patientCurrent = page.locator('section[aria-labelledby="patient-report-heading"] > ul > li');
    await expect(patientCurrent).toHaveCount(2);
    await expect(patientCurrent.first()).toContainText("自报未训练");
    await expect(patientCurrent.nth(1)).toContainText("当前版本 2");
    await page.reload();
    await page.getByRole("button", { name: "4. 反馈", exact: true }).click();
    await expect(patientCurrent.first()).toContainText("自报未训练");
    await expect(patientCurrent.nth(1)).toContainText("当前版本 2");
    await staffPage.reload();
    await expect(staffCurrent).toHaveCount(2);
    await expect(staffCurrent.first()).toContainText("自报未训练");
    const [download] = await Promise.all([
      staffPage.waitForEvent("download"),
      staffPage.getByRole("link", { name: "下载编号化 CSV" }).click(),
    ]);
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv).toContain("patient_report_revision");
    expect(csv).toContain("patient_self_report");
    expect(csv).not.toContain("合成演示不适描述");
    expect(csv).not.toContain("SYN-SELF-CORRECTION");
    await staffPage.getByRole("checkbox", { name: /合成流程测试/ }).check();
    await staffPage.getByRole("button", { name: "撤回测试卡片" }).click();
    await expect(staffPage.getByText(/版本 2 · 撤回/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("目前没有经医护确认并发布给此账号的计划或视频。")).toBeVisible();
    const revokeStatus = await staffPage.evaluate(async (participantId) => {
      const csrf = document.cookie.split("; ").find((item) => item.startsWith("taiji_csrf="))?.split("=")[1];
      if (!csrf) throw new Error("synthetic clinician has no CSRF token");
      return (await fetch(`/api/v1/participants/${participantId}/demo-patient-binding/revoke`, {
        method: "POST", headers: { "X-CSRF-Token": decodeURIComponent(csrf) },
      })).status;
    }, id);
    expect(revokeStatus).toBe(204);
  } finally {
    await staffContext.close();
  }
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "demo-patient@example.org");
  await expect(page.getByRole("heading", { name: "演示编号不可用" })).toBeVisible();
  await expect(page.getByText("此患者账号当前没有有效的演示编号绑定，可能尚未绑定或绑定已撤销。")).toBeVisible();
  await page.getByRole("button", { name: "重新检查绑定" }).click();
  await expect(page.getByRole("heading", { name: "演示编号不可用" })).toBeVisible();
});
