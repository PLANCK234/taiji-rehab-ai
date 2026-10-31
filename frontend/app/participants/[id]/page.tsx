import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../workspace/auth";
import { getConsentHistory, getParticipant, getScreeningHistory } from "../../workspace/intake";
import { getParticipantAssessments, measurementText } from "../../workspace/assessments";
import IntakeForms from "./intake-forms";
import CreateAssessmentForm from "./create-assessment-form";

export const dynamic = "force-dynamic";

const consentText = {
  not_recorded: "未记录",
  granted: "模拟同意已记录",
  refused: "模拟拒绝已记录",
  withdrawn: "模拟撤回已记录",
};
const answerText = { yes: "是", no: "否", unknown: "未知" };

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookieHeader);
  if (!participant) notFound();
  const [consents, screenings, assessments] = await Promise.all([
    getConsentHistory(id, cookieHeader),
    getScreeningHistory(id, cookieHeader),
    getParticipantAssessments(id, cookieHeader),
  ]);
  const canWrite = user.role === "clinician" || user.role === "research_assistant";

  return (
    <main>
      <Link href="/workspace">← 返回工作台</Link>
      <div className="eyebrow">合成数据编号对象</div>
      <h1>{participant.study_code}</h1>
      <p>此页面仅用于开发演示，不代表真实建档或研究入组。</p>
      <section aria-labelledby="consent-heading">
        <h2 id="consent-heading">模拟同意记录</h2>
        {consents ? <>
          <p>当前记录：{consentText[consents.state]}</p>
          <p className="note">照片上传始终关闭；这里的范围选项只记录合成演示状态。</p>
          {consents.records.length ? <ul>{consents.records.map((row) => (
            <li key={row.id}>{consentText[row.decision]} · {row.document_version} · 照片范围：{row.photo_scope ? "已记录" : "未记录"}</li>
          ))}</ul> : <p>暂无记录。</p>}
        </> : <p>同意记录暂不可用。</p>}
      </section>
      <section aria-labelledby="screen-heading">
        <h2 id="screen-heading">模拟三态筛查</h2>
        {screenings ? <>
          <p role="status">{screenings.review_state === "not_assessed" ? "未评估" : "待复核"}</p>
          <p className="note">没有已批准的筛查项目或安全判定规则；任何记录都不产生“安全通过”。</p>
          {screenings.records.length ? <ul>{screenings.records.map((row) => (
            <li key={row.id}>{row.item_code}：{answerText[row.answer]}</li>
          ))}</ul> : <p>暂无筛查项。</p>}
        </> : <p>筛查记录暂不可用；状态未知。</p>}
      </section>
      <section aria-labelledby="assessments-heading">
        <h2 id="assessments-heading">合成人工总分评估</h2>
        <p className="note">仅录入人工 SPPB 总分，不计算分项、等级或训练建议。</p>
        {assessments === null ? <p>评估记录暂不可用。</p> : assessments.length ? (
          <ul>{assessments.map((row) => (
            <li key={row.id}>
              <Link href={`/assessments/${row.id}`}>
                {row.visit_kind === "baseline" ? "基线" : "复评"} ·
                {row.current.state === "draft" ? "草稿" : "已确认"} ·
                {measurementText(row.current)}
              </Link>
            </li>
          ))}</ul>
        ) : <p>暂无评估记录。</p>}
        {canWrite && consents?.state === "granted" && assessments !== null ? (
          <CreateAssessmentForm participantId={participant.id} />
        ) : <p className="note">创建评估需要当前模拟同意及录入权限。</p>}
      </section>
      <section aria-labelledby="pose-demo-heading">
        <h2 id="pose-demo-heading">姿态演示</h2>
        <p className="note">仅生成合成线条人物预览；摄像头、照片文件、上传和识别均未启用。</p>
        <Link href={`/participants/${participant.id}/pose-demo`}>打开合成姿态演示</Link>
      </section>
      {canWrite && consents && screenings ? <IntakeForms
        participantId={participant.id}
        consentCount={consents.records.length}
        consentGranted={consents.state === "granted"}
        existingItemCodes={screenings.records.map((row) => row.item_code)}
      /> : null}
    </main>
  );
}
