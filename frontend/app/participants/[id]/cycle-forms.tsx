"use client";

import { useRef, useState } from "react";
import { postIntake } from "../../workspace/intake";
import { measurementText, type AssessmentSummary } from "../../workspace/assessments";
import type { TrainingSession } from "../../workspace/training";
import {
  assessmentStateText, attendanceText, type SyntheticCycle, type VisitRevision,
} from "../../workspace/cycles";

export default function CycleForms({ participantId, initialCycles, assessments, sessions, canWrite }: {
  participantId: string;
  initialCycles: SyntheticCycle[] | null;
  assessments: AssessmentSummary[];
  sessions: TrainingSession[];
  canWrite: boolean;
}) {
  const [cycles, setCycles] = useState(initialCycles);
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [editing, setEditing] = useState<VisitRevision | null>(null);
  const [visitLabel, setVisitLabel] = useState("");
  const [attendance, setAttendance] = useState<VisitRevision["attendance"]>("unknown");
  const [assessmentState, setAssessmentState] = useState<VisitRevision["assessment_state"]>("unknown");
  const [assessmentId, setAssessmentId] = useState("");
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const replay = useRef<{ fingerprint: string; key: string } | null>(null);

  function keyFor(path: string, body: object): string {
    const fingerprint = `${path}:${JSON.stringify(body)}`;
    if (replay.current?.fingerprint !== fingerprint) {
      replay.current = { fingerprint, key: crypto.randomUUID() };
    }
    return replay.current.key;
  }

  async function createCycle(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const path = `/participants/${participantId}/cycles`;
    const body = { label: cycleLabel.trim() };
    const result = await postIntake<SyntheticCycle>(
      path, body, keyFor(path, body), document.cookie,
    );
    setPending(false);
    if (!result.value) { setMessage("创建周期失败，请核对模拟同意与名称。 "); return; }
    replay.current = null;
    setCycles((current) => [...(current ?? []), { ...result.value!, visits: [] }]);
    setCycleId(result.value.id);
    setCycleLabel("");
    setMessage("合成周期已保存。");
  }

  function beginCorrection(cycle: SyntheticCycle, row: VisitRevision) {
    setCycleId(cycle.id);
    setEditing(row);
    setVisitLabel(row.label);
    setAttendance(row.attendance);
    setAssessmentState(row.assessment_state);
    setAssessmentId(row.assessment_id ?? "");
    setSessionIds(row.training_session_ids);
    setReason("");
    setMessage("");
  }

  async function saveVisit(event: React.FormEvent) {
    event.preventDefault();
    if (!cycleId || (editing && !reason.startsWith("SYN-"))) {
      setMessage("请选择周期；更正时填写以 SYN- 开头的原因。"); return;
    }
    setPending(true);
    const path = editing ? `/cycles/${cycleId}/visits/${editing.visit_id}` : `/cycles/${cycleId}/visits`;
    const body = {
        expected_revision: editing?.revision_no ?? 0,
        label: visitLabel.trim(), attendance, assessment_state: assessmentState,
        assessment_id: assessmentState === "recorded" ? assessmentId : null,
        training_session_ids: sessionIds, change_reason: editing ? reason.trim() : null,
    };
    const result = await postIntake<VisitRevision>(
      path, body, keyFor(path, body), document.cookie,
    );
    setPending(false);
    if (!result.value) { setMessage("保存失败，请检查关联对象、模拟同意或版本；刷新后重试。 "); return; }
    replay.current = null;
    setCycles((current) => current?.map((cycle) => cycle.id === cycleId
      ? { ...cycle, visits: [...cycle.visits, result.value!] } : cycle) ?? null);
    setEditing(null); setVisitLabel(""); setAttendance("unknown");
    setAssessmentState("unknown"); setAssessmentId(""); setSessionIds([]); setReason("");
    setMessage("合成访视版本已保存。");
  }

  return <section aria-labelledby="cycles-heading">
    <h2 id="cycles-heading">手工周期与访视</h2>
    <p className="note">仅供合成数据整理。名称和状态由工作人员手工记录；没有获批的日程、疗效或安全结论。</p>
    {cycles === null ? <p>周期记录暂不可用。</p> : <>
      {cycles.length ? <ul>{cycles.map((cycle) => {
        const latest = cycle.visits.filter((row) => !cycle.visits.some(
          (other) => other.visit_id === row.visit_id && other.revision_no > row.revision_no,
        ));
        return <li key={cycle.id}><strong>{cycle.label}</strong>
          {latest.length ? <ul>{latest.map((row) => <li key={row.visit_id}>
            {row.label} · {attendanceText[row.attendance]} · {assessmentStateText[row.assessment_state]} · 版本 {row.revision_no}
            {row.assessment_id ? <> · <a href={`/assessments/${row.assessment_id}`}>查看关联评估</a>
              {(() => { const linked = assessments.find((item) => item.id === row.assessment_id);
                return linked ? ` · 当前人工总分：${measurementText(linked.current)}（${linked.current.state === "confirmed" ? "已确认" : "草稿"}）` : " · 关联评估暂不可用";
              })()}</> : null}
            {row.training_session_ids.length ? <> · 关联训练 {row.training_session_ids.length} 次</> : " · 尚未关联训练观察"}
            {canWrite ? <button type="button" onClick={() => beginCorrection(cycle, row)}>更正访视</button> : null}
            {row.revision_no > 1 ? <details><summary>修订历史</summary><ul>{cycle.visits.filter(
              (old) => old.visit_id === row.visit_id && old.id !== row.id,
            ).map((old) => <li key={old.id}>版本 {old.revision_no} · {attendanceText[old.attendance]} · {assessmentStateText[old.assessment_state]}{old.change_reason ? ` · ${old.change_reason}` : ""}</li>)}</ul></details> : null}
          </li>)}</ul> : <p>暂无访视，所有到访与测量状态未知。</p>}
        </li>;
      })}</ul> : <p>尚无周期；没有访视记录不表示未到或拒测。</p>}
      {canWrite ? <>
        <form onSubmit={createCycle}><h3>新建合成周期</h3>
          <label>周期名称<input required maxLength={120} value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} /></label>
          <button type="submit" disabled={pending}>保存周期</button>
        </form>
        {cycles.length ? <form onSubmit={saveVisit}><h3>{editing ? "更正访视" : "新增手工访视"}</h3>
          <label>所属周期<select value={cycleId} disabled={!!editing} required onChange={(e) => setCycleId(e.target.value)}>
            <option value="">请选择</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
          </select></label>
          <label>访视名称<input required maxLength={120} value={visitLabel} onChange={(e) => setVisitLabel(e.target.value)} /></label>
          <label>到访情况<select value={attendance} onChange={(e) => setAttendance(e.target.value as VisitRevision["attendance"])}>
            <option value="unknown">未知</option><option value="attended">已到访</option><option value="not_attended">未到访</option>
          </select></label>
          <label>评估情况<select value={assessmentState} onChange={(e) => { setAssessmentState(e.target.value as VisitRevision["assessment_state"]); setAssessmentId(""); }}>
            <option value="unknown">未知</option><option value="recorded">关联已有评估</option><option value="declined">拒测</option><option value="not_measured">未测</option>
          </select></label>
          {assessmentState === "recorded" ? <label>已有人工评估<select required value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
            <option value="">请选择</option>{assessments.map((row) => <option key={row.id} value={row.id}>{row.visit_kind === "baseline" ? "基线" : "复评"} · {row.id.slice(0, 8)}</option>)}
          </select></label> : null}
          <fieldset><legend>关联已有训练观察（可不选）</legend>{sessions.map((row) => <label key={row.id}>
            <input type="checkbox" checked={sessionIds.includes(row.id)} onChange={(e) => setSessionIds((current) => e.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
            {new Date(row.session_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · {row.action_label}
          </label>)}</fieldset>
          {editing ? <label>更正原因（以 SYN- 开头）<input required value={reason} onChange={(e) => setReason(e.target.value)} /></label> : null}
          <button type="submit" disabled={pending}>保存访视</button>
          {editing ? <button type="button" onClick={() => { setEditing(null); setReason(""); }}>取消更正</button> : null}
        </form> : null}
      </> : null}
      {message ? <p role="status">{message}</p> : null}
    </>}
  </section>;
}
