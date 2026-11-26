"use client";

import { useRef, useState } from "react";
import { activityText, discomfortText, poseCountsText, type PatientReport } from "../../workspace/patient-reports";
import type { PatientReview } from "../../workspace/patient-reviews";
import PatientReportReview from "./patient-report-review";

const beijingDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});

function ReportFacts({ row }: { row: PatientReport }) {
  return <>
    {row.publication_version != null && <>演示任务版本 {row.publication_version} · </>}
    发生时间（北京时间）：<time dateTime={row.observed_at}>{new Date(row.observed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time> · {activityText[row.activity_state]} · {row.actual_minutes === null ? "时长未知" : `${row.actual_minutes} 分钟`} · {discomfortText[row.discomfort_state]}{row.discomfort_note ? `：${row.discomfort_note}` : ""}{row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
    {row.pose_summary
      ? <><br />姿态识别摘要：{poseCountsText(row.pose_summary)}</>
      : row.publication_version != null && <><br />未提交姿态摘要</>}
    <br /><small>保存时间（北京时间）：<time dateTime={row.recorded_at}>{new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></small>
  </>;
}

export default function StaffPatientReports({ reports, publicationVersion, versionIssue, participantId, reviews = null, canReview = false }: {
  reports: PatientReport[] | null;
  publicationVersion?: number;
  versionIssue?: "unavailable" | "invalid";
  participantId?: string;
  reviews?: PatientReview[] | null;
  canReview?: boolean;
}) {
  const [onlyDiscomfort, setOnlyDiscomfort] = useState(false);
  const [observedDate, setObservedDate] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [savedReviews, setSavedReviews] = useState<PatientReview[]>([]);
  const [filterNotice, setFilterNotice] = useState("");
  const pendingCheckbox = useRef<HTMLInputElement>(null);
  if (versionIssue) {
    const unavailable = versionIssue === "unavailable";
    return <section aria-labelledby="patient-reports-heading">
      <h2 id="patient-reports-heading" tabIndex={-1}>患者自报训练与不适</h2>
      <p role="status">{unavailable
        ? "发布历史暂不可用，无法核对指定任务版本。"
        : "指定的任务版本没有对应的发布记录，请从发布历史选择一个已发布版本。"}</p>
      <div className="button-row">
        {unavailable
          ? <button type="button" onClick={() => window.location.reload()}>重新读取发布历史</button>
          : <a href="#publication-heading">返回发布历史</a>}
        <a href="?#patient-reports-heading">查看全部自报记录</a>
      </div>
    </section>;
  }

  const allReviews = reviews === null ? null : [...new Map(
    [...reviews, ...savedReviews].map((row) => [row.id, row]),
  ).values()];
  const reviewedRevisions = new Set(allReviews?.map((row) => row.report_revision_id));
  const byReport = new Map<string, PatientReport[]>();
  for (const row of reports ?? []) {
    const revisions = byReport.get(row.report_id) ?? [];
    revisions.push(row);
    byReport.set(row.report_id, revisions);
  }
  const groups = [...byReport.values()]
    .map((revisions) => revisions.sort((a, b) => b.revision_no - a.revision_no))
    .sort((a, b) => Date.parse(b[0].recorded_at) - Date.parse(a[0].recorded_at) || a[0].report_id.localeCompare(b[0].report_id));
  const taskGroups = publicationVersion === undefined
    ? groups
    : groups.filter(([current]) => current.publication_version === publicationVersion);
  const canFilterPending = allReviews !== null && taskGroups.some(([row]) => row.publication_version != null);
  const filterPending = canFilterPending && onlyPending;
  const visibleGroups = taskGroups.filter(([current]) =>
    (!filterPending || (current.publication_version != null && !reviewedRevisions.has(current.id))) &&
    (!onlyDiscomfort || current.discomfort_state === "reported") &&
    (!observedDate || beijingDate.format(new Date(current.observed_at)) === observedDate),
  );

  function recordSaved(review: PatientReview) {
    setSavedReviews((previous) => [...previous, review]);
    if (pendingCheckbox.current?.checked) {
      setFilterNotice("复核已保存，此条反馈已移出待复核列表。");
      pendingCheckbox.current.focus();
    }
  }

  return <section aria-labelledby="patient-reports-heading"><h2 id="patient-reports-heading" tabIndex={-1}>患者自报训练与不适</h2>
    <p className="note">仅显示合成患者本人填写的事实与修订历史；未提交不代表完成或无不适，系统不自动判定风险。</p>
    {publicationVersion !== undefined && <p>
      正在核对演示任务版本 {publicationVersion} · <a href="?#patient-reports-heading">查看全部自报记录</a>
    </p>}
    {taskGroups.length > 0 && <>
      <label>发生日期（北京时间）
        <input type="date" value={observedDate} onChange={(event) => setObservedDate(event.target.value)} />
      </label>
      {observedDate && <button type="button" onClick={() => setObservedDate("")}>清除日期</button>}
      <label>
        <input type="checkbox" checked={onlyDiscomfort}
          onChange={(event) => setOnlyDiscomfort(event.target.checked)} />
        仅显示当前版本自报有不适
      </label>
      {canFilterPending && <label>
        <input ref={pendingCheckbox} type="checkbox" checked={onlyPending}
          onChange={(event) => { setOnlyPending(event.target.checked); setFilterNotice(""); }} />
        仅显示待复核的任务反馈
      </label>}
    </>}
    {filterPending && filterNotice && <p role="status">{filterNotice}</p>}
    {reports === null ? <p>患者自报记录暂不可用。</p> : visibleGroups.length ? <ul>{visibleGroups.map(([current, ...older]) => <li key={current.report_id}>
      <p><strong>当前版本 {current.revision_no}</strong> · <ReportFacts row={current} /></p>
      {participantId && current.publication_version != null && <PatientReportReview
        key={current.id} participantId={participantId} revisionId={current.id} reviews={allReviews}
        onSaved={canReview ? recordSaved : undefined} />}
      {older.length ? <details><summary>查看旧版本（{older.length}）</summary><ul>{older.map((row) => <li key={row.id}>
        <strong>旧版本 {row.revision_no}</strong> · <ReportFacts row={row} />
        {participantId && row.publication_version != null && <PatientReportReview
          participantId={participantId} revisionId={row.id} reviews={allReviews} />}
      </li>)}</ul></details> : null}
    </li>)}</ul> : taskGroups.length ? <p role={filterPending && filterNotice ? undefined : "status"}>{filterPending
      ? "没有符合筛选条件的待复核反馈。"
      : observedDate
      ? "所选日期没有符合筛选条件的记录。"
      : "没有当前版本自报有不适的记录。"}</p>
      : publicationVersion !== undefined ? <p>此任务版本暂无关联反馈。</p>
        : <p>暂无患者自报；训练与不适状态未知。</p>}
  </section>;
}
