import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../workspace/auth";
import LogoutButton from "../workspace/logout-button";
import { getPatientReports } from "../workspace/patient-reports";
import { roleLabel } from "../workspace/role-label";
import { readPatientHome } from "./home";
import RetryPatientHomeButton from "./retry-button";
import PatientTaskFeedback from "./task-feedback";

export const dynamic = "force-dynamic";

export default async function PatientPage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  if (user.role !== "patient") redirect("/workspace");
  const homeResult = await readPatientHome(cookieHeader);
  if (homeResult.kind === "session_expired") redirect("/login");
  const reports = homeResult.kind === "ready" ? await getPatientReports(cookieHeader) : null;

  return <main className="form-page">
    <div className="eyebrow">合成数据演示 · 患者入口</div>
    <h1>我的康复空间</h1>
    <p>当前账号：{user.email}（{roleLabel(user.role)}）</p>
    {homeResult.kind === "ready" ? <>
      <p>我的演示编号：{homeResult.home.study_code}</p>
      <section aria-labelledby="patient-plan-heading">
        <h2 id="patient-plan-heading">训练计划与视频</h2>
        {homeResult.home.publication ? <>
          <p role="status">合成流程测试版本 {homeResult.home.publication.version} · 不可作为训练指导</p>
          <p>当前卡片：{homeResult.home.publication.card_title}</p>
          {!!homeResult.home.publication.actions?.length && <ul aria-label="已发布动作">
            {homeResult.home.publication.actions.map((action) => <li key={action.code}>{action.title}</li>)}
          </ul>}
          <p>{homeResult.home.publication.message}</p>
          <div className="demo-video-frame"><div className="demo-video-empty" role="status">
            <span className="demo-video-icon" aria-hidden="true">▶</span>
            <strong>视频待添加</strong>
            <span>当前卡片暂无可播放视频。</span>
          </div></div>
        </> : <p>目前没有经医护确认并发布给此账号的计划或视频。</p>}
        <p className="note">研究工作台中的 DEMO_ONLY 内容不会自动成为患者训练指导。</p>
      </section>
      <PatientTaskFeedback key={JSON.stringify([user.id, homeResult.home.study_code, homeResult.home.publication?.version])}
        initialReports={reports} publicationVersion={homeResult.home.publication?.version}
        cameraEnabled={process.env.POSE_PROTOTYPE_ENABLED === "true"} />
    </> : homeResult.kind === "binding_unavailable" ? (
      <section>
        <h2>演示编号不可用</h2>
        <p>此患者账号当前没有有效的演示编号绑定，可能尚未绑定或绑定已撤销。</p>
        <RetryPatientHomeButton label="重新检查绑定" />
      </section>
    ) : (
      <section>
        <h2>服务暂不可用</h2>
        <p>患者空间暂时无法连接服务，请稍后刷新重试。</p>
        <RetryPatientHomeButton label="重新检查服务" />
      </section>
    )}
    <LogoutButton />
  </main>;
}
