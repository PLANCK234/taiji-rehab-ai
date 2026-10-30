import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../workspace/auth";
import {
  getAssessment, measurementText, missingReasonText, type AssessmentRevision,
} from "../../workspace/assessments";
import { getConsentHistory } from "../../workspace/intake";
import AssessmentEditor from "./assessment-editor";

export const dynamic = "force-dynamic";

function localTime(value: string | null): string {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

function revisionLine(row: AssessmentRevision) {
  return <li key={row.id}>
    版本 {row.revision_no} · {row.state === "draft" ? "草稿" : "已确认"} ·
    {measurementText(row)} · 记录时间（北京时间）{localTime(row.recorded_at)}
    {row.change_reason ? ` · 更正原因 ${row.change_reason}` : ""}
    {` · 操作者 ${row.recorded_by}`}
  </li>;
}

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const assessment = await getAssessment(id, cookieHeader);
  if (!assessment) notFound();
  const consent = await getConsentHistory(assessment.participant_id, cookieHeader);
  const canWrite = user.role === "clinician" || user.role === "research_assistant";
  const canConfirm = user.role === "clinician" || user.role === "clinical_approver";
  const consentGranted = consent?.state === "granted";

  return <main>
    <Link href={`/participants/${assessment.participant_id}`}>← 返回编号对象</Link>
    <div className="eyebrow">合成人工评估</div>
    <h1>{assessment.visit_kind === "baseline" ? "基线评估" : "复评记录"}</h1>
    <p>当前版本 {assessment.current.revision_no} ·
      {assessment.current.state === "draft" ? "草稿" : "已确认记录"}</p>
    <p>人工 SPPB 总分：{measurementText(assessment.current)}</p>
    <p>测量时间（北京时间）：{localTime(assessment.current.performed_at)}</p>
    <p className="note">方案标记 {assessment.protocol_version} 仅供合成演示；这里不生成分级、安全结论或训练建议。确认缺失或无效记录也不代表完成测量。</p>
    {assessment.current.missing_reason ? <p>缺失/无效原因：{missingReasonText[assessment.current.missing_reason]}</p> : null}
    <section aria-labelledby="history-heading">
      <h2 id="history-heading">版本时间线</h2>
      <ol>{assessment.history.map(revisionLine)}</ol>
    </section>
    {consentGranted ? <AssessmentEditor
      assessmentId={assessment.id}
      current={assessment.current}
      canWrite={canWrite}
      canConfirm={canConfirm}
    /> : <p role="status">当前没有有效模拟同意；评估修改与确认已关闭。</p>}
  </main>;
}
