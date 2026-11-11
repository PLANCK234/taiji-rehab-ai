"use client";

import { useRef, useState } from "react";
import { postIntake } from "../workspace/intake";
import { activityText, discomfortText, type PatientReport } from "../workspace/patient-reports";

function beijingFormTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function ReportFacts({ row }: { row: PatientReport }) {
  return <>
    发生时间（北京时间）：{new Date(row.observed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · {activityText[row.activity_state]} · {row.actual_minutes === null ? "时长未知" : `${row.actual_minutes} 分钟`} · {discomfortText[row.discomfort_state]}{row.discomfort_note ? `：${row.discomfort_note}` : ""}
    {row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
    <br /><small>保存时间（北京时间）：{new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</small>
  </>;
}

export default function PatientReportForm({ initialReports }: { initialReports: PatientReport[] | null }) {
  const [reports, setReports] = useState(initialReports);
  const [editing, setEditing] = useState<PatientReport | null>(null);
  const [observedAt, setObservedAt] = useState("");
  const [activity, setActivity] = useState<PatientReport["activity_state"]>("unknown");
  const [minutes, setMinutes] = useState("");
  const [discomfort, setDiscomfort] = useState<PatientReport["discomfort_state"]>("unknown");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef("");
  const latest = reports?.filter((row) => !reports.some((other) => other.report_id === row.report_id && other.revision_no > row.revision_no))
    .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at) || a.report_id.localeCompare(b.report_id)) ?? [];

  function edit(row: PatientReport) {
    setEditing(row);
    setObservedAt(beijingFormTime(row.observed_at));
    setActivity(row.activity_state);
    setMinutes(row.actual_minutes?.toString() ?? "");
    setDiscomfort(row.discomfort_state);
    setNote(row.discomfort_note ?? "");
    setReason("");
    key.current = "";
    setMessage("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!observedAt || (editing && !reason.startsWith("SYN-"))) {
      setMessage("请填写发生时间；更正时请填写以 SYN- 开头的原因。");
      return;
    }
    key.current ||= crypto.randomUUID();
    setPending(true);
    setMessage("");
    const result = await postIntake<PatientReport>(
      editing ? `/patient/reports/${editing.report_id}` : "/patient/reports",
      {
        expected_revision: editing?.revision_no ?? 0,
        observed_at: editing && observedAt === beijingFormTime(editing.observed_at)
          ? editing.observed_at
          : new Date(`${observedAt}:00+08:00`).toISOString(),
        activity_state: activity,
        actual_minutes: activity === "performed" && minutes !== "" ? Number(minutes) : null,
        discomfort_state: discomfort,
        discomfort_note: discomfort === "reported" ? note.trim() : null,
        change_reason: editing ? reason.trim() : null,
      },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      setReports((previous) => [result.value!, ...(previous ?? [])]);
      setEditing(null);
      setObservedAt("");
      setActivity("unknown");
      setMinutes("");
      setDiscomfort("unknown");
      setNote("");
      setReason("");
      key.current = "";
      setMessage("合成记录已保存。此处没有自动风险判断或平台内处置服务。");
    } else {
      setMessage(result.status === 409 ? "版本已变化，请刷新后再更正。" : "保存失败，请检查模拟同意、账号绑定和填写内容。");
    }
  }

  return <section aria-labelledby="patient-report-heading">
    <h2 id="patient-report-heading">训练与不适记录</h2>
    <p className="note">仅供合成数据流程试用。请记录已经发生的事实；没有记录时状态未知。此页面不提供紧急响应或临床判断。</p>
    {reports === null ? <p>记录暂不可用。</p> : <>
      <form onSubmit={submit} onChange={() => { key.current = ""; }}>
        <h3>{editing ? `更正记录 · 版本 ${editing.revision_no}` : "新增本人记录"}</h3>
        <label>发生时间（北京时间）<input type="datetime-local" required value={observedAt} onChange={(event) => setObservedAt(event.target.value)} /></label>
        <label>实际训练情况<select value={activity} onChange={(event) => setActivity(event.target.value as PatientReport["activity_state"])}>
          <option value="unknown">不清楚／未说明</option><option value="performed">做了训练</option><option value="not_performed">没有训练</option>
        </select></label>
        {activity === "performed" ? <label>实际时长（分钟，可留空表示未知）<input type="number" min="0" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label> : null}
        <label>不适情况<select value={discomfort} onChange={(event) => setDiscomfort(event.target.value as PatientReport["discomfort_state"])}>
          <option value="unknown">不清楚／未说明</option><option value="none">明确没有不适</option><option value="reported">有不适</option>
        </select></label>
        {discomfort === "reported" ? <label>不适描述<input required maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label> : null}
        {editing ? <label>更正原因（以 SYN- 开头）<input required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label> : null}
        <div className="button-row"><button disabled={pending} type="submit">{editing ? "保存更正" : "保存记录"}</button>
          {editing ? <button type="button" onClick={() => { setEditing(null); setReason(""); key.current = ""; }}>取消更正</button> : null}</div>
      </form>
      {message ? <p role="status">{message}</p> : null}
      <h3>本人记录历史</h3>
      {latest.length ? <ul>{latest.map((row) => <li key={row.report_id}>
        <p><strong>当前版本 {row.revision_no}</strong> · <ReportFacts row={row} /></p>
        <button type="button" onClick={() => edit(row)}>更正</button>
        {row.revision_no > 1 ? <details><summary>查看旧版本</summary><ul>{reports.filter((old) => old.report_id === row.report_id && old.id !== row.id).sort((a, b) => b.revision_no - a.revision_no).map((old) => <li key={old.id}><strong>旧版本 {old.revision_no}</strong> · <ReportFacts row={old} /></li>)}</ul></details> : null}
      </li>)}</ul> : <p>尚未填写训练或不适记录；训练与不适状态均未知。</p>}
    </>}
  </section>;
}
