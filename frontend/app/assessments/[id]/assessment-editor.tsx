"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assessmentError, missingReasonText, writeAssessment, type AssessmentRevision, type MissingReason,
} from "../../../lib/assessments";
import { localInputValue, localTimeToUtc } from "../../../lib/format";

type Validity = "valid" | "missing" | "invalid";

export default function AssessmentEditor(props: {
  assessmentId: string; participantId: string; current: AssessmentRevision; canWrite: boolean; canConfirm: boolean;
}) {
  const router = useRouter();
  const measurementKey = useRef(""), confirmKey = useRef("");
  const [validity, setValidity] = useState<Validity>("valid");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => localInputValue(new Date(), true));
  const correcting = props.current.validity !== "unrecorded";
  const canConfirmNow = props.canConfirm && props.current.state === "draft" && props.current.validity !== "unrecorded";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawText = String(form.get("raw_value") ?? "").trim();
    const rawValue = validity === "missing" || rawText === "" ? null : Number(rawText);
    const localTime = String(form.get("performed_at") ?? "");
    const performedAt = validity === "missing" || !localTime ? null : localTimeToUtc(localTime);
    if (rawValue !== null && !Number.isInteger(rawValue)) { setError("总分应为整数。"); return; }
    if (validity === "valid" && (rawValue === null || rawValue < 0 || rawValue > 12)) { setError("有效总分应为 0–12 的整数。"); return; }
    if (validity === "valid" && performedAt === null) { setError("请填写测量时间。"); return; }
    setPending(true); setError("");
    measurementKey.current ||= crypto.randomUUID();
    const result = await writeAssessment<AssessmentRevision>(`/assessments/${props.assessmentId}/measurements`, {
      expected_revision: props.current.revision_no, validity, raw_value: rawValue,
      missing_reason: validity === "valid" ? null : form.get("missing_reason") || null,
      performed_at: performedAt,
      change_reason: String(form.get("change_reason") ?? "").trim() || null,
    }, measurementKey.current, document.cookie, "PUT");
    setPending(false);
    if (result.value) { measurementKey.current = ""; router.refresh(); }
    else setError(assessmentError(result.status));
  }

  async function confirm() {
    setPending(true); setError("");
    confirmKey.current ||= crypto.randomUUID();
    const result = await writeAssessment<AssessmentRevision>(`/assessments/${props.assessmentId}/confirm`,
      { expected_revision: props.current.revision_no }, confirmKey.current, document.cookie);
    setPending(false);
    if (result.value) {
      confirmKey.current = "";
      router.push(`/participants/${props.participantId}/demo`);
      router.refresh();
    } else setError(assessmentError(result.status));
  }

  return <section className="card" aria-labelledby="assessment-edit-heading">
    <div className="card-head"><h2 id="assessment-edit-heading">{correcting ? "更正 / 确认" : "录入人工总分"}</h2></div>
    {canConfirmNow && <div className="next-step" style={{ marginTop: 0, marginBottom: 16 }}>
      <div><div className="label">待确认</div><p>核对无误后确认，系统将生成 Demo 分级并打开训练方案。</p></div>
      <button disabled={pending} type="button" onClick={confirm}>{pending ? "确认中…" : "确认当前记录"}</button>
    </div>}
    {props.canWrite ? <form onSubmit={save} onChange={() => { measurementKey.current = ""; }}>
      <div className="field">
        <label htmlFor="validity">记录状态</label>
        <select id="validity" name="validity" value={validity} required onChange={event => setValidity(event.target.value as Validity)}>
          <option value="valid">有效人工总分</option>
          <option value="missing">缺失（没有测量值）</option>
          <option value="invalid">无效原始记录</option>
        </select>
      </div>
      {validity !== "missing" && <div className="form-grid">
        <div className="field">
          <label htmlFor="raw_value">人工 SPPB 总分（分）</label>
          <input id="raw_value" name="raw_value" type="number" step="1" inputMode="numeric"
            min={validity === "valid" ? 0 : undefined} max={validity === "valid" ? 12 : undefined} required={validity === "valid"}
            placeholder={validity === "invalid" ? "原始值（可选）" : "0–12"} />
        </div>
        <div className="field">
          <label htmlFor="performed_at">测量时间（设备本地时间，保存为 UTC）</label>
          <input id="performed_at" name="performed_at" type="datetime-local" required={validity === "valid"} defaultValue={now} />
        </div>
      </div>}
      {validity !== "valid" && <div className="field">
        <label htmlFor="missing_reason">缺失/无效原因</label>
        <select id="missing_reason" name="missing_reason" required defaultValue="">
          <option value="" disabled>请选择</option>
          {(Object.entries(missingReasonText) as [MissingReason, string][]).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </div>}
      {correcting && <div className="field">
        <label htmlFor="change_reason">更正原因</label>
        <input id="change_reason" name="change_reason" required maxLength={240} placeholder="例如：秒表读数录入错误" />
      </div>}
      <button className={canConfirmNow ? "btn-secondary" : undefined} disabled={pending} type="submit">{pending ? "保存中…" : "保存新草稿版本"}</button>
      <p className="note">零分是有效观测值；缺失与无效会单独标记，不会当作 0 分。</p>
    </form> : <p className="note">当前角色只能查看或确认，不能录入总分。</p>}
    {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
  </section>;
}
