"use client";

import { useEffect, useId, useRef, useState } from "react";
import { postIntake } from "../workspace/intake";
import { activityText, discomfortText, poseCountsText, type PatientPoseCounts, type PatientReport } from "../workspace/patient-reports";
import RetryPatientHomeButton from "./retry-button";
import { useFeedbackLeaveWarning } from "./feedback-leave-guard";

type ReportDraft = {
  observedAt: string;
  activity: PatientReport["activity_state"];
  minutes: string;
  discomfort: PatientReport["discomfort_state"];
  note: string;
  requestKey: string;
  requestBody: string;
  attachTask: boolean;
  attachedVersion: number | undefined;
  confirmedSummary: PatientPoseCounts | null;
};

type Field = "observedAt" | "minutes" | "note" | "reason";
type FieldErrors = Partial<Record<Field, string>>;

function hasNewDraft(draft: Pick<ReportDraft, "observedAt" | "activity" | "minutes" | "discomfort" | "note" | "attachTask"> | null) {
  return !!draft && (draft.observedAt !== "" || draft.activity !== "unknown" || draft.discomfort !== "unknown" || draft.attachTask);
}

function saveError(status: number): string {
  if (status === 401) return "登录已失效，填写内容已保留。请在新标签页重新登录，再返回这里重试。";
  if (status === 403) return "暂时没有保存权限，填写内容已保留。请让工作人员检查账号绑定、模拟同意或操作权限；也可重新登录后重试。";
  if (status === 409) return "记录版本或提交状态已变化，填写内容已保留。请重新检查记录，核对最新版本后再更正。";
  if (status === 422) return "填写内容未通过检查，输入已保留。请核对时间、时长、不适描述和更正原因后重试。";
  if (status === 429) return "提交过于频繁，填写内容已保留，请稍后重试。";
  return "网络或服务暂不可用，尚无法确认保存结果。填写内容已保留；建议保持内容不变，点击重试保存，避免重复新建。";
}

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
    {row.publication_version != null && <>演示任务版本 {row.publication_version} · </>}
    发生时间（北京时间）：{new Date(row.observed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · {activityText[row.activity_state]} · {row.actual_minutes === null ? "时长未知" : `${row.actual_minutes} 分钟`} · {discomfortText[row.discomfort_state]}{row.discomfort_note ? `：${row.discomfort_note}` : ""}
    {row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
    {row.pose_summary && <><br />姿态识别摘要：{poseCountsText(row.pose_summary)}</>}
    <br /><small>保存时间（北京时间）：{new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</small>
  </>;
}

type TaskReportOptions = {
  publicationVersion?: number;
  poseSummary?: PatientPoseCounts | null;
  onPoseSummarySaved?: (summary: PatientPoseCounts) => void;
};

export default function PatientReportForm({ initialReports, ...taskOptions }: TaskReportOptions & {
  initialReports: PatientReport[] | null;
}) {
  return <section aria-labelledby="patient-report-heading">
    <h2 id="patient-report-heading" tabIndex={-1}>训练与不适记录</h2>
    <p className="note">仅供合成数据流程试用。请记录已经发生的事实；没有记录时状态未知。此页面不提供紧急响应或临床判断。</p>
    <EditablePatientReports initialReports={initialReports} {...taskOptions} />
  </section>;
}

function EditablePatientReports({ initialReports, publicationVersion, poseSummary, onPoseSummarySaved }: TaskReportOptions & { initialReports: PatientReport[] | null }) {
  const [savedReports, setSavedReports] = useState<PatientReport[]>([]);
  const lastSavedRecord = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    lastSavedRecord.current?.focus();
  }, [savedReports]);
  const reportsById = new Map(savedReports.map((row) => [row.id, row]));
  for (const row of initialReports ?? []) reportsById.set(row.id, row);
  const reports = [...reportsById.values()];
  const [editing, setEditing] = useState<PatientReport | null>(null);
  const [observedAt, setObservedAt] = useState("");
  const [activity, setActivity] = useState<PatientReport["activity_state"]>("unknown");
  const [minutes, setMinutes] = useState("");
  const [discomfort, setDiscomfort] = useState<PatientReport["discomfort_state"]>("unknown");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [attachTask, setAttachTask] = useState(false);
  const [attachedVersion, setAttachedVersion] = useState<number | undefined>(undefined);
  const [confirmedSummary, setConfirmedSummary] = useState<PatientPoseCounts | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failedStatus, setFailedStatus] = useState<number | null>(null);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => () => { request.current?.abort(); }, []);
  const key = useRef("");
  const requestBody = useRef("");
  const [newDraft, setNewDraft] = useState<ReportDraft | null>(null);
  const latest = reports.filter((row) => !reports.some((other) => other.report_id === row.report_id && other.revision_no > row.revision_no))
    .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at) || a.report_id.localeCompare(b.report_id));
  const latestEditing = editing ? latest.find((row) => row.report_id === editing.report_id) : null;
  const correctionDirty = !!editing && (observedAt !== beijingFormTime(editing.observed_at)
    || activity !== editing.activity_state || (activity === "performed" ? minutes : "") !== (editing.activity_state === "performed" ? editing.actual_minutes?.toString() ?? "" : "")
    || discomfort !== editing.discomfort_state || (discomfort === "reported" ? note : "") !== (editing.discomfort_state === "reported" ? editing.discomfort_note ?? "" : "") || reason !== "");
  const unsaved = pending || (editing ? correctionDirty || hasNewDraft(newDraft)
    : hasNewDraft({ observedAt, activity, minutes, discomfort, note, attachTask }));
  useFeedbackLeaveWarning(unsaved);

  function clearErrors() { setErrors({}); setFailedStatus(null); setMessage(""); }

  function edit(row: PatientReport) {
    if (editing && correctionDirty && !window.confirm("当前更正还有未保存的修改。要放弃这些修改并查看所选记录吗？")) return;
    if (!editing) {
      setNewDraft({ observedAt, activity, minutes, discomfort, note, requestKey: key.current, requestBody: requestBody.current, attachTask, attachedVersion, confirmedSummary });
    }
    setEditing(row);
    setObservedAt(beijingFormTime(row.observed_at));
    setActivity(row.activity_state);
    setMinutes(row.actual_minutes?.toString() ?? "");
    setDiscomfort(row.discomfort_state);
    setNote(row.discomfort_note ?? "");
    setReason("");
    key.current = "";
    clearErrors();
  }

  function returnToNewReport(draft: ReportDraft | null) {
    setEditing(null);
    setObservedAt(draft?.observedAt ?? "");
    setActivity(draft?.activity ?? "unknown");
    setMinutes(draft?.minutes ?? "");
    setDiscomfort(draft?.discomfort ?? "unknown");
    setNote(draft?.note ?? "");
    setReason("");
    setAttachTask(draft?.attachTask ?? false);
    setAttachedVersion(draft?.attachedVersion);
    setConfirmedSummary(draft?.confirmedSummary ?? null);
    key.current = draft?.requestKey ?? "";
    requestBody.current = draft?.requestBody ?? "";
    setNewDraft(null);
  }

  function cancelCorrection() {
    if (correctionDirty && !window.confirm("要取消本次更正吗？未保存的更正内容将丢失。")) return;
    returnToNewReport(newDraft);
    clearErrors();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || failedStatus === 409) return;
    const invalid: FieldErrors = {};
    const instant = new Date(`${observedAt}:00+08:00`);
    if (!observedAt || !Number.isFinite(instant.getTime()) || beijingFormTime(instant.toISOString()) !== observedAt) invalid.observedAt = "请选择有效的发生日期和时间（北京时间）。";
    const badMinutes = formRef.current?.querySelector<HTMLInputElement>('[name="minutes"]')?.validity.badInput;
    if (activity === "performed" && (badMinutes || (minutes !== "" && (!Number.isSafeInteger(Number(minutes)) || Number(minutes) < 0)))) invalid.minutes = "时长请填写大于或等于 0 的整数，或留空表示未知。";
    if (discomfort === "reported" && (!note.trim() || note.trim().length > 500)) invalid.note = "选择有不适时，请填写不适描述（1–500 字）。";
    if (editing && (!reason.trim().startsWith("SYN-") || reason.trim().length < 5 || reason.trim().length > 500)) invalid.reason = "请填写以 SYN- 开头的具体更正原因（5–500 字）。";
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setMessage("请先检查标出的填写项。");
      const first = Object.keys(invalid)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const linkedVersion = !editing && attachTask && attachedVersion === publicationVersion ? publicationVersion : undefined;
    const includedSummary = linkedVersion !== undefined && poseSummary === confirmedSummary ? confirmedSummary : null;
    const body = {
      expected_revision: editing?.revision_no ?? 0,
      ...(linkedVersion !== undefined ? { publication_version: linkedVersion } : {}),
      ...(includedSummary ? { pose_summary: includedSummary } : {}),
      observed_at: editing && observedAt === beijingFormTime(editing.observed_at)
        ? editing.observed_at : new Date(`${observedAt}:00+08:00`).toISOString(),
      activity_state: activity,
      actual_minutes: activity === "performed" && minutes !== "" ? Number(minutes) : null,
      discomfort_state: discomfort,
      discomfort_note: discomfort === "reported" ? note.trim() : null,
      change_reason: editing ? reason.trim() : null,
    };
    const fingerprint = JSON.stringify(body);
    if (requestBody.current !== fingerprint) key.current = "";
    requestBody.current = fingerprint;
    key.current ||= crypto.randomUUID();
    busy.current = true;
    setPending(true);
    setMessage("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let result: { status: number; value: PatientReport | null };
    try { result = await postIntake<PatientReport>(
      editing ? `/patient/reports/${editing.report_id}` : "/patient/reports",
      body,
      key.current,
      document.cookie,
      undefined,
      controller.signal,
    ); } catch { result = { status: 503, value: null }; }
    finally { window.clearTimeout(timeout); request.current = null; busy.current = false; setPending(false); }
    if (result.value) {
      setSavedReports((previous) => [result.value!, ...previous]);
      if (includedSummary) onPoseSummarySaved?.(includedSummary);
      returnToNewReport(editing ? newDraft : null);
      setFailedStatus(null);
      setMessage("合成记录已保存。此处没有自动风险判断或平台内处置服务。");
    } else {
      setFailedStatus(result.status);
      setMessage(saveError(result.status));
    }
  }

  if (initialReports === null) return <div>
    <p>训练与不适记录暂时无法读取。</p>
    <RetryPatientHomeButton label="重新检查记录" />
  </div>;

  return <>
      <form ref={formRef} noValidate aria-busy={pending} onSubmit={submit} onChange={(event) => {
        if (busy.current) return;
        key.current = "";
        const target: EventTarget = event.target;
        const name = target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.name : "";
        const field = name === "activity" ? "minutes" : name === "discomfort" ? "note" : name;
        if (field) setErrors((previous) => ({ ...previous, [field]: undefined }));
      }}>
        <fieldset className="quick-intake-fields" disabled={pending}>
        <h3>{editing ? `更正记录 · 版本 ${editing.revision_no}` : "新增本人记录"}</h3>
        {!editing && publicationVersion !== undefined && <label>
          <input type="checkbox" name="attachTask" checked={attachTask && attachedVersion === publicationVersion} onChange={(event) => {
            setAttachTask(event.target.checked);
            setAttachedVersion(publicationVersion);
            if (!event.target.checked) setConfirmedSummary(null);
          }} />
          将本次反馈关联到演示任务版本 {publicationVersion}
        </label>}
        {!editing && attachTask && attachedVersion === publicationVersion && poseSummary && <label>
          <input type="checkbox" name="poseSummary" checked={confirmedSummary === poseSummary}
            onChange={(event) => setConfirmedSummary(event.target.checked ? poseSummary : null)} />
          一并提交本次姿态识别摘要（{poseCountsText(poseSummary)}）
        </label>}
        <label>发生时间（北京时间）<input name="observedAt" type="datetime-local" required aria-invalid={!!errors.observedAt} aria-describedby={errors.observedAt ? `${id}-time-error` : undefined} value={observedAt} onChange={(event) => setObservedAt(event.target.value)} /></label>
        {errors.observedAt ? <p className="field-error" id={`${id}-time-error`}>{errors.observedAt}</p> : null}
        <label>实际训练情况<select name="activity" value={activity} onChange={(event) => setActivity(event.target.value as PatientReport["activity_state"])}>
          <option value="unknown">不清楚／未说明</option><option value="performed">做了训练</option><option value="not_performed">没有训练</option>
        </select></label>
        {activity === "performed" ? <><label>实际时长（分钟，可留空表示未知）<input name="minutes" type="number" min="0" step="1" aria-invalid={!!errors.minutes} aria-describedby={errors.minutes ? `${id}-minutes-error` : undefined} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>{errors.minutes ? <p className="field-error" id={`${id}-minutes-error`}>{errors.minutes}</p> : null}</> : null}
        <label>不适情况<select name="discomfort" value={discomfort} onChange={(event) => setDiscomfort(event.target.value as PatientReport["discomfort_state"])}>
          <option value="unknown">不清楚／未说明</option><option value="none">明确没有不适</option><option value="reported">有不适</option>
        </select></label>
        {discomfort === "reported" ? <><label>不适描述<input name="note" required maxLength={500} aria-invalid={!!errors.note} aria-describedby={errors.note ? `${id}-note-error` : undefined} value={note} onChange={(event) => setNote(event.target.value)} /></label>{errors.note ? <p className="field-error" id={`${id}-note-error`}>{errors.note}</p> : null}</> : null}
        {editing ? <><label>更正原因（以 SYN- 开头）<input name="reason" required maxLength={500} aria-invalid={!!errors.reason} aria-describedby={errors.reason ? `${id}-reason-error` : undefined} value={reason} onChange={(event) => setReason(event.target.value)} /></label>{errors.reason ? <p className="field-error" id={`${id}-reason-error`}>{errors.reason}</p> : null}</> : null}
        <div className="button-row"><button disabled={pending || failedStatus === 409} type="submit">{pending ? "正在保存…" : failedStatus !== null && failedStatus !== 409 ? "重试保存" : editing ? "保存更正" : "保存记录"}</button>
          {editing ? <button type="button" disabled={pending} onClick={cancelCorrection}>取消更正</button> : null}</div>
        </fieldset>
      </form>
      {message ? <div role={failedStatus !== null || Object.values(errors).some(Boolean) ? "alert" : "status"}><p>{message}</p>
        {failedStatus === 401 || failedStatus === 403 ? <p><a href="/login" target="_blank" rel="noreferrer">在新标签页重新登录</a></p> : null}
        {failedStatus === 409 ? <>
          <RetryPatientHomeButton label="重新检查记录" />
          {editing && latestEditing && latestEditing.revision_no > editing.revision_no ? <>
            <p>最新记录是版本 {latestEditing.revision_no}。请先对照下方历史；继续时保留你填写的内容，不自动提交。</p>
            <button type="button" onClick={() => { setEditing(latestEditing); key.current = ""; clearErrors(); setMessage("已采用最新版本作为更正依据，填写内容已保留。请核对后保存更正。"); }}>使用最新版本继续更正</button>
          </> : null}
          {!editing ? <>
            <p>请先核对本人记录历史，确认没有这次记录后，再继续填写；此操作不会自动保存。</p>
            <button type="button" onClick={() => { key.current = ""; clearErrors(); }}>已核对历史，继续填写</button>
          </> : null}
        </> : null}
      </div> : null}
      <h3>本人记录历史</h3>
      {latest.length ? <ul>{latest.map((row) => <li key={row.report_id}>
        <p tabIndex={-1} ref={row.id === savedReports[0]?.id ? lastSavedRecord : undefined}>
          <strong>当前版本 {row.revision_no}</strong> · <ReportFacts row={row} />
        </p>
        <button type="button" disabled={pending} onClick={() => edit(row)}>更正</button>
        {row.revision_no > 1 ? <details><summary>查看旧版本</summary><ul>{reports.filter((old) => old.report_id === row.report_id && old.id !== row.id).sort((a, b) => b.revision_no - a.revision_no).map((old) => <li key={old.id}><strong>旧版本 {old.revision_no}</strong> · <ReportFacts row={old} /></li>)}</ul></details> : null}
      </li>)}</ul> : <p>尚未填写训练或不适记录；训练与不适状态均未知。</p>}
  </>;
}
