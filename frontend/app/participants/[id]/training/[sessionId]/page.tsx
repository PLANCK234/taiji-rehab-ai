import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../../../components/app-shell";
import { Badge, Card, Crumbs, Empty, Notice, PageHeader } from "../../../../../components/ui";
import { can, getCurrentUser } from "../../../../../lib/auth";
import { formatDateTime } from "../../../../../lib/format";
import { getParticipant } from "../../../../../lib/intake";
import { completionNames, feedbackMissingNames, getTrainingFeedback, getTrainingSession } from "../../../../../lib/training";
import FeedbackForm from "./feedback-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "训练记录" };

const or = (value: string | number | null) => value === null ? "未记录" : String(value);

export default async function TrainingPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const session = await getTrainingSession(sessionId, cookieHeader);
  if (!session || session.participant_id !== id) notFound();
  const [feedback, participant] = await Promise.all([getTrainingFeedback(sessionId, cookieHeader), getParticipant(id, cookieHeader)]);
  const latest = feedback?.at(-1);

  return <AppShell user={user}>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { href: `/participants/${id}`, label: participant?.study_code ?? "编号对象" }, { label: "训练记录" }]} />
    <p style={{ marginTop: -6 }}><Link href={`/participants/${id}`}>← 返回对象记录</Link></p>
    <PageHeader eyebrow="训练观察" title={session.action_label}
      sub={<span className="row" style={{ gap: 6 }}><Badge tone={session.completion_status === "completed" ? "jade" : "amber"}>{completionNames[session.completion_status]}</Badge>
        <span className="muted">{formatDateTime(session.session_at)}（北京时间） · 时长：{session.actual_minutes === null ? "未记录" : `${session.actual_minutes} 分钟`}</span></span>} />
    <div className="grid-main">
      <Card title="训练后反馈" id="feedback-heading" sub="每次修改追加一个版本；留空的项目保持“未记录”。">
        {feedback === null ? <Notice tone="warn">反馈历史暂不可用。</Notice> : feedback.length ? (
          <ol className="timeline">{[...feedback].reverse().map(row => <li key={row.id} className="confirmed">
            <div><strong>第 {row.revision_no} 版</strong> · {row.state === "missing"
              ? `缺失：${feedbackMissingNames[row.missing_reason ?? "unknown"]}`
              : `RPE ${or(row.rpe)}；困难 ${or(row.difficulty)}；辅助 ${or(row.support)}；疲劳 ${or(row.fatigue)}；不适 ${or(row.discomfort)}`}</div>
            {row.notes && <div>{row.notes}</div>}
            <div className="when">{formatDateTime(row.recorded_at)}{row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}</div>
          </li>)}</ol>
        ) : <Empty title="未填写反馈"><p>未填写反馈；不能视为 RPE 0 或无不适。</p></Empty>}
        {session.notes && <p className="note" style={{ marginTop: 14 }}>训练备注：{session.notes}</p>}
      </Card>
      {can.write(user.role) && feedback !== null ? <section className="card">
        <FeedbackForm sessionId={session.id} expectedRevision={latest?.revision_no ?? 0} />
      </section> : null}
    </div>
  </AppShell>;
}
