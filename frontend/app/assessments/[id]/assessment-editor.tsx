"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assessmentError, localTimeToUtc, missingReasonText, writeAssessment,
  type AssessmentRevision, type MissingReason,
} from "../../workspace/assessments";

type Validity = "" | "valid" | "missing" | "invalid";

export default function AssessmentEditor(props: {
  assessmentId: string;
  current: AssessmentRevision;
  canWrite: boolean;
  canConfirm: boolean;
}) {
  const router = useRouter();
  const measurementKey = useRef("");
  const confirmKey = useRef("");
  const [validity, setValidity] = useState<Validity>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawText = String(form.get("raw_value") ?? "").trim();
    const rawValue = validity === "missing" || rawText === "" ? null : Number(rawText);
    const localTime = String(form.get("performed_at") ?? "");
    const performedAt = validity === "missing" || !localTime ? null : localTimeToUtc(localTime);
    if (!validity || (rawValue !== null && !Number.isInteger(rawValue)) ||
        (validity === "valid" && (rawValue === null || performedAt === null))) {
      setError("请完整填写人工总分和设备本地测量时间。");
      return;
    }
    setPending(true);
    setError("");
    measurementKey.current ||= crypto.randomUUID();
    const result = await writeAssessment<AssessmentRevision>(
      `/assessments/${props.assessmentId}/measurements`,
      {
        expected_revision: props.current.revision_no,
        validity,
        raw_value: rawValue,
        missing_reason: validity === "valid" ? null : form.get("missing_reason") || null,
        performed_at: performedAt,
        change_reason: form.get("change_reason") || null,
      },
      measurementKey.current,
      document.cookie,
      "PUT",
    );
    setPending(false);
    if (result.value) {
      measurementKey.current = "";
      router.refresh();
    } else setError(assessmentError(result.status));
  }

  async function confirm() {
    setPending(true);
    setError("");
    confirmKey.current ||= crypto.randomUUID();
    const result = await writeAssessment<AssessmentRevision>(
      `/assessments/${props.assessmentId}/confirm`,
      { expected_revision: props.current.revision_no },
      confirmKey.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      confirmKey.current = "";
      router.refresh();
    } else setError(assessmentError(result.status));
  }

  return <section aria-labelledby="assessment-edit-heading">
    <h2 id="assessment-edit-heading">人工总分录入与审核</h2>
    {props.canWrite ? <form onSubmit={save} onChange={() => { measurementKey.current = ""; }}>
      <label htmlFor="validity">记录状态</label>
      <select id="validity" name="validity" value={validity} required
        onChange={(event) => setValidity(event.target.value as Validity)}>
        <option value="" disabled>请选择</option>
        <option value="valid">有效人工总分</option>
        <option value="missing">缺失（没有测量值）</option>
        <option value="invalid">无效原始记录</option>
      </select>
      <label htmlFor="raw_value">人工 SPPB 总分（分）{validity === "invalid" ? "，原始值可选" : ""}</label>
      <input id="raw_value" name="raw_value" type="number" step="1"
        min={validity === "valid" ? 0 : undefined} max={validity === "valid" ? 12 : undefined}
        required={validity === "valid"} disabled={validity === "missing"} />
      <label htmlFor="missing_reason">缺失/无效原因</label>
      <select id="missing_reason" name="missing_reason"
        required={validity === "missing" || validity === "invalid"}
        disabled={validity === "valid"} defaultValue="">
        <option value="" disabled>请选择</option>
        {(Object.entries(missingReasonText) as [MissingReason, string][]).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      <label htmlFor="performed_at">测量时间（设备本地时间，保存为 UTC）</label>
      <input id="performed_at" name="performed_at" type="datetime-local"
        required={validity === "valid"} disabled={validity === "missing"} />
      <label htmlFor="change_reason">更正原因{props.current.validity !== "unrecorded" ? "（必填）" : "（可选）"}</label>
      <input id="change_reason" name="change_reason"
        required={props.current.validity !== "unrecorded"}
        pattern="SYN-[A-Z0-9_-]{3,60}" maxLength={64} placeholder="SYN-CORRECTION" />
      <button disabled={pending} type="submit">{pending ? "保存中…" : "保存新草稿版本"}</button>
    </form> : null}
    {props.canConfirm && props.current.state === "draft" && props.current.validity !== "unrecorded" ? (
      <button disabled={pending} type="button" onClick={confirm}>
        {pending ? "确认中…" : "确认当前记录"}
      </button>
    ) : null}
    <p className="note">确认表示工作人员核对这条记录；缺失/无效仍无可用总分，且不产生功能等级。</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
