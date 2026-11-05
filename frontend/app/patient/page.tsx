import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../workspace/auth";
import LogoutButton from "../workspace/logout-button";
import type { PatientHome } from "../workspace/patient-publication";
import { getPatientReports } from "../workspace/patient-reports";
import PatientReportForm from "./report-form";

export const dynamic = "force-dynamic";

async function getPatientHome(cookieHeader: string): Promise<PatientHome | null> {
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(`${baseUrl}/api/v1/patient/me`, {
      headers: { cookie: cookieHeader }, cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as PatientHome;
  } catch {
    return null;
  }
}

export default async function PatientPage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  if (user.role !== "patient") redirect("/workspace");
  const home = await getPatientHome(cookieHeader);
  const reports = home ? await getPatientReports(cookieHeader) : null;

  return <main className="form-page">
    <div className="eyebrow">合成数据演示 · 患者入口</div>
    <h1>我的康复空间</h1>
    {home ? <>
      <p>我的演示编号：{home.study_code}</p>
      <section>
        <h2>训练计划与视频</h2>
        {home.publication ? <>
          <p role="status">合成流程测试版本 {home.publication.version} · 不可作为训练指导</p>
          <p>{home.publication.message}</p>
          <div className="demo-video-frame"><div className="demo-video-empty" role="status">
            <span className="demo-video-icon" aria-hidden="true">▶</span>
            <strong>视频待添加</strong>
            <span>尚无经审核的视频素材，当前不能播放。</span>
          </div></div>
        </> : <p>目前没有经医护确认并发布给此账号的计划或视频。</p>}
        <p className="note">研究工作台中的 DEMO_ONLY 内容不会自动成为患者训练指导。</p>
      </section>
      <PatientReportForm initialReports={reports} />
    </> : <section><h2>无法访问</h2><p>账号与演示编号的绑定已撤销或服务暂不可用。</p></section>}
    <LogoutButton />
  </main>;
}
