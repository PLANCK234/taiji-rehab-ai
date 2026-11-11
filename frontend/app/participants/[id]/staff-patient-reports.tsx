import { activityText, discomfortText, type PatientReport } from "../../workspace/patient-reports";

function ReportFacts({ row }: { row: PatientReport }) {
  return <>
    发生时间（北京时间）：<time dateTime={row.observed_at}>{new Date(row.observed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time> · {activityText[row.activity_state]} · {row.actual_minutes === null ? "时长未知" : `${row.actual_minutes} 分钟`} · {discomfortText[row.discomfort_state]}{row.discomfort_note ? `：${row.discomfort_note}` : ""}{row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
    <br /><small>保存时间（北京时间）：<time dateTime={row.recorded_at}>{new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></small>
  </>;
}

export default function StaffPatientReports({ reports }: { reports: PatientReport[] | null }) {
  const byReport = new Map<string, PatientReport[]>();
  for (const row of reports ?? []) {
    const revisions = byReport.get(row.report_id) ?? [];
    revisions.push(row);
    byReport.set(row.report_id, revisions);
  }
  const groups = [...byReport.values()]
    .map((revisions) => revisions.sort((a, b) => b.revision_no - a.revision_no))
    .sort((a, b) => Date.parse(b[0].recorded_at) - Date.parse(a[0].recorded_at) || a[0].report_id.localeCompare(b[0].report_id));

  return <section aria-labelledby="patient-reports-heading"><h2 id="patient-reports-heading">患者自报训练与不适</h2>
    <p className="note">仅显示合成患者本人填写的事实与修订历史；未提交不代表完成或无不适，系统不自动判定风险。</p>
    {reports === null ? <p>患者自报记录暂不可用。</p> : groups.length ? <ul>{groups.map(([current, ...older]) => <li key={current.report_id}>
      <p><strong>当前版本 {current.revision_no}</strong> · <ReportFacts row={current} /></p>
      {older.length ? <details><summary>查看旧版本（{older.length}）</summary><ul>{older.map((row) => <li key={row.id}>
        <strong>旧版本 {row.revision_no}</strong> · <ReportFacts row={row} />
      </li>)}</ul></details> : null}
    </li>)}</ul> : <p>暂无患者自报；训练与不适状态未知。</p>}
  </section>;
}
