import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("patient browser test requires synthetic E2E_PASSWORD");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

test("synthetic patient sees only own portal and loses access after binding revocation", async ({ page, browser }) => {
  await login(page, "demo-patient@example.org");
  await expect(page.getByRole("heading", { name: "我的康复空间" })).toBeVisible();
  await expect(page.getByText("我的演示编号：SYN-001")).toBeVisible();
  await expect(page.getByText("目前没有经医护确认并发布给此账号的计划或视频。")).toBeVisible();
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
    await staffPage.getByRole("checkbox", { name: /合成流程测试/ }).check();
    await staffPage.getByRole("button", { name: "发布测试卡片" }).click();
    await expect(staffPage.getByText(/合成卡片已发布/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/合成流程测试版本 1/)).toBeVisible();
    await expect(page.getByText("视频待添加")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "无法访问" })).toBeVisible();
});
