import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../workspace/auth";
import { getTrainingFeedback, getTrainingSession } from "../../../../workspace/training";
import FeedbackForm from "./feedback-form";

export const dynamic = "force-dynamic";

const missingText = {
  declined: "拒绝反馈",
  interrupted: "训练中断",
  technical_failure: "技术故障",
  unknown: "原因未知",
};

export default async function TrainingPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const session = await getTrainingSession(sessionId, cookieHeader);
  if (!session || session.participant_id !== id) notFound();
  const feedback = await getTrainingFeedback(sessionId, cookieHeader);
  const canWrite = user.role === "clinician" || user.role === "research_assistant";
  const latest = feedback?.at(-1);

  return <main>
    <Link href={`/participants/${id}`}>← 返回对象记录</Link>
    <div className="eyebrow">合成训练观察</div>
    <h1>{session.action_label}</h1>
    <p>时间（北京时间）：{new Date(session.session_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}；
      时长：{session.actual_minutes === null ? "未记录" : `${session.actual_minutes} 分钟`}；
      完成状态：{session.completion_status}。</p>
    <p className="note">此记录仅描述已发生的活动，不构成训练处方或疗效判断。</p>
    <section aria-labelledby="feedback-heading">
      <h2 id="feedback-heading">训练后反馈</h2>
      {feedback === null ? <p>反馈历史暂不可用。</p> : feedback.length ? (
        <ol>{feedback.map((row) => <li key={row.id}>
          第 {row.revision_no} 版 · {row.state === "missing"
            ? `缺失：${missingText[row.missing_reason ?? "unknown"]}`
            : `RPE ${row.rpe === null ? "未记录" : row.rpe}；困难 ${row.difficulty ?? "未记录"}；
              辅助 ${row.support ?? "未记录"}；疲劳 ${row.fatigue ?? "未记录"}；
              不适 ${row.discomfort ?? "未记录"}`}；
          录入者 {row.recorded_by} · {new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
          {row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
        </li>)}</ol>
      ) : <p>未填写反馈；不能视为 RPE 0 或无不适。</p>}
      {canWrite && feedback !== null ? (
        <FeedbackForm
          sessionId={session.id}
          expectedRevision={latest?.revision_no ?? 0}
        />
      ) : null}
    </section>
  </main>;
}
