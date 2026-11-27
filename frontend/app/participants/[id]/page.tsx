import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../components/app-shell";
import { Badge, Card, Crumbs, Empty, FlowSteps, Notice, PageHeader, type StepState } from "../../../components/ui";
import { getAssessmentTrend, getParticipantAssessments, measurementText, type AssessmentSummary } from "../../../lib/assessments";
import { can, getCurrentUser } from "../../../lib/auth";
import { getDemoPlan, gradeNames, runStatusNames, type DemoPlan } from "../../../lib/demo";
import { formatDateTime } from "../../../lib/format";
import { getConsentHistory, getParticipant, getScreeningHistory, type ConsentHistory } from "../../../lib/intake";
import { completionNames, getSafetyEvents, getTrainingSessions, type TrainingSession } from "../../../lib/training";
import AssessmentTrendSection from "./assessment-trend";
import CreateAssessmentForm from "./create-assessment-form";
import { ConsentForm, ScreeningForm } from "./intake-forms";
import TrainingForms from "./training-forms";

export const dynamic = "force-dynamic";

const consentText = { not_recorded: "未记录", granted: "模拟同意已记录", refused: "模拟拒绝已记录", withdrawn: "模拟撤回已记录" };
const answerText = { yes: "是", no: "否", unknown: "未知" };

type NextStep = { title: string; detail: string; href: string; label: string };

function nextStep(id: string, consent: ConsentHistory | null, assessments: AssessmentSummary[] | null,
  plan: DemoPlan | null, sessions: TrainingSession[] | null): NextStep | null {
  if (consent?.state !== "granted") return { title: "记录模拟同意", detail: "评估、训练与 AI 采集都需要当前有效的模拟同意。", href: "#consent-heading", label: "去记录同意" };
  if (!assessments?.length) return { title: "创建基线评估", detail: "录入人工 SPPB 总分，确认后自动生成 Demo 分级与动作组合。", href: "#assessments-heading", label: "去创建评估" };
  const draft = assessments.find(row => row.current.state === "draft");
  if (draft) return { title: "完成评估录入与确认", detail: `当前草稿：${measurementText(draft.current)}。确认后才会生成 Demo 分级。`, href: `/assessments/${draft.id}`, label: "打开评估" };
  if (plan?.current_run) return { title: `继续本次训练（${runStatusNames[plan.current_run.status]}）`, detail: "训练进度已保存在数据库中，可随时继续。", href: `/participants/${id}/demo/run/${plan.current_run.id}`, label: "继续训练" };
  if (plan?.grade && plan.actions.length) return { title: "开始太极训练演示", detail: `${gradeNames[plan.grade.functional_grade]} · ${plan.grade.demo_training_mode ?? ""}，共 ${plan.actions.length} 个动作。`, href: `/participants/${id}/demo`, label: "打开训练方案" };
  if (plan?.grade) return { title: "查看 Demo 方案", detail: "Ⅳ 级或缺失/无效评估不会自动安排自主训练动作，可人工查看动作库。", href: `/participants/${id}/demo`, label: "打开方案" };
  if (!sessions?.length) return { title: "记录 AI 动作或训练观察", detail: "可使用 AI 视频动作评估，或在下方记录已发生的训练。", href: `/participants/${id}/ai-assessment`, label: "AI 动作评估" };
  return null;
}

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookieHeader);
  if (!participant) notFound();
  const [consents, screenings, assessments, trend, sessions, safetyEvents, plan] = await Promise.all([
    getConsentHistory(id, cookieHeader), getScreeningHistory(id, cookieHeader),
    getParticipantAssessments(id, cookieHeader), getAssessmentTrend(id, cookieHeader),
    getTrainingSessions(id, cookieHeader), getSafetyEvents(id, cookieHeader), getDemoPlan(id, cookieHeader),
  ]);
  const canWrite = can.write(user.role);
  const consentGranted = consents?.state === "granted";
  const grade = plan?.grade;
  const step = nextStep(id, consents, assessments, plan, sessions);
  const steps: { label: string; state: StepState }[] = [
    { label: "编码建档", state: "done" },
    { label: "模拟同意", state: consentGranted ? "done" : "todo" },
    { label: "人工评估", state: assessments?.some(row => row.current.state === "confirmed") ? "done" : "todo" },
    { label: "Demo 分级", state: grade ? "done" : "todo" },
    { label: "训练记录", state: sessions?.length ? "done" : "todo" },
  ];
  const firstTodo = steps.findIndex(item => item.state === "todo");
  if (firstTodo >= 0) steps[firstTodo].state = "current";

  return <AppShell user={user}>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { label: participant.study_code }]} />
    <PageHeader eyebrow="编号对象" title={participant.study_code}
      sub={<div className="row" style={{ gap: 6 }}>
        <Badge tone={consentGranted ? "jade" : "amber"}>{consents ? consentText[consents.state] : "同意状态未知"}</Badge>
        {grade ? <Badge tone="ink">{gradeNames[grade.functional_grade]}{grade.demo_training_mode ? ` · ${grade.demo_training_mode}` : ""}</Badge> : <Badge>尚无 Demo 分级</Badge>}
        {plan?.current_run && <Badge tone="blue">训练{runStatusNames[plan.current_run.status]}</Badge>}
      </div>}
      actions={<>
        <Link className="btn btn-secondary" href={`/participants/${id}/ai-assessment`}>AI视频动作评估</Link>
        <Link className="btn" href={grade ? `/participants/${id}/demo` : "#assessments-heading"}>{grade ? "打开训练方案" : "先完成基础评估"}</Link>
      </>} />

    <section className="card" aria-label="流程进度">
      <FlowSteps steps={steps} />
      {step && <div className="next-step">
        <div><div className="label">下一步</div><strong>{step.title}</strong><p>{step.detail}</p></div>
        <Link className="btn btn-sm" href={step.href}>{step.label} →</Link>
      </div>}
    </section>

    <div className="grid-main" style={{ marginTop: 18 }}>
      <div className="stack">
        <Card title="人工 SPPB 评估" id="assessments-heading"
          sub="人工总分确认后，另存一条版本化的 Demo 分级（demo-rule-v1），不作为临床结论。">
          {assessments === null ? <Notice tone="warn">评估记录暂不可用。</Notice> : assessments.length ? (
            <ul className="list">{assessments.map(row => <li key={row.id}>
              <Link className="list-link" href={`/assessments/${row.id}`}>
                <span className="main"><strong>{row.visit_kind === "baseline" ? "基线" : "复评"} · {measurementText(row.current)}</strong>
                  <small>{formatDateTime(row.created_at)} 创建 · 版本 {row.current.revision_no}</small></span>
                <Badge tone={row.current.state === "draft" ? "amber" : "jade"}>{row.current.state === "draft" ? "草稿" : "已确认"}</Badge>
              </Link>
            </li>)}</ul>
          ) : <Empty title="暂无评估记录">创建基线评估后录入人工 SPPB 总分。</Empty>}
          <div style={{ marginTop: 14 }}>
            {canWrite && consentGranted && assessments !== null
              ? <CreateAssessmentForm participantId={participant.id} hasBaseline={assessments.some(row => row.visit_kind === "baseline")} />
              : <p className="note">{canWrite ? "记录模拟同意后即可创建评估。" : "当前角色只读。"}</p>}
          </div>
        </Card>
        <AssessmentTrendSection trend={trend} />
        <Card title="训练观察与反馈" id="training-heading" sub="记录已发生的训练与反馈；缺失值保持“未记录”，不会当作 0。">
          {sessions === null ? <Notice tone="warn">训练记录暂不可用。</Notice> : sessions.length ? (
            <ul className="list">{sessions.map(row => <li key={row.id}>
              <Link className="list-link" href={`/participants/${participant.id}/training/${row.id}`}>
                <span className="main"><strong>{row.action_label}</strong>
                  <small>{formatDateTime(row.session_at)} · {row.actual_minutes === null ? "时长未记录" : `${row.actual_minutes} 分钟`}</small></span>
                <Badge tone={row.completion_status === "completed" ? "jade" : "amber"}>{completionNames[row.completion_status]}</Badge>
              </Link>
            </li>)}</ul>
          ) : <Empty title="尚无训练记录">完成一次 Demo 训练，或在下方手动记录。</Empty>}
          <h3 style={{ marginTop: 18 }}>事件记录</h3>
          {safetyEvents === null ? <Notice tone="warn">事件记录暂不可用。</Notice> : safetyEvents.length ? (
            <ul className="list">{safetyEvents.map(row => <li key={row.id}>
              <span className="main"><span>{row.description}</span><small>{formatDateTime(row.event_at)} · 请按机构既有流程处置</small></span>
            </li>)}</ul>
          ) : <p className="note">尚无事件记录。</p>}
          <TrainingForms participantId={participant.id} canWrite={canWrite} consentGranted={consentGranted} sessions={sessions ?? []} />
        </Card>
      </div>

      <div className="stack">
        <Card title="模拟同意" id="consent-heading">
          {consents ? <>
            <p>当前记录：{consentText[consents.state]}</p>
            {consents.records.length ? <ul className="list">{consents.records.map(row => <li key={row.id}>
              <span className="main"><span>{consentText[row.decision]}</span>
                <small>{formatDateTime(row.recorded_at)} · {row.document_version}{row.change_reason ? ` · ${row.change_reason}` : ""}</small></span>
            </li>)}</ul> : null}
            {canWrite && <ConsentForm participantId={participant.id} consentCount={consents.records.length} granted={consentGranted} />}
          </> : <Notice tone="warn">同意记录暂不可用。</Notice>}
        </Card>
        <Card title="模拟筛查" id="screen-heading">
          {screenings ? <>
            <p><Badge tone={screenings.review_state === "not_assessed" ? "gray" : "amber"}>
              <span role="status">{screenings.review_state === "not_assessed" ? "未评估" : "待复核"}</span></Badge></p>
            {screenings.records.length ? <ul className="list">{screenings.records.map(row => <li key={row.id}>
              <span>{row.item_code}：{answerText[row.answer]}</span></li>)}</ul> : null}
            <p className="note">筛查记录不会自动得出“安全”或“可入组”结论。</p>
            {canWrite && (consentGranted
              ? <ScreeningForm participantId={participant.id} existingItemCodes={screenings.records.map(row => row.item_code)} />
              : <p className="note">未记录有效的模拟同意，筛查录入已关闭。</p>)}
          </> : <Notice tone="warn">筛查记录暂不可用；状态未知。</Notice>}
        </Card>
        {can.export(user.role) ? <Card title="编号化数据导出" id="export-heading">
          <p className="note">导出此对象的结构化记录与全部修订版本（实时，非冻结快照）；不含自由文本与身份信息，附行数与 SHA-256。</p>
          <a className="btn btn-secondary btn-block" href={`/api/v1/participants/${participant.id}/research-export.csv`}>下载编号化 CSV</a>
        </Card> : null}
      </div>
    </div>
  </AppShell>;
}
