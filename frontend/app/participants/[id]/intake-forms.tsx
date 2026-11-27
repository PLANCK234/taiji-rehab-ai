"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type ConsentRecord, type ScreeningRecord, intakeError, postIntake } from "../../../lib/intake";

function useAppendForm() {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function send<T>(path: string, body: object, form?: HTMLFormElement) {
    setPending(true); setError("");
    key.current ||= crypto.randomUUID();
    const result = await postIntake<T>(path, body, key.current, document.cookie);
    setPending(false);
    if (result.value) { key.current = ""; form?.reset(); router.refresh(); }
    else setError(intakeError(result.status));
  }
  const resetKey = () => { key.current = ""; };
  return { resetKey, pending, error, send };
}

export function ConsentForm({ participantId, consentCount, granted }: {
  participantId: string; consentCount: number; granted: boolean;
}) {
  const { resetKey, pending, error, send } = useAppendForm();
  const [decision, setDecision] = useState<"granted" | "refused" | "withdrawn">(granted ? "withdrawn" : "granted");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send<ConsentRecord>(`/participants/${participantId}/consents`, {
      document_version: form.get("document_version"), purpose_code: form.get("purpose_code"), decision,
      photo_scope: decision === "granted" && form.get("photo_scope") === "on",
      change_reason: String(form.get("change_reason") ?? "").trim() || null,
    }, event.currentTarget);
  }

  const body = <form onSubmit={submit} onChange={resetKey}>
    <div className="field">
      <label htmlFor="decision">记录状态</label>
      <select id="decision" name="decision" value={decision} onChange={event => setDecision(event.target.value as typeof decision)}>
        <option value="granted">模拟同意</option><option value="refused">模拟拒绝</option><option value="withdrawn">模拟撤回</option>
      </select>
    </div>
    {consentCount > 0 && <div className="field">
      <label htmlFor="consent_reason">变更原因</label>
      <input id="consent_reason" name="change_reason" required maxLength={240} placeholder="例如：对象要求撤回演示数据使用" />
    </div>}
    <details>
      <summary>文书版本与用途（已预填）</summary>
      <div className="details-body">
        <div className="field"><label htmlFor="document_version">合成文书版本</label>
          <input id="document_version" name="document_version" required defaultValue="SYN-FORM-V1" pattern="SYN-[A-Z0-9_\-]{3,60}" /></div>
        <div className="field"><label htmlFor="purpose_code">合成用途代码</label>
          <input id="purpose_code" name="purpose_code" required defaultValue="SYN-DEMO-USE" pattern="SYN-[A-Z0-9_\-]{3,60}" /></div>
        <label><input name="photo_scope" type="checkbox" disabled={decision !== "granted"} /> 记录照片范围（当前仅登记，不开放上传）</label>
      </div>
    </details>
    <button disabled={pending} type="submit" className={granted ? "btn-secondary" : undefined}>{pending ? "保存中…" : "追加同意记录"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;

  return granted ? <details style={{ marginTop: 12 }}><summary>变更同意状态</summary><div className="details-body">{body}</div></details>
    : <div style={{ marginTop: 12 }}>{body}</div>;
}

export function ScreeningForm({ participantId, existingItemCodes }: { participantId: string; existingItemCodes: string[] }) {
  const { resetKey, pending, error, send } = useAppendForm();
  const [itemCode, setItemCode] = useState("SYN-ITEM-01");
  const correcting = existingItemCodes.includes(itemCode);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send<ScreeningRecord>(`/participants/${participantId}/screenings`, {
      item_code: itemCode, answer: form.get("answer"),
      change_reason: String(form.get("change_reason") ?? "").trim() || null,
    });
  }

  return <form onSubmit={submit} onChange={resetKey} style={{ marginTop: 12 }}>
    <div className="form-grid">
      <div className="field"><label htmlFor="item_code">合成项目代码</label>
        <input id="item_code" name="item_code" value={itemCode} onChange={event => setItemCode(event.target.value.toUpperCase())} required pattern="SYN-[A-Z0-9_\-]{3,60}" /></div>
      <div className="field"><label htmlFor="answer">记录答案</label>
        <select id="answer" name="answer" defaultValue="unknown"><option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option></select></div>
    </div>
    {correcting && <div className="field"><label htmlFor="screen_reason">更正原因</label>
      <input id="screen_reason" name="change_reason" required maxLength={240} placeholder="该项目已有记录，请说明更正原因" /></div>}
    <button disabled={pending} type="submit" className="btn-secondary">{pending ? "保存中…" : "追加筛查记录"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
