"use client";

import { useRef, useState } from "react";
import { postIntake } from "../../workspace/intake";
import type { PatientReview } from "../../workspace/patient-reviews";

const resultText = { reviewed: "已核对", unable: "无法判定" };

export default function PatientReportReview({ participantId, revisionId, reviews, onSaved }: {
  participantId: string;
  revisionId: string;
  reviews: PatientReview[] | null;
  onSaved?: (review: PatientReview) => void;
}) {
  const [result, setResult] = useState<"" | PatientReview["result"]>("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const request = useRef<{ key: string; body: string } | null>(null);
  const busy = useRef(false);
  const history = (reviews ?? []).filter((row) => row.report_revision_id === revisionId)
    .sort((a, b) => b.review_no - a.review_no);
  const latest = history[0];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!onSaved || busy.current || !result || !note.trim()) return;
    const payload = { report_revision_id: revisionId, expected_review_no: latest?.review_no ?? 0, result, note: note.trim() };
    const body = JSON.stringify(payload);
    if (request.current?.body !== body) request.current = { key: crypto.randomUUID(), body };
    busy.current = true;
    setPending(true);
    setError("");
    setSuccess(false);
    const response = await postIntake<PatientReview>(
      `/participants/${participantId}/patient-report-reviews`, payload, request.current.key, document.cookie,
    );
    busy.current = false;
    setPending(false);
    if (response.value) {
      onSaved(response.value);
      setResult("");
      setNote("");
      request.current = null;
      setSuccess(true);
    } else {
      setError(response.status === 409
        ? "反馈或复核版本已变化，请重新打开此档案核对。当前输入已保留。"
        : response.status === 403
          ? "权限或模拟同意已变化，无法保存复核。当前输入已保留。"
          : "复核未确认保存，输入已保留，可重试。");
    }
  }

  return <section aria-label="反馈人工复核">
    <h3>人工复核</h3>
    <p className="note">仅核对本版合成反馈，不代表临床审批、动作质量或安全结论。原始反馈与姿态摘要保持不变。</p>
    {reviews === null ? <p role="status">复核记录暂不可用，请重新打开档案。</p> : <>
      <p>{latest ? `本版复核：${resultText[latest.result]}` : "本版反馈待复核"}</p>
      {history.length > 0 && <ol>{history.map((row) => <li key={row.id}>
        <strong>复核 {row.review_no} · {resultText[row.result]}</strong> · {row.note}
        <br /><small>复核人员编号：{row.recorded_by} · 北京时间：<time dateTime={row.recorded_at}>{new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></small>
      </li>)}</ol>}
      {onSaved && <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <legend>{latest ? "追加复核记录" : "记录本版复核"}</legend>
          <label>复核结果<select required value={result} onChange={(event) => { setResult(event.target.value as typeof result); setSuccess(false); }}>
            <option value="">请选择</option><option value="reviewed">已核对</option><option value="unable">无法判定</option>
          </select></label>
          <label>复核备注（必填，仅合成内容）<textarea required maxLength={500} value={note} onChange={(event) => { setNote(event.target.value); setSuccess(false); }} /></label>
          <p className="note">记录核对依据；无法判定时填写原因，追加记录时说明本次变化。</p>
          <button type="submit" disabled={!result || !note.trim()}>{pending ? "正在保存复核…" : "保存复核"}</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {success && <p role="status">复核已保存，原始反馈未改变。</p>}
      </form>}
    </>}
  </section>;
}
