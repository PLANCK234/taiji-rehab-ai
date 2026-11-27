import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../components/app-shell";
import { Badge, Card, Crumbs, Notice, PageHeader } from "../../../components/ui";
import { getAssessment, measurementText, missingReasonText } from "../../../lib/assessments";
import { can, getCurrentUser } from "../../../lib/auth";
import { formatDateTime } from "../../../lib/format";
import { getConsentHistory, getParticipant } from "../../../lib/intake";
import AssessmentEditor from "./assessment-editor";

export const dynamic = "force-dynamic";

const RULE = [["10–12", "Ⅰ 级", "基础太极演示模式"], ["7–9", "Ⅱ 级", "简化站立太极演示模式"],
  ["4–6", "Ⅲ 级", "坐位 / 扶椅太极演示模式"], ["0–3", "Ⅳ 级", "不自动安排自主训练"]];

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const assessment = await getAssessment(id, cookieHeader);
  if (!assessment) notFound();
  const [consent, participant] = await Promise.all([
    getConsentHistory(assessment.participant_id, cookieHeader), getParticipant(assessment.participant_id, cookieHeader),
  ]);
  const current = assessment.current;
  const confirmed = current.state === "confirmed";
  const participantHref = `/participants/${assessment.participant_id}`;

  return <AppShell user={user}>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { href: participantHref, label: participant?.study_code ?? "编号对象" }, { label: "人工评估" }]} />
    <p style={{ marginTop: -6 }}><Link href={participantHref}>← 返回编号对象</Link></p>
    <PageHeader eyebrow="人工 SPPB 评估" title={assessment.visit_kind === "baseline" ? "基线评估" : "复评记录"}
      sub={<span className="row" style={{ gap: 6 }}>
        <Badge tone={confirmed ? "jade" : "amber"}>{confirmed ? "已确认" : "草稿"}</Badge>
        <span className="muted">当前版本 {current.revision_no} · {confirmed ? "已确认记录" : "草稿"}</span>
      </span>}
      actions={confirmed ? <Link className="btn" href={`${participantHref}/demo`}>查看 Demo 训练方案 →</Link> : undefined} />

    <div className="grid-main">
      <div className="stack">
        <Card>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="note">当前人工总分</div>
              <div className="score" aria-hidden="true">
                <span className="num">{current.validity === "valid" ? current.raw_value : "—"}</span>
                <span className="unit">{current.validity === "valid" ? "/ 12 分" : measurementText(current)}</span>
              </div>
            </div>
            <dl className="kv">
              <dt>测量时间</dt><dd>{formatDateTime(current.performed_at)}</dd>
              <dt>记录方案</dt><dd>{assessment.protocol_version}</dd>
              {current.missing_reason && <><dt>缺失/无效原因</dt><dd>{missingReasonText[current.missing_reason]}</dd></>}
            </dl>
          </div>
          <p style={{ marginTop: 12 }}>人工 SPPB 总分：{measurementText(current)}</p>
        </Card>
        <Card title="版本时间线" id="history-heading" sub="每次修改都追加新版本，历史版本不会被覆盖。">
          <ol className="timeline">{[...assessment.history].reverse().map(row => <li key={row.id} className={row.state === "confirmed" ? "confirmed" : undefined}>
            <div><strong>版本 {row.revision_no}</strong> · {row.state === "draft" ? "草稿" : "已确认"} · {measurementText(row)}</div>
            <div className="when">{formatDateTime(row.recorded_at)}{row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}</div>
          </li>)}</ol>
        </Card>
      </div>
      <div className="stack">
        {consent?.state === "granted"
          ? <AssessmentEditor assessmentId={assessment.id} participantId={assessment.participant_id} current={current}
            canWrite={can.write(user.role)} canConfirm={can.confirm(user.role)} />
          : <Notice tone="warn"><span role="status">当前没有有效模拟同意；评估修改与确认已关闭。</span></Notice>}
        <Card title="Demo 分级规则" id="rule-heading" sub="demo-rule-v1 · 仅用于演示，不是获批的临床分级">
          <table>
            <thead><tr><th>SPPB 总分</th><th>Demo 等级</th><th>演示模式</th></tr></thead>
            <tbody>{RULE.map(([range, grade, mode]) => <tr key={range}><td>{range}</td><td>{grade}</td><td>{mode}</td></tr>)}</tbody>
          </table>
          <p className="note" style={{ marginTop: 10 }}>缺失或无效记录确认后不产生自动分级。</p>
        </Card>
      </div>
    </div>
  </AppShell>;
}
